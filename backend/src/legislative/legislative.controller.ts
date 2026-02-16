import { ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { LegislativeService } from './legislative.service';

/**
 * LegislativeController — REST API for the legislative proposal lifecycle.
 *
 * Routes are under /legislative/proposals (separate from /legislative/voting
 * which handles on-chain VotingCenter operations).
 */
@ApiTags('Legislative')
@Controller('legislative/proposals')
@UseGuards(AuthGuard)
export class LegislativeController {
  constructor(private readonly legislativeService: LegislativeService) {}

  // ===========================================================================
  // CRUD
  // ===========================================================================

  @Post()
  async createProposal(
    @Request() req,
    @Body()
    dto: {
      title: string;
      description: string;
      fullText: string;
      category: string;
      khuralLevel: string;
      entityId: string;
    },
  ) {
    return this.legislativeService.createProposal(req.user.userId, dto);
  }

  @Get()
  async listProposals(
    @Query('status') status?: string,
    @Query('khuralLevel') khuralLevel?: string,
    @Query('entityId') entityId?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.legislativeService.listProposals({
      status,
      khuralLevel,
      entityId,
      category,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get(':id')
  async getProposal(@Param('id') id: string) {
    return this.legislativeService.getProposal(id);
  }

  // ===========================================================================
  // LIFECYCLE TRANSITIONS
  // ===========================================================================

  @Patch(':id/submit')
  async submitProposal(@Param('id') id: string, @Request() req) {
    return this.legislativeService.submitProposal(id, req.user.userId);
  }

  @Patch(':id/debate')
  async openDebate(@Param('id') id: string) {
    return this.legislativeService.openDebate(id);
  }

  @Post(':id/debate')
  async addDebateEntry(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { content: string; replyToId?: string },
  ) {
    return this.legislativeService.addDebateEntry(
      id,
      req.user.userId,
      body.content,
      body.replyToId,
    );
  }

  @Patch(':id/vote-open')
  async openVoting(@Param('id') id: string) {
    return this.legislativeService.openVoting(id);
  }

  @Post(':id/vote')
  async castVote(
    @Param('id') id: string,
    @Request() req,
    @Body() body: { vote: 'FOR' | 'AGAINST' | 'ABSTAIN'; comment?: string },
  ) {
    return this.legislativeService.castVote(
      id,
      req.user.userId,
      body.vote,
      body.comment,
    );
  }

  @Patch(':id/finalize')
  async finalizeVoting(@Param('id') id: string) {
    return this.legislativeService.finalizeVoting(id);
  }

  @Patch(':id/sign')
  async signLaw(@Param('id') id: string, @Request() req) {
    return this.legislativeService.signLaw(id, req.user.userId);
  }

  @Patch(':id/archive')
  async archiveLaw(
    @Param('id') id: string,
    @Body() body: { documentId?: string },
  ) {
    return this.legislativeService.archiveLaw(id, body.documentId);
  }
}
