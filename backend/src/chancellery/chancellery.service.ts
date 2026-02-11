import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Канцелярия — Registry of all contracts, accessible by lawyers and notaries.
 * Provides access to the contract registry, dispute overview,
 * and legal certification workflows.
 */
@Injectable()
export class ChancelleryService {
  private readonly logger = new Logger(ChancelleryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if user has legal access (NOTARY, STATE_LAWYER, or JUDGE)
   * Судья имеет доступ ко ВСЕМ договорам.
   */
  private async verifyLegalAccess(userId: string) {
    // 1. Check if user has signed documents as NOTARY or STATE_LAWYER
    const legalRole = await this.prisma.documentSignature.findFirst({
      where: {
        signerId: userId,
        signerRole: { in: ['NOTARY', 'STATE_LAWYER'] },
      },
    });
    if (legalRole) return;

    // 2. Check if user has notarization records
    const notaryRecord = await this.prisma.notarizationRecord.findFirst({
      where: { notaryId: userId },
    });
    if (notaryRecord) return;

    // 3. Check if user has legal certification records
    const legalCert = await this.prisma.legalCertification.findFirst({
      where: { lawyerId: userId },
    });
    if (legalCert) return;

    // 4. Check if user is a judge (assigned to any court case)
    const judgeRecord = await this.prisma.judicialCase.findFirst({
      where: { assignedJudge: userId },
    });
    if (judgeRecord) return;

    throw new ForbiddenException(
      'Доступ к канцелярии только для нотариусов, юристов и судей',
    );
  }

  /**
   * Get contract registry — all documents with filters
   */
  async getRegistry(
    userId: string,
    filters?: {
      status?: string;
      stage?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    await this.verifyLegalAccess(userId);

    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.stage) where.currentStage = filters.stage;
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { documentNumber: { contains: filters.search, mode: 'insensitive' } },
        { registryNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [contracts, total] = await Promise.all([
      this.prisma.documentContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          documentNumber: true,
          registryNumber: true,
          title: true,
          currentStage: true,
          status: true,
          createdAt: true,
          issuer: { select: { id: true, username: true } },
          recipient: { select: { id: true, username: true } },
          intermediary: { select: { id: true, username: true } },
          transactionAmount: true,
          notarization: { select: { id: true, notarizedAt: true } },
          legalCert: { select: { id: true, compliant: true, certifiedAt: true } },
          _count: { select: { signatures: true } },
        },
      }),
      this.prisma.documentContract.count({ where }),
    ]);

    return { contracts, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get full contract details (for legal review)
   */
  async getContractDetails(userId: string, contractId: string) {
    await this.verifyLegalAccess(userId);

    const contract = await this.prisma.documentContract.findUnique({
      where: { id: contractId },
      include: {
        issuer: { select: { id: true, username: true } },
        recipient: { select: { id: true, username: true } },
        intermediary: { select: { id: true, username: true } },
        signatures: {
          include: { signer: { select: { id: true, username: true } } },
          orderBy: { signedAt: 'asc' },
        },
        notarization: {
          include: { notary: { select: { id: true, username: true } } },
        },
        legalCert: {
          include: { lawyer: { select: { id: true, username: true } } },
        },
        stages: { orderBy: { timestamp: 'asc' } },
      },
    });

    if (!contract) throw new NotFoundException('Договор не найден');
    return contract;
  }

  /**
   * Get disputes related to contracts in the registry
   */
  async getRegistryDisputes(userId: string, page = 1, limit = 20) {
    await this.verifyLegalAccess(userId);

    const skip = (page - 1) * limit;

    const [disputes, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where: { sourceType: 'CONTRACT' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          partyA: { select: { id: true, username: true } },
          partyB: { select: { id: true, username: true } },
          _count: { select: { complaints: true } },
        },
      }),
      this.prisma.dispute.count({ where: { sourceType: 'CONTRACT' } }),
    ]);

    return { disputes, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Get complaints related to contracts (for legal oversight)
   */
  async getRegistryComplaints(userId: string, page = 1, limit = 20) {
    await this.verifyLegalAccess(userId);

    const skip = (page - 1) * limit;

    const [complaints, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where: { sourceType: 'CONTRACT' },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          filer: { select: { id: true, username: true } },
          targetUser: { select: { id: true, username: true } },
          _count: { select: { responses: true, escalationHistory: true } },
        },
      }),
      this.prisma.complaint.count({ where: { sourceType: 'CONTRACT' } }),
    ]);

    return { complaints, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Chancellery statistics
   */
  async getStats(userId: string) {
    await this.verifyLegalAccess(userId);

    const [
      totalContracts,
      activeContracts,
      notarized,
      legallyCertified,
      totalDisputes,
      openDisputes,
      totalComplaints,
      activeComplaints,
    ] = await Promise.all([
      this.prisma.documentContract.count(),
      this.prisma.documentContract.count({ where: { status: 'ACTIVE' } }),
      this.prisma.notarizationRecord.count(),
      this.prisma.legalCertification.count(),
      this.prisma.dispute.count({ where: { sourceType: 'CONTRACT' } }),
      this.prisma.dispute.count({
        where: { sourceType: 'CONTRACT', status: { in: ['OPENED', 'NEGOTIATING'] } },
      }),
      this.prisma.complaint.count({ where: { sourceType: 'CONTRACT' } }),
      this.prisma.complaint.count({
        where: {
          sourceType: 'CONTRACT',
          status: { notIn: ['RESOLVED', 'DISMISSED'] },
        },
      }),
    ]);

    return {
      totalContracts,
      activeContracts,
      notarized,
      legallyCertified,
      totalDisputes,
      openDisputes,
      totalComplaints,
      activeComplaints,
    };
  }
}
