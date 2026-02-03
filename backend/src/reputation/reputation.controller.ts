import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reputation')
@UseGuards(JwtAuthGuard)
export class ReputationController {
  constructor(private reputationService: ReputationService) {}

  /**
   * Get reputation profile for a user
   * GET /reputation/:userId
   */
  @Get(':userId')
  async getProfile(@Param('userId') userId: string) {
    return this.reputationService.getReputationProfile(userId);
  }

  /**
   * Get transaction history for a user
   * GET /reputation/:userId/history
   */
  @Get(':userId/history')
  async getHistory(@Param('userId') userId: string) {
    // For now, allow anyone to see public history
    // In future, restrict detailed view to authorized signers
    return this.reputationService.getTransactionHistory(userId, userId, {
      limit: 20,
      includeDetails: false, // Only show public info
    });
  }
}
