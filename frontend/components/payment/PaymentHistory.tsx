// Show paginated list of user's past payments.

'use client';

import React, { useState, useEffect } from 'react';
import { paymentApi } from '../../services/paymentApi';
import { PaymentRecord, PaymentStatus } from '../../types/payment.types';

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
  refunded: 'bg-orange-100 text-orange-800',
  partially_refunded: 'bg-yellow-100 text-yellow-800',
  created: 'bg-blue-100 text-blue-800',
  attempted: 'bg-purple-100 text-purple-800',
};

export function PaymentHistory() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchPayments();
  }, [page]);

  async function fetchPayments() {
    setLoading(true);
    try {
      const response = await paymentApi.getPaymentHistory(page, 10);
      setPayments(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to fetch payment history');
    } finally {
      setLoading(false);
    }
  }

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatStatus = (status: string) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-20" />
        ))}
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">No payments yet</h3>
        <p className="text-gray-500 mt-1">Your payment history will appear here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
        <span className="text-sm text-gray-500">{total} payment{total !== 1 ? 's' : ''}</span>
      </div>

      <div className="space-y-3">
        {payments.map((payment) => (
          <div
            key={payment.id}
            className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                payment.status === 'paid' ? 'bg-green-100' : payment.status === 'failed' ? 'bg-red-100' : 'bg-gray-100'
              }`}>
                {payment.status === 'paid' ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : payment.status === 'failed' ? (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{payment.description || 'Payment'}</p>
                <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[payment.status as PaymentStatus] || 'bg-gray-100 text-gray-800'}`}>
                {formatStatus(payment.status)}
              </span>
              <span className="font-semibold text-gray-900">{formatAmount(payment.amount)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
