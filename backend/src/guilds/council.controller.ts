import { ApiTags } from '@nestjs/swagger';
import { Controller, Post, Body, Get, UseGuards, Req, Param } from '@nestjs/common';
import { CouncilService } from './council.service';
import { AuthenticatedRequest } from '../auth/auth.middleware';

@ApiTags('Guilds')
@Controller('council')
export class CouncilController {
  constructor(private readonly councilService: CouncilService) {}

  @Get('members/:guildId?')
  async getCouncil(@Param('guildId') guildId?: string) {
    return this.councilService.getCouncilMembers(guildId);
  }

  @Post('propose')
  async proposeEdit(
    @Req() req: AuthenticatedRequest,
    @Body() body: { eventId: string; title: string; description: string }
  ) {
    return this.councilService.proposeVersion(body.eventId, body.title, body.description, req.user.id);
  }

  @Post('vote')
  async vote(
    @Req() req: AuthenticatedRequest,
    @Body() body: { versionId: string; vote: boolean }
  ) {
    return this.councilService.castVote(body.versionId, req.user.id, body.vote);
  }
}
