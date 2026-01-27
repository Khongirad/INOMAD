import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { GuildsService } from './guilds.service';
import { CreateGuildDto, JoinGuildDto } from './dto/guilds.dto';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import { Request } from '@nestjs/common';

@Controller('guilds')
export class GuildsController {
  constructor(private guildsService: GuildsService) {}

  @Post()
  createGuild(@Body() dto: CreateGuildDto) {
    return this.guildsService.createGuild(dto);
  }

  @Get()
  listGuilds(@Query('type') type?: string) {
    return this.guildsService.listGuilds(type);
  }

  @Get(':id')
  getGuild(@Param('id') id: string) {
    return this.guildsService.getGuild(id);
  }

  @Post(':id/join')
  joinGuild(@Param('id') guildId: string, @Request() req: AuthenticatedRequest) {
    return this.guildsService.joinGuild(guildId, req.user.id);
  }

  @Get(':id/members')
  getGuildMembers(@Param('id') guildId: string) {
    return this.guildsService.getGuildMembers(guildId);
  }
}
