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
    await showFrontEndMessage(tabId, '请先登录后使用');
    return false;
  }
  await refreshUserData(user, tabId);

  const validSubscription = await isUserSubscriptionValid(user);
  if (!validSubscription) {
    await showFrontEndMessage(tabId, '试用期已结束，请订阅以继续使用');
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

    await showFrontEndMessage(tabId, '正在获取解答...');

    // 2. 防止用户在15秒内重复请求
    const { lastQueryTime, lastContent, lastContentQueryTime } = await chrome.storage.sync.get([
      'lastQueryTime',
      'lastContent',
      'lastContentQueryTime',
    ]);
    const now = Date.now();

    if (lastQueryTime && now - lastQueryTime < 10000) {
      await showFrontEndMessage(tabId, '请等待10秒后再次请求');
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
      await showFrontEndMessage(tabId, '请等待10秒后再次提交相同内容');
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
    await showFrontEndMessage(tabId, '解答已就绪，请查看新窗口');
  } catch (error: any) {
    await showFrontEndMessage(tabId, `处理请求出错: ${error.message || '未知错误'}, 请检查网络连接或订阅状态`);
  }
}
