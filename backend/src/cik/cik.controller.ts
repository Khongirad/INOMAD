import {
  Controller, Get, Post, Body, Param, Query, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CIKService } from './cik.service';
import {
  AppointProvisionalCIKDto,
  CreateKhuralElectionDto,
  RegisterCandidateDto,
  CastBallotDto,
} from './dto/cik.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('cik')
@ApiBearerAuth()
@Controller('cik')
export class CIKController {
  constructor(private readonly cikService: CIKService) {}

  // ── Public reads ─────────────────────────────────────────────────────────

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get active CIK (provisional or permanent)' })
  getActiveCIK() {
    return this.cikService.getActiveCIK();
  }

  @Public()
  @Get('elections')
  @ApiOperation({ summary: 'List Khural elections' })
  @ApiQuery({ name: 'status', required: false })
  getElections(@Query('status') status?: string) {
    return this.cikService.getElections(status);
  }

  @Public()
  @Get('elections/:id')
  @ApiOperation({ summary: 'Get Khural election details with candidates & votes' })
  getElection(@Param('id') id: string) {
    return this.cikService.getElection(id);
  }

  // ── Creator only ─────────────────────────────────────────────────────────

  @Post('provisional/appoint')
  @ApiOperation({ summary: 'Creator appoints provisional CIK (one-time, for first Khural election)' })
  appointProvisionalCIK(@Request() req: any, @Body() dto: AppointProvisionalCIKDto) {
    return this.cikService.appointProvisionalCIK(req.user.userId, dto);
  }

  @Post('provisional/dissolve')
  @ApiOperation({ summary: 'Creator dissolves provisional CIK after Khural is seated' })
  dissolveProvisionalCIK(@Request() req: any) {
    return this.cikService.dissolveProvisionalCIK(req.user.userId);
  }

  // ── CIK member actions ────────────────────────────────────────────────────

  @Post('elections')
  @ApiOperation({ summary: 'CIK creates Khural election' })
  createElection(@Request() req: any, @Body() dto: CreateKhuralElectionDto) {
    return this.cikService.createKhuralElection(req.user.userId, dto);
  }

  @Post('elections/:id/certify')
  @ApiOperation({ summary: 'CIK certifies election result (cryptographic hash)' })
  certifyElection(@Request() req: any, @Param('id') id: string) {
    return this.cikService.certifyElection(req.user.userId, id);
  }

  // ── Citizen actions ───────────────────────────────────────────────────────

  @Post('candidates')
  @ApiOperation({ summary: 'Citizen registers as Khural candidate' })
  registerCandidate(@Request() req: any, @Body() dto: RegisterCandidateDto) {
    return this.cikService.registerCandidate(req.user.userId, dto);
  }

  @Post('vote')
  @ApiOperation({ summary: 'Cast Merkle-signed ballot in Khural election' })
  castBallot(@Request() req: any, @Body() dto: CastBallotDto) {
    return this.cikService.castBallot(req.user.userId, dto);
  }
}
