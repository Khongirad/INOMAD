import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

interface ContractAddresses {
  // Core contracts
  CoreLock?: string;
  ConstitutionAcceptanceRegistry?: string;
  CitizenRegistry?: string;
  SeatSBT?: string;
  ActivationRegistry?: string;
  LawRegistry?: string;
  
  // Citizen domain
  CitizenActivation?: string;
  ArbanRegistry?: string;
  ArbanCompletion?: string; // Family Arban completion contract
  ZunRegistry?: string;
  ElectionRegistry?: string;
  BranchRegistry?: string;
  CapsuleFactory?: string;
  
  // Banking domain
  Altan?: string;
  AltanCentralBank?: string;
  AltanBankOfSiberia?: string;
  AltanCoreLedger?: string;
  AltanWalletRegistry?: string;
  AltanSettlement?: string;
  AUSD?: string;
  OperatorRegistry?: string;
  TreasuryVault?: string;
  TaxEngine?: string;
  TaxAuthority?: string;
}

interface ChainConfig {
  chainId?: number;
  rpcUrl?: string;
  contracts?: Record<string, string>;
  [key: string]: any;
}

/**
 * Service for loading and managing smart contract addresses
 * Loads from multiple JSON files in chain/ directory
 */
@Injectable()
export class ContractAddressesService {
  private readonly logger = new Logger(ContractAddressesService.name);
  private addresses: ContractAddresses = {};
  private chainId: number;
  private rpcUrl: string;

  constructor(private configService: ConfigService) {
    this.loadAddresses();
  }

  private loadAddresses() {
    const basePath = this.configService.get<string>('CONTRACTS_BASE_PATH', '../chain');
    
    try {
      // Load core addresses
      const coreAddresses = this.loadJsonFile(path.join(basePath, 'addresses.json'));
      
      // Load citizen domain addresses
      const citizenAddresses = this.loadJsonFile(path.join(basePath, 'addresses-citizen.json'));
      
      // Load banking domain addresses
      const bankingAddresses = this.loadJsonFile(path.join(basePath, 'addresses-banking.json'));
      
      // Merge all addresses
      // Core addresses JSON is flat, while citizen/banking have nested 'contracts' field
      const coreContracts: Record<string, string> = {};
      if (coreAddresses && typeof coreAddresses === 'object') {
        // Extract only string values (contract addresses)
        for (const [key, value] of Object.entries(coreAddresses)) {
          if (typeof value === 'string') {
            coreContracts[key] = value;
          }
        }
      }
      
      const citizenContracts = citizenAddresses?.contracts || {};
      const bankingContracts = bankingAddresses?.contracts || {};
      
      this.addresses = {
        ...coreContracts,
        ...citizenContracts,
        ...bankingContracts,
      } as ContractAddresses;
      
      // Extract chain config (prefer banking config if available)
      this.chainId = bankingAddresses?.chainId || citizenAddresses?.chainId || 31337;
      this.rpcUrl = bankingAddresses?.rpcUrl || citizenAddresses?.rpcUrl || 'http://127.0.0.1:8545';
      
      this.logger.log('✅ Contract addresses loaded successfully');
      this.logger.log(`Chain ID: ${this.chainId}`);
      this.logger.log(`RPC URL: ${this.rpcUrl}`);
      this.logger.log(`Loaded ${Object.keys(this.addresses).length} contract addresses`);
      
    } catch (error) {
      this.logger.error('Failed to load contract addresses', error);
    }
  }

  private loadJsonFile(filePath: string): ChainConfig | null {
    try {
      const absolutePath = path.resolve(__dirname, filePath);
      const fileContent = fs.readFileSync(absolutePath, 'utf-8');
      return JSON.parse(fileContent);
    } catch (error) {
      this.logger.warn(`Could not load ${filePath}`);
      return null;
    }
  }

  /**
   * Get address of a specific contract
   */
  getAddress(contractName: keyof ContractAddresses): string | undefined {
    return this.addresses[contractName];
  }

  /**
   * Get all loaded addresses
   */
  getAllAddresses(): ContractAddresses {
    return { ...this.addresses };
  }

  /**
   * Get chain ID
   */
  getChainId(): number {
    return this.chainId;
  }

  /**
   * Get RPC URL
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Check if a contract address is available
   */
  hasContract(contractName: keyof ContractAddresses): boolean {
    return !!this.addresses[contractName];
  }

  /**
   * Get core identity contracts
   */
  getIdentityContracts() {
    return {
      citizenRegistry: this.addresses.CitizenRegistry,
      seatSBT: this.addresses.SeatSBT,
      activationRegistry: this.addresses.ActivationRegistry,
      citizenActivation: this.addresses.CitizenActivation,
    };
  }

  /**
   * Get banking contracts
   */
  getBankingContracts() {
    return {
      altan: this.addresses.Altan,
      altanCentralBank: this.addresses.AltanCentralBank,
      altanBankOfSiberia: this.addresses.AltanBankOfSiberia,
      altanCoreLedger: this.addresses.AltanCoreLedger,
      altanWalletRegistry: this.addresses.AltanWalletRegistry,
      taxEngine: this.addresses.TaxEngine,
      taxAuthority: this.addresses.TaxAuthority,
    };
  }

  /**
   * Get guild/arban contracts
   */
  getGuildContracts() {
    return {
      arbanRegistry: this.addresses.ArbanRegistry,
      arbanCompletion: this.addresses.ArbanCompletion,
      zunRegistry: this.addresses.ZunRegistry,
      electionRegistry: this.addresses.ElectionRegistry,
      branchRegistry: this.addresses.BranchRegistry,
    };
  }
}
