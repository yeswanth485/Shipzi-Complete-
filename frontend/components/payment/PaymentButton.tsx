// Reusable payment trigger button.

'use client';

import React from 'react';
import { usePayment } from '../../hooks/usePayment';

interface PaymentButtonProps {
  planId: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (paymentId: string) => void;
  onFailure?: (error: string) => void;
}

export function PaymentButton({
  planId,
  label = 'Pay Now',
  className = '',
  disabled = false,
  onSuccess,
  onFailure,
}: PaymentButtonProps) {
  const { initiatePayment, isLoading, isSuccess, isError, isCancelled, error, paymentId } = usePayment();

  const handleClick = async () => {
    await initiatePayment(planId);
  };

  // Trigger callbacks
  React.useEffect(() => {
    if (isSuccess && paymentId) {
      onSuccess?.(paymentId);
    }
    if (isError && error) {
      onFailure?.(error);
    }
  }, [isSuccess, isError, paymentId, error, onSuccess, onFailure]);

  if (isSuccess) {
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center px-6 py-3 rounded-lg bg-green-500 text-white font-medium ${className}`}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Payment Successful
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      aria-disabled={disabled || isLoading}
      aria-label={isLoading ? 'Processing payment' : label}
      className={`inline-flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
        isLoading
          ? 'bg-indigo-400 text-white cursor-not-allowed'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Processing...
        </>
      ) : (
        label
      )}
    </button>
  );
}
