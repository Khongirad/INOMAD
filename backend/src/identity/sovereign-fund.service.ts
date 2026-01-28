import { Injectable, Logger } from '@nestjs/common';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';
import { ethers } from 'ethers';

/**
 * Sovereign Fund Service
 * Backend integration with SovereignWealthFund.sol
 * Provides transparency into pension fund balances and investments
 */
@Injectable()
export class SovereignFundService {
  private readonly logger = new Logger(SovereignFundService.name);

  // SovereignWealthFund ABI
  private readonly fundABI = [
    'function getCurrentBalance() view returns (uint256)',
    'function getFundStats() view returns (uint256 balance, uint256 totalReceived, uint256 totalInvested, uint256 totalWithdrawn, uint256 activeInvestments)',
    'function getIncomeBreakdown() view returns (uint256[] sources, uint256[] amounts)',
    'function getActiveInvestments() view returns (uint256[])',
    'function getInvestment(uint256 id) view returns (tuple(uint256 id, string name, string description, uint256 amount, address beneficiary, uint64 timestamp, bool active, bytes32 approvalHash))',
    'function getAnnualReport(uint256 year) view returns (tuple(uint256 year, uint256 totalBalance, uint256 received, uint256 invested, uint256 investmentReturns, bytes32 reportHash, uint64 publishedAt))',
    'function getPublishedYears() view returns (uint256[])',
  ];

  // Income source enum (matches contract)
  private readonly INCOME_SOURCES = {
    0: 'INITIAL_DISTRIBUTION',
    1: 'RESOURCE_PROFITS',
    2: 'FACTORY_DIVIDENDS',
    3: 'TAX_REVENUE',
    4: 'INVESTMENT_RETURNS',
    5: 'DONATIONS',
    6: 'OTHER',
  };

  constructor(
    private blockchain: BlockchainService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get current fund balance
   */
  async getCurrentBalance(): Promise<string | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const fundAddress = addresses?.getAddress('SovereignWealthFund' as any);

      if (!fundAddress) {
        this.logger.warn('SovereignWealthFund contract not deployed');
        return null;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(fundAddress, this.fundABI, provider);

      const balance = await contract.getCurrentBalance();
      return ethers.formatUnits(balance, 6); // ALTAN has 6 decimals
    } catch (error) {
      this.logger.error('Error getting fund balance:', error.message);
      return null;
    }
  }

  /**
   * Get comprehensive fund statistics
   */
  async getFundStats(): Promise<FundStats | null> {
    if (!this.blockchain.isAvailable()) {
      return null;
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const fundAddress = addresses?.getAddress('SovereignWealthFund' as any);

      if (!fundAddress) {
        return null;
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(fundAddress, this.fundABI, provider);

      const stats = await contract.getFundStats();

      return {
        balance: ethers.formatUnits(stats.balance, 6),
        totalReceived: ethers.formatUnits(stats.totalReceived, 6),
        totalInvested: ethers.formatUnits(stats.totalInvested, 6),
        totalWithdrawn: ethers.formatUnits(stats.totalWithdrawn, 6),
        activeInvestments: Number(stats.activeInvestments),
      };
    } catch (error) {
      this.logger.error('Error getting fund stats:', error.message);
      return null;
    }
  }

  /**
   * Get income breakdown by source
   */
  async getIncomeBreakdown(): Promise<IncomeBreakdown[]> {
    if (!this.blockchain.isAvailable()) {
      return [];
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const fundAddress = addresses?.getAddress('SovereignWealthFund' as any);

      if (!fundAddress) {
        return [];
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(fundAddress, this.fundABI, provider);

      const breakdown = await contract.getIncomeBreakdown();
      const sources = breakdown.sources;
      const amounts = breakdown.amounts;

      return sources.map((sourceId: bigint, index: number) => ({
        source: this.INCOME_SOURCES[Number(sourceId)] || 'UNKNOWN',
        sourceId: Number(sourceId),
        amount: ethers.formatUnits(amounts[index], 6),
      }));
    } catch (error) {
      this.logger.error('Error getting income breakdown:', error.message);
      return [];
    }
  }

  /**
   * Get active investments
   */
  async getActiveInvestments(): Promise<Investment[]> {
    if (!this.blockchain.isAvailable()) {
      return [];
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const fundAddress = addresses?.getAddress('SovereignWealthFund' as any);

      if (!fundAddress) {
        return [];
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(fundAddress, this.fundABI, provider);

      const investmentIds = await contract.getActiveInvestments();

      const investments = await Promise.all(
        investmentIds.map(async (id: bigint) => {
          const inv = await contract.getInvestment(id);
          return {
            id: Number(inv.id),
            name: inv.name,
            description: inv.description,
            amount: ethers.formatUnits(inv.amount, 6),
            beneficiary: inv.beneficiary,
            timestamp: Number(inv.timestamp) * 1000, // Convert to ms
            active: inv.active,
            approvalHash: inv.approvalHash,
          };
        }),
      );

      return investments;
    } catch (error) {
      this.logger.error('Error getting active investments:', error.message);
      return [];
    }
  }

  /**
   * Get annual reports
   */
  async getAnnualReports(): Promise<AnnualReport[]> {
    if (!this.blockchain.isAvailable()) {
      return [];
    }

    try {
      const addresses = this.blockchain['contractAddresses'];
      const fundAddress = addresses?.getAddress('SovereignWealthFund' as any);

      if (!fundAddress) {
        return [];
      }

      const provider = this.blockchain['provider'];
      const contract = new ethers.Contract(fundAddress, this.fundABI, provider);

      const years = await contract.getPublishedYears();

      const reports = await Promise.all(
        years.map(async (year: bigint) => {
          const report = await contract.getAnnualReport(year);
          return {
            year: Number(report.year),
            totalBalance: ethers.formatUnits(report.totalBalance, 6),
            received: ethers.formatUnits(report.received, 6),
            invested: ethers.formatUnits(report.invested, 6),
            investmentReturns: ethers.formatUnits(report.investmentReturns, 6),
            reportHash: report.reportHash,
            publishedAt: Number(report.publishedAt) * 1000,
          };
        }),
      );

      return reports;
    } catch (error) {
      this.logger.error('Error getting annual reports:', error.message);
      return [];
    }
  }

  /**
   * Get complete fund overview for dashboard
   */
  async getFundOverview(): Promise<FundOverview> {
    const [stats, breakdown, investments, reports] = await Promise.all([
      this.getFundStats(),
      this.getIncomeBreakdown(),
      this.getActiveInvestments(),
      this.getAnnualReports(),
    ]);

    return {
      stats,
      incomeBreakdown: breakdown,
      activeInvestments: investments,
      annualReports: reports,
    };
  }
}

// Types
export interface FundStats {
  balance: string;
  totalReceived: string;
  totalInvested: string;
  totalWithdrawn: string;
  activeInvestments: number;
}

export interface IncomeBreakdown {
  source: string;
  sourceId: number;
  amount: string;
}

export interface Investment {
  id: number;
  name: string;
  description: string;
  amount: string;
  beneficiary: string;
  timestamp: number;
  active: boolean;
  approvalHash: string;
}

export interface AnnualReport {
  year: number;
  totalBalance: string;
  received: string;
  invested: string;
  investmentReturns: string;
  reportHash: string;
  publishedAt: number;
}

export interface FundOverview {
  stats: FundStats | null;
  incomeBreakdown: IncomeBreakdown[];
  activeInvestments: Investment[];
  annualReports: AnnualReport[];
}
