// AI credit transactions — balance derived by summing amount per user.

import { creditRepository } from '../repositories/credit.repository';
import { auditRepository } from '../repositories/audit.repository';
import { createChildLogger } from '../config/logger';
import { AppError } from '../middlewares/error.middleware';
import { CREDIT_TYPES, AUDIT_ACTIONS } from '../constants/payment.constants';
import { CREDIT_PACKAGES, getCreditPackageById } from '../constants/plans.constants';

const logger = createChildLogger('credit-service');

export const creditService = {
  async grantCredits(
    userId: string,
    amount: number,
    description: string,
    paymentId?: string
  ): Promise<void> {
    const currentBalance = await creditRepository.getUserBalance(userId);
    const newBalance = currentBalance + amount;

    await creditRepository.addCredits({
      user_id: userId,
      payment_id: paymentId,
      type: CREDIT_TYPES.PURCHASE,
      amount,
      balance_after: newBalance,
      description,
    });

    await auditRepository.log({
      user_id: userId,
      actor: 'system',
      action: AUDIT_ACTIONS.CREDIT_GRANTED,
      entity_type: 'credit',
      entity_id: userId,
      new_data: { amount, balance_after: newBalance, description },
    });

    logger.info('Credits granted', { userId, amount, balance: newBalance });
  },

  async deductCredits(
    userId: string,
    amount: number,
    description: string
  ): Promise<number> {
    const balance = await creditRepository.getUserBalance(userId);
    if (balance < amount) {
      throw new AppError(
        `Insufficient credits: have ${balance}, need ${amount}`,
        400
      );
    }

    const newBalance = balance - amount;

    await creditRepository.deductCredits({
      user_id: userId,
      type: CREDIT_TYPES.DEDUCTION,
      amount,
      balance_after: newBalance,
      description,
    });

    await auditRepository.log({
      user_id: userId,
      actor: 'system',
      action: AUDIT_ACTIONS.CREDIT_DEDUCTED,
      entity_type: 'credit',
      entity_id: userId,
      new_data: { amount, balance_after: newBalance, description },
    });

    logger.info('Credits deducted', { userId, amount, balance: newBalance });
    return newBalance;
  },

  async getUserBalance(userId: string): Promise<number> {
    return creditRepository.getUserBalance(userId);
  },

  async purchaseCredits(
    userId: string,
    packageId: string,
    paymentId: string
  ): Promise<void> {
    const pkg = getCreditPackageById(packageId);
    if (!pkg) {
      throw new AppError(`Unknown credit package: ${packageId}`, 400);
    }

    const balance = await creditRepository.getUserBalance(userId);
    const newBalance = balance + pkg.credits;

    await creditRepository.addCredits({
      user_id: userId,
      payment_id: paymentId,
      type: CREDIT_TYPES.PURCHASE,
      amount: pkg.credits,
      balance_after: newBalance,
      description: `Purchased ${pkg.name}: ${pkg.credits} credits`,
    });

    await auditRepository.log({
      user_id: userId,
      actor: 'system',
      action: AUDIT_ACTIONS.CREDIT_GRANTED,
      entity_type: 'credit',
      entity_id: userId,
      new_data: { package_id: packageId, credits: pkg.credits, payment_id: paymentId },
    });

    logger.info('Credit package purchased', { userId, packageId, credits: pkg.credits });
  },

  async refundCredits(
    userId: string,
    originalDeduction: number,
    refundId: string
  ): Promise<void> {
    const balance = await creditRepository.getUserBalance(userId);
    const newBalance = balance + originalDeduction;

    await creditRepository.addCredits({
      user_id: userId,
      refund_id: refundId,
      type: CREDIT_TYPES.REFUND,
      amount: originalDeduction,
      balance_after: newBalance,
      description: `Credit refund: ${originalDeduction} credits restored`,
    });

    await auditRepository.log({
      user_id: userId,
      actor: 'system',
      action: AUDIT_ACTIONS.CREDIT_GRANTED,
      entity_type: 'credit',
      entity_id: userId,
      new_data: { amount: originalDeduction, refund_id: refundId },
    });

    logger.info('Credits refunded', { userId, amount: originalDeduction, refundId });
  },

  async checkSufficientCredits(userId: string, required: number): Promise<boolean> {
    const balance = await creditRepository.getUserBalance(userId);
    if (balance < required) {
      throw new AppError(
        `Insufficient credits: have ${balance}, need ${required}`,
        400
      );
    }
    return true;
  },

  async getCreditHistory(userId: string, page: number = 1, limit: number = 20) {
    return creditRepository.getHistory(userId, page, limit);
  },
};
