import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletProtectionService } from './wallet-protection.service';
import { RiskScorerService } from './risk-scorer.service';
import { AlertService } from './alert.service';
import { EventIndexerService } from './event-indexer.service';

/**
 * WalletProtectionController - API for protection dashboard
 * 
 * Endpoints:
 * - GET /protection/stats - System statistics
 * - GET /protection/wallet/:address - Wallet status
 * - POST /protection/lock - Manual lock
 * - POST /protection/judicial-freeze - Request freeze
 * - GET /protection/alerts - Get alerts
 * - POST /protection/alerts/:id/acknowledge - Acknowledge alert
 * - GET /protection/high-risk - High risk wallets
 */
@ApiTags('Wallet')
@Controller('protection')
export class WalletProtectionController {
  constructor(
    private walletProtection: WalletProtectionService,
    private riskScorer: RiskScorerService,
    private alertService: AlertService,
    private eventIndexer: EventIndexerService,
  ) {}

  /**
   * Get system statistics
   */
  @Get('stats')
  getStats() {
    return {
      success: true,
      data: this.walletProtection.getStats(),
    };
  }

  /**
   * Get wallet protection status
   */
  @Get('wallet/:address')
  async getWalletStatus(@Param('address') address: string) {
    const status = await this.walletProtection.getWalletStatus(address);
    return {
      success: true,
      data: status,
    };
  }

  /**
   * Get wallet transaction history
   */
  @Get('wallet/:address/history')
  getWalletHistory(@Param('address') address: string) {
    const history = this.eventIndexer.getWalletHistory(address);
    return {
      success: true,
      data: {
        wallet: address,
        transactions: history,
        count: history.length,
      },
    };
  }

  /**
   * Manual wallet lock (requires OFFICER_ROLE)
   */
  @Post('lock')
  async lockWallet(
    @Body() body: { wallet: string; reason: string; lockedBy: string },
  ) {
    const success = await this.walletProtection.manualLock(
      body.wallet,
      body.reason,
      body.lockedBy,
    );

    return {
      success,
      message: success ? 'Wallet locked successfully' : 'Failed to lock wallet',
    };
  }

  /**
   * Request judicial freeze (for Council of Justice)
   */
  @Post('judicial-freeze')
  async requestJudicialFreeze(
    @Body() body: { wallet: string; caseHash: string; requestedBy: string },
  ) {
    const result = await this.walletProtection.requestJudicialFreeze(
      body.wallet,
      body.caseHash,
      body.requestedBy,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Get alerts
   */
  @Get('alerts')
  getAlerts(
    @Query('level') level?: string,
    @Query('type') type?: string,
    @Query('wallet') wallet?: string,
    @Query('limit') limit?: string,
    @Query('unacknowledged') unacknowledged?: string,
  ) {
    const alerts = this.alertService.getAlerts({
      level: level as any,
      type: type as any,
      wallet,
      limit: limit ? parseInt(limit) : undefined,
      unacknowledgedOnly: unacknowledged === 'true',
    });

    return {
      success: true,
      data: {
        alerts,
        stats: this.alertService.getStats(),
      },
    };
  }

  /**
   * Acknowledge alert
   */
  @Post('alerts/:id/acknowledge')
  acknowledgeAlert(
    @Param('id') alertId: string,
    @Body() body: { acknowledgedBy: string },
  ) {
    this.alertService.acknowledgeAlert(alertId, body.acknowledgedBy);
    return {
      success: true,
      message: 'Alert acknowledged',
    };
  }

  /**
   * Get high risk wallets
   */
  @Get('high-risk')
  getHighRiskWallets(@Query('threshold') threshold?: string) {
    const thresholdValue = threshold ? parseInt(threshold) : 50;
    const wallets = this.riskScorer.getHighRiskWallets(thresholdValue);

    return {
      success: true,
      data: {
        wallets,
        count: wallets.length,
        threshold: thresholdValue,
      },
    };
  }

  /**
   * Add address to blacklist
   */
  @Post('blacklist')
  addToBlacklist(@Body() body: { address: string; reason: string }) {
    this.riskScorer.addToBlacklist(body.address, body.reason);
    return {
      success: true,
      message: `${body.address} added to blacklist`,
    };
  }

  /**
   * Add address to whitelist
   */
  @Post('whitelist')
  addToWhitelist(@Body() body: { address: string }) {
    this.riskScorer.addToWhitelist(body.address);
    return {
      success: true,
      message: `${body.address} added to whitelist`,
    };
  }

  /**
   * Reset wallet risk score
   */
  @Post('wallet/:address/reset-score')
  resetScore(@Param('address') address: string) {
    this.riskScorer.resetScore(address);
    return {
      success: true,
      message: `Risk score reset for ${address}`,
    };
  }
}
