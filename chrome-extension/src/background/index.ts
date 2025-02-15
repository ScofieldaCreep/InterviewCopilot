import { initializeListeners } from './listeners/messages';
import { initializeCommands } from './listeners/commands';

// 初始化所有监听器
initializeListeners();
initializeCommands();
console.log('Background script initialized');
