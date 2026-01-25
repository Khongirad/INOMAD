import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankFeeService } from './bank-fee.service';

/**
 * Bank Service.
 *
 * Handles financial operations: balance queries, transfers, history.
 * All operations use bankRef (opaque ID) — NEVER userId.
 *
 * INSTITUTIONAL FIREWALL:
 * - Does NOT import or use AuthService/AuthModule
 * - Does NOT log userId alongside financial data
 * - All queries are bankRef-indexed
 */
@Injectable()
export class BankService {
  private readonly logger = new Logger(BankService.name);

  constructor(
    private prisma: PrismaService,
    private feeService: BankFeeService,
  ) {}

  /**
   * Get balance for a bankRef.
   */
  async getBalance(bankRef: string): Promise<{ balance: string; lastSyncedAt: string | null }> {
    const ledger = await this.prisma.altanLedger.findFirst({
      where: { id: bankRef },
    });

    if (!ledger) {
      // Check if bankRef maps to a userId-based ledger (backward compat)
      const bankLink = await this.prisma.bankLink.findFirst({
        where: { bankRef },
      });

      if (bankLink) {
        const userLedger = await this.prisma.altanLedger.findUnique({
          where: { userId: bankLink.userId },
        });
        if (userLedger) {
          return {
            balance: userLedger.balance.toString(),
            lastSyncedAt: userLedger.lastSyncedAt?.toISOString() || null,
          };
        }
      }

      return { balance: '0', lastSyncedAt: null };
    }

    return {
      balance: ledger.balance.toString(),
      lastSyncedAt: ledger.lastSyncedAt?.toISOString() || null,
    };
  }

  /**
   * Get transaction history for a bankRef.
   * Returns transactions with bankRef pairs (no userId leakage).
   */
  async getHistory(bankRef: string, limit = 50) {
    // Query by bankRef columns first (new path), fallback to userId-based
    const bankLink = await this.prisma.bankLink.findFirst({
      where: { bankRef },
      select: { userId: true },
    });

    if (!bankLink) {
      return [];
    }

    const transactions = await this.prisma.altanTransaction.findMany({
      where: {
        OR: [
          { fromBankRef: bankRef },
          { toBankRef: bankRef },
          // Fallback for legacy transactions without bankRef
          { fromUserId: bankLink.userId, fromBankRef: null },
          { toUserId: bankLink.userId, toBankRef: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        type: true,
        status: true,
        txHash: true,
        memo: true,
        createdAt: true,
        fromBankRef: true,
        toBankRef: true,
        fromUserId: true,
        toUserId: true,
      },
    });

    // For legacy transactions without bankRef, resolve via BankLink
    const legacyUserIds = new Set<string>();
    transactions.forEach((tx) => {
      if (!tx.fromBankRef && tx.fromUserId) legacyUserIds.add(tx.fromUserId);
      if (!tx.toBankRef && tx.toUserId) legacyUserIds.add(tx.toUserId);
    });

    const legacyLinks = legacyUserIds.size > 0
      ? await this.prisma.bankLink.findMany({
          where: { userId: { in: Array.from(legacyUserIds) } },
          select: { userId: true, bankRef: true },
        })
      : [];

    const userIdToBankRef = new Map<string, string>();
    legacyLinks.forEach((bl) => userIdToBankRef.set(bl.userId, bl.bankRef));

    return transactions.map((tx) => {
      const senderRef = tx.fromBankRef || (tx.fromUserId ? userIdToBankRef.get(tx.fromUserId) : null) || 'SYSTEM';
      const recipientRef = tx.toBankRef || (tx.toUserId ? userIdToBankRef.get(tx.toUserId) : null) || 'SYSTEM';
      const isOutgoing = senderRef === bankRef;

      return {
        id: tx.id,
        amount: tx.amount.toString(),
        type: tx.type,
        status: tx.status,
        txHash: tx.txHash,
        memo: tx.memo,
        createdAt: tx.createdAt.toISOString(),
        direction: isOutgoing ? 'OUT' : 'IN',
        counterpartyBankRef: isOutgoing ? recipientRef : senderRef,
      };
    });
  }

  /**
   * Transfer funds between bankRefs.
   * Includes 0.03% fee to INOMAD INC.
   *
   * PRIVACY: Logs use bankRef only.
   */
  async transfer(
    senderBankRef: string,
    recipientBankRef: string,
    amount: number,
    memo?: string,
  ) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (senderBankRef === recipientBankRef) {
      throw new BadRequestException('Cannot transfer to same account');
    }

    // Resolve userId from bankRef (backward compat with current schema)
    const senderLink = await this.prisma.bankLink.findFirst({
      where: { bankRef: senderBankRef },
      select: { userId: true },
    });
    if (!senderLink) {
      throw new NotFoundException('Sender bank account not found');
    }

    const recipientLink = await this.prisma.bankLink.findFirst({
      where: { bankRef: recipientBankRef },
      select: { userId: true },
    });
    if (!recipientLink) {
      throw new NotFoundException('Recipient bank account not found');
    }

    // Compute fee — validate fee account exists BEFORE transaction
    let fee = this.feeService.computeFee(amount);
    let inomadLink: { userId: string } | null = null;

    if (fee > 0 && this.feeService.isEnabled()) {
      const inomadBankRef = this.feeService.getInomadBankRef();
      inomadLink = await this.prisma.bankLink.findFirst({
        where: { bankRef: inomadBankRef },
        select: { userId: true },
      });

      if (!inomadLink) {
        this.logger.error(
          `Fee account (${inomadBankRef}) not found! Fee will not be charged to prevent fund loss.`,
        );
        fee = 0;
      }
    }

    const totalDebit = amount + fee;

    return this.prisma.$transaction(async (tx) => {
      // Check sender balance
      const senderLedger = await tx.altanLedger.findUnique({
        where: { userId: senderLink.userId },
      });

      if (!senderLedger || Number(senderLedger.balance) < totalDebit) {
        throw new BadRequestException('Insufficient balance (including fee)');
      }

      // Debit sender (amount + fee)
      await tx.altanLedger.update({
        where: { userId: senderLink.userId },
        data: { balance: { decrement: totalDebit } },
      });

      // Credit recipient
      const recipientLedger = await tx.altanLedger.findUnique({
        where: { userId: recipientLink.userId },
      });

      if (recipientLedger) {
        await tx.altanLedger.update({
          where: { userId: recipientLink.userId },
          data: { balance: { increment: amount } },
        });
      } else {
        await tx.altanLedger.create({
          data: { userId: recipientLink.userId, balance: amount },
        });
      }

      // Record transfer transaction (both userId and bankRef for transition period)
      const transaction = await tx.altanTransaction.create({
        data: {
          fromUserId: senderLink.userId,
          toUserId: recipientLink.userId,
          fromBankRef: senderBankRef,
          toBankRef: recipientBankRef,
          amount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          memo: memo || null,
        },
      });

      // Collect fee (already validated: inomadLink exists if fee > 0)
      if (fee > 0 && inomadLink) {
        const inomadBankRef = this.feeService.getInomadBankRef();

        await tx.altanLedger.upsert({
          where: { userId: inomadLink.userId },
          update: { balance: { increment: fee } },
          create: { userId: inomadLink.userId, balance: fee },
        });

        await tx.altanTransaction.create({
          data: {
            fromUserId: senderLink.userId,
            toUserId: inomadLink.userId,
            fromBankRef: senderBankRef,
            toBankRef: inomadBankRef,
            amount: fee,
            type: 'FEE',
            status: 'COMPLETED',
          },
        });
      }

      // Log with bankRef only (NEVER userId)
      this.logger.log(
        `Transfer: ${senderBankRef.substring(0, 8)}... → ${recipientBankRef.substring(0, 8)}... | amount=${amount} fee=${fee}`,
      );

      return {
        transactionId: transaction.id,
        amount: amount.toString(),
        fee: fee.toString(),
        status: 'COMPLETED',
      };
    });
  }

  /**
   * Resolve a bankRef to check if it exists and is active.
   * Used for recipient validation before transfer.
   */
  async resolveBankRef(bankRef: string): Promise<{ exists: boolean; bankCode: string | null }> {
    const link = await this.prisma.bankLink.findFirst({
      where: { bankRef, status: 'ACTIVE' },
      select: { bankCode: true },
    });

    return {
      exists: !!link,
      bankCode: link?.bankCode || null,
    };
  }
}
