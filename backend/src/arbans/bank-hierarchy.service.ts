import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

/**
 * @title BankHierarchyService
 * @notice Backend service for BankArbanHierarchy contract integration
 * 
 * Manages bank employee registration with citizen verification:
 * 1. Verifies employee is a citizen (has SeatSBT and Arban membership)
 * 2. Registers employee in BankArbanHierarchy
 * 3. Tracks performance and hierarchy positions
 */
@Injectable()
export class BankHierarchyService {
  private readonly logger = new Logger(BankHierarchyService.name);
  private contract: ethers.Contract | null = null;
  private arbanCompletionContract: ethers.Contract | null = null;
  private provider: ethers.Provider | null = null;
  private signer: ethers.Wallet | null = null;

  constructor(
    private readonly configService: ConfigService,
  ) {
    this.initializeContract();
  }

  private async initializeContract() {
    const enabled = this.configService.get('BLOCKCHAIN_ENABLED');
    if (enabled !== 'true') {
      this.logger.warn('Blockchain integration disabled');
      return;
    }

    try {
      const rpcUrl = this.configService.get('ALTAN_RPC_URL');
      const contractAddress = this.configService.get('BANK_HIERARCHY_ADDRESS');
      const arbanCompletionAddress = this.configService.get('ARBAN_COMPLETION_ADDRESS');
      const privateKey = this.configService.get('BANK_ADMIN_PRIVATE_KEY');

      if (!rpcUrl || !contractAddress || !arbanCompletionAddress) {
        this.logger.warn('Bank hierarchy contract not configured');
        return;
      }

      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      // BankArbanHierarchy ABI (simplified)
      const hierarchyAbi = [
        'function registerEmployee(uint256 arbanId, address wallet, uint256 seatId) external returns (uint256)',
        'function getEmployee(uint256 id) external view returns (tuple(uint256 id, address wallet, uint256 seatId, uint256 arbanId, uint64 joinedAt, uint64 lastActiveAt, uint256 performanceScore, bool isActive))',
        'function getHierarchyPath(uint256 employeeId) external view returns (uint256 arbanId, uint256 zunId, uint256 myanganId, uint256 tumenId)',
        'function updatePerformance(uint256 employeeId, uint256 newScore) external',
        'function canBePromoted(uint256 employeeId) external view returns (bool)',
      ];

      // ArbanCompletion ABI
      const arbanAbi = [
        'function getArbanTypeForSeat(uint256 seatId) external view returns (uint8 arbanType, uint256 arbanId)',
      ];

      this.contract = new ethers.Contract(contractAddress, hierarchyAbi, this.signer);
      this.arbanCompletionContract = new ethers.Contract(arbanCompletionAddress, arbanAbi, this.provider);

      this.logger.log('BankHierarchy contract initialized');
    } catch (error) {
      this.logger.error('Failed to initialize BankHierarchy contract', error);
    }
  }

  /**
   * Register a new bank employee
   * @param employeeData Employee registration data
   * @returns On-chain employee ID
   */
  async registerEmployee(employeeData: {
    seatId: number;
    wallet: string;
    bankArbanId: number; // Bank Arban (10-person unit)
  }): Promise<number> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // 1. Verify citizen exists in ArbanCompletion
    const arbanMembership = await this.verifyArbanMembership(employeeData.seatId);
    
    if (!arbanMembership.isCitizen) {
      throw new Error('Employee must be a citizen with Arban membership');
    }

    this.logger.log(`Registering employee: seatId=${employeeData.seatId}, wallet=${employeeData.wallet}`);

    // 2. Register in BankArbanHierarchy
    try {
      const tx = await this.contract.registerEmployee(
        employeeData.bankArbanId,
        employeeData.wallet,
        employeeData.seatId
      );

      const receipt = await tx.wait();
      
      // Parse EmployeeRegistered event
      const event = receipt.logs
        .map(log => {
          try {
            return this.contract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === 'EmployeeRegistered');

      if (!event) {
        throw new Error('EmployeeRegistered event not found');
      }

      const employeeId = Number(event.args[0]);
      
      this.logger.log(`Employee registered: employeeId=${employeeId}`);
      
      return employeeId;
    } catch (error) {
      this.logger.error('Failed to register employee', error);
      throw error;
    }
  }

  /**
   * Verify citizen has Arban membership
   */
  private async verifyArbanMembership(seatId: number): Promise<{
    isCitizen: boolean;
    arbanType: 'FAMILY' | 'ORGANIZATIONAL' | 'NONE';
    arbanId: number;
  }> {
    if (!this.arbanCompletionContract) {
      throw new Error('ArbanCompletion contract not initialized');
    }

    const result = await this.arbanCompletionContract.getArbanTypeForSeat(seatId);
    
    const arbanType = result[0]; // 0=NONE, 1=FAMILY, 2=ORGANIZATIONAL
    const arbanId = Number(result[1]);

    const typeMap = ['NONE', 'FAMILY', 'ORGANIZATIONAL'];
    
    return {
      isCitizen: arbanType !== 0,
      arbanType: typeMap[arbanType] as any,
      arbanId,
    };
  }

  /**
   * Get employee details
   */
  async getEmployee(employeeId: number) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const emp = await this.contract.getEmployee(employeeId);
    
    return {
      id: Number(emp.id),
      wallet: emp.wallet,
      seatId: Number(emp.seatId),
      arbanId: Number(emp.arbanId),
      joinedAt: new Date(Number(emp.joinedAt) * 1000),
      lastActiveAt: new Date(Number(emp.lastActiveAt) * 1000),
      performanceScore: Number(emp.performanceScore),
      isActive: emp.isActive,
    };
  }

  /**
   * Get hierarchy path for employee
   */
  async getHierarchyPath(employeeId: number) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const path = await this.contract.getHierarchyPath(employeeId);
    
    return {
      arbanId: Number(path[0]),
      zunId: Number(path[1]),
      myanganId: Number(path[2]),
      tumenId: Number(path[3]),
    };
  }

  /**
   * Update employee performance
   */
  async updatePerformance(employeeId: number, newScore: number) {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (newScore < 0 || newScore > 100) {
      throw new Error('Performance score must be 0-100');
    }

    const tx = await this.contract.updatePerformance(employeeId, newScore);
    await tx.wait();
    
    this.logger.log(`Updated performance: employeeId=${employeeId}, score=${newScore}`);
  }

  /**
   * Check if employee can be promoted
   */
  async canBePromoted(employeeId: number): Promise<boolean> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    return await this.contract.canBePromoted(employeeId);
  }
}
