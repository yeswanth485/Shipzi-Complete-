// Single payment detail view.

'use client';

import React, { useState, useEffect } from 'react';
import { paymentApi } from '../../services/paymentApi';
import { PaymentRecord } from '../../types/payment.types';

interface PaymentStatusProps {
  paymentId: string;
}

export function PaymentStatus({ paymentId }: PaymentStatusProps) {
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayment();
  }, [paymentId]);

  async function fetchPayment() {
    setLoading(true);
    try {
      const data = await paymentApi.getPayment(paymentId);
      setPayment(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="animate-pulse bg-gray-100 rounded-xl h-64" />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!payment) return null;

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusColor: Record<string, string> = {
    paid: 'text-green-600 bg-green-50',
    failed: 'text-red-600 bg-red-50',
    cancelled: 'text-gray-600 bg-gray-50',
    refunded: 'text-orange-600 bg-orange-50',
    partially_refunded: 'text-yellow-600 bg-yellow-50',
    created: 'text-blue-600 bg-blue-50',
    attempted: 'text-purple-600 bg-purple-50',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Payment Details</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor[payment.status] || 'text-gray-600 bg-gray-50'}`}>
          {payment.status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Amount</p>
          <p className="text-lg font-semibold text-gray-900">{formatAmount(payment.amount)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Currency</p>
          <p className="text-lg font-semibold text-gray-900">{payment.currency}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Date</p>
          <p className="text-sm text-gray-900">{formatDate(payment.created_at)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Payment Method</p>
          <p className="text-sm text-gray-900 capitalize">{payment.payment_method || 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Description</p>
          <p className="text-sm text-gray-900">{payment.description || 'N/A'}</p>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-500">Order ID</p>
          <p className="text-xs font-mono text-gray-600 break-all">{payment.razorpay_order_id}</p>
        </div>
        {payment.razorpay_payment_id && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Payment ID</p>
            <p className="text-xs font-mono text-gray-600 break-all">{payment.razorpay_payment_id}</p>
          </div>
        )}
        {payment.error_code && (
          <div className="col-span-2">
            <p className="text-sm text-gray-500">Error</p>
            <p className="text-sm text-red-600">{payment.error_code}: {payment.error_description}</p>
          </div>
        )}
        {payment.captured_at && (
          <div>
            <p className="text-sm text-gray-500">Captured At</p>
            <p className="text-sm text-gray-900">{formatDate(payment.captured_at)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
