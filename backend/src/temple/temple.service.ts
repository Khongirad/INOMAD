import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Contract } from 'ethers';
import { templeOfHeavenAbi } from '../blockchain/abis/templeOfHeaven.abi';
import { RecordType } from '@prisma/client';

export interface SubmitRecordDto {
  documentHash: string;
  recordType: RecordType;
  metadata?: string;
  submitterPrivateKey: string;
}

export interface VerifyRecordDto {
  verifierPrivateKey: string;
}

export interface DonationDto {
  amount: string; // in ETH
  donorPrivateKey: string;
}

@Injectable()
export class TempleOfHeavenService {
  private readonly logger = new Logger(TempleOfHeavenService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
  ) {}

  /**
   * Get Temple contract instance
   */
  private getTempleContract(privateKeyOrProvider?: string): Contract {
    const contractAddress = process.env.TEMPLE_OF_HEAVEN_ADDRESS;
    if (!contractAddress) {
      throw new Error('TEMPLE_OF_HEAVEN_ADDRESS not configured');
    }

    const signerOrProvider = privateKeyOrProvider
      ? this.blockchain.getWallet(privateKeyOrProvider)
      : this.blockchain.getProvider();

    return new Contract(contractAddress, templeOfHeavenAbi, signerOrProvider);
  }

  /**
   * Submit a record to the Temple
   */
  async submitRecord(dto: SubmitRecordDto) {
    this.logger.log(`Submitting ${dto.recordType} record`);

    const contract = this.getTempleContract(dto.submitterPrivateKey);

    // Map record type to enum
    const recordTypeMap: Record<RecordType, number> = { LIBRARY: 0, ARCHIVE: 1, CADASTRE: 2 };
    const recordTypeNum = recordTypeMap[dto.recordType];

    // Submit on-chain
    const tx = await contract.submitRecord(
      dto.documentHash,
      recordTypeNum,
      dto.metadata || '',
    );
    const receipt = await tx.wait();

    // Get submitter address (seatId)
    const wallet = this.blockchain.getWallet(dto.submitterPrivateKey);
    const submitterAddress = await wallet.getAddress();

    // Store in database
    const record = await this.prisma.templeRecord.create({
      data: {
        contractAddress: contract.target as string,
        documentHash: dto.documentHash,
        recordType: dto.recordType,
        metadata: dto.metadata,
        submitterSeatId: submitterAddress,
      },
    });

    this.logger.log(`Record ${record.id} submitted successfully`);
    return record;
  }

  /**
   * Verify a record scientifically (by council member)
   */
  async verifyRecord(recordId: string, dto: VerifyRecordDto) {
    const record = await this.prisma.templeRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new Error('Record not found');
    }

    const contract = this.getTempleContract(dto.verifierPrivateKey);

    // Verify on-chain
    const tx = await contract.verifyRecord(record.documentHash);
    await tx.wait();

    // Get verifier address
    const wallet = this.blockchain.getWallet(dto.verifierPrivateKey);
    const verifierAddress = await wallet.getAddress();

    // Update database
    const updated = await this.prisma.templeRecord.update({
      where: { id: recordId },
      data: {
        scientificVerified: true,
        scientificVerifier: verifierAddress,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(`Record ${record.id} verified`);
    return updated;
  }

  /**
   * Get record by ID
   */
  async getRecord(recordId: string) {
    return this.prisma.templeRecord.findUnique({
      where: { id: recordId },
    });
  }

  /**
   * Get records by type
   */
  async getRecordsByType(recordType: RecordType) {
    return this.prisma.templeRecord.findMany({
      where: { recordType },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get records by submitter
   */
  async getRecordsBySubmitter(submitterSeatId: string) {
    return this.prisma.templeRecord.findMany({
      where: { submitterSeatId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Make a donation to the Temple
   */
  async makeDonation(dto: DonationDto) {
    this.logger.log(`Processing donation: ${dto.amount} ETH`);

    const contract = this.getTempleContract(dto.donorPrivateKey);

    // Get donor address
    const wallet = this.blockchain.getWallet(dto.donorPrivateKey);
    const donorAddress = await wallet.getAddress();

    // Send donation
    const tx = await contract.receiveDonation({
      value: dto.amount,
    });
    await tx.wait();

    this.logger.log(`Donation of ${dto.amount} received from ${donorAddress}`);
    return {
      donor: donorAddress,
      amount: dto.amount,
      transactionHash: tx.hash,
    };
  }

  /**
   * Get Temple donation balance
   */
  async getDonationBalance() {
    const contract = this.getTempleContract();
    const balance = await contract.getDonationBalance();
    return {
      balance: balance.toString(),
    };
  }

  /**
   * Get Temple statistics
   */
  async getStatistics() {
    const [
      totalRecords,
      scientificVerified,
      libraryRecords,
      archiveRecords,
      cadastreRecords,
    ] = await Promise.all([
      this.prisma.templeRecord.count(),
      this.prisma.templeRecord.count({ where: { scientificVerified: true } }),
      this.prisma.templeRecord.count({ where: { recordType: 'LIBRARY' } }),
      this.prisma.templeRecord.count({ where: { recordType: 'ARCHIVE' } }),
      this.prisma.templeRecord.count({ where: { recordType: 'CADASTRE' } }),
    ]);

    return {
      totalRecords,
      scientificVerified,
      unverifiedRecords: totalRecords - scientificVerified,
      byType: {
        library: libraryRecords,
        archive: archiveRecords,
        cadastre: cadastreRecords,
      },
    };
  }
}
