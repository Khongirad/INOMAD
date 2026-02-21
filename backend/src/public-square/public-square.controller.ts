import {
  Controller, Get, Post, Body, Param, Query, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PublicSquareService } from './public-square.service';
import { CreatePublicSquarePostDto, VotePublicSquareDto } from './dto/public-square.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('public-square')
@ApiBearerAuth()
@Controller('public-square')
export class PublicSquareController {
  constructor(private readonly publicSquareService: PublicSquareService) {}

  // ── Public reads ─────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'List public square posts (filterable by level, scope, type)' })
  @ApiQuery({ name: 'level', required: false })
  @ApiQuery({ name: 'scopeId', required: false })
  @ApiQuery({ name: 'postType', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getPosts(
    @Query('level') level?: string,
    @Query('scopeId') scopeId?: string,
    @Query('postType') postType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.publicSquareService.getPosts({
      level: level as any,
      scopeId,
      postType: postType as any,
      status: status as any,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Public()
  @Get('trending')
  @ApiOperation({ summary: 'Top petitions close to escalation threshold' })
  getTrending(@Query('limit') limit?: string) {
    return this.publicSquareService.getTrending(limit ? +limit : 10);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get single post with votes' })
  getPost(@Param('id') id: string) {
    return this.publicSquareService.getPost(id);
  }

  // ── Auth required ────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create a debate, petition, or proposal' })
  createPost(@Request() req: any, @Body() dto: CreatePublicSquarePostDto) {
    return this.publicSquareService.createPost(req.user.userId, dto);
  }

  @Post('vote')
  @ApiOperation({ summary: 'Support or oppose a post' })
  vote(@Request() req: any, @Body() dto: VotePublicSquareDto) {
    return this.publicSquareService.vote(req.user.userId, dto);
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Manually escalate a post to the next level (moderators)' })
  escalate(@Param('id') id: string) {
    return this.publicSquareService.escalatePost(id);
  }
}
