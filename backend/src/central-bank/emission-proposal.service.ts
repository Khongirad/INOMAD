import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

type EmissionProposalStatus =
  | 'PROPOSED'
  | 'APPROVED_PENDING_TIMELOCK'
  | 'EXECUTABLE'
  | 'EXECUTED'
  | 'REJECTED'
  | 'EXPIRED';

type EmissionProposalType = 'MINT' | 'BURN';


const TIMELOCK_HOURS = 24;
const PROPOSAL_EXPIRY_DAYS = 7;
const DEFAULT_QUORUM = 3;

export interface CreateProposalDto {
  proposalType: 'MINT' | 'BURN';
  amount: number;
  corrAccountId?: string;
  recipientAddress?: string;
  reason: string;
  legalBasis?: string;
}

@Injectable()
export class EmissionProposalService {
  private readonly logger = new Logger(EmissionProposalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchain: BlockchainService,
  ) {}

  /**
   * CB Governor creates an emission/burn proposal.
   * The proposal enters PROPOSED state and awaits Board approvals.
   */
  async createProposal(governorId: string, dto: CreateProposalDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    if (!dto.reason?.trim()) {
      throw new BadRequestException('Reason is required');
    }
    if (!dto.corrAccountId && !dto.recipientAddress) {
      throw new BadRequestException('Either corrAccountId or recipientAddress is required');
    }

    // Verify corrAccount if provided
    if (dto.corrAccountId) {
      const corrAccount = await this.prisma.corrAccount.findUnique({
        where: { id: dto.corrAccountId },
        include: { license: true },
      });
      if (!corrAccount) throw new NotFoundException('Correspondent account not found');
      if (corrAccount.license.status !== 'ACTIVE') {
        throw new BadRequestException('Cannot emit to suspended/revoked bank');
      }
      if (dto.proposalType === 'BURN' && Number(corrAccount.balance) < dto.amount) {
        throw new BadRequestException(
          `Insufficient balance. Balance: ${corrAccount.balance}, Requested: ${dto.amount}`,
        );
      }
    }

    const expiresAt = new Date(Date.now() + PROPOSAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const proposal = await this.prisma.emissionProposal.create({
      data: {
        proposalType: dto.proposalType as EmissionProposalType,
        amount: dto.amount,
        corrAccountId: dto.corrAccountId,
        recipientAddress: dto.recipientAddress,
        reason: dto.reason,
        legalBasis: dto.legalBasis,
        status: 'PROPOSED',
        proposedById: governorId,
        quorumRequired: DEFAULT_QUORUM,
      },
    });

    this.logger.log(
      `📋 Emission proposal CREATED: ${dto.proposalType} ${dto.amount} ALTAN — by ${governorId}`,
    );

    return {
      ok: true,
      proposal: this.formatProposal(proposal),
      message: `Proposal ${proposal.id} created. Requires ${DEFAULT_QUORUM} Board approvals.`,
    };
  }

  /**
   * CB Board member approves a proposal.
   * Once quorum is reached, 24h timelock begins automatically.
   */
  async approveProposal(approverId: string, proposalId: string, note?: string) {
    const proposal = await this.prisma.emissionProposal.findUnique({
      where: { id: proposalId },
      include: { approvals: true },
    });

    if (!proposal) throw new NotFoundException('Proposal not found');

    if (proposal.status !== 'PROPOSED') {
      throw new BadRequestException(
        `Proposal is in status ${proposal.status} — cannot approve`,
      );
    }

    // Check expiry
    const expiresAt = new Date(
      proposal.createdAt.getTime() + PROPOSAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    if (new Date() > expiresAt) {
      await this.prisma.emissionProposal.update({
        where: { id: proposalId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Proposal has expired');
    }

    // Check duplicate vote
    const alreadyApproved = proposal.approvals.find((a) => a.approverId === approverId);
    if (alreadyApproved) {
      throw new ConflictException('You have already approved this proposal');
    }

    // Create approval record
    await this.prisma.emissionApproval.create({
      data: { proposalId, approverId, approverNote: note },
    });

    const newCount = proposal.approvalsCount + 1;

    // Check if quorum reached
    const quorumReached = newCount >= proposal.quorumRequired;
    const now = new Date();
    const executableAfter = quorumReached
      ? new Date(now.getTime() + TIMELOCK_HOURS * 60 * 60 * 1000)
      : null;

    const updated = await this.prisma.emissionProposal.update({
      where: { id: proposalId },
      data: {
        approvalsCount: newCount,
        status: quorumReached ? 'APPROVED_PENDING_TIMELOCK' : 'PROPOSED',
        quorumReachedAt: quorumReached ? now : undefined,
        executableAfter: executableAfter ?? undefined,
      },
    });

    if (quorumReached) {
      this.logger.log(
        `✅ Proposal ${proposalId}: QUORUM REACHED (${newCount}/${proposal.quorumRequired}). Executable after ${executableAfter?.toISOString()}`,
      );
    } else {
      this.logger.log(
        `👍 Proposal ${proposalId}: approval ${newCount}/${proposal.quorumRequired} by ${approverId}`,
      );
    }

    return {
      ok: true,
      approvalsCount: newCount,
      quorumRequired: proposal.quorumRequired,
      quorumReached,
      executableAfter: executableAfter?.toISOString() ?? null,
      message: quorumReached
        ? `Quorum reached! Proposal executable after ${executableAfter?.toISOString()}`
        : `Approval recorded (${newCount}/${proposal.quorumRequired} required)`,
    };
  }

  /**
   * Execute a proposal after quorum + timelock.
   * Calls the on-chain EmissionMultiSig contract, then records txHash.
   * This is permissionless after timelock — anyone can trigger execution.
   */
  async executeProposal(executorId: string, proposalId: string) {
    const proposal = await this.prisma.emissionProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal) throw new NotFoundException('Proposal not found');

    if (proposal.status !== 'APPROVED_PENDING_TIMELOCK') {
      throw new BadRequestException(
        `Proposal is in status ${proposal.status} — cannot execute`,
      );
    }

    if (!proposal.executableAfter || new Date() < proposal.executableAfter) {
      const remaining = proposal.executableAfter
        ? Math.ceil((proposal.executableAfter.getTime() - Date.now()) / 1000 / 60)
        : TIMELOCK_HOURS * 60;
      throw new BadRequestException(
        `Timelock not expired. Executable in ${remaining} minutes`,
      );
    }

    // Check expiry
    const expiresAt = new Date(
      proposal.createdAt.getTime() + PROPOSAL_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    );
    if (new Date() > expiresAt) {
      await this.prisma.emissionProposal.update({
        where: { id: proposalId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Proposal has expired during timelock');
    }

    // Mark as executing
    await this.prisma.emissionProposal.update({
      where: { id: proposalId },
      data: { status: 'EXECUTED', executedById: executorId, executedAt: new Date() },
    });

    // ── On-chain execution ────────────────────────────────────────────────────
    let txHash: string | null = null;
    let blockNumber: bigint | null = null;

    try {
      const result = await this.blockchain.executeEmissionProposal(
        proposal.proposalType,
        Number(proposal.amount),
        proposal.recipientAddress ?? null,
        proposal.corrAccountId ?? null,
      );
      txHash = result.txHash;
      blockNumber = result.blockNumber ? BigInt(result.blockNumber) : null;

      this.logger.log(
        `⛓️  On-chain ${proposal.proposalType} executed: txHash=${txHash}`,
      );
    } catch (err) {
      // If on-chain call fails, revert to APPROVED_PENDING for retry
      await this.prisma.emissionProposal.update({
        where: { id: proposalId },
        data: {
          status: 'APPROVED_PENDING_TIMELOCK',
          executedById: null,
          executedAt: null,
        },
      });
      this.logger.error(`❌ On-chain execution failed for proposal ${proposalId}: ${err.message}`);
      throw new BadRequestException(`On-chain execution failed: ${err.message}`);
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Save txHash
    await this.prisma.emissionProposal.update({
      where: { id: proposalId },
      data: { txHash, blockNumber },
    });

    // Also update the EmissionRecord if one exists (for backward compat)
    try {
      await this.prisma.emissionRecord.create({
        data: {
          type: proposal.proposalType === 'MINT' ? 'MINT' : 'BURN',
          amount: proposal.amount,
          reason: `[MultiSig Proposal ${proposalId}] ${proposal.reason}`,
          corrAccountId: proposal.corrAccountId,
          txHash,
          blockNumber,
          status: 'COMPLETED',
        },
      });
    } catch (_) {
      // Non-critical — proposal already recorded
    }

    this.logger.log(
      `✅ Proposal ${proposalId} EXECUTED on-chain. txHash: ${txHash}`,
    );

    return {
      ok: true,
      proposalId,
      txHash,
      blockNumber: blockNumber?.toString() ?? null,
      amount: proposal.amount.toString(),
      type: proposal.proposalType,
      message: `${proposal.proposalType} of ${proposal.amount} ALTAN executed on-chain`,
    };
  }

  /**
   * Governor rejects a proposal.
   */
  async rejectProposal(governorId: string, proposalId: string, reason: string) {
    const proposal = await this.prisma.emissionProposal.findUnique({
      where: { id: proposalId },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    if (!['PROPOSED', 'APPROVED_PENDING_TIMELOCK'].includes(proposal.status)) {
      throw new BadRequestException('Proposal cannot be rejected in its current state');
    }

    await this.prisma.emissionProposal.update({
      where: { id: proposalId },
      data: { status: 'REJECTED', rejectedById: governorId, rejectionReason: reason },
    });

    this.logger.log(`❌ Proposal ${proposalId} REJECTED by ${governorId}: ${reason}`);

    return { ok: true, message: `Proposal ${proposalId} rejected` };
  }

  /**
   * Get all proposals (public — for governance transparency).
   */
  async getProposals(status?: EmissionProposalStatus) {
    const proposals = await this.prisma.emissionProposal.findMany({
      where: status ? { status } : undefined,
      include: { approvals: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      ok: true,
      proposals: proposals.map(this.formatProposal.bind(this)),
    };
  }

  /**
   * Get a single proposal by ID.
   */
  async getProposal(proposalId: string) {
    const proposal = await this.prisma.emissionProposal.findUnique({
      where: { id: proposalId },
      include: { approvals: true },
    });
    if (!proposal) throw new NotFoundException('Proposal not found');
    return { ok: true, proposal: this.formatProposal(proposal) };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private formatProposal(p: any) {
    const now = Date.now();
    const timelockRemaining =
      p.executableAfter && now < new Date(p.executableAfter).getTime()
        ? Math.ceil((new Date(p.executableAfter).getTime() - now) / 1000)
        : 0;

    return {
      id: p.id,
      type: p.proposalType,
      amount: p.amount?.toString(),
      corrAccountId: p.corrAccountId,
      recipientAddress: p.recipientAddress,
      reason: p.reason,
      legalBasis: p.legalBasis,
      status: p.status,
      proposedById: p.proposedById,
      approvalsCount: p.approvalsCount,
      quorumRequired: p.quorumRequired,
      approvals: p.approvals?.map((a: any) => ({
        approverId: a.approverId,
        approvedAt: a.approvedAt?.toISOString(),
        note: a.approverNote,
      })) ?? [],
      quorumReachedAt: p.quorumReachedAt?.toISOString() ?? null,
      executableAfter: p.executableAfter?.toISOString() ?? null,
      timelockRemainingSeconds: timelockRemaining,
      txHash: p.txHash ?? null,
      blockNumber: p.blockNumber?.toString() ?? null,
      executedAt: p.executedAt?.toISOString() ?? null,
      executedById: p.executedById ?? null,
      rejectionReason: p.rejectionReason ?? null,
      createdAt: p.createdAt?.toISOString(),
    };
  }
}
