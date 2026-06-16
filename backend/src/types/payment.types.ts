// Complete TypeScript types for all payment operations.

export interface CreateOrderRequest {
  plan_id?: string;
  amount?: number; // Backend-calculated, not accepted from frontend
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  payment_id: string;
}

export interface RefundRequest {
  payment_id: string;
  amount?: number;
  reason: string;
  type: 'full' | 'partial';
}

export interface RefundResponse {
  refund_id: string;
  status: string;
  amount: number;
  message: string;
}

export interface WebhookPayload {
  event: string;
  payload: {
    payment?: { entity: RazorpayPaymentEntity };
    order?: { entity: RazorpayOrderEntity };
    refund?: { entity: RazorpayRefundEntity };
    subscription?: { entity: RazorpaySubscriptionEntity };
  };
}

export interface RazorpayPaymentEntity {
  id: string;
  entity: 'payment';
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  method: string;
  description: string;
  notes: Record<string, string>;
  created_at: number;
  error_code?: string;
  error_description?: string;
}

export interface RazorpayOrderEntity {
  id: string;
  entity: 'order';
  amount: number;
  currency: string;
  status: string;
  receipt: string;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpayRefundEntity {
  id: string;
  entity: 'refund';
  amount: number;
  currency: string;
  payment_id: string;
  status: string;
  notes: Record<string, string>;
  created_at: number;
}

export interface RazorpaySubscriptionEntity {
  id: string;
  entity: 'subscription';
  plan_id: string;
  status: string;
  current_start: number;
  current_end: number;
  created_at: number;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  notes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  idempotency_key: string;
  payment_method: string | null;
  error_code: string | null;
  error_description: string | null;
  captured_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RefundRecord {
  id: string;
  payment_id: string;
  user_id: string;
  razorpay_refund_id: string | null;
  amount: number;
  reason: string;
  status: string;
  type: string;
  notes: Record<string, unknown>;
  processed_at: string | null;
  failed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRecord {
  id: string;
  user_id: string | null;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface CreditRecord {
  id: string;
  user_id: string;
  payment_id: string | null;
  refund_id: string | null;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

export interface ApiError {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
