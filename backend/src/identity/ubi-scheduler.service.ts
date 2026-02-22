import { TransactionType } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';
import { ECONOMIC_CONSTANTS, TRANSACTION_REASONS } from '../bank/bank.utils';

@Injectable()
export class UBISchedulerService {
  private readonly logger = new Logger(UBISchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bankRewardService: BankRewardService,
  ) {}

  /**
   * Weekly UBI distribution
   * Runs every Monday at 00:01 UTC (distribute for previous week)
   */
  @Cron('1 0 * * 1', {
    name: 'weekly-ubi-distribution',
    timeZone: 'UTC',
  })
  async distributeWeeklyUBI(): Promise<void> {
    this.logger.log('🔄 Starting weekly UBI distribution...');

    const { weekStart, weekEnd } = this.getLastWeekRange();

    try {
      // Get all eligible citizens
      const eligibleUsers = await this.getEligibleUsers();

      this.logger.log(
        `Found ${eligibleUsers.length} eligible users for UBI (week ${weekStart.toISOString()})`,
      );

      // Get Pension Fund account
      const pensionFund = await this.getPensionFundAccount();

      let successCount = 0;
      let skipCount = 0;
      let failCount = 0;

      for (const user of eligibleUsers) {
        try {
          // Check if already paid for this week (idempotency)
          const existingPayment = await this.prisma.ubiPayment.findUnique({
            where: {
              userId_weekStartDate: {
                userId: user.id,
                weekStartDate: weekStart,
              },
            },
          });

          if (existingPayment) {
            this.logger.log(
              `User ${user.seatId} already received UBI for this week`,
            );
            skipCount++;
            continue;
          }

          // Create pending payment record
          const ubiPayment = await this.prisma.ubiPayment.create({
            data: {
              userId: user.id,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              amount: ECONOMIC_CONSTANTS.UBI_WEEKLY_AMOUNT,
              status: 'PENDING',
            },
          });

          // Transfer UBI from Pension Fund
          const result = await this.bankRewardService.transferReward(
            pensionFund.id,
            user.id,
            ECONOMIC_CONSTANTS.UBI_WEEKLY_AMOUNT,
            TransactionType.REWARD,
            TRANSACTION_REASONS.UBI_WEEKLY,
          );

          // Update payment record to COMPLETED
          await this.prisma.ubiPayment.update({
            where: { id: ubiPayment.id },
            data: {
              status: 'COMPLETED',
              transactionId: result.transactionId,
              processedAt: new Date(),
            },
          });

          successCount++;
          this.logger.log(`✅ UBI paid to ${user.seatId}: 400 ALTAN`);
        } catch (error) {
          this.logger.error(
            `Failed to pay UBI to user ${user.seatId}:`,
            error,
          );
          failCount++;

          // Record failure
          await this.prisma.ubiPayment.upsert({
            where: {
              userId_weekStartDate: {
                userId: user.id,
                weekStartDate: weekStart,
              },
            },
            create: {
              userId: user.id,
              weekStartDate: weekStart,
              weekEndDate: weekEnd,
              amount: ECONOMIC_CONSTANTS.UBI_WEEKLY_AMOUNT,
              status: 'FAILED',
              failureReason: error.message,
            },
            update: {
              status: 'FAILED',
              failureReason: error.message,
              processedAt: new Date(),
            },
          });
        }
      }

      this.logger.log(
        `✅ UBI distribution complete: ${successCount} paid, ${skipCount} skipped, ${failCount} failed`,
      );
    } catch (error) {
      this.logger.error('Failed to distribute UBI:', error);
    }
  }

  /**
   * Get eligible users for UBI
   * - Must be VERIFIED
   * - Must have active BankLink (bankRef populated)
   * - Exclude system accounts
   */
  private async getEligibleUsers() {
    return this.prisma.user.findMany({
      where: {
        verificationStatus: 'VERIFIED',
        bankLink: { isNot: null }, // Must have active BankLink
        // Exclude system accounts
        email: {
          notIn: [
            'pension@system.khural',
            'centralbank@system.khural',
            'treasury@system.khural',
          ],
        },
      },
      select: {
        id: true,
        seatId: true,
        email: true,
      },
    });
  }

  /**
   * Get Pension Fund system account
   */
  private async getPensionFundAccount() {
    const account = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: 'pension@system.khural' },
          { username: 'PENSION_FUND_SYSTEM' },
        ],
      },
    });

    if (!account) {
      throw new Error('Pension Fund system account not found');
    }

    return account;
  }

  /**
   * Get last week's date range (Monday to Sunday)
   * Called on Monday to distribute for previous week
   */
  private getLastWeekRange(): { weekStart: Date; weekEnd: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ...

    // Calculate days back to last Monday
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek + 6;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToLastMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    return { weekStart, weekEnd };
  }

  /**
   * Manual trigger for testing/admin purposes
   * Can specify custom week start date
   */
  async manualDistribution(weekStartDate?: Date): Promise<{
    success: number;
    skipped: number;
    failed: number;
  }> {
    this.logger.log('🔧 Manual UBI distribution triggered');

    // Use provided date or default to last week
    const { weekStart, weekEnd } = weekStartDate
      ? {
          weekStart: new Date(weekStartDate),
          weekEnd: new Date(
            new Date(weekStartDate).getTime() + 6 * 24 * 60 * 60 * 1000,
          ),
        }
      : this.getLastWeekRange();

    const eligibleUsers = await this.getEligibleUsers();
    const pensionFund = await this.getPensionFundAccount();

    let successCount = 0;
    let skipCount = 0;
    let failCount = 0;

    for (const user of eligibleUsers) {
      try {
        // Check if already paid
        const existingPayment = await this.prisma.ubiPayment.findUnique({
          where: {
            userId_weekStartDate: {
              userId: user.id,
              weekStartDate: weekStart,
            },
          },
        });

        if (existingPayment) {
          skipCount++;
          continue;
        }

        // Create payment
        const ubiPayment = await this.prisma.ubiPayment.create({
          data: {
            userId: user.id,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            amount: ECONOMIC_CONSTANTS.UBI_WEEKLY_AMOUNT,
            status: 'PENDING',
          },
        });

        // Transfer
        const result = await this.bankRewardService.transferReward(
          pensionFund.id,
          user.id,
          ECONOMIC_CONSTANTS.UBI_WEEKLY_AMOUNT,
          TransactionType.REWARD,
          TRANSACTION_REASONS.UBI_WEEKLY,
        );

        // Mark complete
        await this.prisma.ubiPayment.update({
          where: { id: ubiPayment.id },
          data: {
            status: 'COMPLETED',
            transactionId: result.transactionId,
            processedAt: new Date(),
          },
        });

        successCount++;
      } catch (error) {
        this.logger.error(`Failed to pay UBI to user ${user.seatId}:`, error);
        failCount++;

        await this.prisma.ubiPayment.upsert({
          where: {
            userId_weekStartDate: {
              userId: user.id,
              weekStartDate: weekStart,
            },
          },
          create: {
            userId: user.id,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            amount: ECONOMIC_CONSTANTS.UBI_WEEKLY_AMOUNT,
            status: 'FAILED',
            failureReason: error.message,
          },
          update: {
            status: 'FAILED',
            failureReason: error.message,
            processedAt: new Date(),
          },
        });
      }
    }

    this.logger.log(
      `Manual UBI distribution complete: ${successCount} paid, ${skipCount} skipped, ${failCount} failed`,
    );

    return { success: successCount, skipped: skipCount, failed: failCount };
  }
}
