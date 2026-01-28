import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';

/**
 * Founder Bootstrap Service
 * Handles the first creator becoming first citizen with super-verification rights
 */
@Injectable()
export class FounderService {
  private readonly logger = new Logger(FounderService.name);

  // FounderBootstrap ABI (minimal for now)
  private readonly founderBootstrapABI = [
    'function founder() view returns (address)',
    'function bootstrapped() view returns (bool)',
    'function bootstrapTimestamp() view returns (uint64)',
    'function founderVerifiedCount() view returns (uint256)',
    'function isBootstrapActive() view returns (bool)',
    'function getRemainingVerifications() view returns (uint256)',
    'function getTimeRemaining() view returns (uint256)',
    'function wasVerifiedByFounder(uint256 seatId) view returns (bool)',
  ];

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  /**
   * Check if founder bootstrap is active
   */
  async isBootstrapActive(): Promise<boolean> {
    if (!this.blockchain.isAvailable()) {
      this.logger.warn('Blockchain not available - cannot check bootstrap status');
      return false;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const founderBootstrapAddress = addresses?.getAddress('FounderBootstrap' as any);

      if (!founderBootstrapAddress) {
        this.logger.warn('FounderBootstrap contract not deployed');
        return false;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(
        founderBootstrapAddress,
        this.founderBootstrapABI,
        provider,
      );

      const isActive = await contract.isBootstrapActive();
      return isActive;
    } catch (error) {
      this.logger.error('Error checking bootstrap status:', error.message);
      return false;
    }
  }

  /**
   * Get founder address
   */
  async getFounderAddress(): Promise<string | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const founderBootstrapAddress = addresses?.getAddress('FounderBootstrap' as any);

      if (!founderBootstrapAddress) {
        return null;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(
        founderBootstrapAddress,
        this.founderBootstrapABI,
        provider,
      );

      const founderAddr = await contract.founder();
      return founderAddr !== ethers.ZeroAddress ? founderAddr : null;
    } catch (error) {
      this.logger.error('Error getting founder address:', error.message);
      return null;
    }
  }

  /**
   * Check if user is the founder
   */
  async isFounder(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { walletAddress: true, seatId: true },
    });

    if (!user || !user.walletAddress) {
      return false;
    }

    // Check on-chain
    const founderAddress = await this.getFounderAddress();
    if (!founderAddress) {
      return false;
    }

    // Also check if seatId is 1 (founder should always be #1)
    return (
      user.walletAddress.toLowerCase() === founderAddress.toLowerCase() &&
      user.seatId === '1'
    );
  }

  /**
   * Get bootstrap status and stats
   */
  async getBootstrapStatus(): Promise<BootstrapStatus> {
    if (!this.blockchain.isAvailable()) {
      return {
        isActive: false,
        founder: null,
        bootstrapped: false,
        timestamp: null,
        verifiedCount: 0,
        remainingVerifications: 0,
        timeRemaining: 0,
      };
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const founderBootstrapAddress = addresses?.getAddress('FounderBootstrap' as any);

      if (!founderBootstrapAddress) {
        return {
          isActive: false,
          founder: null,
          bootstrapped: false,
          timestamp: null,
          verifiedCount: 0,
          remainingVerifications: 0,
          timeRemaining: 0,
        };
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(
        founderBootstrapAddress,
        this.founderBootstrapABI,
        provider,
      );

      const [isActive, founder, bootstrapped, timestamp, verifiedCount, remaining, timeLeft] =
        await Promise.all([
          contract.isBootstrapActive(),
          contract.founder(),
          contract.bootstrapped(),
          contract.bootstrapTimestamp(),
          contract.founderVerifiedCount(),
          contract.getRemainingVerifications(),
          contract.getTimeRemaining(),
        ]);

      return {
        isActive,
        founder: founder !== ethers.ZeroAddress ? founder : null,
        bootstrapped,
        timestamp: timestamp > 0 ? Number(timestamp) * 1000 : null, // Convert to ms
        verifiedCount: Number(verifiedCount),
        remainingVerifications: Number(remaining),
        timeRemaining: Number(timeLeft),
      };
    } catch (error) {
      this.logger.error('Error getting bootstrap status:', error.message);
      return {
        isActive: false,
        founder: null,
        bootstrapped: false,
        timestamp: null,
        verifiedCount: 0,
        remainingVerifications: 0,
        timeRemaining: 0,
      };
    }
  }

  /**
   * Check if a citizen was verified by founder
   */
  async wasVerifiedByFounder(seatId: string): Promise<boolean> {
    if (!this.blockchain.isAvailable()) {
      return false;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const founderBootstrapAddress = addresses?.getAddress('FounderBootstrap' as any);

      if (!founderBootstrapAddress) {
        return false;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(
        founderBootstrapAddress,
        this.founderBootstrapABI,
        provider,
      );

      return await contract.wasVerifiedByFounder(seatId);
    } catch (error) {
      this.logger.error('Error checking founder verification:', error.message);
      return false;
    }
  }
}

export interface BootstrapStatus {
  isActive: boolean;
  founder: string | null;
  bootstrapped: boolean;
  timestamp: number | null;
  verifiedCount: number;
  remainingVerifications: number;
  timeRemaining: number; // seconds
}
