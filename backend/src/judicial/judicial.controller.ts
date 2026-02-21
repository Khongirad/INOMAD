import { Controller, Get, Post, Param, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JudicialService } from './judicial.service';
import {
  AcceptCaseDto, AddHearingDto, FileJudicialCaseDto, IssueVerdictDto,
} from './dto/judicial.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('judicial')
@ApiBearerAuth()
@Controller('judicial')
export class JudicialController {
  constructor(private readonly judicialService: JudicialService) {}

  // ── Public reads ──────────────────────────────────────────────────────────

  @Public()
  @Get('cases')
  @ApiOperation({ summary: 'List judicial cases (filterable by status/level)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'level',  required: false })
  getCases(@Query('status') status?: string, @Query('level') level?: string) {
    return this.judicialService.getCases({ status, level });
  }

  @Public()
  @Get('cases/:id')
  @ApiOperation({ summary: 'Get full case details with hearings and verdict' })
  getCase(@Param('id') id: string) {
    return this.judicialService.getCase(id);
  }

  // ── Authenticated ─────────────────────────────────────────────────────────

  @Get('my-cases')
  @ApiOperation({ summary: 'Get all cases I am plaintiff, defendant, or judge in' })
  getMyCases(@Request() req: any) {
    return this.judicialService.getMyCases(req.user.userId);
  }

  @Post('cases')
  @ApiOperation({ summary: 'File a judicial case against a citizen or organization' })
  fileCase(@Request() req: any, @Body() dto: FileJudicialCaseDto) {
    return this.judicialService.fileCase(req.user.userId, dto);
  }

  @Post('cases/accept')
  @ApiOperation({ summary: 'Judge accepts a case (self-assignment)' })
  acceptCase(@Request() req: any, @Body() dto: AcceptCaseDto) {
    return this.judicialService.acceptCase(req.user.userId, dto);
  }

  @Post('cases/hearing')
  @ApiOperation({ summary: 'Schedule a hearing for the case' })
  addHearing(@Request() req: any, @Body() dto: AddHearingDto) {
    return this.judicialService.addHearing(req.user.userId, dto);
  }

  @Post('cases/verdict')
  @ApiOperation({ summary: 'Issue a verdict with cryptographic hash' })
  issueVerdict(@Request() req: any, @Body() dto: IssueVerdictDto) {
    return this.judicialService.issueVerdict(req.user.userId, dto);
  }

  @Post('cases/:id/close')
  @ApiOperation({ summary: 'Close the case after verdict' })
  closeCase(@Request() req: any, @Param('id') id: string) {
    return this.judicialService.closeCase(req.user.userId, id);
  }

  @Post('cases/:id/appeal')
  @ApiOperation({ summary: 'Appeal a verdict (plaintiff or defendant only)' })
  appealCase(@Request() req: any, @Param('id') id: string) {
    return this.judicialService.appealCase(req.user.userId, id);
  }
}
