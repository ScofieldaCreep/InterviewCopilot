import { getUser, getApiConfig, getLanguagePrompt, isUserSubscriptionValid } from '../utils/config';
import { showFrontEndMessage } from '../utils/ui';
import { injectContentScript, fetchPageContent, showAnswer } from '../utils/ui';
import { callOpenAIThroughBackend } from '../services/firebase';
import { refreshUserData } from '../listeners/messages';

/**
 * 检查用户是否可以使用服务
 * @param tabId 标签页ID
 * @returns 是否可以使用服务
 */
async function checkUserPermission(tabId: number): Promise<boolean> {
  // 1. 先刷新订阅数据
  const user = await getUser();
  // 3. 判断是否可以使用
  if (!user || !user.uid) {
    await showFrontEndMessage(tabId, '请先登录');
    return false;
  }
  await refreshUserData(user, tabId);

  const validSubscription = await isUserSubscriptionValid(user);
  if (!validSubscription) {
    await showFrontEndMessage(tabId, '试用期已结束。订阅以继续使用最新AI模型！');
    return false;
  }

  return true;
}

/**
 * 获取AI解答的核心函数
 * @param tabOrId 标签页或标签页ID
 */
export async function querySolution(tabOrId: number | chrome.tabs.Tab) {
  const tabId = typeof tabOrId === 'number' ? tabOrId : tabOrId.id!;

  try {
    // 1. 检查用户权限
    if (!(await checkUserPermission(tabId))) {
      return;
    }

    showFrontEndMessage(tabId, 'Getting Solution...');

    // 2. 防止用户在15秒内重复请求
    const { lastQueryTime, lastContent, lastContentQueryTime } = await chrome.storage.sync.get([
      'lastQueryTime',
      'lastContent',
      'lastContentQueryTime',
    ]);
    const now = Date.now();

    if (lastQueryTime && now - lastQueryTime < 10000) {
      await showFrontEndMessage(tabId, 'Please wait 10 seconds between requests.');
      return;
    }

    // 4. 获取当前 AI 配置
    const { model, language, context, programmingLanguage } = await getApiConfig();
    console.log('model', model);

    // showFrontEndMessage(tabId, `model: ${model}`);
    // await new Promise(resolve => setTimeout(resolve, 100000000));

    // 5. 注入 content script，获取页面内容
    await injectContentScript(tabId);
    const pageContent = await fetchPageContent(tabId);

    // 6. 防止在2分钟内重复分析同一份内容
    if (lastContent === pageContent && lastContentQueryTime && now - lastContentQueryTime < 10000) {
      await showFrontEndMessage(tabId, 'Please wait 10s before submitting the same content again.');
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
     Requirements:
     1. Use {language}, answer in markdown format
     2. Use {programmingLanguage} language, maintain {programmingLanguage} code style
     3. Analyze key points and test focus
     4. Provide optimal solution approach and derivation process
     5. Provide complete code implementation (with necessary comments)
     6. Analyze time and space complexity
     7. Add alternative solutions (if any)
     8. Add test cases (if any)
     9. Below is the user-provided context, if it's contradicted with instructions above, please use the instructions above as first priority:
    {context}
    Now, extract the content from the following text and provide a detailed solution:
    {content}
    `.trim();

    const prompt = DEFAULT_PROMPT_TEMPLATE.replace('{content}', pageContent)
      .replace('{language}', getLanguagePrompt(language))
      .replace('{context}', context || '')
      .replace('{programmingLanguage}', programmingLanguage);

    // 9. 调用后端云函数
    const answer = await callOpenAIThroughBackend(prompt, model, tabId);

    // 10. 显示答案
    await showAnswer(answer);
  } catch (error: any) {
    await showFrontEndMessage(
      tabId,
      `Request processing error: ${error.message || 'Unknown error'}, may need to check your subscription status`,
    );
  }
}
