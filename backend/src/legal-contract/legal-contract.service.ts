import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createHash } from 'crypto';
import { Prisma, ContractStatus, SignatoryRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// ────────────────────────────────────────────────────────────────────────────
// DTOs
// ────────────────────────────────────────────────────────────────────────────

export interface GenerateFromTemplateDto {
  templateId: string;
  title: string;
  partyAId: string;
  partyBId: string;
  /** Pulled from UserProfile at initialization — immutable after creation */
  bankRequisites: {
    partyA: { bank: string; account: string; bic: string };
    partyB: { bank: string; account: string; bic: string };
  };
  legalAddress: string;
  /** Optional 2-year expiry override (default = now + 2 years) */
  expiresAt?: Date;
}

export interface AddSignatoryDto {
  userId: string;
  role: SignatoryRole;
  /** NOTARY only — their rank level */
  notaryRank?: number;
  /** MEDIATOR only — commission percentage (e.g. 0.003 = 0.3%) */
  feePercent?: number;
}

export interface ConfirmSignatureDto {
  userId: string;
  /** Optional private string combined into hash (simulates key-based signing) */
  signingKey?: string;
}

export interface UpdateCustomConditionsDto {
  lawyerUserId: string;
  customConditions: string;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

/**
 * 1.00% expressed as a decimal fraction — feePercent stores 0.007 = 0.7%, 0.01 = 1.0%.
 * Rule 1: SUM(mediator feePercent) MUST NOT exceed this value.
 */
const MEDIATOR_CAP = 0.01; // 1.00% = 0.01 in decimal fraction representation

/**
 * LegalContractService — Legal Ecosystem & Temple of Heaven
 *
 * Enforces four immutable rules (Separation of Powers):
 *
 *  Rule 1 – 1% Mediator Cap
 *    SUM(feePercent) across all MEDIATOR signatories ≤ 1.00%
 *
 *  Rule 2 – Rank Clearance
 *    NOTARY signatory's notaryRank ≥ contract.requiredRank
 *
 *  Rule 3 – Template Origin
 *    Contracts created ONLY via generateFromTemplate().
 *    bankRequisites & legalAddress are immutable.
 *    Lawyers may ONLY update customConditions.
 *
 *  Rule 4 – Multi-Signature Activation
 *    ACTIVE only when: ≥1 confirmed LAWYER + ≥1 confirmed NOTARY
 *    (with rank ≥ requiredRank) + ALL MEDIATORs confirmed.
 */
@Injectable()
export class LegalContractService {
  private readonly logger = new Logger(LegalContractService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // RULE 3: Generate from Template (only origin)
  // ──────────────────────────────────────────────

  async generateFromTemplate(dto: GenerateFromTemplateDto) {
    const template = await this.prisma.contractTemplate.findUnique({
      where: { id: dto.templateId },
    });
    if (!template || !template.isActive) {
      throw new NotFoundException(
        `ContractTemplate ${dto.templateId} not found or inactive.`,
      );
    }
    if (dto.partyAId === dto.partyBId) {
      throw new BadRequestException('Party A and Party B cannot be the same person.');
    }

    const now = new Date();
    const expiresAt = dto.expiresAt ?? new Date(now.getFullYear() + 2, now.getMonth(), now.getDate());

    const contract = await this.prisma.legalContract.create({
      data: {
        templateId: dto.templateId,
        title: dto.title,
        partyAId: dto.partyAId,
        partyBId: dto.partyBId,
        bankRequisites: dto.bankRequisites as object,
        legalAddress: dto.legalAddress,
        status: ContractStatus.DRAFT,
        requiredRank: template.requiredRank,
        expiresAt,
      },
      include: { template: { select: { code: true, title: true, requiredRank: true } } },
    });

    this.logger.log(`✓ Contract ${contract.id} created from template ${template.code}`);
    return contract;
  }

  // ──────────────────────────────────────────────
  // Rule 3: Lawyer updates customConditions ONLY
  // ──────────────────────────────────────────────

  async updateCustomConditions(contractId: string, dto: UpdateCustomConditionsDto) {
    const contract = await this.getContractOrThrow(contractId);
    if (contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.ARCHIVED || contract.status === ContractStatus.REVOKED) {
      throw new ForbiddenException(`Cannot modify contract in status ${contract.status}.`);
    }

    // Verify this userId is a LAWYER signatory for this contract
    const lawyerSlot = await this.prisma.contractSignatory.findUnique({
      where: { contractId_userId: { contractId, userId: dto.lawyerUserId } },
    });
    if (!lawyerSlot || lawyerSlot.role !== SignatoryRole.LAWYER) {
      throw new ForbiddenException(
        'Only a confirmed LAWYER signatory may update customConditions. ' +
        'Rule 3: bankRequisites and legalAddress are immutable.',
      );
    }

    return this.prisma.legalContract.update({
      where: { id: contractId },
      data: { customConditions: dto.customConditions },
    });
  }

  // ──────────────────────────────────────────────
  // RULE 1 + 2: Add Signatory
  // ──────────────────────────────────────────────

  async addSignatory(contractId: string, dto: AddSignatoryDto) {
    const contract = await this.getContractOrThrow(contractId);

    if (contract.status === ContractStatus.ACTIVE || contract.status === ContractStatus.ARCHIVED || contract.status === ContractStatus.REVOKED) {
      throw new BadRequestException(`Cannot add signatories to a contract in status ${contract.status}.`);
    }

    // Prevent duplicate slot
    const existing = await this.prisma.contractSignatory.findUnique({
      where: { contractId_userId: { contractId, userId: dto.userId } },
    });
    if (existing) {
      throw new ConflictException(`User ${dto.userId} already has a signatory slot on contract ${contractId}.`);
    }

    // ── Rule 2: Rank Clearance ──
    if (dto.role === SignatoryRole.NOTARY) {
      if (!dto.notaryRank) {
        throw new BadRequestException('NOTARY signatories must provide notaryRank.');
      }
      if (dto.notaryRank < contract.requiredRank) {
        throw new ForbiddenException(
          `Ранг нотариуса ${dto.notaryRank} недостаточен для данного контракта ` +
          `(требуется ≥ ${contract.requiredRank}). Rule 2: Rank Clearance.`,
        );
      }
    }

    // ── Rule 1: 1% Mediator Cap ──
    if (dto.role === SignatoryRole.MEDIATOR) {
      if (dto.feePercent == null) {
        throw new BadRequestException('MEDIATOR signatories must provide feePercent.');
      }
      if (dto.feePercent <= 0) {
        throw new BadRequestException('MEDIATOR feePercent must be positive (e.g. 0.003 = 0.3%).');
      }
      // Sum existing mediator fees
      const existingMediators = await this.prisma.contractSignatory.findMany({
        where: { contractId, role: SignatoryRole.MEDIATOR },
        select: { feePercent: true },
      });
      const currentTotal = existingMediators.reduce(
        (sum, m) => sum + Number(m.feePercent ?? 0),
        0,
      );
      const newTotal = currentTotal + dto.feePercent;
      if (newTotal > MEDIATOR_CAP) {
        throw new BadRequestException(
          `Превышен лимит комиссии Канцелярии — max 1%. ` +
          `Текущий суммарный процент: ${(currentTotal * 100).toFixed(4)}%, ` +
          `запрошено добавить: ${(dto.feePercent * 100).toFixed(4)}%, ` +
          `итого: ${(newTotal * 100).toFixed(4)}%. Rule 1.`,
        );
      }
    }

    const signatory = await this.prisma.contractSignatory.create({
      data: {
        contractId,
        userId: dto.userId,
        role: dto.role,
        notaryRank: dto.notaryRank,
        feePercent: dto.feePercent != null ? new Prisma.Decimal(dto.feePercent) : undefined,
      },
    });

    // Transition to PENDING_SIGNATURES on first signatory
    if (contract.status === ContractStatus.DRAFT) {
      await this.prisma.legalContract.update({
        where: { id: contractId },
        data: { status: ContractStatus.PENDING_SIGNATURES },
      });
    }

    return signatory;
  }

  // ──────────────────────────────────────────────
  // CONFIRM SIGNATURE — per-signatory SHA-256
  // ──────────────────────────────────────────────

  async confirmSignature(contractId: string, dto: ConfirmSignatureDto) {
    const slot = await this.prisma.contractSignatory.findUnique({
      where: { contractId_userId: { contractId, userId: dto.userId } },
    });
    if (!slot) throw new NotFoundException(`No signatory slot for user ${dto.userId} on contract ${contractId}.`);
    if (slot.isConfirmed) throw new ConflictException(`User ${dto.userId} already confirmed.`);

    const now = new Date();
    const sigInput = [dto.userId, contractId, slot.role, now.toISOString(), dto.signingKey ?? ''].join('|');
    const signatureHash = createHash('sha256').update(sigInput, 'utf8').digest('hex');

    return this.prisma.contractSignatory.update({
      where: { id: slot.id },
      data: { isConfirmed: true, confirmedAt: now, signatureHash },
    });
  }

  // ──────────────────────────────────────────────
  // RULE 4: tryActivate — multi-sig gate
  // ──────────────────────────────────────────────

  async tryActivate(contractId: string) {
    const contract = await this.prisma.legalContract.findUnique({
      where: { id: contractId },
      include: { signatories: true },
    });
    if (!contract) throw new NotFoundException(`Contract ${contractId} not found.`);
    if (contract.status === ContractStatus.ACTIVE) {
      throw new ConflictException('Contract is already ACTIVE.');
    }
    if (contract.status !== ContractStatus.PENDING_SIGNATURES) {
      throw new BadRequestException(
        `Contract must be in PENDING_SIGNATURES to activate. Current: ${contract.status}`,
      );
    }

    const sigs = contract.signatories;

    // Rule 4 checks
    const confirmedLawyers = sigs.filter(
      (s) => s.role === SignatoryRole.LAWYER && s.isConfirmed,
    );
    const confirmedNotaries = sigs.filter(
      (s) =>
        s.role === SignatoryRole.NOTARY &&
        s.isConfirmed &&
        (s.notaryRank ?? 0) >= contract.requiredRank,
    );
    const allMediators = sigs.filter((s) => s.role === SignatoryRole.MEDIATOR);
    const confirmedMediators = allMediators.filter((s) => s.isConfirmed);

    const issues: string[] = [];
    if (confirmedLawyers.length < 1) issues.push('нет подтверждённого Юриста (≥1 LAWYER required)');
    if (confirmedNotaries.length < 1)
      issues.push(
        `нет подтверждённого Нотариуса с рангом ≥ ${contract.requiredRank}`,
      );
    if (confirmedMediators.length < allMediators.length) {
      issues.push(
        `Посредники не подписали (${confirmedMediators.length}/${allMediators.length})`,
      );
    }

    if (issues.length > 0) {
      throw new BadRequestException(
        `Контракт не готов к активации — не все подписи собраны. Rule 4:\n` +
        issues.map((i) => `  • ${i}`).join('\n'),
      );
    }

    // Generate final contractHash = SHA-256(all sigHashes sorted + timestamp)
    const ts = new Date();
    const hashInput = [
      ...sigs.map((s) => s.signatureHash ?? '').sort(),
      ts.toISOString(),
    ].join('|');
    const contractHash = createHash('sha256').update(hashInput, 'utf8').digest('hex');

    const updated = await this.prisma.legalContract.update({
      where: { id: contractId },
      data: { status: ContractStatus.ACTIVE, activatedAt: ts, contractHash },
    });

    this.logger.log(`✓ Contract ${contractId} ACTIVATED — hash=${contractHash.slice(0, 16)}...`);
    return updated;
  }

  // ──────────────────────────────────────────────
  // REVOKE CONTRACT
  // ──────────────────────────────────────────────

  async revokeContract(contractId: string, reason: string) {
    const contract = await this.getContractOrThrow(contractId);
    if (contract.status === ContractStatus.ARCHIVED || contract.status === ContractStatus.REVOKED) {
      throw new BadRequestException(`Contract is already ${contract.status}.`);
    }

    return this.prisma.legalContract.update({
      where: { id: contractId },
      data: { status: ContractStatus.REVOKED },
    });
  }

  // ──────────────────────────────────────────────
  // ARCHIVE CONTRACT → TempleSnapshot
  // ──────────────────────────────────────────────

  async archiveContract(contractId: string) {
    const contract = await this.prisma.legalContract.findUnique({
      where: { id: contractId },
      include: { signatories: true, template: true, snapshot: true },
    });
    if (!contract) throw new NotFoundException(`Contract ${contractId} not found.`);
    if (contract.snapshot) throw new ConflictException(`Contract ${contractId} is already archived.`);

    // Build immutable snapshot
    const snapshotJson = {
      contractId: contract.id,
      title: contract.title,
      templateCode: contract.template.code,
      status: contract.status,
      partyAId: contract.partyAId,
      partyBId: contract.partyBId,
      bankRequisites: contract.bankRequisites,
      legalAddress: contract.legalAddress,
      customConditions: contract.customConditions,
      contractHash: contract.contractHash,
      activatedAt: contract.activatedAt,
      expiresAt: contract.expiresAt,
      archivedAt: new Date().toISOString(),
      signatories: contract.signatories.map((s) => ({
        userId: s.userId,
        role: s.role,
        notaryRank: s.notaryRank,
        feePercent: s.feePercent,
        signatureHash: s.signatureHash,
        isConfirmed: s.isConfirmed,
        confirmedAt: s.confirmedAt,
      })),
    };

    const snapshotString = JSON.stringify(snapshotJson);
    const archiveHash = createHash('sha256').update(snapshotString, 'utf8').digest('hex');

    await this.prisma.$transaction(async (tx) => {
      await tx.legalContract.update({
        where: { id: contractId },
        data: { status: ContractStatus.ARCHIVED },
      });
      await tx.templeSnapshot.create({
        data: { contractId, snapshotJson, archiveHash },
      });
    });

    this.logger.log(`✓ Contract ${contractId} → Temple Archive (hash=${archiveHash.slice(0, 16)}...)`);
    return { archiveHash, archivedAt: new Date() };
  }

  // ──────────────────────────────────────────────
  // GET DETAILS
  // ──────────────────────────────────────────────

  async getContractDetails(contractId: string) {
    const contract = await this.prisma.legalContract.findUnique({
      where: { id: contractId },
      include: {
        template: { select: { code: true, title: true, requiredRank: true } },
        partyA: { select: { id: true, username: true } },
        partyB: { select: { id: true, username: true } },
        signatories: {
          include: { user: { select: { id: true, username: true } } },
          orderBy: { role: 'asc' },
        },
        snapshot: { select: { archiveHash: true, archivedAt: true } },
      },
    });
    if (!contract) throw new NotFoundException(`Contract ${contractId} not found.`);
    return contract;
  }

  // ──────────────────────────────────────────────
  // LEGAL TRACE — frontend visualization graph
  // ──────────────────────────────────────────────

  async getLegalTrace(contractId: string) {
    const contract = await this.getContractDetails(contractId);

    const nodes = [
      { id: contract.partyAId, type: 'party_a', label: contract.partyA.username },
      { id: contract.partyBId, type: 'party_b', label: contract.partyB.username },
      ...contract.signatories.map((s) => ({
        id: s.userId,
        type: s.role.toLowerCase(),
        label: s.user.username,
        rank: s.notaryRank,
        feePercent: s.feePercent,
        isConfirmed: s.isConfirmed,
        signatureHash: s.signatureHash,
      })),
    ];

    const edges = [
      ...contract.signatories.map((s) => ({
        from: s.userId,
        to: contract.id,
        type: `signs_as_${s.role.toLowerCase()}`,
        confirmed: s.isConfirmed,
      })),
      { from: contract.partyAId, to: contract.id, type: 'party_a' },
      { from: contract.partyBId, to: contract.id, type: 'party_b' },
    ];

    return {
      contractId: contract.id,
      title: contract.title,
      status: contract.status,
      contractHash: contract.contractHash,
      activatedAt: contract.activatedAt,
      expiresAt: contract.expiresAt,
      template: contract.template,
      legalAddress: contract.legalAddress,
      snapshot: contract.snapshot,
      nodes,
      edges,
      mediatorCap: MEDIATOR_CAP,
      currentMediatorTotal: contract.signatories
        .filter((s) => s.role === SignatoryRole.MEDIATOR)
        .reduce((sum, s) => sum + Number(s.feePercent ?? 0), 0),
    };
  }

  // ──────────────────────────────────────────────
  // LIST TEMPLATES
  // ──────────────────────────────────────────────

  async listTemplates(source?: string) {
    return this.prisma.contractTemplate.findMany({
      where: { isActive: true, ...(source ? { source } : {}) },
      orderBy: [{ requiredRank: 'asc' }, { code: 'asc' }],
    });
  }

  // ──────────────────────────────────────────────
  // CRON — Archive expired completed contracts → Temple Snapshot
  // ──────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkAndArchiveExpired(): Promise<void> {
    const now = new Date();
    this.logger.log(`[Cron] checkAndArchiveExpired @ ${now.toISOString()}`);

    // Expire ACTIVE contracts past expiresAt → COMPLETED first
    await this.prisma.legalContract.updateMany({
      where: {
        status: ContractStatus.ACTIVE,
        expiresAt: { lte: now },
      },
      data: { status: ContractStatus.COMPLETED },
    });

    // Find COMPLETED contracts with no snapshot yet, that have expired
    const toArchive = await this.prisma.legalContract.findMany({
      where: {
        status: ContractStatus.COMPLETED,
        expiresAt: { lte: now },
        snapshot: null,
      },
      select: { id: true },
    });

    if (toArchive.length === 0) {
      this.logger.log('[Cron] No contracts to archive.');
      return;
    }

    this.logger.log(`[Cron] Archiving ${toArchive.length} contract(s) → Temple of Heaven`);

    let archived = 0;
    for (const { id } of toArchive) {
      try {
        await this.archiveContract(id);
        archived++;
      } catch (err) {
        this.logger.error(`[Cron] Failed to archive contract ${id}: ${(err as Error).message}`);
      }
    }

    this.logger.log(`[Cron] Done — ${archived}/${toArchive.length} contracts archived.`);
  }

  // ──────────────────────────────────────────────
  // Private helper
  // ──────────────────────────────────────────────

  private async getContractOrThrow(contractId: string) {
    const contract = await this.prisma.legalContract.findUnique({
      where: { id: contractId },
    });
    if (!contract) throw new NotFoundException(`Contract ${contractId} not found.`);
    return contract;
  }
}
