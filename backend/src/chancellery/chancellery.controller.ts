import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChancelleryService } from './chancellery.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('chancellery')
@UseGuards(AuthGuard)
export class ChancelleryController {
  constructor(private readonly chancelleryService: ChancelleryService) {}

  /**
   * Browse contract registry (lawyers/notaries only)
   */
  @Get('registry')
  async getRegistry(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('stage') stage?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chancelleryService.getRegistry(req.user.id, {
      status,
      stage,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  /**
   * Get full contract details
   */
  @Get('registry/:id')
  async getContractDetails(@Req() req: any, @Param('id') id: string) {
    return this.chancelleryService.getContractDetails(req.user.id, id);
  }

  /**
   * Get disputes from the registry
   */
  @Get('disputes')
  async getRegistryDisputes(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chancelleryService.getRegistryDisputes(
      req.user.id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * Get complaints from the registry
   */
  @Get('complaints')
  async getRegistryComplaints(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.chancelleryService.getRegistryComplaints(
      req.user.id,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * Chancellery statistics
   */
  @Get('stats')
  async getStats(@Req() req: any) {
    return this.chancelleryService.getStats(req.user.id);
  }
}
