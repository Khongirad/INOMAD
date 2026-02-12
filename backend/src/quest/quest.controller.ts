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
import { QuestService } from './quest.service';
import { AuthGuard } from '../auth/auth.guard';
import { QuestCategory } from '@prisma/client';

@Controller('quests')
@UseGuards(AuthGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  // ── Create quest ──
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.questService.createQuest(req.user.id, {
      title: body.title,
      description: body.description,
      objectives: body.objectives || [],
      category: body.category || 'OTHER',
      rewardAltan: body.rewardAltan,
      reputationGain: body.reputationGain,
      deadline: body.deadline,
      estimatedDuration: body.estimatedDuration,
      organizationId: body.organizationId,
      requirements: body.requirements,
      minReputation: body.minReputation,
    });
  }

  // ── Browse marketplace ──
  @Get()
  async browse(
    @Req() req: any,
    @Query('category') category?: QuestCategory,
    @Query('republicId') republicId?: string,
    @Query('minReward') minReward?: string,
    @Query('maxReward') maxReward?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.questService.browseQuests(req.user.id, {
      category,
      republicId,
      minReward: minReward ? Number(minReward) : undefined,
      maxReward: maxReward ? Number(maxReward) : undefined,
      search,
      organizationId,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ── My quests ──
  @Get('my')
  async myQuests(@Req() req: any, @Query('role') role?: 'giver' | 'taker' | 'all') {
    return this.questService.getMyQuests(req.user.id, role || 'all');
  }

  // ── Market stats ──
  @Get('stats')
  async stats() {
    return this.questService.getMarketStats();
  }

  // ── Quest detail ──
  @Get(':id')
  async getQuest(@Param('id') id: string) {
    return this.questService.getQuest(id);
  }

  // ── Accept quest ──
  @Post(':id/accept')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.questService.acceptQuest(id, req.user.id);
  }

  // ── Update progress ──
  @Put(':id/progress')
  async progress(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.questService.updateProgress(id, req.user.id, body.objectives);
  }

  // ── Submit for review ──
  @Post(':id/submit')
  async submit(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.questService.submitQuest(id, req.user.id, body.evidence || []);
  }

  // ── Approve (pay + reputation + tax) ──
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.questService.approveQuest(id, req.user.id, body.rating, body.feedback);
  }

  // ── Reject ──
  @Post(':id/reject')
  async reject(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.questService.rejectQuest(id, req.user.id, body.feedback);
  }
}
