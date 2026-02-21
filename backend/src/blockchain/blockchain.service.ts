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
        arbadId: Number(meta[1]),
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
   * Broadcast a signed transaction to the network
   */
  async broadcastTransaction(signedTx: string): Promise<ethers.TransactionResponse> {
    if (!this.isAvailable()) {
      throw new Error('Blockchain not available');
    }

    try {
      this.logger.log(`Broadcasting transaction...`);
      const txResponse = await this.provider.broadcastTransaction(signedTx);
      this.logger.log(`Transaction sent: ${txResponse.hash}`);
      return txResponse;
    } catch (error) {
      this.logger.error('Failed to broadcast transaction', error);
      throw error;
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

  /**
   * Get block timestamp
   */
  async getBlockTimestamp(blockNumber: number): Promise<number> {
    if (!this.isAvailable()) {
      return 0;
    }

    try {
      const block = await this.provider.getBlock(blockNumber);
      return block ? block.timestamp : 0;
    } catch (error) {
      this.logger.error(`Failed to get timestamp for block ${blockNumber}`, error);
      return 0;
    }
  }

  /**
   * Create a wallet from private key for signing transactions
   * WARNING: This should only be used for backend signing operations
   * Private keys should be stored securely in environment variables
   */
  getWallet(privateKey: string): ethers.Wallet {
    if (!this.isAvailable()) {
      throw new Error('Blockchain not available');
    }

    try {
      return new ethers.Wallet(privateKey, this.provider);
    } catch (error) {
      this.logger.error('Failed to create wallet', error);
      throw new Error('Invalid private key');
    }
  }

  /**
   * Sign a transaction with a private key
   * Returns the signed transaction ready for broadcast
   */
  async signTransaction(
    tx: ethers.TransactionRequest,
    privateKey: string,
  ): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Blockchain not available');
    }

    try {
      const wallet = this.getWallet(privateKey);
      const signedTx = await wallet.signTransaction(tx);
      return signedTx;
    } catch (error) {
      this.logger.error('Failed to sign transaction', error);
      throw error;
    }
  }

  /**
   * Deploy a contract using a private key
   * Returns the deployed contract instance
   */
  async deployContract(
    abi: ethers.InterfaceAbi,
    bytecode: string,
    privateKey: string,
    ...constructorArgs: any[]
  ): Promise<ethers.Contract> {
    if (!this.isAvailable()) {
      throw new Error('Blockchain not available');  }

    try {
      const wallet = this.getWallet(privateKey);
      const factory = new ethers.ContractFactory(abi, bytecode, wallet);
      
      this.logger.log('Deploying contract...');
      const contract = await factory.deploy(...constructorArgs);
      
      this.logger.log(`Contract deployment transaction: ${contract.deploymentTransaction()?.hash}`);
      await contract.waitForDeployment();
     
      const address = await contract.getAddress();
      this.logger.log(`Contract deployed at: ${address}`);
      
      // Type cast to fix ethers v6 compatibility
      return contract as any;
    } catch (error) {
      this.logger.error('Failed to deploy contract', error);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(tx: ethers.TransactionRequest): Promise<bigint> {
    if (!this.isAvailable()) {
      throw new Error('Blockchain not available');
    }

    try {
      return await this.provider.estimateGas(tx);
    } catch (error) {
      this.logger.error('Failed to estimate gas', error);
      throw error;
    }
  }

  /**
   * Get a contract instance with a signer for write operations
   * Use this when you need to send transactions to a contract
   */
  getContractWithSigner(
    address: string,
    abi: ethers.InterfaceAbi,
    privateKey: string,
  ): ethers.Contract {
    if (!this.isAvailable()) {
      throw new Error('Blockchain not available');
    }

    const wallet = this.getWallet(privateKey);
    return new ethers.Contract(address, abi, wallet);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    if (!this.isAvailable()) {
      return BigInt(0);
    }

    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || BigInt(0);
    } catch (error) {
      this.logger.error('Failed to get gas price', error);
      return BigInt(0);
    }
  }

  // ─── Write Operations (require OPERATOR_PRIVATE_KEY) ──────────────────────

  /**
   * Mint a SeatSBT for a newly verified citizen.
   * Called by OnChainVerificationService immediately after guarantor approval.
   *
   * @param walletAddress - Citizen's on-chain wallet (EOA or MPC)
   * @param seatId        - Human-readable seat ID (e.g. "KHURAL-AB12CD34")
   */
  async mintSeatSBT(
    walletAddress: string,
    seatId: string,
  ): Promise<{ txHash: string; tokenId: bigint; blockNumber: bigint }> {
    const privateKey = this.configService.get<string>('OPERATOR_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('OPERATOR_PRIVATE_KEY not configured. Cannot mint SeatSBT on-chain.');
    }

    const addresses = this.contractAddresses.getIdentityContracts();
    if (!addresses.seatSBT) {
      throw new Error('SeatSBT contract address not configured');
    }

    const { SeatSBT_ABI: _ABI } = await import('./abis/seatSBT.abi');
    const contract = this.getContractWithSigner(addresses.seatSBT, SeatSBT_ABI, privateKey);

    const tx = await contract.mintSeat(walletAddress, seatId);
    const receipt = await tx.wait();

    // Parse SeatMinted event for tokenId
    let tokenId = BigInt(0);
    for (const log of receipt.logs ?? []) {
      try {
        const parsed = contract.interface.parseLog(log);
        if (parsed?.name === 'SeatMinted') {
          tokenId = parsed.args.tokenId;
          break;
        }
      } catch { /* not this event */ }
    }

    return {
      txHash: receipt.hash,
      tokenId,
      blockNumber: BigInt(receipt.blockNumber),
    };
  }

  /**
   * Revoke a SeatSBT (admin action — fraud, permanent ban).
   */
  async revokeSeatSBT(
    tokenId: bigint,
    reason: string,
  ): Promise<{ txHash: string }> {
    const privateKey = this.configService.get<string>('OPERATOR_PRIVATE_KEY');
    if (!privateKey) throw new Error('OPERATOR_PRIVATE_KEY not configured');

    const addresses = this.contractAddresses.getIdentityContracts();
    const contract = this.getContractWithSigner(addresses.seatSBT, SeatSBT_ABI, privateKey);

    const tx = await contract.revokeSeat(tokenId, reason);
    const receipt = await tx.wait();
    return { txHash: receipt.hash };
  }

  /**
   * Check if a wallet address already holds a SeatSBT.
   */
  async hasSeatSBT(walletAddress: string): Promise<boolean> {
    if (!this.isAvailable() || !this.seatSBTContract) return false;
    try {
      const balance = await this.seatSBTContract.balanceOf(walletAddress);
      return Number(balance) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Execute the actual emission/burn call on AltanCoreLedger.
   * Only called from EmissionProposalService.executeProposal() after multi-sig quorum + timelock.
   *
   * In production the EmissionMultiSig contract handles this atomically on-chain.
   * This backend method is the bridge for the operator to trigger execution.
   *
   * @param type             - 'MINT' or 'BURN'
   * @param amount           - raw amount (in ALTAN units)
   * @param recipientAddress - on-chain address (for MINT) or source (for BURN)
   * @param corrAccountId    - Postgres corrAccount id (for internal DB update)
   */
  async executeEmissionProposal(
    type: 'MINT' | 'BURN',
    amount: number,
    recipientAddress: string | null,
    corrAccountId: string | null,
  ): Promise<{ txHash: string; blockNumber: number }> {
    const privateKey = this.configService.get<string>('OPERATOR_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('OPERATOR_PRIVATE_KEY not configured. Cannot execute emission on-chain.');
    }

    const bankingAddresses = this.contractAddresses.getBankingContracts();
    const ledgerAddress = bankingAddresses.altanCoreLedger || bankingAddresses.altan;
    if (!ledgerAddress) {
      throw new Error('AltanCoreLedger contract address not configured');
    }

    const contract = this.getContractWithSigner(ledgerAddress, AltanCoreLedger_ABI, privateKey);

    // Convert amount to 18-decimal wei equivalent
    const amountWei = ethers.parseUnits(amount.toString(), 18);
    const target = recipientAddress ?? ethers.ZeroAddress;

    let tx: ethers.TransactionResponse;
    if (type === 'MINT') {
      tx = await contract.mint(target, amountWei);
    } else {
      tx = await contract.burn(target, amountWei);
    }

    const receipt = await tx.wait();
    this.logger.log(`⛓️  ${type} ${amount} ALTAN executed on-chain: ${receipt.hash}`);

    return { txHash: receipt.hash, blockNumber: receipt.blockNumber };
  }

  // ── Block Queries ──────────────────────────────────────────────────────────

  /**
   * Get the hash of the latest block.
   * Used for injecting blockchain entropy into deterministic SeatId generation.
   */
  async getCurrentBlockHash(): Promise<string> {
    if (!this.isEnabled || !this.provider) {
      return '';
    }
    try {
      const block = await this.provider.getBlock('latest');
      return block?.hash ?? '';
    } catch {
      return '';
    }
  }

  // ── StateAnchor ────────────────────────────────────────────────────────────

  /**
   * Publish a Merkle root to StateAnchor.sol.
   * Called by StateAnchorService weekly to create on-chain state commitments.
   *
   * @param contractAddress  StateAnchor.sol deployed address
   * @param merkleRoot       0x-prefixed 32-byte Merkle root
   * @param anchorType       Enum value matching StateAnchor.AnchorType
   * @param description      Human-readable label for this anchor
   * @returns Transaction hash
   */
  async callStateAnchor(
    contractAddress: string,
    merkleRoot: string,
    anchorType: number,
    description: string,
  ): Promise<string> {
    const privateKey = this.configService.get<string>('OPERATOR_PRIVATE_KEY');
    if (!privateKey) {
      throw new Error('OPERATOR_PRIVATE_KEY not configured — cannot anchor state');
    }

    // Minimal ABI for StateAnchor.addAnchor
    const STATE_ANCHOR_ABI = [
      'function addAnchor(bytes32 merkleRoot, uint8 anchorType, string calldata description) external returns (uint256 anchorId)',
    ];

    const contract = this.getContractWithSigner(contractAddress, STATE_ANCHOR_ABI, privateKey);

    // Convert 0x hex string to bytes32
    const rootBytes32 = ethers.zeroPadValue(merkleRoot, 32);

    const tx = await contract.addAnchor(rootBytes32, anchorType, description);
    const receipt = await tx.wait();
    this.logger.log(`⚓ StateAnchor published: anchorType=${anchorType} tx=${receipt.hash}`);
    return receipt.hash;
  }
}
