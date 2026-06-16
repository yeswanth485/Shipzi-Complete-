// TypeScript types for all frontend payment operations.

export interface PaymentPlan {
  id: string;
  name: string;
  amount: number; // in paise
  currency: string;
  description: string;
  credits: number;
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

export interface PaymentRecord {
  id: string;
  user_id: string;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  payment_method: string | null;
  error_code: string | null;
  error_description: string | null;
  captured_at: string | null;
  created_at: string;
}

export interface PaymentHistoryResponse {
  success: boolean;
  data: PaymentRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RefundResponse {
  refund_id: string;
  status: string;
  amount: number;
  message: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes: Record<string, string>;
  config?: {
    display?: {
      blocks?: Record<string, {
        name: string;
        instruments: Array<{ method: string }>;
      }>;
      sequence?: string[];
      preferences?: {
        show_default_blocks?: boolean;
      };
    };
  };
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
    escape?: boolean;
  };
  theme?: {
    color?: string;
  };
}

export interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export type PaymentStatus = 'created' | 'attempted' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded';

export interface PaymentState {
  status: 'idle' | 'loading' | 'success' | 'failed' | 'cancelled';
  error: string | null;
  paymentId: string | null;
  orderId: string | null;
}

export interface PaymentApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
  details?: Array<{ field: string; message: string }>;
}
