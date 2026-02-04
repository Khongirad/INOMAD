import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Contract } from 'ethers';
import { councilOfJusticeAbi } from '../blockchain/abis/councilOfJustice.abi';

export interface NominateMemberDto {
  seatId: string;
  legalEducationHash: string;
  specialization: string;
  arbanId: string;
  walletAddress: string;
  nominatorPrivateKey: string;
}

export interface ApproveMemberDto {
  judgePrivateKey: string;
}

export interface FileCaseDto {
  plaintiffSeatId: string;
  defendantSeatId: string;
  caseHash: string;
  description: string;
  rulingType: 'CIVIL' | 'CRIMINAL' | 'ADMINISTRATIVE';
  filerPrivateKey: string;
}

export interface AssignCaseDto {
  judgeSeatId: string;
  clerkPrivateKey: string;
}

export interface RuleOnCaseDto {
  rulingHash: string;
  rulingText: string;
  judgePrivateKey: string;
}

export interface RegisterPrecedentDto {
  caseId: number;
  precedentHash: string;
  summary: string;
  legalPrinciple: string;
  judgePrivateKey: string;
}

@Injectable()
export class CouncilOfJusticeService {
  private readonly logger = new Logger(CouncilOfJusticeService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Get Council contract instance
   */
  private getCouncilContract(privateKeyOrProvider?: string): Contract {
    const contractAddress = process.env.COUNCIL_OF_JUSTICE_ADDRESS;
    if (!contractAddress) {
      throw new Error('COUNCIL_OF_JUSTICE_ADDRESS not configured');
    }

    const signerOrProvider = privateKeyOrProvider
      ? this.blockchain.getWallet(privateKeyOrProvider)
      : this.blockchain.provider;

    return new Contract(contractAddress, councilOfJusticeAbi, signerOrProvider);
  }

  // ============ Member Management ============

  /**
   * Nominate a judge member
   */
  async nominateMember(dto: NominateMemberDto) {
    this.logger.log(`Nominating judge: ${dto.seatId}`);

    const contract = this.getCouncilContract(dto.nominatorPrivateKey);

    // Nominate on-chain
    const tx = await contract.nominateMember(
      dto.seatId,
      dto.legalEducationHash,
      dto.specialization,
      dto.arbanId,
      dto.walletAddress,
    );
    const receipt = await tx.wait();

    // Extract memberId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'MemberNominated');
    const memberId = event ? Number(event.args[0]) : 0;

    // Store in database
    const member = await this.prisma.councilOfJusticeMember.create({
      data: {
        memberId,
        seatId: dto.seatId,
        legalEducationHash: dto.legalEducationHash,
        nominatedByArbanId: dto.arbanId,
        specialization: dto.specialization,
        walletAddress: dto.walletAddress,
      },
    });

    this.logger.log(`Member ${memberId} nominated successfully`);
    return member;
  }

  /**
   * Approve a member nomination
   */
  async approveMember(memberId: string, dto: ApproveMemberDto) {
    const member = await this.prisma.councilOfJusticeMember.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      throw new Error('Member not found');
    }

    const contract = this.getCouncilContract(dto.judgePrivateKey);

    // Approve on-chain
    const tx = await contract.approveMember(member.memberId);
    await tx.wait();

    // Update database
    const updated = await this.prisma.councilOfJusticeMember.update({
      where: { id: memberId },
      data: {
        approvals: { increment: 1 },
      },
    });

    // Check if approved (threshold = 3)
    if (updated.approvals >= 3 && !updated.approved) {
      await this.prisma.councilOfJusticeMember.update({
        where: { id: memberId },
        data: {
          approved: true,
          approvedAt: new Date(),
        },
      });
    }

    this.logger.log(`Member ${member.memberId} approved. Total approvals: ${updated.approvals}`);
    return updated;
  }

  /**
   * Get member by ID
   */
  async getMember(memberId: string) {
    return this.prisma.councilOfJusticeMember.findUnique({
      where: { id: memberId },
    });
  }

  /**
   * Get all members by seat ID
   */
  async getMemberBySeatId(seatId: string) {
    return this.prisma.councilOfJusticeMember.findUnique({
      where: { seatId },
    });
  }

  // ============ Judicial Cases ============

  /**
   * File a new case
   */
  async fileCase(dto: FileCaseDto) {
    this.logger.log(`Filing case: ${dto.description}`);

    const contract = this.getCouncilContract(dto.filerPrivateKey);

    // Map ruling type to enum
    const rulingTypeMap = { CIVIL: 0, CRIMINAL: 1, ADMINISTRATIVE: 2 };
    const rulingType = rulingTypeMap[dto.rulingType];

    // File on-chain
    const tx = await contract.fileCase(
      dto.plaintiffSeatId,
      dto.defendantSeatId,
      dto.caseHash,
      dto.description,
      rulingType,
    );
    const receipt = await tx.wait();

    // Extract caseId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'CaseFiled');
    const caseId = event ? Number(event.args[0]) : 0;

    // Store in database
    const judicialCase = await this.prisma.judicialCase.create({
      data: {
        caseId,
        plaintiffSeatId: dto.plaintiffSeatId,
        defendantSeatId: dto.defendantSeatId,
        caseHash: dto.caseHash,
        description: dto.description,
        rulingType: dto.rulingType,
        status: 'PENDING',
      },
    });

    this.logger.log(`Case ${caseId} filed successfully`);
    return judicialCase;
  }

  /**
   * Assign a case to a judge
   */
  async assignCase(caseId: string, dto: AssignCaseDto) {
    const judicialCase = await this.prisma.judicialCase.findUnique({
      where: { id: caseId },
    });

    if (!judicialCase) {
      throw new Error('Case not found');
    }

    // Get judge wallet address
    const judge = await this.prisma.councilOfJusticeMember.findUnique({
      where: { seatId: dto.judgeSeatId },
    });

    if (!judge) {
      throw new Error('Judge not found');
    }

    const contract = this.getCouncilContract(dto.clerkPrivateKey);

    // Assign on-chain
    const tx = await contract.assignCase(judicialCase.caseId, judge.walletAddress);
    await tx.wait();

    // Update database
    const updated = await this.prisma.judicialCase.update({
      where: { id: caseId },
      data: {
        assignedJudge: judge.walletAddress,
        status: 'ASSIGNED',
      },
    });

    this.logger.log(`Case ${judicialCase.caseId} assigned to judge ${judge.walletAddress}`);
    return updated;
  }

  /**
   * Rule on a case
   */
  async ruleOnCase(caseId: string, dto: RuleOnCaseDto) {
    const judicialCase = await this.prisma.judicialCase.findUnique({
      where: { id: caseId },
    });

    if (!judicialCase) {
      throw new Error('Case not found');
    }

    const contract = this.getCouncilContract(dto.judgePrivateKey);

    // Rule on-chain
    const tx = await contract.ruleOnCase(
      judicialCase.caseId,
      dto.rulingHash,
      dto.rulingText,
    );
    await tx.wait();

    // Update database
    const updated = await this.prisma.judicialCase.update({
      where: { id: caseId },
      data: {
        rulingHash: dto.rulingHash,
        ruling: dto.rulingText,
        status: 'RULED',
        ruledAt: new Date(),
      },
    });

    this.logger.log(`Case ${judicialCase.caseId} ruled`);
    return updated;
  }

  /**
   * Get case by ID
   */
  async getCase(caseId: string) {
    return this.prisma.judicialCase.findUnique({
      where: { id: caseId },
    });
  }

  /**
   * Get cases by plaintiff
   */
  async getCasesByPlaintiff(seatId: string) {
    return this.prisma.judicialCase.findMany({
      where: { plaintiffSeatId: seatId },
      orderBy: { filedAt: 'desc' },
    });
  }

  /**
   * Get cases by defendant
   */
  async getCasesByDefendant(seatId: string) {
    return this.prisma.judicialCase.findMany({
      where: { defendantSeatId: seatId },
      orderBy: { filedAt: 'desc' },
    });
  }

  // ============ Legal Precedents ============

  /**
   * Register a legal precedent
   */
  async registerPrecedent(dto: RegisterPrecedentDto) {
    this.logger.log(`Registering precedent for case ${dto.caseId}`);

    const contract = this.getCouncilContract(dto.judgePrivateKey);

    // Register on-chain
    const tx = await contract.registerPrecedent(
      dto.caseId,
      dto.precedentHash,
      dto.summary,
      dto.legalPrinciple,
    );
    const receipt = await tx.wait();

    // Extract precedentId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'PrecedentRegistered');
    const precedentId = event ? Number(event.args[0]) : 0;

    // Get judge address from wallet
    const wallet = this.blockchain.getWallet(dto.judgePrivateKey);
    const judgeAddress = await wallet.getAddress();

    // Store in database
    const precedent = await this.prisma.legalPrecedent.create({
      data: {
        precedentId,
        sourceCaseId: dto.caseId,
        precedentHash: dto.precedentHash,
        summary: dto.summary,
        legalPrinciple: dto.legalPrinciple,
        judge: judgeAddress,
      },
    });

    this.logger.log(`Precedent ${precedentId} registered successfully`);
    return precedent;
  }

  /**
   * Get precedent by ID
   */
  async getPrecedent(precedentId: string) {
    return this.prisma.legalPrecedent.findUnique({
      where: { id: precedentId },
    });
  }

  /**
   * Get precedents by case
   */
  async getPrecedentsByCase(caseId: number) {
    return this.prisma.legalPrecedent.findMany({
      where: { sourceCaseId: caseId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
