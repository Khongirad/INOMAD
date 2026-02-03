import { Controller, Get, Post, Body, Param, UseGuards, Req, Patch } from '@nestjs/common';
import { QuestService } from './quest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('quests')
@UseGuards(JwtAuthGuard)
export class QuestController {
  constructor(private questService: QuestService) {}

  @Post()
  async create(@Req() req, @Body() data: {
    title: string;
    description: string;
    objectives: Array<{ description: string }>;
    rewardAltan?: number;
    reputationGain?: number;
    deadline?: string;
    requirements?: any;
  }) {
    return this.questService.createQuest(req.user.id, {
      ...data,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
    });
  }

  @Get('available')
  async getAvailable(@Body() filters?: { minReward?: number }) {
    return this.questService.getAvailableQuests(filters);
  }

  @Get('my')
  async getMyQuests(@Req() req, @Body() params?: { role?: 'giver' | 'taker' | 'all' }) {
    return this.questService.getMyQuests(req.user.id, params?.role);
  }

  @Get(':id')
  async getQuest(@Param('id') id: string) {
    return this.questService.getQuest(id);
  }

  @Post(':id/accept')
  async accept(@Req() req, @Param('id') id: string) {
    return this.questService.acceptQuest(id, req.user.id);
  }

  @Patch(':id/progress')
  async updateProgress(@Req() req, @Param('id') id: string, @Body() data: { objectives: any[] }) {
    return this.questService.updateProgress(id, req.user.id, data.objectives);
  }

  @Post(':id/submit')
  async submit(@Req() req, @Param('id') id: string, @Body() data: { evidence: any[] }) {
    return this.questService.submitQuest(id, req.user.id, data.evidence);
  }

  @Post(':id/approve')
  async approve(@Req() req, @Param('id') id: string, @Body() data: { rating: number; feedback?: string }) {
    return this.questService.approveQuest(id, req.user.id, data.rating, data.feedback);
  }

  @Post(':id/reject')
  async reject(@Req() req, @Param('id') id: string, @Body() data: { feedback: string }) {
    return this.questService.rejectQuest(id, req.user.id, data.feedback);
  }
}
