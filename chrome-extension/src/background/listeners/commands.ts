import { querySolution } from '../core/solution';
import { getUser } from '../utils/config';
import { showFrontEndMessage } from '../utils/ui';
import { isUserSubscriptionValid } from '../utils/config';
import { refreshUserData } from './messages';

/**
 * 初始化命令监听器
 */
export function initializeCommands(): void {
  chrome.commands.onCommand.addListener(async command => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    // if (command === '_execute_action') {
    //   // 按下Chrome自带的 action 快捷键，打开Popup
    //   await chrome.action.openPopup();
    // }
    if (command === 'get_answer') {
      try {
        await querySolution(tab);
      } catch (err: any) {
        await showFrontEndMessage(tab.id!, err.message);
      }
    }
  });
}
