// Repository interfaces for data access layer.

import { PaymentRecord, RefundRecord, AuditLogRecord, CreditRecord } from '../types/payment.types';

export interface CreatePaymentData {
  user_id: string;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  notes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  idempotency_key: string;
}

export interface IPaymentRepository {
  create(data: CreatePaymentData): Promise<PaymentRecord>;
  findById(id: string): Promise<PaymentRecord | null>;
  findByOrderId(razorpay_order_id: string): Promise<PaymentRecord | null>;
  findByPaymentId(razorpay_payment_id: string): Promise<PaymentRecord | null>;
  findByIdempotencyKey(key: string): Promise<PaymentRecord | null>;
  updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<PaymentRecord>;
  findByUserId(user_id: string, page: number, limit: number): Promise<{ data: PaymentRecord[]; total: number }>;
  markCaptured(id: string, razorpay_payment_id: string, signature: string, payment_method?: string): Promise<PaymentRecord>;
  markFailed(id: string, error_code: string, error_description: string): Promise<PaymentRecord>;
}

export interface CreateRefundData {
  payment_id: string;
  user_id: string;
  amount: number;
  reason: string;
  type: string;
  notes?: Record<string, unknown>;
}

export interface IRefundRepository {
  create(data: CreateRefundData): Promise<RefundRecord>;
  findById(id: string): Promise<RefundRecord | null>;
  findByPaymentId(payment_id: string): Promise<RefundRecord[]>;
  findByRazorpayRefundId(razorpay_refund_id: string): Promise<RefundRecord | null>;
  updateStatus(id: string, status: string, extra?: Record<string, unknown>): Promise<RefundRecord>;
  getTotalRefundedAmount(payment_id: string): Promise<number>;
}

export interface AuditLogInput {
  user_id?: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, unknown>;
}

export interface IAuditRepository {
  log(data: AuditLogInput): Promise<AuditLogRecord>;
  findByEntity(entity_type: string, entity_id: string, page: number, limit: number): Promise<{ data: AuditLogRecord[]; total: number }>;
  findByUser(user_id: string, page: number, limit: number): Promise<{ data: AuditLogRecord[]; total: number }>;
}

export interface CreateCreditData {
  user_id: string;
  payment_id?: string;
  refund_id?: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  expires_at?: string;
  metadata?: Record<string, unknown>;
}

export interface ICreditRepository {
  addCredits(data: CreateCreditData): Promise<CreditRecord>;
  deductCredits(data: CreateCreditData): Promise<CreditRecord>;
  getUserBalance(user_id: string): Promise<number>;
  getHistory(user_id: string, page: number, limit: number): Promise<{ data: CreditRecord[]; total: number }>;
}

export interface WebhookEventData {
  event_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
}

export interface IWebhookRepository {
  findByEventId(event_id: string): Promise<{ id: string; status: string; retry_count: number } | null>;
  create(data: WebhookEventData): Promise<{ id: string }>;
  markProcessed(id: string): Promise<void>;
  markFailed(id: string, error_message: string): Promise<void>;
  markDeadLetter(id: string): Promise<void>;
  updateRetryCount(id: string): Promise<void>;
}
