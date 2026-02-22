import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { InaugurationService, InaugurateDto } from './inauguration.service';
import { CareerRole } from '@prisma/client';

@ApiTags('Inauguration')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('inauguration')
export class InaugurationController {
  constructor(private readonly service: InaugurationService) {}

  /**
   * POST /inauguration
   * Inaugurate a Leader + bind 9-member Personal Guard (Apparatus).
   * Returns oath hash and CareerLog IDs.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inaugurate a Leader and bind their Personal Guard (9 Staff)' })
  async inaugurate(@Body() dto: InaugurateDto) {
    return this.service.inaugurate(dto);
  }

  /**
   * GET /inauguration/legal-trace/:userId
   * Returns the Legal Graph data for frontend visualization:
   *   - Leader node + their sworn laws
   *   - 9 Staff nodes + their laws
   *   - sharedLaws + graphEdges
   */
  @Get('legal-trace/:userId')
  @ApiOperation({
    summary: 'Legal Graph: Leader + Staff nodes + Law edges for visualization',
    description:
      'Returns structured graph data. On hover leader node, highlight all swears_to_law edges. ' +
      'sharedLaws have unified oath badge.',
  })
  async getLegalTrace(@Param('userId') userId: string) {
    return this.service.getLegalTrace(userId);
  }

  /**
   * GET /inauguration/history/:userId
   * Career "Work Book" — full timeline of all appointments with quest counts.
   */
  @Get('history/:userId')
  @ApiOperation({ summary: 'Career history (Work Book) with quest counts per 2-year term' })
  async getUserHistory(@Param('userId') userId: string) {
    return this.service.getUserHistory(userId);
  }

  /**
   * POST /inauguration/revoke/:careerLogId
   * Revoke a Leader's CareerLog — cascades REVOKED to all 9 Staff.
   */
  @Post('revoke/:careerLogId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke a Leader — cascades REVOKED to entire Personal Guard',
  })
  async revokeLeader(
    @Param('careerLogId') careerLogId: string,
    @Body('reason') reason?: string,
  ) {
    return this.service.revokeLeader(careerLogId, reason);
  }

  /**
   * GET /inauguration/laws
   * List all active LawArticles (for oath ceremony UI selection).
   */
  @Get('laws')
  @ApiOperation({ summary: 'List all active Law Articles for the oath ceremony' })
  @ApiQuery({ name: 'source', required: false, enum: ['Constitution', 'Zun Statute', 'Myangad Charter', 'Tumed Charter'] })
  async getLawArticles(@Query('source') source?: string) {
    return this.service.getLawArticles(source);
  }
}
