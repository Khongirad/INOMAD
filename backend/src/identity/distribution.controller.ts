import { ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param } from '@nestjs/common';
import { CitizenDistributionService } from './citizen-distribution.service';

/**
 * Distribution Controller
 * API endpoints for citizen ALTAN distribution
 */
@ApiTags('Identity')
@Controller('distribution')
export class DistributionController {
  constructor(private distributionService: CitizenDistributionService) {}

  /**
   * Get distribution status
   * GET /api/distribution/status
   */
  @Get('status')
  async getDistributionStatus(): Promise<any> {
    return this.distributionService.getDistributionStatus();
  }

  /**
   * Check if citizen has received distribution
   * GET /api/distribution/received/:seatId
   */
  @Get('received/:seatId')
  async hasReceived(@Param('seatId') seatId: string): Promise<any> {
    const received = await this.distributionService.hasReceivedDistribution(seatId);
    return {
      seatId,
      hasReceived: received,
    };
  }

  /**
   * Check distribution eligibility for user
   * GET /api/distribution/eligibility/:userId
   */
  @Get('eligibility/:userId')
  async checkEligibility(@Param('userId') userId: string): Promise<any> {
    return this.distributionService.checkEligibility(userId);
  }
}
