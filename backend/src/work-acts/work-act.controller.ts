import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { WorkActService } from './work-act.service';

@ApiTags('WorkActs')
@Controller('api/work-acts')
@UseGuards(AuthGuard)
export class WorkActController {
  constructor(private readonly workActService: WorkActService) {}

  /**
   * POST /api/work-acts — create a work act
   */
  @Post()
  async create(
    @Req() req: any,
    @Body()
    body: {
      clientId: string;
      title: string;
      description: string;
      deliverables: string[];
      amount: number;
      currency?: string;
      questId?: string;
      contractId?: string;
      organizationId?: string;
    },
  ) {
    return this.workActService.create(req.user.id, body);
  }

  /**
   * GET /api/work-acts — list work acts
   */
  @Get()
  async list(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.workActService.list({
      status: status as any,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * GET /api/work-acts/my — my work acts (as contractor)
   */
  @Get('my')
  async myWorkActs(@Req() req: any) {
    return this.workActService.list({ contractorId: req.user.id });
  }

  /**
   * GET /api/work-acts/reviews — work acts I need to review (as client)
   */
  @Get('reviews')
  async reviewQueue(@Req() req: any) {
    return this.workActService.list({ clientId: req.user.id });
  }

  /**
   * GET /api/work-acts/:id — get work act details
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.workActService.getById(id);
  }

  /**
   * POST /api/work-acts/:id/submit — submit for review
   */
  @Post(':id/submit')
  async submit(@Req() req: any, @Param('id') id: string) {
    return this.workActService.submit(id, req.user.id);
  }

  /**
   * POST /api/work-acts/:id/review — client reviews
   */
  @Post(':id/review')
  async review(@Req() req: any, @Param('id') id: string) {
    return this.workActService.review(id, req.user.id);
  }

  /**
   * POST /api/work-acts/:id/sign — sign work act
   */
  @Post(':id/sign')
  async sign(@Req() req: any, @Param('id') id: string, @Body('signature') signature: string) {
    return this.workActService.sign(id, req.user.id, signature);
  }

  /**
   * POST /api/work-acts/:id/dispute — dispute work act
   */
  @Post(':id/dispute')
  async dispute(@Req() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.workActService.dispute(id, req.user.id, reason);
  }

  /**
   * DELETE /api/work-acts/:id — cancel work act
   */
  @Delete(':id')
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.workActService.cancel(id, req.user.id);
  }

  /**
   * PUT /api/work-acts/:id/payment — record payment
   */
  @Put(':id/payment')
  async recordPayment(@Param('id') id: string, @Body('txHash') txHash: string) {
    return this.workActService.recordPayment(id, txHash);
  }
}
