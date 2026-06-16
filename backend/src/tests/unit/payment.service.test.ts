// Unit tests for payment.service.ts

import { paymentService } from '../../services/payment.service';
import { paymentRepository } from '../../repositories/payment.repository';
import { auditRepository } from '../../repositories/audit.repository';
import { razorpayService } from '../../services/razorpay.service';

jest.mock('../../repositories/payment.repository');
jest.mock('../../repositories/audit.repository');
jest.mock('../../services/razorpay.service');
jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const mockPaymentRepository = paymentRepository as jest.Mocked<typeof paymentRepository>;
const mockAuditRepository = auditRepository as jest.Mocked<typeof auditRepository>;
const mockRazorpayService = razorpayService as jest.Mocked<typeof razorpayService>;

describe('paymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder', () => {
    it('should create a new order successfully', async () => {
      mockPaymentRepository.findByIdempotencyKey.mockResolvedValue(null);
      mockRazorpayService.createOrder.mockResolvedValue({
        id: 'order_test_123',
        amount: 99900,
        currency: 'INR',
        status: 'created',
      });
      mockPaymentRepository.create.mockResolvedValue({
        id: 'payment-uuid-1',
        razorpay_order_id: 'order_test_123',
        amount: 99900,
        status: 'created',
      } as any);
      mockAuditRepository.log.mockResolvedValue({} as any);

      const result = await paymentService.createOrder(
        'user-uuid-1',
        'pro_monthly',
        'idem-test-123'
      );

      expect(result.order_id).toBe('order_test_123');
      expect(result.amount).toBe(99900);
      expect(mockPaymentRepository.create).toHaveBeenCalled();
      expect(mockAuditRepository.log).toHaveBeenCalled();
    });

    it('should return existing order for idempotency', async () => {
      mockPaymentRepository.findByIdempotencyKey.mockResolvedValue({
        id: 'payment-uuid-1',
        razorpay_order_id: 'order_existing',
        amount: 99900,
        currency: 'INR',
      } as any);

      const result = await paymentService.createOrder(
        'user-uuid-1',
        'pro_monthly',
        'idem-existing'
      );

      expect(result.order_id).toBe('order_existing');
      expect(mockRazorpayService.createOrder).not.toHaveBeenCalled();
    });

    it('should throw error for unknown plan', async () => {
      mockPaymentRepository.findByIdempotencyKey.mockResolvedValue(null);

      await expect(
        paymentService.createOrder('user-uuid-1', 'unknown_plan', 'idem-123')
      ).rejects.toThrow('Unknown plan');
    });
  });

  describe('verifyAndCapturePayment', () => {
    it('should verify and capture payment successfully', async () => {
      mockPaymentRepository.findByOrderId.mockResolvedValue({
        id: 'payment-uuid-1',
        user_id: 'user-uuid-1',
        status: 'created',
        razorpay_order_id: 'order_test_123',
      } as any);
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(true);
      mockPaymentRepository.markCaptured.mockResolvedValue({
        id: 'payment-uuid-1',
        status: 'paid',
      } as any);
      mockRazorpayService.fetchPayment.mockResolvedValue({
        id: 'pay_test_456',
        method: 'upi',
      });
      mockPaymentRepository.updateStatus.mockResolvedValue({} as any);
      mockAuditRepository.log.mockResolvedValue({} as any);

      const result = await paymentService.verifyAndCapturePayment(
        'user-uuid-1',
        {
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'valid_signature',
        }
      );

      expect(result.success).toBe(true);
      expect(mockPaymentRepository.markCaptured).toHaveBeenCalled();
    });

    it('should reject invalid signature', async () => {
      mockPaymentRepository.findByOrderId.mockResolvedValue({
        id: 'payment-uuid-1',
        user_id: 'user-uuid-1',
        status: 'created',
      } as any);
      mockRazorpayService.verifyPaymentSignature.mockReturnValue(false);
      mockPaymentRepository.markFailed.mockResolvedValue({} as any);
      mockAuditRepository.log.mockResolvedValue({} as any);

      await expect(
        paymentService.verifyAndCapturePayment('user-uuid-1', {
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'invalid_signature',
        })
      ).rejects.toThrow('Invalid payment signature');
    });

    it('should reject unauthorized user', async () => {
      mockPaymentRepository.findByOrderId.mockResolvedValue({
        id: 'payment-uuid-1',
        user_id: 'different-user',
        status: 'created',
      } as any);

      await expect(
        paymentService.verifyAndCapturePayment('user-uuid-1', {
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'sig',
        })
      ).rejects.toThrow('Unauthorized');
    });

    it('should reject payment in wrong status', async () => {
      mockPaymentRepository.findByOrderId.mockResolvedValue({
        id: 'payment-uuid-1',
        user_id: 'user-uuid-1',
        status: 'paid',
      } as any);

      await expect(
        paymentService.verifyAndCapturePayment('user-uuid-1', {
          razorpay_order_id: 'order_test_123',
          razorpay_payment_id: 'pay_test_456',
          razorpay_signature: 'sig',
        })
      ).rejects.toThrow("Payment is in 'paid' state");
    });
  });

  describe('getPayment', () => {
    it('should return payment for authorized user', async () => {
      mockPaymentRepository.findById.mockResolvedValue({
        id: 'payment-uuid-1',
        user_id: 'user-uuid-1',
      } as any);

      const result = await paymentService.getPayment('user-uuid-1', 'payment-uuid-1');
      expect(result.id).toBe('payment-uuid-1');
    });

    it('should throw for unauthorized user', async () => {
      mockPaymentRepository.findById.mockResolvedValue({
        id: 'payment-uuid-1',
        user_id: 'different-user',
      } as any);

      await expect(
        paymentService.getPayment('user-uuid-1', 'payment-uuid-1')
      ).rejects.toThrow('Unauthorized');
    });

    it('should throw for non-existent payment', async () => {
      mockPaymentRepository.findById.mockResolvedValue(null);

      await expect(
        paymentService.getPayment('user-uuid-1', 'non-existent')
      ).rejects.toThrow('Payment not found');
    });
  });
});
