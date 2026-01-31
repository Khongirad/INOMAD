import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Contract } from 'ethers';
import { academyOfSciencesAbi } from '../blockchain/abis/academyOfSciences.abi';

export interface SubmitPatentDto {
  submitterSeatId: string;
  patentHash: string;
  title: string;
  field: string;
  privateKey: string;
}

export interface ReviewPatentDto {
  reviewerPrivateKey: string;
  approve: boolean;
  notes: string;
}

export interface RegisterDiscoveryDto {
  scientistSeatId: string;
  discoveryHash: string;
  title: string;
  description: string;
  privateKey: string;
}

export interface PeerReviewDto {
  reviewerPrivateKey: string;
}

export interface RequestGrantDto {
  scientistSeatId: string;
  projectTitle: string;
  description: string;
  amount: string; // Wei amount as string
  privateKey: string;
}

export interface ApproveGrantDto {
  reviewerPrivateKey: string;
  approvedAmount: string;
}

@Injectable()
export class AcademyOfSciencesService {
  private readonly logger = new Logger(AcademyOfSciencesService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Get Academy contract instance
   */
  private getAcademyContract(privateKeyOrProvider?: string): Contract {
    const contractAddress = process.env.ACADEMY_OF_SCIENCES_ADDRESS;
    if (!contractAddress) {
      throw new Error('ACADEMY_OF_SCIENCES_ADDRESS not configured');
    }

    const signerOrProvider = privateKeyOrProvider
      ? this.blockchain.getWallet(privateKeyOrProvider)
      : this.blockchain.provider;

    return new Contract(contractAddress, academyOfSciencesAbi, signerOrProvider);
  }

  // ============ Patent Management ============

  /**
   * Submit a new patent
   */
  async submitPatent(dto: SubmitPatentDto) {
    this.logger.log(`Submitting patent: ${dto.title}`);

    const contract = this.getAcademyContract(dto.privateKey);

    // Submit on-chain
    const tx = await contract.submitPatent(
      dto.patentHash,
      dto.title,
      dto.field,
      dto.submitterSeatId,
    );
    const receipt = await tx.wait();

    // Extract patentId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'PatentSubmitted');
    const patentId = event ? Number(event.args[0]) : 0;

    // Store in database
    const patent = await this.prisma.patent.create({
      data: {
        patentId,
        submitterSeatId: dto.submitterSeatId,
        patentHash: dto.patentHash,
        title: dto.title,
        field: dto.field,
        status: 'PENDING',
      },
    });

    this.logger.log(`Patent ${patentId} submitted successfully`);
    return patent;
  }

  /**
   * Review a patent (approve/reject)
   */
  async reviewPatent(patentId: string, dto: ReviewPatentDto) {
    const patent = await this.prisma.patent.findUnique({
      where: { id: patentId },
    });

    if (!patent) {
      throw new Error('Patent not found');
    }

    const contract = this.getAcademyContract(dto.reviewerPrivateKey);

    // Review on-chain
    const tx = await contract.reviewPatent(patent.patentId, dto.approve, dto.notes);
    await tx.wait();

    // Update database
    const updated = await this.prisma.patent.update({
      where: { id: patentId },
      data: {
        status: dto.approve ? 'APPROVED' : 'REJECTED',
        reviewedAt: new Date(),
        reviewNotes: dto.notes,
      },
    });

    this.logger.log(`Patent ${patent.patentId} ${dto.approve ? 'approved' : 'rejected'}`);
    return updated;
  }

  /**
   * Get patent by ID
   */
  async getPatent(patentId: string) {
    return this.prisma.patent.findUnique({
      where: { id: patentId },
    });
  }

  /**
   * Get all patents by submitter
   */
  async getPatentsBySubmitter(seatId: string) {
    return this.prisma.patent.findMany({
      where: { submitterSeatId: seatId },
      orderBy: { submittedAt: 'desc' },
    });
  }

  // ============ Discovery Management ============

  /**
   * Register a scientific discovery
   */
  async registerDiscovery(dto: RegisterDiscoveryDto) {
    this.logger.log(`Registering discovery: ${dto.title}`);

    const contract = this.getAcademyContract(dto.privateKey);

    // Register on-chain
    const tx = await contract.registerDiscovery(
      dto.discoveryHash,
      dto.title,
      dto.description,
      dto.scientistSeatId,
    );
    const receipt = await tx.wait();

    // Extract discoveryId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'DiscoveryRegistered');
    const discoveryId = event ? Number(event.args[0]) : 0;

    // Store in database
    const discovery = await this.prisma.discovery.create({
      data: {
        discoveryId,
        scientistSeatId: dto.scientistSeatId,
        discoveryHash: dto.discoveryHash,
        title: dto.title,
        description: dto.description,
      },
    });

    this.logger.log(`Discovery ${discoveryId} registered successfully`);
    return discovery;
  }

  /**
   * Peer review a discovery
   */
  async peerReviewDiscovery(discoveryId: string, dto: PeerReviewDto) {
    const discovery = await this.prisma.discovery.findUnique({
      where: { id: discoveryId },
    });

    if (!discovery) {
      throw new Error('Discovery not found');
    }

    const contract = this.getAcademyContract(dto.reviewerPrivateKey);

    // Peer review on-chain
    const tx = await contract.peerReviewDiscovery(discovery.discoveryId);
    await tx.wait();

    // Update database
    const updated = await this.prisma.discovery.update({
      where: { id: discoveryId },
      data: {
        peerReviews: { increment: 1 },
      },
    });

    this.logger.log(`Discovery ${discovery.discoveryId} peer reviewed. Total reviews: ${updated.peerReviews}`);
    return updated;
  }

  /**
   * Get discovery by ID
   */
  async getDiscovery(discoveryId: string) {
    return this.prisma.discovery.findUnique({
      where: { id: discoveryId },
    });
  }

  /**
   * Get all discoveries by scientist
   */
  async getDiscoveriesByScientist(seatId: string) {
    return this.prisma.discovery.findMany({
      where: { scientistSeatId: seatId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ============ Research Grants ============

  /**
   * Request a research grant
   */
  async requestGrant(dto: RequestGrantDto) {
    this.logger.log(`Requesting grant: ${dto.projectTitle}`);

    const contract = this.getAcademyContract(dto.privateKey);

    // Request on-chain
    const tx = await contract.requestGrant(
      dto.projectTitle,
      dto.description,
      dto.amount,
      dto.scientistSeatId,
    );
    const receipt = await tx.wait();

    // Extract grantId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'GrantRequested');
    const grantId = event ? Number(event.args[0]) : 0;

    // Store in database
    const grant = await this.prisma.researchGrant.create({
      data: {
        grantId,
        scientistSeatId: dto.scientistSeatId,
        projectTitle: dto.projectTitle,
        description: dto.description,
        requestedAmount: BigInt(dto.amount),
        status: 'REQUESTED',
      },
    });

    this.logger.log(`Grant ${grantId} requested successfully`);
    return grant;
  }

  /**
   * Approve a research grant
   */
  async approveGrant(grantId: string, dto: ApproveGrantDto) {
    const grant = await this.prisma.researchGrant.findUnique({
      where: { id: grantId },
    });

    if (!grant) {
      throw new Error('Grant not found');
    }

    const contract = this.getAcademyContract(dto.reviewerPrivateKey);

    // Approve on-chain
    const tx = await contract.approveGrant(grant.grantId, dto.approvedAmount);
    await tx.wait();

    // Update database
    const updated = await this.prisma.researchGrant.update({
      where: { id: grantId },
      data: {
        status: 'APPROVED',
        approvedAmount: BigInt(dto.approvedAmount),
        approvedAt: new Date(),
      },
    });

    this.logger.log(`Grant ${grant.grantId} approved for ${dto.approvedAmount} wei`);
    return updated;
  }

  /**
   * Get grant by ID
   */
  async getGrant(grantId: string) {
    return this.prisma.researchGrant.findUnique({
      where: { id: grantId },
    });
  }

  /**
   * Get all grants by scientist
   */
  async getGrantsByScientist(seatId: string) {
    return this.prisma.researchGrant.findMany({
      where: { scientistSeatId: seatId },
      orderBy: { requestedAt: 'desc' },
    });
  }
}
