import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

/**
 * Blockchain service for interacting with ALTAN contracts
 * Provides read-only access to on-chain state
 */
@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private seatSBTContract: ethers.Contract;
  private altanContract: ethers.Contract;

  // Contract ABIs (minimal interfaces)
  private readonly SEAT_SBT_ABI = [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function balanceOf(address owner) view returns (uint256)',
    'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
    'function totalSupply() view returns (uint256)',
  ];

  private readonly ALTAN_ABI = [
    'function balanceOf(address account) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
  ];

  constructor(private configService: ConfigService) {
    this.initializeProvider();
  }

  private initializeProvider() {
    const rpcUrl = this.configService.get<string>('ALTAN_RPC_URL');
    const seatSBTAddress = this.configService.get<string>('SEAT_SBT_ADDRESS');
    const altanAddress = this.configService.get<string>('ALTAN_ADDRESS');

    if (!rpcUrl || !seatSBTAddress || !altanAddress) {
      this.logger.warn('Blockchain configuration incomplete. Running in offline mode.');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      this.seatSBTContract = new ethers.Contract(
        seatSBTAddress,
        this.SEAT_SBT_ABI,
        this.provider,
      );

      this.altanContract = new ethers.Contract(
        altanAddress,
        this.ALTAN_ABI,
        this.provider,
      );

      this.logger.log('✅ Blockchain service initialized');
      this.logger.log(`RPC: ${rpcUrl}`);
      this.logger.log(`SeatSBT: ${seatSBTAddress}`);
      this.logger.log(`ALTAN: ${altanAddress}`);
    } catch (error) {
      this.logger.error('Failed to initialize blockchain service', error);
    }
  }

  /**
   * Check if blockchain is available
   */
  isAvailable(): boolean {
    return !!this.provider && !!this.seatSBTContract;
  }

  /**
   * Get the owner address of a SeatSBT token
   */
  async getSeatOwner(seatId: string): Promise<string | null> {
    if (!this.isAvailable()) {
      this.logger.warn('Blockchain not available');
      return null;
    }

    try {
      // Convert seatId to token ID (assuming seatId is the token ID)
      const tokenId = BigInt(seatId);
      const owner = await this.seatSBTContract.ownerOf(tokenId);
      return owner;
    } catch (error) {
      this.logger.error(`Failed to get owner for seat ${seatId}`, error);
      return null;
    }
  }

  /**
   * Verify that an address owns a specific seat
   */
  async verifySeatOwnership(seatId: string, expectedOwner: string): Promise<boolean> {
    const actualOwner = await this.getSeatOwner(seatId);
    
    if (!actualOwner) {
      return false;
    }

    // Case-insensitive comparison
    return actualOwner.toLowerCase() === expectedOwner.toLowerCase();
  }

  /**
   * Get all seat IDs owned by an address
   */
  async getSeatsOwnedBy(address: string): Promise<string[]> {
    if (!this.isAvailable()) {
      this.logger.warn('Blockchain not available');
      return [];
    }

    try {
      const balance = await this.seatSBTContract.balanceOf(address);
      const seatIds: string[] = [];

      for (let i = 0; i < Number(balance); i++) {
        const tokenId = await this.seatSBTContract.tokenOfOwnerByIndex(address, i);
        seatIds.push(tokenId.toString());
      }

      return seatIds;
    } catch (error) {
      this.logger.error(`Failed to get seats for address ${address}`, error);
      return [];
    }
  }

  /**
   * Get ALTAN balance for an address
   */
  async getAltanBalance(address: string): Promise<string> {
    if (!this.isAvailable()) {
      this.logger.warn('Blockchain not available');
      return '0';
    }

    try {
      const balance = await this.altanContract.balanceOf(address);
      const decimals = await this.altanContract.decimals();
      
      // Convert to human-readable format
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      this.logger.error(`Failed to get ALTAN balance for ${address}`, error);
      return '0';
    }
  }

  /**
   * Get total supply of SeatSBTs
   */
  async getTotalSeats(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const total = await this.seatSBTContract.totalSupply();
      return Number(total);
    } catch (error) {
      this.logger.error('Failed to get total seats', error);
      return 0;
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      this.logger.error('Failed to get block number', error);
      return 0;
    }
  }
}
