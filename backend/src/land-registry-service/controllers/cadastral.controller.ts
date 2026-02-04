import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { CadastralMapService } from '../services/cadastral-map.service';
import { OwnershipService } from '../services/ownership.service';
import { TransferService } from '../services/transfer.service';

@Controller('api/land-registry/cadastral')
export class CadastralController {
  constructor(
    private cadastralService: CadastralMapService,
    private ownershipService: OwnershipService,
    private transferService: TransferService,
  ) {}

  /**
   * Register new land plot
   */
  @Post('land-plots')
  async registerLandPlot(@Body() data: any, @Request() req: any) {
    // TODO: Add registry officer role check
    return this.cadastralService.registerLandPlot({
      ...data,
      registeredBy: req.user.id,
    });
  }

  /**
   * Search by cadastral number
   */
  @Get('land-plots/:cadastralNumber')
  async getLandPlot(@Param('cadastralNumber') cadastralNumber: string) {
    return this.cadastralService.searchByCadastralNumber(cadastralNumber);
  }

  /**
   * Search by location
   */
  @Get('land-plots')
  async searchLandPlots(
    @Query('region') region?: string,
    @Query('district') district?: string,
    @Query('locality') locality?: string,
  ) {
    return this.cadastralService.searchByLocation({
      region,
      district,
      locality,
    });
  }

  /**
   * Search by GPS bounds
   */
  @Post('land-plots/search/gps')
  async searchByGPS(@Body() bounds: any) {
    return this.cadastralService.searchByGPSBounds(bounds);
  }

  /**
   * Get my properties
   */
  @Get('ownerships/me')
  async getMyOwnerships(@Request() req: any) {
    return this.ownershipService.getOwnershipsByUser(req.user.id);
  }

  /**
   * Get my leases
   */
  @Get('leases/me')
  async getMyLeases(@Request() req: any) {
    return this.ownershipService.getLeasesByUser(req.user.id);
  }

  /**
   * Get transaction history
   */
  @Get('transactions')
  async getTransactions(
    @Query('landPlotId') landPlotId?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.transferService.getTransactionHistory(landPlotId, propertyId);
  }
}
