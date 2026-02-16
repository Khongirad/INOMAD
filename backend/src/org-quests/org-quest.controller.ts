import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrgQuestService } from './org-quest.service';

@ApiTags('OrgQuests')
@Controller('org-quests')
@UseGuards(AuthGuard)
export class OrgQuestController {
  constructor(private readonly orgQuestService: OrgQuestService) {}

  // ── Create a task for an organization ──
  @Post('org/:orgId')
  createTask(
    @Param('orgId') orgId: string,
    @Request() req: any,
    @Body()
    body: {
      title: string;
      description: string;
      objectives: Array<{ description: string }>;
      category: string;
      visibility?: 'ORG_ONLY' | 'BRANCH' | 'PUBLIC';
      requiredRole?: string;
      requiredSkills?: any;
      minReputation?: number;
      rewardAltan?: number;
      reputationGain?: number;
      deadline?: string;
      estimatedDuration?: number;
    },
  ) {
    return this.orgQuestService.createTask(orgId, req.user.sub, body);
  }

  // ── Get task board for a specific organization ──
  @Get('org/:orgId')
  getOrgTaskBoard(
    @Param('orgId') orgId: string,
    @Request() req: any,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orgQuestService.getOrgTaskBoard(orgId, req.user.sub, {
      category,
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ── Browse all available tasks ──
  @Get('browse')
  browseAvailableTasks(
    @Request() req: any,
    @Query('category') category?: string,
    @Query('powerBranch') powerBranch?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orgQuestService.browseAvailableTasks(req.user.sub, {
      category,
      powerBranch,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  // ── My tasks ──
  @Get('my')
  getMyTasks(
    @Request() req: any,
    @Query('role') role?: 'creator' | 'assignee' | 'all',
  ) {
    return this.orgQuestService.getMyTasks(req.user.sub, role || 'all');
  }

  // ── Get single task detail ──
  @Get(':taskId')
  getTask(@Param('taskId') taskId: string) {
    return this.orgQuestService.getTask(taskId);
  }

  // ── Accept a task ──
  @Put(':taskId/accept')
  acceptTask(@Param('taskId') taskId: string, @Request() req: any) {
    return this.orgQuestService.acceptTask(taskId, req.user.sub);
  }

  // ── Update progress ──
  @Put(':taskId/progress')
  updateProgress(
    @Param('taskId') taskId: string,
    @Request() req: any,
    @Body() body: { objectives: any[] },
  ) {
    return this.orgQuestService.updateProgress(taskId, req.user.sub, body.objectives);
  }

  // ── Submit for review ──
  @Put(':taskId/submit')
  submitTask(
    @Param('taskId') taskId: string,
    @Request() req: any,
    @Body() body: { evidence: any[] },
  ) {
    return this.orgQuestService.submitTask(taskId, req.user.sub, body.evidence);
  }

  // ── Approve completion ──
  @Put(':taskId/approve')
  approveTask(
    @Param('taskId') taskId: string,
    @Request() req: any,
    @Body() body: { rating: number; feedback?: string },
  ) {
    return this.orgQuestService.approveTask(taskId, req.user.sub, body.rating, body.feedback);
  }

  // ── Reject submission ──
  @Put(':taskId/reject')
  rejectTask(
    @Param('taskId') taskId: string,
    @Request() req: any,
    @Body() body: { feedback: string },
  ) {
    return this.orgQuestService.rejectTask(taskId, req.user.sub, body.feedback);
  }
}
