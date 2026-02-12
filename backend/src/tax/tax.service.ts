import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaxRecordStatus } from '@prisma/client';

/**
 * TaxService — Annual tax filing.
 *
 * Tax is collected ONCE A YEAR during the tax period (January).
 * Rate: 10% total (7% → Republic, 3% → Confederation).
 *
 * Lifecycle: DRAFT → FILED → PAID
 */
@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate annual tax record for a user.
   * Aggregates all completed Quest rewards for the given year.
   */
  async generateTaxRecord(userId: string, taxYear: number) {
    // Find user's republic
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        regionalReputations: {
          include: { republic: true },
          take: 1,
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const republicRep = user.regionalReputations[0];
    if (!republicRep)
      throw new BadRequestException(
        'User has no republic affiliation for tax purposes',
      );

    // Check for existing record
    const existing = await this.prisma.taxRecord.findUnique({
      where: {
        userId_taxYear_republicId: {
          userId,
          taxYear,
          republicId: republicRep.republicId,
        },
      },
    });
    if (existing)
      throw new BadRequestException(
        `Tax record for ${taxYear} already exists (status: ${existing.status})`,
      );

    // Aggregate all completed quests for the year
    const periodStart = new Date(taxYear, 0, 1); // Jan 1
    const periodEnd = new Date(taxYear + 1, 0, 1); // Jan 1 next year

    const completedQuests = await this.prisma.quest.findMany({
      where: {
        takerId: userId,
        status: 'COMPLETED',
        completedAt: {
          gte: periodStart,
          lt: periodEnd,
        },
      },
    });

    const totalIncome = completedQuests.reduce(
      (sum, q) => sum + Number(q.rewardAltan),
      0,
    );

    // Calculate tax
    const taxRate = 0.1;
    const republicRate = 0.07;
    const confedRate = 0.03;
    const totalTaxDue = totalIncome * taxRate;
    const republicTaxDue = totalIncome * republicRate;
    const confederationTaxDue = totalIncome * confedRate;

    const record = await this.prisma.taxRecord.create({
      data: {
        userId,
        republicId: republicRep.republicId,
        taxYear,
        taxPeriodStart: periodStart,
        taxPeriodEnd: periodEnd,
        totalIncome,
        totalQuestsCompleted: completedQuests.length,
        taxRate,
        republicTaxRate: republicRate,
        confederationTaxRate: confedRate,
        totalTaxDue,
        republicTaxDue,
        confederationTaxDue,
        status: 'DRAFT',
      },
    });

    this.logger.log(
      `Tax record created for user ${userId}, year ${taxYear}: income=${totalIncome}, tax=${totalTaxDue}`,
    );
    return record;
  }

  /**
   * File tax return (DRAFT → FILED).
   */
  async fileTaxReturn(userId: string, taxRecordId: string) {
    const record = await this.prisma.taxRecord.findUnique({
      where: { id: taxRecordId },
    });
    if (!record) throw new NotFoundException('Tax record not found');
    if (record.userId !== userId)
      throw new BadRequestException('Not your tax record');
    if (record.status !== 'DRAFT')
      throw new BadRequestException(`Cannot file a ${record.status} record`);

    return this.prisma.taxRecord.update({
      where: { id: taxRecordId },
      data: { status: 'FILED' },
    });
  }

  /**
   * Pay annual tax (FILED → PAID).
   */
  async payTax(userId: string, taxRecordId: string) {
    const record = await this.prisma.taxRecord.findUnique({
      where: { id: taxRecordId },
    });
    if (!record) throw new NotFoundException('Tax record not found');
    if (record.userId !== userId)
      throw new BadRequestException('Not your tax record');
    if (record.status !== 'FILED')
      throw new BadRequestException(`Cannot pay a ${record.status} record`);

    // TODO: Integrate with ALTAN ledger to debit the tax amount
    // For now, mark as paid
    return this.prisma.taxRecord.update({
      where: { id: taxRecordId },
      data: {
        status: 'PAID',
        isPaid: true,
        totalTaxPaid: record.totalTaxDue,
        paidAt: new Date(),
        paymentTxHash: `TAX-${Date.now()}-${userId.substring(0, 8)}`,
      },
    });
  }

  /**
   * Get user's tax history.
   */
  async getTaxHistory(userId: string) {
    return this.prisma.taxRecord.findMany({
      where: { userId },
      orderBy: { taxYear: 'desc' },
      include: { republic: true },
    });
  }

  /**
   * Get a single tax record with full details.
   */
  async getTaxRecord(taxRecordId: string) {
    const record = await this.prisma.taxRecord.findUnique({
      where: { id: taxRecordId },
      include: { republic: true, user: true },
    });
    if (!record) throw new NotFoundException('Tax record not found');
    return record;
  }

  /**
   * Auto-generate DRAFT tax records on January 1st.
   * Runs daily but only acts on Jan 1.
   */
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async autoGenerateTaxRecords() {
    const now = new Date();
    // Only run on January 1st
    if (now.getMonth() !== 0 || now.getDate() !== 1) return;

    const taxYear = now.getFullYear() - 1; // Tax for the previous year
    this.logger.log(`Auto-generating tax records for year ${taxYear}`);

    // Get all users who completed quests in that year
    const periodStart = new Date(taxYear, 0, 1);
    const periodEnd = new Date(taxYear + 1, 0, 1);

    const usersWithQuests = await this.prisma.quest.findMany({
      where: {
        status: 'COMPLETED',
        completedAt: { gte: periodStart, lt: periodEnd },
        takerId: { not: null },
      },
      select: { takerId: true },
      distinct: ['takerId'],
    });

    let generated = 0;
    for (const { takerId } of usersWithQuests) {
      if (!takerId) continue;
      try {
        await this.generateTaxRecord(takerId, taxYear);
        generated++;
      } catch (error) {
        // Skip if already exists
        if (!error.message?.includes('already exists')) {
          this.logger.error(
            `Failed to generate tax for user ${takerId}: ${error.message}`,
          );
        }
      }
    }

    this.logger.log(
      `Auto-generated ${generated} tax records for ${usersWithQuests.length} users`,
    );
  }
}
