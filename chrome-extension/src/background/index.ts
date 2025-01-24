import { initializeListeners } from './listeners/messages';
import { initializeCommands } from './listeners/commands';

// 初始化所有监听器
initializeListeners();
initializeCommands();

// 监听插件图标点击事件(默认获取解答)
import { querySolution } from './core/solution';
chrome.action.onClicked.addListener(querySolution);
