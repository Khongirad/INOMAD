import { Controller, Get, Param } from '@nestjs/common';
import { SovereignFundService } from './sovereign-fund.service';

/**
 * Sovereign Fund Controller
 * Public API endpoints for pension fund transparency
 */
@Controller('sovereign-fund')
export class SovereignFundController {
  constructor(private fundService: SovereignFundService) {}

  /**
   * Get current fund balance
   * GET /api/sovereign-fund/balance
   */
  @Get('balance')
  async getBalance(): Promise<any> {
    const balance = await this.fundService.getCurrentBalance();
    return { balance };
  }

  /**
   * Get fund statistics
   * GET /api/sovereign-fund/stats
   */
  @Get('stats')
  async getStats(): Promise<any> {
    return this.fundService.getFundStats();
  }

  /**
   * Get income breakdown by source
   * GET /api/sovereign-fund/income
   */
  @Get('income')
  async getIncomeBreakdown(): Promise<any> {
    return this.fundService.getIncomeBreakdown();
  }

  /**
   * Get active investments
   * GET /api/sovereign-fund/investments
   */
  @Get('investments')
  async getInvestments(): Promise<any> {
    return this.fundService.getActiveInvestments();
  }

  /**
   * Get annual reports
   * GET /api/sovereign-fund/reports
   */
  @Get('reports')
  async getReports(): Promise<any> {
    return this.fundService.getAnnualReports();
  }

  /**
   * Get complete fund overview
   * GET /api/sovereign-fund/overview
   */
  @Get('overview')
  async getOverview(): Promise<any> {
    return this.fundService.getFundOverview();
  }
}
