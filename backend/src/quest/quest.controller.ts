import { ApiTags } from '@nestjs/swagger';
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
  ParseUUIDPipe,
} from '@nestjs/common';
import { QuestService } from './quest.service';
import { AuthGuard } from '../auth/auth.guard';
import { QuestCategory } from '@prisma/client';
import {
  CreateQuestDto,
  ApproveQuestDto,
  RejectQuestDto,
  SubmitQuestDto,
  UpdateProgressDto,
} from './quest.dto';

@ApiTags('Gamification')
@Controller('quests')
@UseGuards(AuthGuard)
export class QuestController {
  constructor(private readonly questService: QuestService) {}

  // ── Create quest ──
  @Post()
  async create(@Req() req: any, @Body() dto: CreateQuestDto) {
    return this.questService.createQuest(req.user.id, dto);
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
  async getQuest(@Param('id', ParseUUIDPipe) id: string) {
    return this.questService.getQuest(id);
  }

  // ── Accept quest ──
  @Post(':id/accept')
  async accept(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.questService.acceptQuest(id, req.user.id);
  }

  // ── Update progress ──
  @Put(':id/progress')
  async progress(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.questService.updateProgress(id, req.user.id, dto.objectives);
  }

  // ── Submit for review ──
  @Post(':id/submit')
  async submit(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: SubmitQuestDto,
  ) {
    return this.questService.submitQuest(id, req.user.id, dto.evidence || []);
  }

  // ── Approve (pay + reputation + tax) ──
  @Post(':id/approve')
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: ApproveQuestDto,
  ) {
    return this.questService.approveQuest(id, req.user.id, dto.rating, dto.feedback);
  }

  // ── Reject ──
  @Post(':id/reject')
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
    @Body() dto: RejectQuestDto,
  ) {
    return this.questService.rejectQuest(id, req.user.id, dto.feedback);
  }

  // ── Cancel (giver cancels OPEN quest) ──
  @Post(':id/cancel')
  async cancel(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.questService.cancelQuest(id, req.user.id);
  }

  // ── Withdraw (taker abandons) ──
  @Post(':id/withdraw')
  async withdraw(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.questService.withdrawQuest(id, req.user.id);
  }
}
