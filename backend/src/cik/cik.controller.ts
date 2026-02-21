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
  @ApiOperation({ summary: 'List Khural elections (filterable by level, branch, status)' })
  @ApiQuery({ name: 'status',    required: false })
  @ApiQuery({ name: 'branch',    required: false })
  @ApiQuery({ name: 'fromLevel', required: false })
  @ApiQuery({ name: 'toLevel',   required: false })
  getElections(
    @Query('status')    status?:    string,
    @Query('branch')    branch?:    string,
    @Query('fromLevel') fromLevel?: string,
    @Query('toLevel')   toLevel?:   string,
  ) {
    return this.cikService.getElections({ status, branch, fromLevel, toLevel });
  }

  @Public()
  @Get('ladder/:scopeId')
  @ApiOperation({ summary: 'Full election ladder snapshot for all 4 branches in a geographic scope' })
  getLadderStatus(@Param('scopeId') scopeId: string) {
    return this.cikService.getLadderStatus(scopeId);
  }

  @Public()
  @Get('elections/:id')
  @ApiOperation({ summary: 'Get election details with candidates & ballot count' })
  getElection(@Param('id') id: string) {
    return this.cikService.getElection(id);
  }

  // ── Creator only ─────────────────────────────────────────────────────────

  @Post('provisional/appoint')
  @ApiOperation({ summary: 'Creator appoints provisional CIK (one-time, for first Khural elections)' })
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
  @ApiOperation({
    summary: 'CIK creates a hierarchical branch election (fromLevel → toLevel, per branch)',
    description: 'Ladder: LEVEL_1→10→100→1000→10000→REPUBLIC→CONFEDERATION. Separate election per branch.',
  })
  createElection(@Request() req: any, @Body() dto: CreateKhuralElectionDto) {
    return this.cikService.createKhuralElection(req.user.userId, dto);
  }

  @Post('elections/:id/certify')
  @ApiOperation({ summary: 'CIK certifies election result (cryptographic result hash, winner becomes toLevel branch leader)' })
  certifyElection(@Request() req: any, @Param('id') id: string) {
    return this.cikService.certifyElection(req.user.userId, id);
  }

  // ── Citizen actions ───────────────────────────────────────────────────────

  @Post('candidates')
  @ApiOperation({ summary: 'Self-register as candidate / add platform (verified citizens only)' })
  registerCandidate(@Request() req: any, @Body() dto: RegisterCandidateDto) {
    return this.cikService.registerCandidate(req.user.userId, dto);
  }

  @Post('vote')
  @ApiOperation({
    summary: 'Cast Merkle-signed ballot',
    description: 'Voters are leaders of orgs at fromLevel. sha256(electionId|voter|candidate|ts) is returned.',
  })
  castBallot(@Request() req: any, @Body() dto: CastBallotDto) {
    return this.cikService.castBallot(req.user.userId, dto);
  }
}
