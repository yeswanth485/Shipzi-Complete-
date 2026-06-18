// Detailed payment flow modal.

'use client';

import React, { useEffect, useRef } from 'react';
import { usePayment } from '../../hooks/usePayment';
import { useUser } from '../../context/UserContext';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  planName: string;
  amount: number; // in paise
  onSuccess: (paymentId: string) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  planId,
  planName,
  amount,
  onSuccess,
}: PaymentModalProps) {
  const { userData, firebaseUser } = useUser();
  const { initiatePayment, retryPayment, isLoading, isSuccess, isError, isCancelled, error, paymentId } = usePayment({
    email: userData?.email || firebaseUser?.email || undefined,
    contact: firebaseUser?.phoneNumber || undefined,
  });
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onClose]);

  // Trigger onSuccess callback
  useEffect(() => {
    if (isSuccess && paymentId) {
      onSuccess(paymentId);
      // Don't auto-close here — parent handles closing after activation
    }
  }, [isSuccess, paymentId, onSuccess]);

  if (!isOpen) return null;

  const formatAmount = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={!isLoading ? onClose : undefined} />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Payment for ${planName}`}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden"
      >
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Processing payment...</p>
              <p className="text-gray-400 text-sm mt-1">Please do not close this window</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div className="absolute inset-0 bg-green-50 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Successful!</h3>
              <p className="text-gray-500 mt-1">Thank you for your purchase</p>
            </div>
          </div>
        )}

        {/* Failed State */}
        {isError && (
          <div className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Payment Failed</h3>
              <p className="text-gray-500 mt-1">{error || 'Something went wrong'}</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={retryPayment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancelled State */}
        {isCancelled && (
          <div className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">Payment Cancelled</h3>
              <p className="text-gray-500 mt-1">You cancelled the payment</p>
              <div className="flex gap-3 mt-6 justify-center">
                <button
                  onClick={retryPayment}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Default State - Plan Summary */}
        {!isLoading && !isSuccess && !isError && !isCancelled && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Complete Payment</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{planName}</p>
                  <p className="text-sm text-gray-500">Shipzi Subscription</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(amount)}</p>
              </div>
            </div>

            <button
              onClick={() => initiatePayment(planId)}
              className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Proceed to Pay {formatAmount(amount)}
            </button>

            <p className="text-xs text-gray-400 text-center mt-4">
              Secure payment powered by Razorpay
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
