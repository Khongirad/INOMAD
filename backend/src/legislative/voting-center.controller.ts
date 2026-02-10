import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { VotingCenterService } from './voting-center.service';
import { ethers } from 'ethers';

/**
 * @class VotingCenterController
 * @description REST API for Legislative Branch voting
 */
@Controller('legislative/voting')
export class VotingCenterController {
  private readonly logger = new Logger(VotingCenterController.name);

  constructor(private readonly votingCenterService: VotingCenterService) {}

  /**
   * POST /legislative/voting/proposals
   * Create a new proposal
   */
  @Post('proposals')
  async createProposal(
    @Request() req,
    @Body()
    body: {
      proposalType: number;
      khuralLevel: number;
      khuralId: number;
      title: string;
      description: string;
      executionData?: string;
      votingPeriod: number;
      privateKey: string; // TODO: Replace with proper auth
    },
  ) {
    try {
      // TODO: Get signer from authenticated user wallet
      const signer = new ethers.Wallet(body.privateKey);
      
      const result = await this.votingCenterService.createProposal(signer, {
        proposalType: body.proposalType,
        khuralLevel: body.khuralLevel,
        khuralId: body.khuralId,
        title: body.title,
        description: body.description,
        executionData: body.executionData,
        votingPeriod: body.votingPeriod,
      });
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Create proposal failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /legislative/voting/proposals/:id
   * Get proposal details
   */
  @Get('proposals/:id')
  async getProposal(@Param('id') id: string) {
    try {
      const proposalId = parseInt(id);
      const proposal = await this.votingCenterService.getProposal(proposalId);
      
      return {
        success: true,
        data: proposal,
      };
    } catch (error) {
      this.logger.error(`Get proposal failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /legislative/voting/proposals
   * Get proposals by level
   */
  @Get('proposals')
  async getProposalsByLevel(@Request() req) {
    try {
      const level = parseInt(req.query.level || '1');
      const proposalIds = await this.votingCenterService.getProposalsByLevel(level);
      
      // Fetch full proposals
      const proposals = await Promise.all(
        proposalIds.map(id => this.votingCenterService.getProposal(id)),
      );
      
      return {
        success: true,
        data: proposals,
      };
    } catch (error) {
      this.logger.error(`Get proposals failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /legislative/voting/proposals/:id/vote
   * Cast a vote
   */
  @Post('proposals/:id/vote')
  async vote(
    @Param('id') id: string,
    @Body()
    body: {
      support: boolean;
      reason?: string;
      privateKey: string; // TODO: Replace with proper auth
    },
  ) {
    try {
      const proposalId = parseInt(id);
      const signer = new ethers.Wallet(body.privateKey);
      
      const result = await this.votingCenterService.vote(
        signer,
        proposalId,
        body.support,
        body.reason || '',
      );
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Vote failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /legislative/voting/proposals/:id/finalize
   * Finalize a proposal
   */
  @Post('proposals/:id/finalize')
  async finalizeProposal(
    @Param('id') id: string,
    @Body() body: { privateKey: string },
  ) {
    try {
      const proposalId = parseInt(id);
      const signer = new ethers.Wallet(body.privateKey);
      
      const result = await this.votingCenterService.finalizeProposal(signer, proposalId);
      
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Finalize failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /legislative/voting/proposals/:id/results
   * Get proposal results
   */
  @Get('proposals/:id/results')
  async getResults(@Param('id') id: string) {
    try {
      const proposalId = parseInt(id);
      const proposal = await this.votingCenterService.getProposal(proposalId);
      
      return {
        success: true,
        data: proposal.results,
      };
    } catch (error) {
      this.logger.error(`Get results failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }

  /**
   * GET /legislative/voting/proposals/:id/has-voted/:address
   * Check if address voted
   */
  @Get('proposals/:id/has-voted/:address')
  async hasVoted(@Param('id') id: string, @Param('address') address: string) {
    try {
      const proposalId = parseInt(id);
      const hasVoted = await this.votingCenterService.hasVoted(proposalId, address);
      
      return {
        success: true,
        data: { hasVoted },
      };
    } catch (error) {
      this.logger.error(`Check vote status failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }
  }
}
