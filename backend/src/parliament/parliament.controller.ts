import { ApiTags } from '@nestjs/swagger';
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
import { ParliamentService } from './parliament.service';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Parliament')
@Controller('parliament')
@UseGuards(AuthGuard)
export class ParliamentController {
  constructor(private readonly parliamentService: ParliamentService) {}

  // ── SESSIONS ──

  @Post('sessions')
  async createSession(@Req() req: any, @Body() body: any) {
    return this.parliamentService.createSession(req.user.id, body);
  }

  @Get('sessions')
  async listSessions(
    @Query('level') level?: string,
    @Query('entityId') entityId?: string,
    @Query('status') status?: string,
  ) {
    return this.parliamentService.listSessions(level, entityId, status);
  }

  @Get('sessions/:id')
  async getSession(@Param('id') id: string) {
    return this.parliamentService.getSession(id);
  }

  @Patch('sessions/:id/start')
  async startSession(@Param('id') id: string, @Req() req: any) {
    return this.parliamentService.startSession(id, req.user.id);
  }

  @Patch('sessions/:id/complete')
  async completeSession(
    @Param('id') id: string,
    @Req() req: any,
    @Body('resolution') resolution?: string,
  ) {
    return this.parliamentService.completeSession(id, req.user.id, resolution);
  }

  // ── VOTING ──

  @Post('sessions/:id/vote')
  async castVote(
    @Param('id') id: string,
    @Req() req: any,
    @Body() body: { vote: 'FOR' | 'AGAINST' | 'ABSTAIN'; comment?: string },
  ) {
    return this.parliamentService.castVote(id, req.user.id, body);
  }

  @Get('sessions/:id/results')
  async getResults(@Param('id') id: string) {
    return this.parliamentService.getVoteResults(id);
  }
}
