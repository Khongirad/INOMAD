import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OwnershipService } from '../services/ownership.service';
import { TransferService } from '../services/transfer.service';
import { RegistryOfficerGuard } from '../guards/registry-officer.guard';
import { ValuationService } from '../services/valuation.service';

@Controller('api/land-registry/property')
export class PropertyController {
  constructor(
    private ownershipService: OwnershipService,
    private transferService: TransferService,
    private valuationService: ValuationService,
  ) {}

  /**
   * Register ownership (citizens only)
   */
  @Post('ownership')
  async registerOwnership(@Body() data: any, @Request() req: any) {
    return this.ownershipService.registerOwnership({
      ...data,
      ownerId: req.user.id,
    });
  }

  /**
   * Register lease (can include foreigners)
   */
  @Post('lease')
  async registerLease(@Body() data: any, @Request() req: any) {
    return this.ownershipService.registerLease(data);
  }

  /**
   * Initiate property transfer
   */
  @Post('transfer')
  async initiateTransfer(@Body() data: any, @Request() req: any) {
    return this.transferService.initiateTransfer({
      ...data,
      sellerId: req.user.id,
    });
  }

  /**
   * Confirm payment for transfer
   */
  @Post('transfer/:id/pay')
  async confirmPayment(
    @Param('id') transactionId: string,
    @Body() data: { paymentTxHash: string },
    @Request() req: any,
  ) {
    return this.transferService.confirmPayment({
      transactionId,
      buyerId: req.user.id,
      paymentTxHash: data.paymentTxHash,
    });
  }

  /**
   * Complete transfer (registry officer only)
   */
  @Post('transfer/:id/complete')
  @UseGuards(RegistryOfficerGuard)
  async completeTransfer(
    @Param('id') transactionId: string,
    @Body() data: { blockchainTxHash?: string },
    @Request() req: any,
  ) {
    return this.transferService.completeTransfer({
      transactionId,
      officerId: req.user.id,
      blockchainTxHash: data.blockchainTxHash,
    });
  }

  /**
   * Get property valuation
   */
  @Post('valuation')
  async getValuation(@Body() data: { landPlotId?: string; propertyId?: string }) {
    return this.valuationService.calculateValuation(data);
  }

  /**
   * Get market trends
   */
  @Get('market/:region')
  async getMarketTrends(@Param('region') region: string) {
    return this.valuationService.getMarketTrends(region);
  }
}
