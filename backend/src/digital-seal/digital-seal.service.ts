import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Contract, keccak256, toUtf8Bytes} from 'ethers';
import { digitalSealAbi } from '../blockchain/abis/digitalSeal.abi';

export interface CreateSealDto {
  signer1SeatId: string;
  signer2SeatId: string;
  title?: string;
  description?: string;
  documentHash?: string;
}

export interface ApproveSealDto {
  seatId: string;
  privateKey: string;
}

@Injectable()
export class DigitalSealService {
  private readonly logger = new Logger(DigitalSealService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new DigitalSeal contract between two signers
   */
  async createSeal(dto: CreateSealDto) {
    this.logger.log(`Creating DigitalSeal for ${dto.signer1SeatId} and ${dto.signer2SeatId}`);

    // Get signer addresses from seat IDs
    const signer1 = await this.prisma.user.findUnique({
      where: { seatId: dto.signer1SeatId },
      select: { walletAddress: true },
    });

    const signer2 = await this.prisma.user.findUnique({
      where: { seatId: dto.signer2SeatId },
      select: { walletAddress: true },
    });

    if (!signer1?.walletAddress || !signer2?.walletAddress) {
      throw new Error('One or both signers do not have wallet addresses');
    }

    // Get deployment private key from environment (should be backend admin key)
    const deployerKey = this.configService.get<string>('DEPLOYER_PRIVATE_KEY');
    if (!deployerKey) {
      throw new Error('DEPLOYER_PRIVATE_KEY not configured - required for contract deployment');
    }

    // Deploy DigitalSeal contract
    // Note: You'll need to add the contract bytecode
    const digitalSealBytecode = process.env.DIGITAL_SEAL_BYTECODE;
    if (!digitalSealBytecode) {
      this.logger.warn('DIGITAL_SEAL_BYTECODE not set - using mock deployment');
      // For now, create seal without actual blockchain deployment
      // In production, this should throw an error
    }

    let contractAddress = '';
    
    if (digitalSealBytecode) {
      try {
        const contract = await this.blockchain.deployContract(
          digitalSealAbi,
          digitalSealBytecode,
          deployerKey,
          signer1.walletAddress,
          signer2.walletAddress,
        );
        contractAddress = await contract.getAddress();
        this.logger.log(`DigitalSeal deployed at: ${contractAddress}`);
      } catch (error) {
        this.logger.error('Contract deployment failed', error);
        throw new Error('Failed to deploy DigitalSeal contract');
      }
    }

    // Store in database
    const seal = await this.prisma.digitalSeal.create({
      data: {
        contractAddress,
        signer1SeatId: dto.signer1SeatId,
        signer2SeatId: dto.signer2SeatId,
        title: dto.title,
        description: dto.description,
        documentHash: dto.documentHash,
      },
    });

    return seal;
  }

  /**
   * Approve a seal by one of the signers
   */
  async approveSeal(sealId: string, dto: ApproveSealDto) {
    const seal = await this.prisma.digitalSeal.findUnique({
      where: { id: sealId },
    });

    if (!seal) {
      throw new Error('Seal not found');
    }

    if (seal.executed) {
      throw new Error('Seal already executed');
    }

    // Verify caller is one of the signers
    if (dto.seatId !== seal.signer1SeatId && dto.seatId !== seal.signer2SeatId) {
      throw new Error('Caller is not a signer');
    }

    // Create contract instance (read-only for now)
    const provider = this.blockchain.getProvider();
    if (!provider) {
      throw new Error('Blockchain provider not available');
    }
    const contract = new Contract(
      seal.contractAddress,
      digitalSealAbi,
      provider,
    );

    // Create document hash
    const txHash = seal.documentHash || keccak256(toUtf8Bytes(`${seal.title || ''}_${seal.id}`));

    // Approve on-chain
    const tx = await contract.approve(txHash);
    await tx.wait();

    // Update database
    const isSigner1 = dto.seatId === seal.signer1SeatId;
    const updated = await this.prisma.digitalSeal.update({
      where: { id: sealId },
      data: {
        approvalCount: { increment: 1 },
        signer1Approved: isSigner1 ? true : seal.signer1Approved,
        signer2Approved: !isSigner1 ? true : seal.signer2Approved,
      },
    });

    this.logger.log(`Seal ${sealId} approved by ${dto.seatId}. Total approvals: ${updated.approvalCount}`);

    return updated;
  }

  /**
   * Revoke approval for a seal
   */
  async revokeSeal(sealId: string, dto: ApproveSealDto) {
    const seal = await this.prisma.digitalSeal.findUnique({
      where: { id: sealId },
    });

    if (!seal) {
      throw new Error('Seal not found');
    }

    if (seal.executed) {
      throw new Error('Cannot revoke executed seal');
    }

    // Verify caller is one of the signers
    if (dto.seatId !== seal.signer1SeatId && dto.seatId !== seal.signer2SeatId) {
      throw new Error('Caller is not a signer');
    }

    const provider = this.blockchain.getProvider();
    if (!provider) {
      throw new Error('Blockchain provider not available');
    }
    const contract = new Contract(
      seal.contractAddress,
      digitalSealAbi,
      provider,
    );

    const txHash = seal.documentHash || keccak256(toUtf8Bytes(`${seal.title || ''}_${seal.id}`));

    // Revoke on-chain
    const tx = await contract.revoke(txHash);
    await tx.wait();

    // Update database
    const isSigner1 = dto.seatId === seal.signer1SeatId;
    const updated = await this.prisma.digitalSeal.update({
      where: { id: sealId },
      data: {
        approvalCount: { decrement: 1 },
        signer1Approved: isSigner1 ? false : seal.signer1Approved,
        signer2Approved: !isSigner1 ? false : seal.signer2Approved,
      },
    });

    this.logger.log(`Seal ${sealId} revoked by ${dto.seatId}`);

    return updated;
  }

  /**
   * Execute a seal after both approvals
   */
  async executeSeal(sealId: string, dto: ApproveSealDto) {
    const seal = await this.prisma.digitalSeal.findUnique({
      where: { id: sealId },
    });

    if (!seal) {
      throw new Error('Seal not found');
    }

    if (seal.executed) {
      throw new Error('Seal already executed');
    }

    if (seal.approvalCount < 2) {
      throw new Error('Insufficient approvals');
    }

    // Verify caller is one of the signers
    if (dto.seatId !== seal.signer1SeatId && dto.seatId !== seal.signer2SeatId) {
      throw new Error('Caller is not a signer');
    }

    const provider = this.blockchain.getProvider();
    if (!provider) {
      throw new Error('Blockchain provider not available');
    }
    const contract = new Contract(
      seal.contractAddress,
      digitalSealAbi,
      provider,
    );

    const txHash = seal.documentHash || keccak256(toUtf8Bytes(`${seal.title || ''}_${seal.id}`));

    // Execute on-chain
    const tx = await contract.execute(txHash, '0x');
    await tx.wait();

    // Update database
    const updated = await this.prisma.digitalSeal.update({
      where: { id: sealId },
      data: {
        executed: true,
        executedAt: new Date(),
      },
    });

    this.logger.log(`Seal ${sealId} executed`);

    return updated;
  }

  /**
   * Get seal status from blockchain
   */
  async getSealStatus(sealId: string) {
    const seal = await this.prisma.digitalSeal.findUnique({
      where: { id: sealId },
    });

    if (!seal) {
      throw new Error('Seal not found');
    }

    const provider = this.blockchain.getProvider();
    if (!provider) {
      throw new Error('Blockchain provider not available');
    }
    const contract = new Contract(
      seal.contractAddress,
      digitalSealAbi,
      provider,
    );

    const txHash = seal.documentHash || keccak256(toUtf8Bytes(`${seal.title || ''}_${seal.id}`));

    // Get on-chain status
    const [approved, isExecuted, approvals] = await contract.verify(txHash);

    return {
      ...seal,
      onChain: {
        approved,
        executed: isExecuted,
        approvalCount: Number(approvals),
      },
    };
  }

  /**
   * Get all seals for a user
   */
  async getSealsForUser(seatId: string) {
    const seals = await this.prisma.digitalSeal.findMany({
      where: {
        OR: [
          { signer1SeatId: seatId },
          { signer2SeatId: seatId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return seals;
  }

  /**
   * Get seal by ID
   */
  async getSeal(sealId: string) {
    return this.prisma.digitalSeal.findUnique({
      where: { id: sealId },
    });
  }
}
