import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

/**
 * Bank Reward Service — System-initiated transfers only.
 *
 * This is the ONLY exported service from BankModule.
 * It handles reward/system transfers (task completion, UBI, governance payouts).
 *
 * CONSTRAINTS:
 * - NEVER exposes balance queries or history
 * - NEVER returns financial data to callers
 * - All transfers are recorded with bankRef (resolves userId → bankRef internally)
 * - Logs use bankRef only, never userId
 */
@Injectable()
export class BankRewardService {
  private readonly logger = new Logger(BankRewardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Transfer ALTAN as a system reward (e.g., task completion).
   * Resolves userId → bankRef internally. The caller only knows userId.
   *
   * @param fromUserId - The user funding the reward
   * @param toUserId - The user receiving the reward
   * @param amount - Amount to transfer
   * @param type - Transaction type (REWARD, UBI, PAYOUT, etc.)
   * @param memo - Optional memo
   */
  async transferReward(
    fromUserId: string,
    toUserId: string,
    amount: number,
    type: TransactionType = TransactionType.REWARD,
    memo?: string,
  ): Promise<{ transactionId: string; status: string }> {
    if (amount <= 0) {
      throw new BadRequestException('Reward amount must be positive');
    }

    if (fromUserId === toUserId) {
      throw new BadRequestException('Cannot reward self');
    }

    // Resolve bankRefs from userIds
    const [senderLink, recipientLink] = await Promise.all([
      this.prisma.bankLink.findUnique({ where: { userId: fromUserId }, select: { bankRef: true } }),
      this.prisma.bankLink.findUnique({ where: { userId: toUserId }, select: { bankRef: true } }),
    ]);

    const senderBankRef = senderLink?.bankRef || null;
    const recipientBankRef = recipientLink?.bankRef || null;

    return this.prisma.$transaction(async (tx) => {
      // Check sender balance
      const senderLedger = await tx.altanLedger.findUnique({
        where: { userId: fromUserId },
      });

      if (!senderLedger || Number(senderLedger.balance) < amount) {
        throw new BadRequestException('Insufficient balance for reward');
      }

      // Debit sender
      await tx.altanLedger.update({
        where: { userId: fromUserId },
        data: { balance: { decrement: amount } },
      });

      // Credit recipient (create ledger if not exists)
      const recipientLedger = await tx.altanLedger.findUnique({
        where: { userId: toUserId },
      });

      if (recipientLedger) {
        await tx.altanLedger.update({
          where: { userId: toUserId },
          data: { balance: { increment: amount } },
        });
      } else {
        await tx.altanLedger.create({
          data: { userId: toUserId, balance: amount },
        });
      }

      // Record transaction with both userId and bankRef (dual-write for transition)
      const transaction = await tx.altanTransaction.create({
        data: {
          fromUserId,
          toUserId,
          fromBankRef: senderBankRef,
          toBankRef: recipientBankRef,
          amount,
          type,
          status: 'COMPLETED',
          memo: memo || null,
        },
      });

      // Log with bankRef only (privacy)
      this.logger.log(
        `Reward: ${senderBankRef?.substring(0, 8) || '???'}... → ${recipientBankRef?.substring(0, 8) || '???'}... | amount=${amount} type=${type}`,
      );

      return {
        transactionId: transaction.id,
        status: 'COMPLETED',
      };
    });
  }
}
