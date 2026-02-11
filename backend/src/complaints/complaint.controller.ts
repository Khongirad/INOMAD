import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ComplaintService } from './complaint.service';

@Controller('api/complaints')
@UseGuards(AuthGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  /**
   * POST /api/complaints — file a new complaint
   */
  @Post()
  async fileComplaint(
    @Req() req: any,
    @Body()
    body: {
      category: string;
      title: string;
      description: string;
      targetUserId?: string;
      targetOrgId?: string;
      evidence?: string[];
    },
  ) {
    return this.complaintService.fileComplaint(req.user.id, body as any);
  }

  /**
   * GET /api/complaints — list complaints
   */
  @Get()
  async listComplaints(
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.complaintService.listComplaints({
      status: status as any,
      category: category as any,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  /**
   * GET /api/complaints/my — my filed complaints
   */
  @Get('my')
  async myComplaints(@Req() req: any) {
    return this.complaintService.listComplaints({ filerId: req.user.id });
  }

  /**
   * GET /api/complaints/stats — complaint statistics
   */
  @Get('stats')
  async getStats() {
    return this.complaintService.getStats();
  }

  /**
   * GET /api/complaints/:id — get complaint details
   */
  @Get(':id')
  async getComplaint(@Param('id') id: string) {
    return this.complaintService.getComplaint(id);
  }

  /**
   * POST /api/complaints/:id/respond — respond to complaint
   */
  @Post(':id/respond')
  async respond(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { body: string; isOfficial?: boolean; attachments?: string[] },
  ) {
    return this.complaintService.respond(id, req.user.id, body.body, body.isOfficial, body.attachments);
  }

  /**
   * PUT /api/complaints/:id/assign — assign reviewer
   */
  @Put(':id/assign')
  async assignReviewer(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.complaintService.assignReviewer(id, assigneeId);
  }

  /**
   * PUT /api/complaints/:id/resolve — resolve complaint
   */
  @Put(':id/resolve')
  async resolve(@Param('id') id: string, @Body('resolution') resolution: string) {
    return this.complaintService.resolve(id, resolution);
  }

  /**
   * PUT /api/complaints/:id/dismiss — dismiss complaint
   */
  @Put(':id/dismiss')
  async dismiss(@Param('id') id: string, @Body('reason') reason: string) {
    return this.complaintService.dismiss(id, reason);
  }

  /**
   * POST /api/complaints/:id/escalate — escalate to court
   */
  @Post(':id/escalate')
  async escalate(@Param('id') id: string) {
    return this.complaintService.escalate(id);
  }
}
