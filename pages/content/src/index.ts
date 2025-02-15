// pages/content/src/index.ts
// 类型定义
interface ContentResponse {
  success: boolean;
  title?: string;
  body?: string;
  error?: string;
}

// 监听来自 background script 的消息
chrome.runtime.onMessage.addListener(
  (
    request: { action: string },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: ContentResponse) => void,
  ) => {
    console.log('Received message:', request);

    if (request.action === 'getPageContent') {
      try {
        const content: ContentResponse = {
          success: true,
          title: document.title,
          body: document.body.innerText
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.trim())
            .join('\n'),
        };

        console.log('Sending response:', content);
        sendResponse(content);
      } catch (error) {
        console.error('Content script error:', error);
        sendResponse({
          success: false,
          error: 'Unknown error in content script when getPageContent',
        });
      }
    }

    return true;
  },
);
