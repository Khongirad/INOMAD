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
import { ComplaintService } from './complaint.service';
import { AuthGuard } from '../auth/auth.guard';
import { ComplaintStatus, ComplaintCategory, DisputeSourceType } from '@prisma/client';

@Controller('complaints')
@UseGuards(AuthGuard)
export class ComplaintController {
  constructor(private readonly complaintService: ComplaintService) {}

  @Post()
  async fileComplaint(
    @Req() req: any,
    @Body()
    body: {
      sourceType: DisputeSourceType;
      sourceId: string;
      category: ComplaintCategory;
      title: string;
      description: string;
      targetUserId?: string;
      targetOrgId?: string;
      evidence?: string[];
      disputeId?: string;
    },
  ) {
    return this.complaintService.fileComplaint(req.user.id, body);
  }

  @Get()
  async listComplaints(
    @Query('status') status?: ComplaintStatus,
    @Query('category') category?: ComplaintCategory,
    @Query('level') level?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.complaintService.listComplaints({
      status,
      category,
      currentLevel: level ? parseInt(level) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('my')
  async myComplaints(@Req() req: any, @Query('page') page?: string) {
    return this.complaintService.listComplaints({
      filerId: req.user.id,
      page: page ? parseInt(page) : undefined,
    });
  }

  @Get('stats')
  async getStats() {
    return this.complaintService.getStats();
  }

  @Get('book')
  async getComplaintBook(
    @Query('level') level: string,
    @Query('entityId') entityId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.complaintService.getComplaintBook(
      parseInt(level),
      entityId,
      page ? parseInt(page) : undefined,
      limit ? parseInt(limit) : undefined,
    );
  }

  @Get(':id')
  async getComplaint(@Param('id') id: string) {
    return this.complaintService.getComplaint(id);
  }

  @Post(':id/respond')
  async respond(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { body: string; isOfficial?: boolean; attachments?: string[] },
  ) {
    return this.complaintService.respond(id, req.user.id, body.body, body.isOfficial, body.attachments);
  }

  @Patch(':id/assign')
  async assignReviewer(@Param('id') id: string, @Body('assigneeId') assigneeId: string) {
    return this.complaintService.assignReviewer(id, assigneeId);
  }

  @Post(':id/escalate')
  async escalateToNextLevel(
    @Param('id') id: string,
    @Req() req: any,
    @Body('reason') reason: string,
  ) {
    return this.complaintService.escalateToNextLevel(id, req.user.id, reason);
  }

  @Post(':id/escalate-court')
  async escalateToCourt(@Param('id') id: string) {
    return this.complaintService.escalateToCourt(id);
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string, @Body('resolution') resolution: string) {
    return this.complaintService.resolve(id, resolution);
  }

  @Patch(':id/dismiss')
  async dismiss(@Param('id') id: string, @Body('reason') reason: string) {
    return this.complaintService.dismiss(id, reason);
  }
}
