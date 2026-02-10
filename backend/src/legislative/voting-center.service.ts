import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';

/**
 * @class VotingCenterService
 * @description Service for interacting with VotingCenter smart contract
 * Manages proposals, votes, and Legislative Branch operations
 */
@Injectable()
export class VotingCenterService {
  private readonly logger = new Logger(VotingCenterService.name);
  private provider: ethers.JsonRpcProvider;
  private votingCenter: ethers.Contract;
  
  // VotingCenter ABI (key methods)
  private readonly votingCenterAbi = [
    'function createProposal(uint8 proposalType, uint8 khuralLevel, uint256 khuralId, string title, string description, bytes executionData, uint256 votingPeriod) external returns (uint256)',
    'function vote(uint256 proposalId, bool support, string reason) external',
    'function finalizeProposal(uint256 proposalId) external',
    'function executeProposal(uint256 proposalId) external',
    'function getProposal(uint256 proposalId) external view returns (tuple(uint8 proposalType, uint8 khuralLevel, uint256 khuralId, string title, string description, bytes executionData, address proposer, uint256 votingPeriod, uint256 startTime, uint256 endTime, uint8 status, bool finalized, bool executed))',
    'function getProposalResults(uint256 proposalId) external view returns (uint256 votesFor, uint256 votesAgainst, uint256 quorumRequired, uint256 totalEligible)',
    'function hasVoted(uint256 proposalId, address voter) external view returns (bool)',
    'function getProposalsByLevel(uint8 level) external view returns (uint256[] memory)',
    'event ProposalCreated(uint256 indexed proposalId, uint8 proposalType, uint8 khuralLevel, uint256 khuralId, address proposer)',
    'event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, string reason)',
    'event ProposalFinalized(uint256 indexed proposalId, uint8 status)',
    'event ProposalExecuted(uint256 indexed proposalId)',
  ];

  constructor(private configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('RPC_URL');
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const votingCenterAddress = this.configService.get<string>('VOTING_CENTER_ADDRESS');
 this.votingCenter = new ethers.Contract(
      votingCenterAddress,
      this.votingCenterAbi,
      this.provider,
    );
    
    this.logger.log(`VotingCenter initialized at ${votingCenterAddress}`);
  }

  /**
   * Create a new proposal
   */
  async createProposal(
    signer: ethers.Signer,
    proposalData: {
      proposalType: number;
      khuralLevel: number;
      khuralId: number;
      title: string;
      description: string;
      executionData?: string;
      votingPeriod: number;
    },
  ): Promise<{ proposalId: number; txHash: string }> {
    try {
      const votingCenterWithSigner = this.votingCenter.connect(signer) as ethers.Contract;
      
      const tx = await votingCenterWithSigner.createProposal(
        proposalData.proposalType,
        proposalData.khuralLevel,
        proposalData.khuralId,
        proposalData.title,
        proposalData.description,
        proposalData.executionData || '0x',
        proposalData.votingPeriod,
      );
      
      this.logger.log(`Proposal creation tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      
      // Parse ProposalCreated event
      const event = receipt.logs
        .map(log => {
          try {
            return this.votingCenter.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === 'ProposalCreated');
      
      const proposalId = event?.args?.proposalId ? Number(event.args.proposalId) : 0;
      
      this.logger.log(`Proposal created: ID ${proposalId}`);
      return { proposalId, txHash: receipt.hash };
    } catch (error) {
      this.logger.error(`Failed to create proposal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Cast a vote on a proposal
   */
  async vote(
    signer: ethers.Signer,
    proposalId: number,
    support: boolean,
    reason: string = '',
  ): Promise<{ txHash: string }> {
    try {
      const votingCenterWithSigner = this.votingCenter.connect(signer) as ethers.Contract;
      
      const tx = await votingCenterWithSigner.vote(proposalId, support, reason);
      this.logger.log(`Vote tx sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      this.logger.log(`Vote recorded for proposal ${proposalId}`);
      
      return { txHash: receipt.hash };
    } catch (error) {
      this.logger.error(`Failed to vote: ${error.message}`);
      throw error;
    }
  }

  /**
   * Finalize a proposal after voting period ends
   */
  async finalizeProposal(
    signer: ethers.Signer,
    proposalId: number,
  ): Promise<{ status: string; txHash: string }> {
    try {
      const votingCenterWithSigner = this.votingCenter.connect(signer) as ethers.Contract;
      
      const tx = await votingCenterWithSigner.finalizeProposal(proposalId);
      const receipt = await tx.wait();
      
      // Parse ProposalFinalized event
      const event = receipt.logs
        .map(log => {
          try {
            return this.votingCenter.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e?.name === 'ProposalFinalized');
      
      const status = event?.args?.status ? Number(event.args.status) : 0;
      const statusName = ['ACTIVE', 'PASSED', 'REJECTED', 'EXECUTED', 'CANCELLED'][status];
      
      this.logger.log(`Proposal ${proposalId} finalized: ${statusName}`);
      return { status: statusName, txHash: receipt.hash };
    } catch (error) {
      this.logger.error(`Failed to finalize proposal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get proposal details
   */
  async getProposal(proposalId: number): Promise<any> {
    try {
      const proposal = await this.votingCenter.getProposal(proposalId);
      const results = await this.votingCenter.getProposalResults(proposalId);
      
      return {
        proposalId,
        proposalType: Number(proposal.proposalType),
        khuralLevel: Number(proposal.khuralLevel),
        khuralId: Number(proposal.khuralId),
        title: proposal.title,
        description: proposal.description,
        proposer: proposal.proposer,
        status: Number(proposal.status),
        votingPeriod: Number(proposal.votingPeriod),
        startTime: new Date(Number(proposal.startTime) * 1000),
        endTime: new Date(Number(proposal.endTime) * 1000),
        finalized: proposal.finalized,
        executed: proposal.executed,
        results: {
          votesFor: Number(results.votesFor),
          votesAgainst: Number(results.votesAgainst),
          quorumRequired: Number(results.quorumRequired),
          totalEligible: Number(results.totalEligible),
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get proposal: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all proposals for a Khural level
   */
  async getProposalsByLevel(level: number): Promise<number[]> {
    try {
      const proposalIds = await this.votingCenter.getProposalsByLevel(level);
      return proposalIds.map(id => Number(id));
    } catch (error) {
      this.logger.error(`Failed to get proposals by level: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if address has voted on proposal
   */
  async hasVoted(proposalId: number, voter: string): Promise<boolean> {
    try {
      return await this.votingCenter.hasVoted(proposalId, voter);
    } catch (error) {
      this.logger.error(`Failed to check vote status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Listen to proposal events
   */
  listenToProposalEvents(callback: (event: any) => void) {
    this.votingCenter.on('ProposalCreated', (...args) => {
      const [proposalId, proposalType, khuralLevel, khuralId, proposer, event] = args;
      callback({
        type: 'ProposalCreated',
        proposalId: Number(proposalId),
        proposalType: Number(proposalType),
        khuralLevel: Number(khuralLevel),
        khuralId: Number(khuralId),
        proposer,
        blockNumber: event.log.blockNumber,
        txHash: event.log.transactionHash,
      });
    });
    
    this.votingCenter.on('VoteCast', (...args) => {
      const [proposalId, voter, support, reason, event] = args;
      callback({
        type: 'VoteCast',
        proposalId: Number(proposalId),
        voter,
        support,
        reason,
        blockNumber: event.log.blockNumber,
        txHash: event.log.transactionHash,
      });
    });
    
    this.votingCenter.on('ProposalFinalized', (...args) => {
      const [proposalId, status, event] = args;
      callback({
        type: 'ProposalFinalized',
        proposalId: Number(proposalId),
        status: Number(status),
        blockNumber: event.log.blockNumber,
        txHash: event.log.transactionHash,
      });
    });
    
    this.logger.log('Listening to VotingCenter events');
  }
}
