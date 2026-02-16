import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DistributionService } from './distribution.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CentralBankAuthGuard } from '../central-bank/central-bank-auth.guard';

/**
 * Distribution Controller
 * 
 * Manages the initial ALTAN distribution from 2.1T emission
 */
@ApiTags('Distribution')
@Controller('distribution')
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  /**
   * Initialize the distribution pool (ONE-TIME, Creator/CB Governor only)
   */
  @Post('initialize')
  @UseGuards(CentralBankAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async initializePool(
    @Body() dto: {
      totalEmission: number;
      citizenPercent: number;
      statePercent: number;
      fundPercent: number;
      estimatedCitizens: number;
      emissionTxHash?: string;
    },
  ) {
    const result = await this.distributionService.initializePool(
      dto.totalEmission,
      dto.citizenPercent,
      dto.statePercent,
      dto.fundPercent,
      dto.estimatedCitizens,
      dto.emissionTxHash,
    );

    return { ok: true, ...result };
  }

  /**
   * Get user's distribution status (requires auth)
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Request() req) {
    const status = await this.distributionService.getDistributionStatus(
      req.user.sub,
    );

    if (!status) {
      return {
        ok: false,
        message: 'User not registered for distribution',
      };
    }

    return { ok: true, ...status };
  }

  /**
   * Get overall pool statistics (public)
   */
  @Get('pool/stats')
  async getPoolStats() {
    const stats = await this.distributionService.getPoolStats();

    if (!stats) {
      return {
        ok: false,
        message: 'Distribution pool not initialized',
      };
    }

    return { ok: true, ...stats };
  }
}
