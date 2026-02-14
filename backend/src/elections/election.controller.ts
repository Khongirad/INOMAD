import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ElectionService } from './election.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreateElectionDto, AddCandidateDto, CastVoteDto } from './dto/election.dto';

@Controller('elections')
@UseGuards(JwtAuthGuard)
export class ElectionController {
  constructor(private readonly electionService: ElectionService) {}

  /**
   * Create election
   */
  @Post('create')
  async createElection(
    @Request() req,
    @Body() body: CreateElectionDto,
  ) {
    return this.electionService.createElection({
      organizationId: body.organizationId,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      creatorId: req.user.id,
    });
  }

  /**
   * Add candidate to election
   */
  @Post(':id/candidate')
  async addCandidate(
    @Param('id') electionId: string,
    @Body() body: AddCandidateDto,
  ) {
    return this.electionService.addCandidate(
      electionId,
      body.candidateId,
      body.platform
    );
  }

  /**
   * Cast vote
   */
  @Post(':id/vote')
  async vote(
    @Request() req,
    @Param('id') electionId: string,
    @Body() body: CastVoteDto,
  ) {
    await this.electionService.vote({
      electionId,
      voterId: req.user.id,
      candidateId: body.candidateId,
    });

    return { success: true };
  }

  /**
   * Complete election (admin/auto)
   */
  @Post(':id/complete')
  @UseGuards(AdminGuard)
  async completeElection(@Request() req, @Param('id') electionId: string) {
    return this.electionService.completeElection(electionId, req.user.id);
  }

  /**
   * Cancel election (admin)
   */
  @Post(':id/cancel')
  @UseGuards(AdminGuard)
  async cancelElection(@Request() req, @Param('id') electionId: string) {
    return this.electionService.cancelElection(electionId, req.user.id);
  }

  /**
   * Get election details
   */
  @Get(':id')
  async getElection(@Param('id') electionId: string) {
    return this.electionService.getElection(electionId);
  }

  /**
   * Get organization's elections
   */
  @Get('organization/:organizationId')
  async getOrganizationElections(@Param('organizationId') organizationId: string) {
    return this.electionService.getOrganizationElections(organizationId);
  }

  /**
   * Get active elections
   */
  @Get('status/active')
  async getActiveElections() {
    return this.electionService.getActiveElections();
  }

  /**
   * Get upcoming elections
   */
  @Get('status/upcoming')
  async getUpcomingElections() {
    return this.electionService.getUpcomingElections();
  }

  /**
   * Cron: activate upcoming elections
   */
  @Post('cron/activate')
  @UseGuards(AdminGuard)
  async activateElections() {
    const count = await this.electionService.activateUpcomingElections();
    return { activated: count };
  }

  /**
   * Cron: auto-complete elections
   */
  @Post('cron/complete')
  @UseGuards(AdminGuard)
  async autoCompleteElections() {
    const count = await this.electionService.autoCompleteElections();
    return { completed: count };
  }
}
