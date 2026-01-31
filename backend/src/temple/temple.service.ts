import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { Contract } from 'ethers';
import { templeOfHeavenAbi } from '../blockchain/abis/templeOfHeaven.abi';

export interface SubmitRecordDto {
  recordHash: string;
  recordType: 'LIBRARY' | 'ARCHIVE' | 'CADASTRE';
  metadata: string;
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
      : this.blockchain.provider;

    return new Contract(contractAddress, templeOfHeavenAbi, signerOrProvider);
  }

  /**
   * Submit a record to the Temple
   */
  async submitRecord(dto: SubmitRecordDto) {
    this.logger.log(`Submitting ${dto.recordType} record`);

    const contract = this.getTempleContract(dto.submitterPrivateKey);

    // Map record type to enum
    const recordTypeMap = { LIBRARY: 0, ARCHIVE: 1, CADASTRE: 2 };
    const recordType = recordTypeMap[dto.recordType];

    // Submit on-chain
    const tx = await contract.submitRecord(
      dto.recordHash,
      recordType,
      dto.metadata,
    );
    const receipt = await tx.wait();

    // Extract recordId from event
    const event = receipt.logs.find((log: any) => log.fragment?.name === 'RecordSubmitted');
    const recordId = event ? Number(event.args[0]) : 0;

    // Get submitter address
    const wallet = this.blockchain.getWallet(dto.submitterPrivateKey);
    const submitterAddress = await wallet.getAddress();

    // Store in database
    const record = await this.prisma.templeRecord.create({
      data: {
        recordId,
        recordHash: dto.recordHash,
        recordType: dto.recordType,
        metadata: dto.metadata,
        submitter: submitterAddress,
        verified: false,
      },
    });

    this.logger.log(`Record ${recordId} submitted successfully`);
    return record;
  }

  /**
   * Verify a record (by council member)
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
    const tx = await contract.verifyRecord(record.recordId);
    await tx.wait();

    // Update database
    const updated = await this.prisma.templeRecord.update({
      where: { id: recordId },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    this.logger.log(`Record ${record.recordId} verified`);
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
  async getRecordsByType(recordType: 'LIBRARY' | 'ARCHIVE' | 'CADASTRE') {
    return this.prisma.templeRecord.findMany({
      where: { recordType },
      orderBy: { submittedAt: 'desc' },
    });
  }

  /**
   * Get records by submitter
   */
  async getRecordsBySubmitter(submitterAddress: string) {
    return this.prisma.templeRecord.findMany({
      where: { submitter: submitterAddress },
      orderBy: { submittedAt: 'desc' },
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
      value: dto.amount, // Should be in wei
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
      verifiedRecords,
      libraryRecords,
      archiveRecords,
      cadastreRecords,
    ] = await Promise.all([
      this.prisma.templeRecord.count(),
      this.prisma.templeRecord.count({ where: { verified: true } }),
      this.prisma.templeRecord.count({ where: { recordType: 'LIBRARY' } }),
      this.prisma.templeRecord.count({ where: { recordType: 'ARCHIVE' } }),
      this.prisma.templeRecord.count({ where: { recordType: 'CADASTRE' } }),
    ]);

    return {
      totalRecords,
      verifiedRecords,
      unverifiedRecords: totalRecords - verifiedRecords,
      byType: {
        library: libraryRecords,
        archive: archiveRecords,
        cadastre: cadastreRecords,
      },
    };
  }
}
