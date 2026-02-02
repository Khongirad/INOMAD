import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { ContractAddressesService } from './contract-addresses.service';
import { SeatSBT_ABI } from './abis/seatSBT.abi';
import { CitizenRegistry_ABI } from './abis/citizenRegistry.abi';
import { AltanCoreLedger_ABI } from './abis/altanCoreLedger.abi';
import { AltanWalletRegistry_ABI } from './abis/altanWalletRegistry.abi';
import { AltanWallet_ABI } from './abis/altanWallet.abi';
import { ActivationRegistry_ABI } from './abis/activationRegistry.abi';
import { TaxEngine_ABI } from './abis/taxEngine.abi';

/**
 * Blockchain service for interacting with ALTAN contracts
 * Provides read-only access to on-chain state
 */
@Injectable()
export class BlockchainService implements OnModuleInit {
  private readonly logger = new Logger(BlockchainService.name);
  private provider: ethers.JsonRpcProvider;
  private isEnabled: boolean = false;
  
  // Contract instances
  private seatSBTContract: ethers.Contract;
  private citizenRegistryContract: ethers.Contract;
  private activationRegistryContract: ethers.Contract;
  private altanCoreLedgerContract: ethers.Contract;
  private altanWalletRegistryContract: ethers.Contract;
  private taxEngineContract: ethers.Contract;

  constructor(
    private configService: ConfigService,
    private contractAddresses: ContractAddressesService,
  ) {}

  async onModuleInit() {
    await this.initializeProvider();
  }

  private async initializeProvider() {
    // Check if blockchain integration is enabled
    const enabled = this.configService.get<string>('BLOCKCHAIN_ENABLED', 'true') === 'true';
    if (!enabled) {
      this.logger.warn('⚠️  Blockchain integration disabled via config');
      return;
    }

    const rpcUrl = this.configService.get<string>('ALTAN_RPC_URL') || this.contractAddresses.getRpcUrl();
    
    if (!rpcUrl) {
      this.logger.warn('⚠️  No RPC URL configured. Running in offline mode.');
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Test connection
      await this.provider.getBlockNumber();
      
      // Initialize contract instances
      this.initializeContracts();
      
      this.isEnabled = true;
      this.logger.log('✅ Blockchain service initialized');
      this.logger.log(`   RPC: ${rpcUrl}`);
      this.logger.log(`   Chain ID: ${this.contractAddresses.getChainId()}`);
      this.logger.log(`   Contracts loaded: ${Object.keys(this.contractAddresses.getAllAddresses()).length}`);
      
    } catch (error) {
      this.logger.error('❌ Failed to initialize blockchain service', error.message);
      this.logger.warn('   Continuing in offline mode');
    }
  }

  private initializeContracts() {
    const addresses = this.contractAddresses.getIdentityContracts();
    const bankingAddresses = this.contractAddresses.getBankingContracts();

    // Initialize SeatSBT
    if (addresses.seatSBT) {
      this.seatSBTContract = new ethers.Contract(
        addresses.seatSBT,
        SeatSBT_ABI,
        this.provider,
      );
      this.logger.log(`   ✓ SeatSBT: ${addresses.seatSBT}`);
    }

    // Initialize CitizenRegistry
    if (addresses.citizenRegistry) {
      this.citizenRegistryContract = new ethers.Contract(
        addresses.citizenRegistry,
        CitizenRegistry_ABI,
        this.provider,
      );
      this.logger.log(`   ✓ CitizenRegistry: ${addresses.citizenRegistry}`);
    }

    // Initialize ActivationRegistry
    if (addresses.activationRegistry) {
      this.activationRegistryContract = new ethers.Contract(
        addresses.activationRegistry,
        ActivationRegistry_ABI,
        this.provider,
      );
      this.logger.log(`   ✓ ActivationRegistry: ${addresses.activationRegistry}`);
    }

    // Initialize AltanCoreLedger (use Altan address as fallback)
    const altanAddress = bankingAddresses.altanCoreLedger || bankingAddresses.altan;
    if (altanAddress) {
      this.altanCoreLedgerContract = new ethers.Contract(
        altanAddress,
        AltanCoreLedger_ABI,
        this.provider,
      );
      this.logger.log(`   ✓ AltanCoreLedger: ${altanAddress}`);
    }

    // Initialize AltanWalletRegistry
    if (bankingAddresses.altanWalletRegistry) {
      this.altanWalletRegistryContract = new ethers.Contract(
        bankingAddresses.altanWalletRegistry,
        AltanWalletRegistry_ABI,
        this.provider,
      );
      this.logger.log(`   ✓ AltanWalletRegistry: ${bankingAddresses.altanWalletRegistry}`);
    }

    // Initialize TaxEngine
    if (bankingAddresses.taxEngine) {
      this.taxEngineContract = new ethers.Contract(
        bankingAddresses.taxEngine,
        TaxEngine_ABI,
        this.provider,
      );
      this.logger.log(`   ✓ TaxEngine: ${bankingAddresses.taxEngine}`);
    }
  }

  /**
   * Check if blockchain is available
   */
  isAvailable(): boolean {
    return this.isEnabled && !!this.provider;
  }

  /**
   * Get AltanCoreLedger contract for event listening
   */
  getAltanCoreLedgerContract(): ethers.Contract | null {
    if (!this.isAvailable() || !this.altanCoreLedgerContract) {
      return null;
    }
    return this.altanCoreLedgerContract;
  }

  /**
   * Get the provider for event subscriptions
   */
  getProvider(): ethers.JsonRpcProvider | null {
    return this.isAvailable() ? this.provider : null;
  }

  /**
   * Get ActivationRegistry contract for activation operations
   */
  getActivationRegistryContract(): ethers.Contract | null {
    if (!this.isAvailable() || !this.activationRegistryContract) {
      return null;
    }
    return this.activationRegistryContract;
  }

  /**
   * Get TaxEngine contract for tax operations
   */
  getTaxEngineContract(): ethers.Contract | null {
    if (!this.isAvailable() || !this.taxEngineContract) {
      return null;
    }
    return this.taxEngineContract;
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
   * Get ALTAN balance for an address from on-chain
   */
  async getAltanBalance(address: string): Promise<string> {
    if (!this.isAvailable() || !this.altanCoreLedgerContract) {
      return null;
    }

    try {
      const balance = await this.altanCoreLedgerContract.balanceOf(address);
      const decimals = await this.altanCoreLedgerContract.decimals();
      
      // Convert to human-readable format
      return ethers.formatUnits(balance, decimals);
    } catch (error) {
      this.logger.error(`Failed to get ALTAN balance for ${address}`, error);
      return null;
    }
  }

  /**
   * Get seat metadata from CitizenRegistry
   */
  async getSeatMetadata(seatId: string | number): Promise<any> {
    if (!this.isAvailable() || !this.citizenRegistryContract) {
      return null;
    }

    try {
      const meta = await this.citizenRegistryContract.metaOf(seatId);
      return {
        nationId: meta[0],
        arbanId: Number(meta[1]),
        provinceId: Number(meta[2]),
        districtId: Number(meta[3]),
        cityId: Number(meta[4]),
        registrationDate: Number(meta[5]),
        exists: meta[6],
      };
    } catch (error) {
      this.logger.error(`Failed to get seat metadata for ${seatId}`, error);
      return null;
    }
  }

  /**
   * Get wallet address for a seat ID
   */
  async getWalletAddress(seatId: string | number): Promise<string | null> {
    if (!this.isAvailable() || !this.altanWalletRegistryContract) {
      return null;
    }

    try {
      const walletAddress = await this.altanWalletRegistryContract.walletOf(seatId);
      return walletAddress === ethers.ZeroAddress ? null : walletAddress;
    } catch (error) {
      this.logger.error(`Failed to get wallet for seat ${seatId}`, error);
      return null;
    }
  }

  /**
   * Check if wallet is unlocked
   */
  async isWalletUnlocked(seatId: string | number): Promise<boolean> {
    const walletAddress = await this.getWalletAddress(seatId);
    if (!walletAddress) {
      return false;
    }

    try {
      const walletContract = new ethers.Contract(
        walletAddress,
        AltanWallet_ABI,
        this.provider,
      );
      return await walletContract.unlocked();
    } catch (error) {
      this.logger.error(`Failed to check unlock status for seat ${seatId}`, error);
      return false;
    }
  }

  /**
   * Check if a seat is activated
   */
  async isActivated(seatId: string | number): Promise<boolean> {
    if (!this.isAvailable() || !this.activationRegistryContract) {
      return false;
    }

    try {
      return await this.activationRegistryContract.isActivated(seatId);
    } catch (error) {
      this.logger.error(`Failed to check activation for seat ${seatId}`, error);
      return false;
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
