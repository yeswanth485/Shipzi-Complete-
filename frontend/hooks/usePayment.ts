// Core payment hook. Manages entire payment state machine.

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { paymentApi } from '../services/paymentApi';
import { loadRazorpay } from '../utils/loadRazorpay';
import { PaymentState, RazorpayCheckoutOptions, RazorpayResponse, VerifyPaymentRequest } from '../types/payment.types';

export function usePayment(userInfo?: { email?: string; contact?: string }) {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: 'idle',
    error: null,
    paymentId: null,
    orderId: null,
  });

  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const lastOrderRef = useRef<string | null>(null);

  // Pre-load Razorpay script
  useEffect(() => {
    loadRazorpay().then(setIsScriptLoaded);
  }, []);

  const initiatePayment = useCallback(
    async (planId: string) => {
      setPaymentState({ status: 'loading', error: null, paymentId: null, orderId: null });

      try {
        // Step 1: Create order on backend
        const order = await paymentApi.createOrder(planId);
        lastOrderRef.current = order.order_id;

        // Step 2: Load Razorpay script if not loaded
        if (!isScriptLoaded) {
          const loaded = await loadRazorpay();
          if (!loaded) {
            setPaymentState((prev) => ({
              ...prev,
              status: 'failed',
              error: 'Failed to load payment gateway. Please check your connection.',
            }));
            return;
          }
        }

        // Step 3: Open Razorpay checkout modal
        const options: RazorpayCheckoutOptions = {
          key: order.key_id,
          amount: order.amount,
          currency: order.currency,
          name: 'Shipzi',
          description: `Payment for ${planId}`,
          order_id: order.order_id,
          handler: async (response: RazorpayResponse) => {
            // Step 4: Verify payment on backend
            try {
              const verifyData: VerifyPaymentRequest = {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              };

              const result = await paymentApi.verifyPayment(verifyData);
              setPaymentState({
                status: 'success',
                error: null,
                paymentId: result.payment_id,
                orderId: order.order_id,
              });
            } catch (verifyError) {
              setPaymentState({
                status: 'failed',
                error: (verifyError as Error).message || 'Payment verification failed',
                paymentId: null,
                orderId: order.order_id,
              });
            }
          },
          prefill: {
            contact: userInfo?.contact || '',
            email: userInfo?.email || '',
          },
          notes: { plan_id: planId },
          config: {
            display: {
              blocks: {
                utib: {
                  name: 'Pay using UPI / Cards / Wallets',
                  instruments: [
                    { method: 'upi' },
                    { method: 'card' },
                    { method: 'wallet' },
                    { method: 'netbanking' },
                  ],
                },
              },
              sequence: ['block.utib'],
              preferences: {
                show_default_blocks: true,
              },
            },
          },
          modal: {
            ondismiss: () => {
              setPaymentState((prev) => ({
                ...prev,
                status: 'cancelled',
                error: 'Payment cancelled by user',
              }));
            },
            confirm_close: true,
            escape: true,
          },
          theme: {
            color: '#6366f1',
          },
        };

        const razorpay = new window.Razorpay(options);
        razorpay.on('payment.failed', (response: any) => {
          setPaymentState({
            status: 'failed',
            error: response.error?.description || 'Payment failed',
            paymentId: null,
            orderId: order.order_id,
          });
        });

        razorpay.open();
      } catch (error) {
        setPaymentState({
          status: 'failed',
          error: (error as Error).message || 'Failed to initiate payment',
          paymentId: null,
          orderId: null,
        });
      }
    },
    [isScriptLoaded, userInfo]
  );

  const refundPayment = useCallback(async (paymentId: string, reason: string) => {
    try {
      const result = await paymentApi.initiateRefund(paymentId, reason);
      return result;
    } catch (error) {
      throw error;
    }
  }, []);

  const retryPayment = useCallback(() => {
    setPaymentState({ status: 'idle', error: null, paymentId: null, orderId: lastOrderRef.current });
  }, []);

  const resetState = useCallback(() => {
    setPaymentState({ status: 'idle', error: null, paymentId: null, orderId: null });
    lastOrderRef.current = null;
  }, []);

  return {
    initiatePayment,
    refundPayment,
    retryPayment,
    resetState,
    paymentState,
    isLoading: paymentState.status === 'loading',
    isSuccess: paymentState.status === 'success',
    isError: paymentState.status === 'failed',
    isCancelled: paymentState.status === 'cancelled',
    error: paymentState.error,
    paymentId: paymentState.paymentId,
  };
}
