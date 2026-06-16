// Service interfaces for business logic layer.

import {
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  RefundRequest,
  RefundResponse,
  PaymentRecord,
  PaginatedResponse,
} from '../types/payment.types';

export interface IPaymentService {
  createOrder(userId: string, planId: string, idempotencyKey: string, ip?: string, userAgent?: string): Promise<CreateOrderResponse>;
  verifyAndCapturePayment(userId: string, request: VerifyPaymentRequest, ip?: string, userAgent?: string): Promise<VerifyPaymentResponse>;
  getPayment(userId: string, paymentId: string): Promise<PaymentRecord>;
  getPaymentHistory(userId: string, page: number, limit: number, status?: string): Promise<PaginatedResponse<PaymentRecord>>;
}

export interface IRazorpayService {
  createOrder(params: { amount: number; currency: string; receipt: string; notes?: Record<string, string> }): Promise<{ id: string; amount: number; currency: string; status: string }>;
  verifyPaymentSignature(params: { order_id: string; payment_id: string; signature: string }): boolean;
  verifyWebhookSignature(rawBody: Buffer, signature: string): boolean;
  fetchPayment(razorpay_payment_id: string): Promise<Record<string, unknown>>;
  capturePayment(razorpay_payment_id: string, amount: number): Promise<Record<string, unknown>>;
  refundPayment(razorpay_payment_id: string, params: { amount: number; notes?: Record<string, string>; speed?: string }): Promise<Record<string, unknown>>;
}

export interface IRefundService {
  initiateRefund(userId: string, request: RefundRequest, ip?: string, userAgent?: string): Promise<RefundResponse>;
  handleRefundWebhook(refundData: Record<string, unknown>): Promise<void>;
}

export interface ICreditService {
  grantCredits(userId: string, amount: number, description: string, paymentId?: string): Promise<void>;
  deductCredits(userId: string, amount: number, description: string): Promise<number>;
  getUserBalance(userId: string): Promise<number>;
  purchaseCredits(userId: string, packageId: string, paymentId: string): Promise<void>;
  refundCredits(userId: string, originalDeduction: number, refundId: string): Promise<void>;
  checkSufficientCredits(userId: string, required: number): Promise<boolean>;
}

export interface IWebhookService {
  processWebhook(rawBody: Buffer, signature: string, payload: Record<string, unknown>): Promise<void>;
}

export interface ISubscriptionService {
  createSubscription(userId: string, planId: string): Promise<Record<string, unknown>>;
  cancelSubscription(userId: string, subscriptionId: string, cancelAtEnd: boolean): Promise<void>;
  handleSubscriptionWebhook(event: string, payload: Record<string, unknown>): Promise<void>;
}
