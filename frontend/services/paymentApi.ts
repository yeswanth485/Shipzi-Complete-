// All API calls to Shipzi backend.

import {
  CreateOrderResponse,
  VerifyPaymentRequest,
  VerifyPaymentResponse,
  PaymentRecord,
  PaymentHistoryResponse,
  RefundResponse,
  PaymentApiResponse,
} from '../types/payment.types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch {
    return null;
  }
}

function generateIdempotencyKey(): string {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  includeAuth = true
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  if (method === 'POST') {
    headers['X-Idempotency-Key'] = generateIdempotencyKey();
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as PaymentApiResponse;
    throw new Error(error.error || error.message || `API error: ${response.status}`);
  }

  return data as T;
}

export const paymentApi = {
  async createOrder(planId: string): Promise<CreateOrderResponse> {
    const response = await apiRequest<PaymentApiResponse<CreateOrderResponse>>(
      'POST',
      '/api/payment/create-order',
      { plan_id: planId }
    );
    if (!response.data) throw new Error(response.error || 'Failed to create order');
    return response.data;
  },

  async verifyPayment(data: VerifyPaymentRequest): Promise<VerifyPaymentResponse> {
    const response = await apiRequest<PaymentApiResponse<VerifyPaymentResponse>>(
      'POST',
      '/api/payment/verify',
      data
    );
    if (!response.data) throw new Error(response.error || 'Failed to verify payment');
    return response.data;
  },

  async initiateRefund(paymentId: string, reason: string): Promise<RefundResponse> {
    const response = await apiRequest<PaymentApiResponse<RefundResponse>>(
      'POST',
      '/api/payment/refund',
      { payment_id: paymentId, reason, type: 'full' }
    );
    if (!response.data) throw new Error(response.error || 'Failed to initiate refund');
    return response.data;
  },

  async getPaymentHistory(page: number = 1, limit: number = 20): Promise<PaymentHistoryResponse> {
    const response = await apiRequest<PaymentHistoryResponse>(
      'GET',
      `/api/payment/history?page=${page}&limit=${limit}`
    );
    return response;
  },

  async getPayment(paymentId: string): Promise<PaymentRecord> {
    const response = await apiRequest<PaymentApiResponse<PaymentRecord>>(
      'GET',
      `/api/payment/${paymentId}`
    );
    if (!response.data) throw new Error(response.error || 'Payment not found');
    return response.data;
  },
};
