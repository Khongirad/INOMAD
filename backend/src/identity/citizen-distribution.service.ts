import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';

/**
 * Citizen Distribution Service
 * Handles automatic ALTAN distribution to newly verified citizens
 */
@Injectable()
export class CitizenDistributionService {
  private readonly logger = new Logger(CitizenDistributionService.name);

  // AltanBankOfSiberia ABI (minimal for distribution)
  private readonly bankABI = [
    'function distributeToNewCitizen(uint256 seatId, uint256 accountId) external',
    'function hasReceivedDistribution(uint256 seatId) view returns (bool)',
    'function perCitizenAmount() view returns (uint256)',
    'function totalDistributed() view returns (uint256)',
    'function distributionPool() view returns (address)',
    'function sovereignFund() view returns (address)',
  ];

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  /**
   * Check if citizen has received distribution
   */
  async hasReceivedDistribution(seatId: string): Promise<boolean> {
    if (!this.blockchain.isAvailable()) {
      this.logger.warn('Blockchain not available - cannot check distribution');
      return false;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const bankAddress = addresses?.getAddress('AltanBankOfSiberia');

      if (!bankAddress) {
        this.logger.warn('AltanBankOfSiberia contract not deployed');
        return false;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(bankAddress, this.bankABI, provider);

      return await contract.hasReceivedDistribution(seatId);
    } catch (error) {
      this.logger.error('Error checking distribution status:', error.message);
      return false;
    }
  }

  /**
   * Get per-citizen distribution amount
   */
  async getPerCitizenAmount(): Promise<string | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const bankAddress = addresses?.getAddress('AltanBankOfSiberia');

      if (!bankAddress) {
        return null;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(bankAddress, this.bankABI, provider);

      const amount = await contract.perCitizenAmount();
      return ethers.formatUnits(amount, 6); // ALTAN has 6 decimals
    } catch (error) {
      this.logger.error('Error getting per-citizen amount:', error.message);
      return null;
    }
  }

  /**
   * Get total distributed amount
   */
  async getTotalDistributed(): Promise<string | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const bankAddress = addresses?.getAddress('AltanBankOfSiberia');

      if (!bankAddress) {
        return null;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(bankAddress, this.bankABI, provider);

      const total = await contract.totalDistributed();
      return ethers.formatUnits(total, 6);
    } catch (error) {
      this.logger.error('Error getting total distributed:', error.message);
      return null;
    }
  }

  /**
   * Get distribution pool address
   */
  async getDistributionPoolAddress(): Promise<string | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const bankAddress = addresses?.getAddress('AltanBankOfSiberia');

      if (!bankAddress) {
        return null;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(bankAddress, this.bankABI, provider);

      const poolAddr = await contract.distributionPool();
      return poolAddr !== ethers.ZeroAddress ? poolAddr : null;
    } catch (error) {
      this.logger.error('Error getting distribution pool address:', error.message);
      return null;
    }
  }

  /**
   * Get distribution status for dashboard
   */
  async getDistributionStatus(): Promise<DistributionStatus> {
    if (!this.blockchain.isAvailable()) {
      return {
        perCitizenAmount: null,
        totalDistributed: null,
        distributionPool: null,
        sovereignFund: null,
      };
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const bankAddress = addresses?.getAddress('AltanBankOfSiberia');

      if (!bankAddress) {
        return {
          perCitizenAmount: null,
          totalDistributed: null,
          distributionPool: null,
          sovereignFund: null,
        };
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(bankAddress, this.bankABI, provider);

      const [perCitizen, total, pool, fund] = await Promise.all([
        contract.perCitizenAmount(),
        contract.totalDistributed(),
        contract.distributionPool(),
        contract.sovereignFund(),
      ]);

      return {
        perCitizenAmount: ethers.formatUnits(perCitizen, 6),
        totalDistributed: ethers.formatUnits(total, 6),
        distributionPool: pool !== ethers.ZeroAddress ? pool : null,
        sovereignFund: fund !== ethers.ZeroAddress ? fund : null,
      };
    } catch (error) {
      this.logger.error('Error getting distribution status:', error.message);
      return {
        perCitizenAmount: null,
        totalDistributed: null,
        distributionPool: null,
        sovereignFund: null,
      };
    }
  }

  /**
   * Check eligibility for distribution
   * User must have:
   * 1. Verified status
   * 2. SeatID assigned
   * 3. Not already received distribution
   */
  async checkEligibility(userId: string): Promise<{
    eligible: boolean;
    reason?: string;
    seatId?: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        seatId: true,
        verificationStatus: true,
      },
    });

    if (!user) {
      return { eligible: false, reason: 'User not found' };
    }

    if (!user.seatId) {
      return { eligible: false, reason: 'No SeatID assigned' };
    }

    if (user.verificationStatus !== 'VERIFIED') {
      return { eligible: false, reason: 'Not verified' };
    }

    // Check on-chain if already received
    const hasReceived = await this.hasReceivedDistribution(user.seatId);
    if (hasReceived) {
      return { eligible: false, reason: 'Already received distribution', seatId: user.seatId };
    }

    return { eligible: true, seatId: user.seatId };
  }
}

export interface DistributionStatus {
  perCitizenAmount: string | null;
  totalDistributed: string | null;
  distributionPool: string | null;
  sovereignFund: string | null;
}
