import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FounderService } from './founder.service';

/**
 * Founder Bootstrap Controller
 * Endpoints for founder super-verification and bootstrap status
 */
@Controller('founder')
export class FounderController {
  constructor(private founderService: FounderService) {}

  /**
   * Get bootstrap status
   * GET /api/founder/status
   */
  @Get('status')
  async getBootstrapStatus(): Promise<any> {
    return this.founderService.getBootstrapStatus();
  }

  /**
   * Check if user is the founder
   * GET /api/founder/check/:userId
   */
  @Get('check/:userId')
  async checkIsFounder(@Param('userId') userId: string): Promise<any> {
    const isFounder = await this.founderService.isFounder(userId);
    const status = isFounder ? await this.founderService.getBootstrapStatus() : null;

    return {
      isFounder,
      status,
    };
  }

  /**
   * Check if citizen was verified by founder
   * GET /api/founder/verified/:seatId
   */
  @Get('verified/:seatId')
  async wasVerifiedByFounder(@Param('seatId') seatId: string) {
    const verified = await this.founderService.wasVerifiedByFounder(seatId);
    return {
      seatId,
      verifiedByFounder: verified,
    };
  }
}
