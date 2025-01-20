import { getUser, getApiConfig, getLanguagePrompt, isUserSubscriptionValid } from '../utils/config';
import { showErrorMessage } from '../utils/ui';
import { injectContentScript, fetchPageContent, showAnswer } from '../utils/ui';
import { callOpenAIThroughBackend } from '../services/firebase';

/**
 * 获取AI解答的核心函数
 * @param tabOrId 标签页或标签页ID
 */
export async function querySolution(tabOrId: number | chrome.tabs.Tab) {
  const tabId = typeof tabOrId === 'number' ? tabOrId : tabOrId.id!;

  try {
    // 1. 获取当前用户
    const user = await getUser();
    if (!user) {
      await showErrorMessage(tabId, 'Please login first.');
      return;
    }

    // 2. 判断是否可用：已订阅 或者 在试用期
    const validSubscription = await isUserSubscriptionValid(user);
    if (!validSubscription) {
      await showErrorMessage(tabId, 'Trial period has ended. Please subscribe to continue.');
      return;
    }

    // 3. 防止用户在15秒内重复请求
    const { lastQueryTime, lastContent, lastContentQueryTime } = await chrome.storage.sync.get([
      'lastQueryTime',
      'lastContent',
      'lastContentQueryTime',
    ]);
    const now = Date.now();

    if (lastQueryTime && now - lastQueryTime < 15000) {
      await showErrorMessage(tabId, 'Please wait 15 seconds between requests.');
      return;
    }

    // 4. 获取当前 AI 配置
    const { model, language, context, programmingLanguage } = await getApiConfig();

    // 5. 注入 content script，获取页面内容
    await injectContentScript(tabId);
    const pageContent = await fetchPageContent(tabId);

    // 6. 防止在2分钟内重复分析同一份内容
    if (
      lastContent === pageContent &&
      lastContentQueryTime &&
      now - lastContentQueryTime < 120000
    ) {
      await showErrorMessage(tabId, 'Please wait before submitting the same content again.');
      return;
    }

    // 7. 记录新的请求时间 & 内容
    await chrome.storage.sync.set({
      lastQueryTime: now,
      lastContent: pageContent,
      lastContentQueryTime: now,
    });

    // 8. 准备向 OpenAI 发送的 Prompt
    const DEFAULT_PROMPT_TEMPLATE = `
     Please analyze the following algorithm problem and provide a detailed solution:
    {content}

     Requirements:
     1. Use {language}, answer in markdown format
     2. Use {programmingLanguage} language, maintain {programmingLanguage} code style
     3. Analyze key points and test focus
     4. Provide optimal solution approach and derivation process
     5. Provide complete code implementation (with necessary comments)
     6. Analyze time and space complexity
     7. Add alternative solutions (if any)
    {context}
    `.trim();

    const prompt = DEFAULT_PROMPT_TEMPLATE
      .replace('{content}', pageContent)
      .replace('{language}', getLanguagePrompt(language))
      .replace('{context}', context || '')
      .replace('{programmingLanguage}', programmingLanguage);

    // 9. 调用后端云函数
    const answer = await callOpenAIThroughBackend(prompt, model, tabId);

    // 10. 显示答案
    await showAnswer(answer);
  } catch (error: any) {
    await showErrorMessage(tabId, `Request processing error: ${error.message || 'Unknown error'}`);
  }
} 