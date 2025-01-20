import { querySolution } from '../core/solution';
import { getUser } from '../utils/config';
import { showErrorMessage } from '../utils/ui';
import { isUserSubscriptionValid } from '../utils/config';
import { refreshUserData } from './messages';

/**
 * 初始化命令监听器
 */
export function initializeCommands(): void {
  chrome.commands.onCommand.addListener(async command => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    if (command === '_execute_action') {
      // 按下Chrome自带的 action 快捷键，打开Popup
      await chrome.action.openPopup();
    } else if (command === 'get_answer') {
      try {
        // 1. 先刷新订阅数据
        await refreshUserData();

        // 2. 再次获取最新user
        const user = await getUser();
        if (!user || !user.uid) {
          await showErrorMessage(tab.id!, 'Please login first.');
          return;
        }

        // 3. 判断是否仍然可以使用
        const validSubscription = await isUserSubscriptionValid(user);
        if (!validSubscription) {
          await showErrorMessage(tab.id!, 'Trial period has ended. Please subscribe to continue.');
          return;
        }

        // 4. 触发提示并获取解答
        showErrorMessage(tab.id!, 'Getting solution...');
        await querySolution(tab);
      } catch (err: any) {
        console.error(err);
        await showErrorMessage(tab.id!, 'Unable to check subscription status. Please retry or check network.');
      }
    }
  });
}
