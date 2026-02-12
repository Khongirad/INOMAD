import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  OrgBankTxStatus,
  OrgBankTxType,
  BankApprovalLevel,
  MemberRole,
} from '@prisma/client';

/**
 * OrgBankingService — Organizational banking with dual authorization.
 *
 * US banking practice:
 * 1. Client initiates transaction + signs (multi-sig optional)
 * 2. Bank officer approves (Manager / Senior Manager / Chairman)
 * 3. Transaction executes
 *
 * Daily reports are auto-generated for every active account.
 */
@Injectable()
export class OrgBankingService {
  private readonly logger = new Logger(OrgBankingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ===========================================================================
  // TRANSACTION LIFECYCLE
  // ===========================================================================

  /**
   * Step 1: Client initiates a transaction.
   * The initiator is added as the first signer.
   */
  async initiateTransaction(
    accountId: string,
    initiatorId: string,
    dto: {
      type: OrgBankTxType;
      amount: number;
      description: string;
      recipientAccount?: string;
    },
  ) {
    const account = await this.prisma.orgBankAccount.findUnique({
      where: { id: accountId },
      include: { organization: true },
    });
    if (!account) throw new NotFoundException('Account not found');
    if (!account.isActive) throw new BadRequestException('Account is inactive');

    // Verify initiator is a member of the org
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: account.organizationId,
          userId: initiatorId,
        },
      },
    });
    if (!membership)
      throw new ForbiddenException('You are not a member of this organization');

    // Check permission: must have canManageTreasury
    const permission = await this.prisma.orgPermission.findUnique({
      where: {
        organizationId_role: {
          organizationId: account.organizationId,
          role: membership.role,
        },
      },
    });
    if (!permission?.canManageTreasury)
      throw new ForbiddenException(
        'You do not have treasury management permissions',
      );

    // Check balance for outgoing
    if (
      dto.type === 'OUTGOING' &&
      Number(account.balance) < dto.amount
    ) {
      throw new BadRequestException('Insufficient funds');
    }

    const initialSignature = {
      userId: initiatorId,
      signedAt: new Date().toISOString(),
      signature: `SIG-${initiatorId}-${Date.now()}`,
    };

    // Auto-approve if only 1 signature required
    const clientApproved = account.clientSignaturesRequired <= 1;

    const tx = await this.prisma.orgBankTransaction.create({
      data: {
        accountId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        recipientAccount: dto.recipientAccount,
        initiatorId,
        clientSignatures: [initialSignature],
        clientApproved,
        status: clientApproved ? 'CLIENT_APPROVED' : 'PENDING',
        reportDate: new Date(),
      },
    });

    this.logger.log(
      `Transaction ${tx.id} initiated by ${initiatorId} — ${clientApproved ? 'CLIENT_APPROVED' : 'PENDING'}`,
    );
    return tx;
  }

  /**
   * Step 2 (optional): Co-signer approves the transaction.
   * Required when clientSignaturesRequired > 1.
   */
  async signTransaction(txId: string, signerId: string) {
    const tx = await this.prisma.orgBankTransaction.findUnique({
      where: { id: txId },
      include: { account: { include: { organization: true } } },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'PENDING')
      throw new BadRequestException(
        `Transaction is ${tx.status}, cannot sign`,
      );

    // Check signer is a member
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: tx.account.organizationId,
          userId: signerId,
        },
      },
    });
    if (!membership) throw new ForbiddenException('Not a member');

    // Check not already signed
    const signatures = tx.clientSignatures as any[];
    if (signatures.some((s: any) => s.userId === signerId))
      throw new BadRequestException('Already signed');

    signatures.push({
      userId: signerId,
      signedAt: new Date().toISOString(),
      signature: `SIG-${signerId}-${Date.now()}`,
    });

    const clientApproved =
      signatures.length >= tx.account.clientSignaturesRequired;

    return this.prisma.orgBankTransaction.update({
      where: { id: txId },
      data: {
        clientSignatures: signatures,
        clientApproved,
        status: clientApproved ? 'CLIENT_APPROVED' : 'PENDING',
      },
    });
  }

  /**
   * Step 3: Bank officer approves the transaction.
   * The officer's role level must meet the account's bankApprovalLevel.
   */
  async bankApproveTransaction(
    txId: string,
    officerId: string,
    approve: boolean,
    note?: string,
  ) {
    const tx = await this.prisma.orgBankTransaction.findUnique({
      where: { id: txId },
      include: { account: true },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.status !== 'CLIENT_APPROVED')
      throw new BadRequestException(
        'Transaction must be client-approved first',
      );

    // Determine required approval level from account settings
    const requiredLevel = tx.account.bankApprovalLevel;

    // Approve or reject
    if (!approve) {
      return this.prisma.orgBankTransaction.update({
        where: { id: txId },
        data: {
          bankApproverId: officerId,
          bankApprovalLevel: requiredLevel,
          bankApproved: false,
          bankApprovalNote: note || 'Rejected by bank officer',
          status: 'REJECTED',
        },
      });
    }

    // Execute the transaction (debit/credit balance)
    return this.prisma.$transaction(async (prisma) => {
      // Update transaction status
      const updated = await prisma.orgBankTransaction.update({
        where: { id: txId },
        data: {
          bankApproverId: officerId,
          bankApprovalLevel: requiredLevel,
          bankApproved: true,
          bankApprovalNote: note,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      // Update account balance
      if (tx.type === 'OUTGOING' || tx.type === 'TAX_PAYMENT') {
        await prisma.orgBankAccount.update({
          where: { id: tx.accountId },
          data: { balance: { decrement: Number(tx.amount) } },
        });
      } else if (tx.type === 'INCOMING') {
        await prisma.orgBankAccount.update({
          where: { id: tx.accountId },
          data: { balance: { increment: Number(tx.amount) } },
        });
      }

      this.logger.log(
        `Transaction ${txId} COMPLETED — approved by officer ${officerId}`,
      );
      return updated;
    });
  }

  /**
   * Cancel a pending transaction (by the initiator).
   */
  async cancelTransaction(txId: string, userId: string) {
    const tx = await this.prisma.orgBankTransaction.findUnique({
      where: { id: txId },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    if (tx.initiatorId !== userId)
      throw new ForbiddenException('Only the initiator can cancel');
    if (tx.status !== 'PENDING' && tx.status !== 'CLIENT_APPROVED')
      throw new BadRequestException(`Cannot cancel a ${tx.status} transaction`);

    return this.prisma.orgBankTransaction.update({
      where: { id: txId },
      data: { status: 'CANCELLED' },
    });
  }

  // ===========================================================================
  // QUERIES
  // ===========================================================================

  async getAccountTransactions(
    accountId: string,
    opts?: { page?: number; limit?: number; status?: OrgBankTxStatus },
  ) {
    const page = opts?.page || 1;
    const limit = Math.min(opts?.limit || 20, 50);
    const skip = (page - 1) * limit;

    const where: any = { accountId };
    if (opts?.status) where.status = opts.status;

    const [transactions, total] = await Promise.all([
      this.prisma.orgBankTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.orgBankTransaction.count({ where }),
    ]);

    return { transactions, total, page, limit };
  }

  async getPendingTransactions(accountId: string) {
    return this.prisma.orgBankTransaction.findMany({
      where: {
        accountId,
        status: { in: ['PENDING', 'CLIENT_APPROVED'] },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getOrgAccounts(organizationId: string) {
    return this.prisma.orgBankAccount.findMany({
      where: { organizationId, isActive: true },
      include: {
        _count: { select: { transactions: true } },
      },
    });
  }

  // ===========================================================================
  // DAILY REPORT (Cron: every day at midnight)
  // ===========================================================================

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailyReports() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const accounts = await this.prisma.orgBankAccount.findMany({
      where: { isActive: true },
    });

    let reportsGenerated = 0;

    for (const account of accounts) {
      try {
        // Check if report already exists for this day
        const existing = await this.prisma.bankDailyReport.findUnique({
          where: {
            accountId_reportDate: {
              accountId: account.id,
              reportDate: yesterday,
            },
          },
        });
        if (existing) continue;

        // Get all transactions for yesterday
        const transactions = await this.prisma.orgBankTransaction.findMany({
          where: {
            accountId: account.id,
            reportDate: {
              gte: yesterday,
              lt: today,
            },
          },
        });

        const totalIncoming = transactions
          .filter((t) => t.type === 'INCOMING' && t.status === 'COMPLETED')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const totalOutgoing = transactions
          .filter(
            (t) =>
              (t.type === 'OUTGOING' || t.type === 'TAX_PAYMENT') &&
              t.status === 'COMPLETED',
          )
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const pendingCount = transactions.filter(
          (t) => t.status === 'PENDING' || t.status === 'CLIENT_APPROVED',
        ).length;

        const openingBalance =
          Number(account.balance) + totalOutgoing - totalIncoming;

        const report = await this.prisma.bankDailyReport.create({
          data: {
            accountId: account.id,
            reportDate: yesterday,
            openingBalance,
            closingBalance: Number(account.balance),
            totalIncoming,
            totalOutgoing,
            txCount: transactions.length,
            pendingCount,
            deliveredAt: new Date(),
          },
        });

        // Link transactions to this report
        if (transactions.length > 0) {
          await this.prisma.orgBankTransaction.updateMany({
            where: {
              id: { in: transactions.map((t) => t.id) },
            },
            data: {
              reportId: report.id,
              reportedAt: new Date(),
            },
          });
        }

        reportsGenerated++;
      } catch (error) {
        this.logger.error(
          `Failed to generate daily report for account ${account.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Generated ${reportsGenerated} daily reports for ${accounts.length} accounts`,
    );
    return reportsGenerated;
  }

  async getDailyReport(accountId: string, date: Date) {
    return this.prisma.bankDailyReport.findUnique({
      where: {
        accountId_reportDate: {
          accountId,
          reportDate: date,
        },
      },
      include: { transactions: true },
    });
  }

  async getDailyReports(
    accountId: string,
    opts?: { page?: number; limit?: number },
  ) {
    const page = opts?.page || 1;
    const limit = Math.min(opts?.limit || 30, 50);
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      this.prisma.bankDailyReport.findMany({
        where: { accountId },
        orderBy: { reportDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bankDailyReport.count({ where: { accountId } }),
    ]);

    return { reports, total, page, limit };
  }
}
