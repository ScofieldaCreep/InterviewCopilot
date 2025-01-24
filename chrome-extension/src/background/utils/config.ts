import { ApiConfig, User } from '../types';

/**
 * 获取API配置
 * @returns API配置对象
 */
export async function getApiConfig(): Promise<ApiConfig> {
  const { model, language, context, programmingLanguage } = await chrome.storage.sync.get([
    'model',
    'language',
    'context',
    'programmingLanguage',
  ]);
  return { model, language, context, programmingLanguage };
}

/**
 * 获取当前用户信息
 * @returns 用户信息对象或null
 */
export async function getUser(): Promise<User | null> {
  const { user } = await chrome.storage.sync.get('user');
  return user || null;
}

/**
 * 根据语言代码获取可读的语言提示
 * @param lang 语言代码
 * @returns 可读的语言名称
 */
export function getLanguagePrompt(lang: string): string {
  const prompts: { [key: string]: string } = {
    en: 'English',
    zh: '中文',
    ja: '日本語',
    es: 'Español',
    hi: 'हिन्दी',
  };
  return prompts[lang] || 'English';
}

/**
 * 判断用户是否在有效的试用期内
 * @param user 用户信息
 * @returns 是否在有效试用期内
 */
export function isInTrialPeriod(user: User): boolean {
  if (!user.creationTime) {
    return false;
  }

  const TRIAL_DURATION = 30 * 60 * 1000; // 30分钟
  const now = Date.now();
  return now - user.creationTime < TRIAL_DURATION;
}

/**
 * 判断用户是否有效订阅或在试用期
 * @param user 用户信息
 * @returns 是否可以使用服务
 */
export async function isUserSubscriptionValid(user: User | null): Promise<boolean> {
  if (!user) return false;

  // 如果用户选择的是基础模型(gpt-3.5-turbo)，则无限制使用
  const { model } = await chrome.storage.sync.get(['model']);
  console.log('model', model);
  if (model === 'gpt-4o-mini') return true;

  if (user.hasValidSubscription || user.email === 'scofieldacreep@gmail.com') return true;
  return isInTrialPeriod(user);
}
