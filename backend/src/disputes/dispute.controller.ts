import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { DisputeService } from './dispute.service';
import { AuthGuard } from '../auth/auth.guard';
import { DisputeSourceType, DisputeStatus } from '@prisma/client';

@Controller('disputes')
@UseGuards(AuthGuard)
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  /**
   * Open a new dispute (must be bound to a contract/quest/work-act)
   */
  @Post()
  async openDispute(
    @Req() req: any,
    @Body()
    body: {
      partyBId: string;
      sourceType: DisputeSourceType;
      sourceId: string;
      title: string;
      description: string;
    },
  ) {
    return this.disputeService.openDispute(req.user.id, body);
  }

  /**
   * List my disputes
   */
  @Get()
  async listDisputes(
    @Req() req: any,
    @Query('status') status?: DisputeStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.disputeService.listDisputes(
      req.user.id,
      status,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  /**
   * Get dispute details
   */
  @Get(':id')
  async getDispute(@Param('id') id: string) {
    return this.disputeService.getDispute(id);
  }

  /**
   * Start negotiation
   */
  @Patch(':id/negotiate')
  async startNegotiation(@Param('id') id: string) {
    return this.disputeService.startNegotiation(id);
  }

  /**
   * Settle dispute (parties resolved it themselves)
   */
  @Patch(':id/settle')
  async settle(@Param('id') id: string, @Body('resolution') resolution: string) {
    return this.disputeService.settle(id, resolution);
  }

  /**
   * Escalate to formal complaint (soft path)
   */
  @Post(':id/escalate-complaint')
  async escalateToComplaint(@Param('id') id: string) {
    return this.disputeService.escalateToComplaint(id);
  }

  /**
   * Escalate directly to court (hard path)
   */
  @Post(':id/escalate-court')
  async escalateToCourt(@Param('id') id: string) {
    return this.disputeService.escalateToCourt(id);
  }
}
