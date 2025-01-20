import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  DocumentSnapshot,
  onSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../firebase-init.js';
import { AIResponse } from '../types';
import { showErrorMessage } from '../utils/ui';

/**
 * 调用OpenAI云函数
 * @param prompt 提示文本
 * @param model 模型名称
 * @param tabId 标签页ID
 * @returns AI响应文本
 */
export async function callOpenAIThroughBackend(
  prompt: string,
  model: string,
  tabId: number
): Promise<string> {
  try {
    const getOpenAIAnswer = httpsCallable<any, AIResponse>(functions, 'getAIResponse');
    const response = await getOpenAIAnswer({ prompt, model });
    return response.data.answer;
  } catch (error: any) {
    await showErrorMessage(tabId, `AI Response Error: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * 检查用户是否有有效订阅
 * @param uid 用户ID
 * @param tabId 标签页ID
 * @returns 是否有有效订阅
 */
export async function hasActiveSubscription(uid: string, tabId: number): Promise<boolean> {
  try {
    const subscriptionsRef = collection(db, 'customers', uid, 'subscriptions');
    const activeQuery = query(
      subscriptionsRef,
      where('status', '==', 'active'),
      orderBy('current_period_end', 'desc'),
      limit(1)
    );
    const activeSubsSnapshot = await getDocs(activeQuery);
    if (activeSubsSnapshot.empty) return false;

    const latestSub = activeSubsSnapshot.docs[0].data();
    const currentPeriodEndMs = latestSub.current_period_end.toMillis();
    return currentPeriodEndMs > Date.now();
  } catch (error: any) {
    await showErrorMessage(tabId, `Subscription check failed: ${error.message || 'Unknown error'}`);
    throw error;
  }
}

/**
 * 检查用户支付状态
 * @param userId 用户ID
 * @returns 是否有有效订阅
 */
export async function checkPaymentStatus(userId: string): Promise<boolean> {
  const paymentsRef = collection(db, 'customers', userId, 'subscriptions');
  const q = query(paymentsRef, where('status', '==', 'active'), orderBy('current_period_end', 'desc'), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return false;

  const data = snapshot.docs[0].data();
  const currentPeriodEndMs = data.current_period_end.toMillis();
  return currentPeriodEndMs > Date.now();
}

/**
 * 获取Stripe价格ID
 * @returns Stripe价格ID
 */
export async function getStripePriceId(): Promise<string> {
  const configDocRef = doc(db, 'config', 'stripe');
  const configSnap = await getDoc(configDocRef);
  if (!configSnap.exists()) {
    throw new Error('Stripe configuration not found');
  }
  return configSnap.data().priceId_test;
}

/**
 * 监听Checkout Session状态
 * @param docRef Checkout Session文档引用
 * @param onData 数据回调函数
 * @returns 取消监听函数
 */
export function listenToCheckoutSession(
  docRef: any,
  onData: (data: any) => void
): () => void {
  return onSnapshot(docRef, (snap: DocumentSnapshot) => onData(snap.data()));
} 