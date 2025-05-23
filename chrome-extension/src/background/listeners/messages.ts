import { querySolution } from '../core/solution';
import { getUser } from '../utils/config';
import { hasActiveSubscription, getStripePriceId, listenToCheckoutSession } from '../services/firebase';
import { createCheckoutSession, openStripeCheckout } from '../services/stripe';
import { User } from '../types';

/**
 * 刷新用户数据
 */
export async function refreshUserData(user: User, tabId: number): Promise<void> {
  // 检查 Firestore 是否有有效订阅
  const hasValidSubscription = await hasActiveSubscription(user.uid, tabId);
  const updatedUser = {
    ...user,
    hasValidSubscription,
  };

  // 写回 chrome.storage.sync
  await chrome.storage.sync.set({ user: updatedUser });
}

/**
 * 初始化消息监听器
 */
export function initializeListeners(): void {
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. 点击「GetAnswer」
    if (request.action === 'getAnswer' && request.tabId) {
      (async () => {
        try {
          await querySolution(request.tabId);
          sendResponse({ success: true });
        } catch (error: any) {
          console.error(error);
          sendResponse({ error: error.message });
        }
      })();
      return true; // 异步
    }

    // 2. 登录弹窗
    if (request.action === 'login') {
      chrome.windows.create(
        {
          url: 'login.html',
          type: 'popup',
          width: 800,
          height: 600,
        },
        () => sendResponse({ success: true }),
      );
      return true;
    }

    // 3. 订阅流程：创建 checkout session 并打开Stripe支付页面
    if (request.action === 'subscribe') {
      (async () => {
        try {
          // 3.1 获取当前用户
          const user = await getUser();
          if (!user || !user.uid) {
            sendResponse({ success: false, error: 'Please login before subscribing' });
            return;
          }
          // 3.2 检查是否已有有效订阅
          if (await hasActiveSubscription(user.uid, request.tabId)) {
            sendResponse({ success: false, error: 'Active subscription already exists' });
            return;
          }

          // 3.3 获取 Stripe 价格 ID
          const PRICE_ID = await getStripePriceId();
          console.log('PRICE_ID', PRICE_ID);
          // 3.4 创建 checkout session
          const docRef = await createCheckoutSession(user.uid, PRICE_ID, user.email, request.tabId);
          console.log('docRef', docRef);
          // 3.5 监听 checkout session, 获取 Stripe 支付链接
          const unsubscribe = listenToCheckoutSession(docRef, data => {
            if (data?.error) {
              unsubscribe();
              sendResponse({ success: false, error: data.error.message });
            } else if (data?.url) {
              unsubscribe();
              // 后台直接弹出支付页
              openStripeCheckout(data.url).then(() => {
                sendResponse({ success: true });
              });
            }
          });
        } catch (error: any) {
          console.error('Subscribe Flow Error:', error);
          sendResponse({ success: false, error: error.message });
        }
      })();
      return true;
    }

    // 4. 刷新用户数据（按需拉取订阅状态）
    if (request.action === 'refreshUser') {
      refreshUserData()
        .then(() => sendResponse({ success: true }))
        .catch(err => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }
  });
}
