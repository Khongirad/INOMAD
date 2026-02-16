import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { LandRegistryServiceService } from './land-registry-service.service';

@ApiTags('Land')
@Controller('land-registry')
export class LandRegistryServiceController {
  constructor(private readonly landService: LandRegistryServiceService) {}

  // ===== Cadastral =====

  @Post('cadastral/land-plots')
  async registerLandPlot(@Req() req: any, @Body() body: any) {
    return this.landService.registerLandPlot(req.user.userId, body);
  }

  @Get('cadastral/land-plots/:cadastralNumber')
  async getLandPlot(@Param('cadastralNumber') cadastralNumber: string) {
    return this.landService.getLandPlotByCadastral(cadastralNumber);
  }

  @Get('cadastral/land-plots')
  async searchLandPlots(
    @Query('region') region?: string,
    @Query('district') district?: string,
    @Query('locality') locality?: string,
    @Query('landType') landType?: string,
  ) {
    return this.landService.searchLandPlots({ region, district, locality, landType });
  }

  @Post('cadastral/land-plots/search/gps')
  async searchByGPS(@Body() bounds: any) {
    return this.landService.searchLandPlotsByGPS(bounds);
  }

  // ===== Ownership =====

  @Get('cadastral/ownerships/me')
  async getMyOwnerships(@Req() req: any) {
    return this.landService.getMyOwnerships(req.user.userId);
  }

  @Post('property/ownership')
  async registerOwnership(@Req() req: any, @Body() body: any) {
    return this.landService.registerOwnership(req.user.userId, body);
  }

  // ===== Leases =====

  @Get('cadastral/leases/me')
  async getMyLeases(@Req() req: any) {
    return this.landService.getMyLeases(req.user.userId);
  }

  @Post('property/lease')
  async registerLease(@Body() body: any) {
    return this.landService.registerLease(body);
  }

  // ===== Transactions =====

  @Get('cadastral/transactions')
  async getTransactions(
    @Query('landPlotId') landPlotId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.landService.getTransactionHistory(landPlotId, propertyId);
  }

  @Post('property/transfer')
  async initiateTransfer(@Req() req: any, @Body() body: any) {
    return this.landService.initiateTransfer(req.user.userId, body);
  }

  @Post('property/transfer/:id/pay')
  async confirmPayment(
    @Param('id') id: string,
    @Body() body: { paymentTxHash: string },
  ) {
    return this.landService.confirmPayment(id, body.paymentTxHash);
  }

  @Post('property/transfer/:id/complete')
  async completeTransfer(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { blockchainTxHash?: string },
  ) {
    return this.landService.completeTransfer(id, req.user.userId, body.blockchainTxHash);
  }

  // ===== Valuation =====

  @Post('property/valuation')
  async calculateValuation(@Body() body: { landPlotId?: string; propertyId?: string }) {
    return this.landService.calculateValuation(body.landPlotId, body.propertyId);
  }

  @Get('property/market/:region')
  async getMarketTrends(@Param('region') region: string) {
    return this.landService.getMarketTrends(region);
  }
}
