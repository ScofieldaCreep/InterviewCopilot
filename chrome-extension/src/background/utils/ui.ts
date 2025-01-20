import { parseMarkdown, generateResultHTML } from './markdown';

/**
 * 在页面上显示错误提示
 * @param tabId 标签页ID
 * @param message 错误信息
 */
export async function showErrorMessage(tabId: number, message: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (errorMsg: string) => {
      const style = document.createElement('style');
      style.textContent = `
        .algo-ace-error {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #ff4d4f;
          color: white;
          padding: 12px 20px;
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          z-index: 10000;
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `;
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.className = 'algo-ace-error';
      div.textContent = errorMsg;
      document.body.appendChild(div);

      setTimeout(() => div.remove(), 6000);
    },
    args: [message],
  });
}

/**
 * 显示AI回答结果
 * @param answer 解析后的HTML内容
 */
export async function showAnswer(answer: string) {
  const parsedContent = parseMarkdown(answer);
  const html = generateResultHTML(parsedContent);
  let dataUrl: string;

  try {
    dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

    // 获取当前窗口信息
    const currentWindow = await chrome.windows.getCurrent({ windowTypes: ['normal'] });
    console.log('Current window:', currentWindow);

    // 获取所有显示器的信息
    const displays = await chrome.system.display.getInfo();
    console.log('Displays:', displays);

    // 使用主显示器的尺寸
    const primaryDisplay = displays.find(d => d.isPrimary) || displays[0];
    const screen = {
      availWidth: primaryDisplay.workArea.width,
      availHeight: primaryDisplay.workArea.height,
    };

    const MIN_WIDTH = 400;
    const MIN_HEIGHT = 600;
    const padding = 0;

    // 计算当前窗口的边界
    const currentLeft = currentWindow.left ?? 0;
    const currentTop = currentWindow.top ?? 0;
    const currentWidth = currentWindow.width ?? screen.availWidth;
    const currentRight = currentLeft + currentWidth;

    // 计算新窗口的位置和尺寸
    let left: number;
    let width: number;

    // 如果当前窗口在屏幕左半边，popup放右边
    if (currentRight < screen.availWidth / 2) {
      left = currentRight + padding;
      width = screen.availWidth - left;
    }
    // 如果当前窗口在屏幕右半边，popup放左边
    else if (currentLeft > screen.availWidth / 2) {
      width = currentLeft - padding;
      left = 0;
    }
    // 如果当前窗口在中间，选择右边剩余空间较大的一边
    else {
      const leftSpace = currentLeft;
      const rightSpace = screen.availWidth - currentRight;
      if (rightSpace >= leftSpace) {
        left = currentRight + padding;
        width = screen.availWidth - left;
      } else {
        width = currentLeft - padding;
        left = 0;
      }
    }

    // 确保最小宽度
    width = Math.max(width, MIN_WIDTH);

    // 高度尽可能占满屏幕，但保持最小高度
    const height = Math.max(screen.availHeight - padding * 2, MIN_HEIGHT);
    const top = padding;

    console.log('Window position:', { left, top, width, height });

    // 尝试以popup方式打开
    try {
      const newWindow = await chrome.windows.create({
        url: dataUrl,
        type: 'popup',
        width: Math.round(width),
        height: Math.round(height),
        left: Math.round(left),
        top: Math.round(top),
        focused: true,
      });
      console.log('Created window:', newWindow);
    } catch (popupError) {
      console.error('Failed to create popup:', popupError);
      // popup失败就用新Tab
      await chrome.tabs.create({
        url: dataUrl,
        active: true,
      });
    }
  } catch (error) {
    console.error('Failed to show answer:', error);
    // 如果出现错误，回退到最简单的新标签页模式
    try {
      await chrome.tabs.create({
        url: dataUrl!,
        active: true,
      });
    } catch (fallbackError) {
      console.error('Even fallback failed:', fallbackError);
    }
  }
}

/**
 * 注入content script
 * @param tabId 标签页ID
 */
export async function injectContentScript(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/index.js'],
    });
  } catch {
    // 忽略重复注入导致的报错
  }
}

/**
 * 获取页面内容
 * @param tabId 标签页ID
 * @returns 页面内容
 */
export async function fetchPageContent(tabId: number): Promise<string> {
  const response = await chrome.tabs.sendMessage(tabId, {
    action: 'getPageContent',
  });

  if (!response?.success) {
    throw new Error('Failed to get page content');
  }

  return response.body;
}
