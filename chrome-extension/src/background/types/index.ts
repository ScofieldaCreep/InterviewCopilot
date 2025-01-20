// AI响应接口
export interface AIResponse {
  answer: string;
}

// 用户接口
export interface User {
  uid: string;
  email: string;
  hasValidSubscription?: boolean;
  creationTime?: number;
}

// API配置接口
export interface ApiConfig {
  model: string;
  language: string;
  context?: string;
  programmingLanguage: string;
}

// Stripe配置接口
export interface StripeConfig {
  priceId_production: string;
}

// Checkout Session数据接口
export interface CheckoutSessionData {
  price: string;
  success_url: string;
  cancel_url: string;
  mode: 'subscription';
  metadata: {
    userId: string;
    userEmail: string;
  };
}

// 存储数据接口
export interface StorageData {
  lastQueryTime?: number;
  lastContent?: string;
  lastContentQueryTime?: number;
  user?: User;
} 