import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Central Bank Service — Fourth Branch of Power.
 *
 * Handles:
 * - Emission (minting) and destruction (burning) of ALTAN
 * - Bank licensing
 * - Correspondent account management
 * - Monetary policy
 *
 * NEVER imports or depends on BankModule, AuthModule, or IdentityModule.
 */
@Injectable()
export class CentralBankService {
  private readonly logger = new Logger(CentralBankService.name);

  constructor(private prisma: PrismaService) {}

  // ============================
  // EMISSION & BURNING
  // ============================

  async emitToCorrespondentAccount(
    officerId: string,
    corrAccountId: string,
    amount: number,
    reason: string,
    memo?: string,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    // Verify corr account exists
    const corrAccount = await this.prisma.corrAccount.findUnique({
      where: { id: corrAccountId },
      include: { license: true },
    });
    if (!corrAccount) throw new NotFoundException('Correspondent account not found');
    if (corrAccount.license.status !== 'ACTIVE') {
      throw new BadRequestException('Cannot emit to suspended/revoked bank');
    }

    // Check daily emission limit
    const policy = await this.getActivePolicy();
    if (policy) {
      const todayUsage = await this.getTodayEmissionTotal();
      const limit = Number(policy.dailyEmissionLimit);
      if (limit > 0 && todayUsage + amount > limit) {
        throw new BadRequestException(
          `Daily emission limit exceeded. Used: ${todayUsage.toFixed(2)}, Limit: ${limit.toFixed(2)}, Requested: ${amount}`,
        );
      }
    }

    // Atomic: create emission record + update corr balance + create transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update corr account balance
      const updated = await tx.corrAccount.update({
        where: { id: corrAccountId },
        data: { balance: { increment: amount } },
      });

      // Create emission record
      const emission = await tx.emissionRecord.create({
        data: {
          type: 'MINT',
          amount,
          reason,
          memo,
          corrAccountId,
          authorizedById: officerId,
          status: 'COMPLETED',
        },
      });

      // Create AltanTransaction for unified history
      await tx.altanTransaction.create({
        data: {
          amount,
          type: 'MINT',
          status: 'COMPLETED',
          memo: reason,
          toBankRef: corrAccount.accountRef,
        },
      });

      return { emission, newBalance: updated.balance };
    });

    this.logger.log(
      `EMISSION: ${amount} ALTAN minted to corr account ${corrAccount.accountRef.substring(0, 8)}... (${reason})`,
    );

    return {
      emissionId: result.emission.id,
      amount: amount.toString(),
      corrAccountBalance: result.newBalance.toString(),
      reason,
    };
  }

  async burnFromCorrespondentAccount(
    officerId: string,
    corrAccountId: string,
    amount: number,
    reason: string,
  ) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const corrAccount = await this.prisma.corrAccount.findUnique({
      where: { id: corrAccountId },
    });
    if (!corrAccount) throw new NotFoundException('Correspondent account not found');

    if (Number(corrAccount.balance) < amount) {
      throw new BadRequestException(
        `Insufficient balance in correspondent account. Balance: ${corrAccount.balance}, Requested: ${amount}`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.corrAccount.update({
        where: { id: corrAccountId },
        data: { balance: { decrement: amount } },
      });

      const emission = await tx.emissionRecord.create({
        data: {
          type: 'BURN',
          amount,
          reason,
          corrAccountId,
          authorizedById: officerId,
          status: 'COMPLETED',
        },
      });

      await tx.altanTransaction.create({
        data: {
          amount,
          type: 'BURN',
          status: 'COMPLETED',
          memo: reason,
          fromBankRef: corrAccount.accountRef,
        },
      });

      return { emission, newBalance: updated.balance };
    });

    this.logger.log(
      `BURN: ${amount} ALTAN burned from corr account ${corrAccount.accountRef.substring(0, 8)}... (${reason})`,
    );

    return {
      emissionId: result.emission.id,
      amount: amount.toString(),
      corrAccountBalance: result.newBalance.toString(),
      reason,
    };
  }

  async getEmissionHistory(limit = 50, offset = 0) {
    const records = await this.prisma.emissionRecord.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        corrAccount: { include: { license: { select: { bankCode: true, bankName: true } } } },
        authorizedBy: { select: { name: true, role: true, walletAddress: true } },
      },
    });

    return records.map((r) => ({
      id: r.id,
      type: r.type,
      amount: r.amount.toString(),
      reason: r.reason,
      memo: r.memo,
      bankCode: r.corrAccount?.license?.bankCode || null,
      bankName: r.corrAccount?.license?.bankName || null,
      authorizedBy: r.authorizedBy?.name || r.authorizedBy?.walletAddress?.substring(0, 10),
      status: r.status,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async getTotalSupply() {
    const [mintResult, burnResult] = await Promise.all([
      this.prisma.emissionRecord.aggregate({
        where: { type: 'MINT', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.emissionRecord.aggregate({
        where: { type: 'BURN', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const minted = Number(mintResult._sum.amount || 0);
    const burned = Number(burnResult._sum.amount || 0);
    const circulating = minted - burned;

    return {
      minted: minted.toFixed(6),
      burned: burned.toFixed(6),
      circulating: circulating.toFixed(6),
    };
  }

  async getDailyEmissionUsage() {
    const policy = await this.getActivePolicy();
    const limit = policy ? Number(policy.dailyEmissionLimit) : 0;
    const used = await this.getTodayEmissionTotal();
    const remaining = Math.max(0, limit - used);

    return {
      used: used.toFixed(6),
      limit: limit.toFixed(6),
      remaining: remaining.toFixed(6),
    };
  }

  private async getTodayEmissionTotal(): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await this.prisma.emissionRecord.aggregate({
      where: {
        type: 'MINT',
        status: 'COMPLETED',
        createdAt: { gte: startOfDay },
      },
      _sum: { amount: true },
    });

    return Number(result._sum.amount || 0);
  }

  // ============================
  // LICENSING
  // ============================

  async issueLicense(
    officerId: string,
    bankAddress: string,
    bankCode: string,
    bankName: string,
  ) {
    // Check for existing license
    const existing = await this.prisma.centralBankLicense.findFirst({
      where: { OR: [{ bankAddress }, { bankCode }] },
    });
    if (existing) {
      throw new BadRequestException(
        `License already exists for this address or code: ${existing.bankCode}`,
      );
    }

    const license = await this.prisma.centralBankLicense.create({
      data: {
        bankAddress,
        bankCode,
        bankName,
        status: 'ACTIVE',
        issuedById: officerId,
      },
    });

    // Create correspondent account for this bank
    const corrAccount = await this.prisma.corrAccount.create({
      data: {
        licenseId: license.id,
        accountRef: `CORR:${bankCode}:${license.id.substring(0, 8)}`,
        balance: 0,
      },
    });

    this.logger.log(`LICENSE ISSUED: ${bankName} (${bankCode}) at ${bankAddress}`);

    return {
      license: {
        id: license.id,
        bankCode: license.bankCode,
        bankName: license.bankName,
        bankAddress: license.bankAddress,
        status: license.status,
        issuedAt: license.issuedAt.toISOString(),
      },
      corrAccount: {
        id: corrAccount.id,
        accountRef: corrAccount.accountRef,
        balance: '0',
      },
    };
  }

  async revokeLicense(officerId: string, licenseId: string, reason: string) {
    const license = await this.prisma.centralBankLicense.findUnique({
      where: { id: licenseId },
    });
    if (!license) throw new NotFoundException('License not found');
    if (license.status === 'REVOKED') {
      throw new BadRequestException('License already revoked');
    }

    await this.prisma.centralBankLicense.update({
      where: { id: licenseId },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokeReason: reason,
      },
    });

    this.logger.log(`LICENSE REVOKED: ${license.bankName} (${license.bankCode}) — ${reason}`);
  }

  async getLicensedBanks() {
    const licenses = await this.prisma.centralBankLicense.findMany({
      orderBy: { issuedAt: 'asc' },
      include: {
        corrAccount: { select: { id: true, accountRef: true, balance: true } },
        issuedBy: { select: { name: true, role: true } },
      },
    });

    return licenses.map((l) => ({
      id: l.id,
      bankAddress: l.bankAddress,
      bankCode: l.bankCode,
      bankName: l.bankName,
      status: l.status,
      issuedAt: l.issuedAt.toISOString(),
      revokedAt: l.revokedAt?.toISOString() || null,
      revokeReason: l.revokeReason || null,
      issuedBy: l.issuedBy?.name || null,
      corrAccount: l.corrAccount
        ? {
            id: l.corrAccount.id,
            accountRef: l.corrAccount.accountRef,
            balance: l.corrAccount.balance.toString(),
          }
        : null,
    }));
  }

  // ============================
  // CORRESPONDENT ACCOUNTS
  // ============================

  async getCorrAccounts() {
    const accounts = await this.prisma.corrAccount.findMany({
      include: {
        license: { select: { bankCode: true, bankName: true, status: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return accounts.map((a) => ({
      id: a.id,
      accountRef: a.accountRef,
      balance: a.balance.toString(),
      bankCode: a.license.bankCode,
      bankName: a.license.bankName,
      bankStatus: a.license.status,
      updatedAt: a.updatedAt.toISOString(),
    }));
  }

  // ============================
  // MONETARY POLICY
  // ============================

  async getCurrentPolicy() {
    const policy = await this.getActivePolicy();
    if (!policy) {
      return {
        officialRate: '0.0000',
        reserveRequirement: '0.1000',
        dailyEmissionLimit: '10000000.000000',
        effectiveFrom: new Date().toISOString(),
      };
    }

    return {
      id: policy.id,
      officialRate: policy.officialRate.toString(),
      reserveRequirement: policy.reserveRequirement.toString(),
      dailyEmissionLimit: policy.dailyEmissionLimit.toString(),
      effectiveFrom: policy.effectiveFrom.toISOString(),
    };
  }

  async updatePolicy(
    officerId: string,
    changes: { officialRate?: number; reserveRequirement?: number; dailyEmissionLimit?: number },
    reason: string,
  ) {
    const current = await this.getActivePolicy();
    const now = new Date();

    // Deactivate current policy
    if (current) {
      await this.prisma.monetaryPolicy.update({
        where: { id: current.id },
        data: { isActive: false },
      });
    }

    // Create new policy
    const newPolicy = await this.prisma.monetaryPolicy.create({
      data: {
        officialRate: changes.officialRate ?? Number(current?.officialRate || 0),
        reserveRequirement: changes.reserveRequirement ?? Number(current?.reserveRequirement || 0.1),
        dailyEmissionLimit: changes.dailyEmissionLimit ?? Number(current?.dailyEmissionLimit || 10000000),
        isActive: true,
        effectiveFrom: now,
      },
    });

    // Record each change
    const changeRecords: { parameter: string; previousValue: string; newValue: string }[] = [];

    if (changes.officialRate !== undefined) {
      changeRecords.push({
        parameter: 'officialRate',
        previousValue: current?.officialRate?.toString() || '0',
        newValue: changes.officialRate.toString(),
      });
    }
    if (changes.reserveRequirement !== undefined) {
      changeRecords.push({
        parameter: 'reserveRequirement',
        previousValue: current?.reserveRequirement?.toString() || '0.1',
        newValue: changes.reserveRequirement.toString(),
      });
    }
    if (changes.dailyEmissionLimit !== undefined) {
      changeRecords.push({
        parameter: 'dailyEmissionLimit',
        previousValue: current?.dailyEmissionLimit?.toString() || '10000000',
        newValue: changes.dailyEmissionLimit.toString(),
      });
    }

    for (const change of changeRecords) {
      await this.prisma.monetaryPolicyChange.create({
        data: {
          ...change,
          reason,
          authorizedById: officerId,
          effectiveAt: now,
        },
      });
    }

    this.logger.log(`POLICY UPDATE: ${changeRecords.map(c => `${c.parameter}: ${c.previousValue} → ${c.newValue}`).join(', ')} (${reason})`);

    return {
      id: newPolicy.id,
      officialRate: newPolicy.officialRate.toString(),
      reserveRequirement: newPolicy.reserveRequirement.toString(),
      dailyEmissionLimit: newPolicy.dailyEmissionLimit.toString(),
      effectiveFrom: newPolicy.effectiveFrom.toISOString(),
    };
  }

  async getPolicyHistory(limit = 50) {
    const changes = await this.prisma.monetaryPolicyChange.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        authorizedBy: { select: { name: true, role: true } },
      },
    });

    return changes.map((c) => ({
      id: c.id,
      parameter: c.parameter,
      previousValue: c.previousValue,
      newValue: c.newValue,
      reason: c.reason,
      authorizedBy: c.authorizedBy?.name || null,
      effectiveAt: c.effectiveAt.toISOString(),
    }));
  }

  // ============================
  // PUBLIC STATS (no auth)
  // ============================

  async getPublicStats() {
    const [supply, policy, licensedCount, lastEmission] = await Promise.all([
      this.getTotalSupply(),
      this.getCurrentPolicy(),
      this.prisma.centralBankLicense.count({ where: { status: 'ACTIVE' } }),
      this.prisma.emissionRecord.findFirst({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    return {
      totalSupply: supply.circulating,
      totalMinted: supply.minted,
      totalBurned: supply.burned,
      licensedBanksCount: licensedCount,
      officialRate: policy.officialRate,
      lastEmissionDate: lastEmission?.createdAt?.toISOString() || null,
    };
  }

  // ============================
  // HELPERS
  // ============================

  private async getActivePolicy() {
    return this.prisma.monetaryPolicy.findFirst({
      where: { isActive: true },
      orderBy: { effectiveFrom: 'desc' },
    });
  }
}
