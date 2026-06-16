// Unit tests for webhook.service.ts

import { webhookService } from '../../services/webhook.service';
import { razorpayService } from '../../services/razorpay.service';
import { webhookRepository } from '../../repositories/webhook.repository';
import { paymentRepository } from '../../repositories/payment.repository';
import { auditRepository } from '../../repositories/audit.repository';
import { refundService } from '../../services/refund.service';

jest.mock('../../services/razorpay.service');
jest.mock('../../repositories/webhook.repository');
jest.mock('../../repositories/payment.repository');
jest.mock('../../repositories/audit.repository');
jest.mock('../../services/refund.service');
jest.mock('../../config/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
  createChildLogger: () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }),
}));

const mockRazorpayService = razorpayService as jest.Mocked<typeof razorpayService>;
const mockWebhookRepository = webhookRepository as jest.Mocked<typeof webhookRepository>;
const mockPaymentRepository = paymentRepository as jest.Mocked<typeof paymentRepository>;
const mockAuditRepository = auditRepository as jest.Mocked<typeof auditRepository>;
const mockRefundService = refundService as jest.Mocked<typeof refundService>;

describe('webhookService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processWebhook', () => {
    it('should process valid webhook with correct signature', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookRepository.findByEventId.mockResolvedValue(null);
      mockWebhookRepository.create.mockResolvedValue({ id: 'event-uuid-1' });
      mockWebhookRepository.markProcessed.mockResolvedValue(undefined);
      mockAuditRepository.log.mockResolvedValue({} as any);

      await webhookService.processWebhook(
        Buffer.from('{}'),
        'valid_signature',
        { event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_123', id: 'pay_123', method: 'upi' } } } } as any
      );

      expect(mockRazorpayService.verifyWebhookSignature).toHaveBeenCalled();
      expect(mockWebhookRepository.markProcessed).toHaveBeenCalledWith('event-uuid-1');
    });

    it('should reject webhook with invalid signature silently', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(false);

      await webhookService.processWebhook(
        Buffer.from('{}'),
        'invalid_signature',
        { event: 'payment.captured', payload: {} } as any
      );

      expect(mockWebhookRepository.create).not.toHaveBeenCalled();
    });

    it('should skip duplicate events', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookRepository.findByEventId.mockResolvedValue({
        id: 'existing-event',
        status: 'processed',
      });

      await webhookService.processWebhook(
        Buffer.from('{}'),
        'valid_signature',
        { event: 'payment.captured', payload: {} } as any
      );

      expect(mockWebhookRepository.create).not.toHaveBeenCalled();
    });

    it('should handle payment.failed event', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookRepository.findByEventId.mockResolvedValue(null);
      mockWebhookRepository.create.mockResolvedValue({ id: 'event-uuid-2' });
      mockWebhookRepository.markProcessed.mockResolvedValue(undefined);
      mockAuditRepository.log.mockResolvedValue({} as any);
      mockPaymentRepository.findByOrderId.mockResolvedValue({
        id: 'payment-1',
        user_id: 'user-1',
      } as any);
      mockPaymentRepository.markFailed.mockResolvedValue({} as any);

      await webhookService.processWebhook(
        Buffer.from('{}'),
        'valid_signature',
        {
          event: 'payment.failed',
          payload: {
            payment: {
              entity: {
                order_id: 'order_123',
                error_code: 'CARD_EXPIRED',
                error_description: 'Card has expired',
              },
            },
          },
        } as any
      );

      expect(mockPaymentRepository.markFailed).toHaveBeenCalled();
    });

    it('should handle refund events', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookRepository.findByEventId.mockResolvedValue(null);
      mockWebhookRepository.create.mockResolvedValue({ id: 'event-uuid-3' });
      mockWebhookRepository.markProcessed.mockResolvedValue(undefined);
      mockAuditRepository.log.mockResolvedValue({} as any);
      mockRefundService.handleRefundWebhook.mockResolvedValue(undefined);

      await webhookService.processWebhook(
        Buffer.from('{}'),
        'valid_signature',
        {
          event: 'refund.processed',
          payload: {
            refund: {
              entity: { id: 'rfnd_123', status: 'processed' },
            },
          },
        } as any
      );

      expect(mockRefundService.handleRefundWebhook).toHaveBeenCalled();
    });

    it('should mark events as dead letter after max retries', async () => {
      mockRazorpayService.verifyWebhookSignature.mockReturnValue(true);
      mockWebhookRepository.findByEventId.mockResolvedValue(null);
      mockWebhookRepository.create.mockResolvedValue({ id: 'event-uuid-4' });
      mockWebhookRepository.markFailed.mockResolvedValue(undefined);
      mockWebhookRepository.updateRetryCount.mockResolvedValue(undefined);
      mockWebhookRepository.markDeadLetter.mockResolvedValue(undefined);
      mockAuditRepository.log.mockResolvedValue({} as any);
      mockPaymentRepository.findByOrderId.mockRejectedValue(new Error('DB error'));

      await webhookService.processWebhook(
        Buffer.from('{}'),
        'valid_signature',
        {
          event: 'payment.captured',
          payload: { payment: { entity: { order_id: 'order_123' } } },
        } as any
      );

      expect(mockWebhookRepository.markFailed).toHaveBeenCalled();
    });
  });
});
