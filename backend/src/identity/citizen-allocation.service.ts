import { TransactionType } from '@prisma/client';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankRewardService } from '../bank/bank-reward.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  generateBankRef,
  ECONOMIC_CONSTANTS,
  TRANSACTION_REASONS,
} from '../bank/bank.utils';

/**
 * CitizenAllocationService
 *
 * Handles automatic bank account creation and fund allocation
 * for verified citizens according to the economic model.
 *
 * Economic Model:
 * - Level 1: 100 ALTAN (base verification)
 * - Level 2: 5,000 ALTAN (Arbad membership)
 * - Level 3: 9,383 ALTAN (Zun formation - full allocation)
 *
 * Fund Source: Siberian Pension Fund (special account in Bank of Siberia)
 * Funded by: Central Bank emission
 */
@Injectable()
export class CitizenAllocationService {
  private readonly logger = new Logger(CitizenAllocationService.name);

  constructor(
    private prisma: PrismaService,
    private bankRewardService: BankRewardService,
  ) {}

  /**
   * Create bank account for newly verified citizen
   * Called automatically after super-verification
   */
  async createCitizenBankAccount(userId: string): Promise<{
    bankRef: string;
    accountCreated: boolean;
    alreadyExists: boolean;
  }> {
    try {
      // Check if user already has a bank account
      const existingLink = await this.prisma.bankLink.findUnique({
        where: { userId },
      });

      if (existingLink) {
        this.logger.log(
          `User ${userId} already has bank account: ${existingLink.bankRef}`,
        );
        return {
          bankRef: existingLink.bankRef,
          accountCreated: false,
          alreadyExists: true,
        };
      }

      // Generate new bankRef
      const bankRef = generateBankRef();

      // Create BankLink
      await this.prisma.bankLink.create({
        data: {
          userId,
          bankRef,
          bankCode: 'BOS', // Bank of Siberia
          status: 'ACTIVE',
          // Note: Balance is tracked in AltanLedger, not BankLink
        },
      });

      // Initialize AltanLedger with zero balance
      await this.prisma.altanLedger.upsert({
        where: { userId },
        create: {
          userId,
          balance: 0,
        },
        update: {}, // Do nothing if exists
      });

      this.logger.log(
        `✅ Created bank account for user ${userId}: ${bankRef}`,
      );

      return {
        bankRef,
        accountCreated: true,
        alreadyExists: false,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create bank account for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Allocate Level 1 funds (100 ALTAN) after verification
   * Source: Siberian Pension Fund
   */
  async allocateLevel1Funds(
    userId: string,
    seatId: string,
  ): Promise<{
    allocated: boolean;
    amount: number;
    bankRef: string;
  }> {
    try {
      // Get user's bank account
      const bankLink = await this.prisma.bankLink.findUnique({
        where: { userId },
      });

      if (!bankLink) {
        throw new Error(
          `No bank account found for user ${userId}. Account must be created first.`,
        );
      }

      const { LEVEL_1_ALLOCATION, PENSION_FUND_BANK_REF } =
        ECONOMIC_CONSTANTS;

      // Get Pension Fund userId (special system account)
      // TODO: Create pension fund system user if doesn't exist
      const pensionFundUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: 'pension@system.khural' },
            { username: 'PENSION_FUND_SYSTEM' },
          ],
        },
      });

      if (!pensionFundUser) {
        throw new Error(
          'Pension Fund system account not found. Please create it first.',
        );
      }

      // Transfer from Pension Fund to citizen using transferReward
      await this.bankRewardService.transferReward(
        pensionFundUser.id, // From Pension Fund
        userId, // To citizen
        LEVEL_1_ALLOCATION,
        TransactionType.REWARD, // TransactionType.REWARD - system allocation
        TRANSACTION_REASONS.LEVEL_1_VERIFICATION,
      );

      this.logger.log(
        `✅ Allocated ${LEVEL_1_ALLOCATION} ALTAN to citizen ${seatId} (${bankLink.bankRef})`,
      );

      return {
        allocated: true,
        amount: LEVEL_1_ALLOCATION,
        bankRef: bankLink.bankRef,
      };
    } catch (error) {
      this.logger.error(
        `Failed to allocate Level 1 funds for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Allocate Level 2 funds (5,000 ALTAN) when citizen joins/creates Arbad
   * Supports both FamilyArbad and OrganizationalArbad
   */
  async allocateLevel2Funds(
    userId: string,
    arbadId: string,
  ): Promise<{
    allocated: boolean;
    amount: number;
    arbadRef?: string;
  }> {
    try {
      const { LEVEL_2_ALLOCATION } = ECONOMIC_CONSTANTS;

      // Check if already allocated (idempotency via transaction history)
      const existingAllocation = await this.checkLevel2Allocation(userId);
      if (existingAllocation) {
        this.logger.log(
          `User ${userId} already received Level 2 allocation. Skipping.`,
        );
        return {
          allocated: false,
          amount: 0,
        };
      }

      // Get user seatId for logging
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { seatId: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Verify Arbad membership (check both Family and Org Arbads)
      const isMember = await this.verifyArbadMembership(userId, arbadId);
      if (!isMember) {
        throw new Error(
          `User ${userId} is not a member of Arbad ${arbadId}`,
        );
      }

      // Get Pension Fund userId
      const pensionFundUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: 'pension@system.khural' },
            { username: 'PENSION_FUND_SYSTEM' },
          ],
        },
      });

      if (!pensionFundUser) {
        throw new Error(
          'Pension Fund system account not found. Cannot allocate funds.',
        );
      }

      // Transfer 5,000 ALTAN from Pension Fund
      await this.bankRewardService.transferReward(
        pensionFundUser.id,
        userId,
        LEVEL_2_ALLOCATION,
        TransactionType.REWARD,
        TRANSACTION_REASONS.LEVEL_2_ARBAD,
      );

      this.logger.log(
        `✅ Allocated ${LEVEL_2_ALLOCATION} ALTAN to citizen ${user.seatId} for Arbad membership`,
      );

      return {
        allocated: true,
        amount: LEVEL_2_ALLOCATION,
        arbadRef: arbadId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to allocate Level 2 funds for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if user already received Level 2 allocation
   */
  private async checkLevel2Allocation(userId: string): Promise<boolean> {
    const existing = await this.prisma.altanTransaction.findFirst({
      where: {
        toUserId: userId,
        memo: TRANSACTION_REASONS.LEVEL_2_ARBAD,
        status: 'COMPLETED',
      },
    });
    return !!existing;
  }

  /**
   * Verify user is member of given Arbad (Family or Organizational)
   */
  private async verifyArbadMembership(
    userId: string,
    arbadId: string,
  ): Promise<boolean> {
    // Get user's seatId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { seatId: true },
    });

    if (!user || !user.seatId) {
      return false;
    }

    // Check FamilyArbad (husband, wife, or children)
    const familyArbad = await this.prisma.familyArbad.findUnique({
      where: { id: arbadId },
      include: { children: true },
    });

    if (familyArbad) {
      const isHusband = familyArbad.husbandSeatId === user.seatId;
      const isWife = familyArbad.wifeSeatId === user.seatId;
      const isChild = familyArbad.children.some(
        (child) => child.childSeatId === user.seatId,
      );

      if (isHusband || isWife || isChild) {
        return true;
      }
    }

    // Check OrganizationalArbad
    const orgMember = await this.prisma.orgArbadMember.findFirst({
      where: {
        arbadId: BigInt(arbadId),
        seatId: user.seatId,
      },
    });

    return !!orgMember;
  }

  /**
   * Allocate Level 3 funds (9,383 ALTAN) when Zun is formed
   * Distributed to all members of all Arbads in the Zun
   */
  async allocateLevel3Funds(
    userId: string,
    zunId: string,
  ): Promise<{
    allocated: boolean;
    amount: number;
    zunRef?: string;
  }> {
    try {
      const { LEVEL_3_ALLOCATION } = ECONOMIC_CONSTANTS;

      // Check if already allocated (idempotency)
      const existingAllocation = await this.checkLevel3Allocation(userId);
      if (existingAllocation) {
        this.logger.log(
          `User ${userId} already received Level 3 allocation. Skipping.`,
        );
        return {
          allocated: false,
          amount: 0,
        };
      }

      // Get user seatId
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { seatId: true },
      });

      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      // Verify Zun membership (via Arbad membership)
      const isMember = await this.verifyZunMembership(userId, zunId);
      if (!isMember) {
        throw new Error(`User ${userId} is not a member of Zun ${zunId}`);
      }

      // Get Pension Fund userId
      const pensionFundUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: 'pension@system.khural' },
            { username: 'PENSION_FUND_SYSTEM' },
          ],
        },
      });

      if (!pensionFundUser) {
        throw new Error(
          'Pension Fund system account not found. Cannot allocate funds.',
        );
      }

      // Transfer 9,383 ALTAN from Pension Fund
      await this.bankRewardService.transferReward(
        pensionFundUser.id,
        userId,
        LEVEL_3_ALLOCATION,
        TransactionType.REWARD,
        TRANSACTION_REASONS.LEVEL_3_ZUN,
      );

      this.logger.log(
        `✅ Allocated ${LEVEL_3_ALLOCATION} ALTAN to citizen ${user.seatId} for Zun formation (full per-capita reached)`,
      );

      return {
        allocated: true,
        amount: LEVEL_3_ALLOCATION,
        zunRef: zunId,
      };
    } catch (error) {
      this.logger.error(
        `Failed to allocate Level 3 funds for user ${userId}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Check if user already received Level 3 allocation
   */
  private async checkLevel3Allocation(userId: string): Promise<boolean> {
    const existing = await this.prisma.altanTransaction.findFirst({
      where: {
        toUserId: userId,
        memo: TRANSACTION_REASONS.LEVEL_3_ZUN,
        status: 'COMPLETED',
      },
    });
    return !!existing;
  }

  /**
   * Verify user is member of any Arbad in the given Zun
   */
  private async verifyZunMembership(
    userId: string,
    zunId: string,
  ): Promise<boolean> {
    // Get user's seatId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { seatId: true },
    });

    if (!user || !user.seatId) {
      return false;
    }

    // Get Zun with all member Arbads
    const zun = await this.prisma.zun.findUnique({
      where: { id: zunId },
      include: { memberArbads: { include: { children: true } } },
    });

    if (!zun || !zun.memberArbads || zun.memberArbads.length === 0) {
      return false;
    }

    // Check if user is member of any Arbad in this Zun
    for (const arbad of zun.memberArbads) {
      const isHusband = arbad.husbandSeatId === user.seatId;
      const isWife = arbad.wifeSeatId === user.seatId;
      const isChild = arbad.children.some(
        (child) => child.childSeatId === user.seatId,
      );

      if (isHusband || isWife || isChild) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get citizen's allocation summary
   */
  async getAllocationSummary(userId: string): Promise<{
    level1Received: boolean;
    level2Received: boolean;
    level3Received: boolean;
    totalReceived: number;
    totalAvailable: number;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bankLink: true },
    });

    if (!user || !user.bankLink) {
      return {
        level1Received: false,
        level2Received: false,
        level3Received: false,
        totalReceived: 0,
        totalAvailable: ECONOMIC_CONSTANTS.PER_CAPITA_TOTAL,
      };
    }

    // Check transaction history to determine which levels received
    const transactions = await this.prisma.altanTransaction.findMany({
      where: {
        OR: [
          { fromBankRef: user.bankLink.bankRef },
          { toBankRef: user.bankLink.bankRef },
        ],
        memo: {
          contains: 'Verification Award',
        },
      },
    });

    const level1Received = transactions.some((tx) =>
      tx.memo?.includes('Level 1'),
    );
    const level2Received = transactions.some((tx) =>
      tx.memo?.includes('Level 2'),
    );
    const level3Received = transactions.some((tx) =>
      tx.memo?.includes('Level 3'),
    );

    let totalReceived = 0;
    if (level1Received) totalReceived += ECONOMIC_CONSTANTS.LEVEL_1_ALLOCATION;
    if (level2Received) totalReceived += ECONOMIC_CONSTANTS.LEVEL_2_ALLOCATION;
    if (level3Received) totalReceived += ECONOMIC_CONSTANTS.LEVEL_3_ALLOCATION;

    return {
      level1Received,
      level2Received,
      level3Received,
      totalReceived,
      totalAvailable: ECONOMIC_CONSTANTS.PER_CAPITA_TOTAL,
    };
  }
}
