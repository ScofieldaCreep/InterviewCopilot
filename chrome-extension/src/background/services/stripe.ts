import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase-init.js';
import { CheckoutSessionData } from '../types';
import { showErrorMessage } from '../utils/ui';

/**
 * 创建Stripe Checkout Session
 * @param uid 用户ID
 * @param priceId Stripe价格ID
 * @param userEmail 用户邮箱
 * @param tabId 标签页ID
 * @returns Checkout Session文档引用
 */
export async function createCheckoutSession(
  uid: string,
  priceId: string,
  userEmail: string,
  tabId: number
) {
  try {
    const checkoutSessionRef = collection(db, 'customers', uid, 'checkout_sessions');
    const sessionData: CheckoutSessionData = {
      price: priceId,
      success_url: 'https://algo-ace-next.vercel.app/',
      cancel_url: 'https://algo-ace-next.vercel.app/',
      mode: 'subscription',
      metadata: { userId: uid, userEmail },
    };
    return await addDoc(checkoutSessionRef, sessionData);
  } catch (error: any) {
    await showErrorMessage(
      tabId,
      `Failed to create payment session: ${error.message || 'Unknown error'}`
    );
    throw error;
  }
}

/**
 * 打开Stripe支付窗口
 * @param url 支付链接
 * @returns 窗口创建Promise
 */
export function openStripeCheckout(url: string) {
  return chrome.windows.create({
    url,
    type: 'popup',
    width: 800,
    height: 600,
  });
} 