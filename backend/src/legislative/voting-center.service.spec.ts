import { Test, TestingModule } from '@nestjs/testing';
import { VotingCenterService } from './voting-center.service';
import { ConfigService } from '@nestjs/config';

// Build mock contract functions so we can control return values per-test
const mockConnect = jest.fn();
const mockCreateProposal = jest.fn();
const mockVote = jest.fn();
const mockFinalizeProposal = jest.fn();
const mockGetProposal = jest.fn();
const mockGetProposalResults = jest.fn();
const mockGetProposalsByLevel = jest.fn();
const mockHasVoted = jest.fn();
const mockOn = jest.fn();
const mockParseLog = jest.fn();

const contractInstance = {
  createProposal: mockCreateProposal,
  vote: mockVote,
  finalizeProposal: mockFinalizeProposal,
  getProposal: mockGetProposal,
  getProposalResults: mockGetProposalResults,
  getProposalsByLevel: mockGetProposalsByLevel,
  hasVoted: mockHasVoted,
  on: mockOn,
  connect: mockConnect,
  interface: { parseLog: mockParseLog },
};

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({})),
    Contract: jest.fn().mockImplementation(() => contractInstance),
    Interface: jest.fn().mockImplementation(() => ({
      parseLog: mockParseLog,
    })),
  },
}));

describe('VotingCenterService', () => {
  let service: VotingCenterService;

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'VOTING_CENTER_ADDRESS') return '0xVoting';
      if (key === 'RPC_URL') return 'http://localhost:8545';
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // connect() returns the same contract (with signer)
    mockConnect.mockReturnValue(contractInstance);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VotingCenterService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(VotingCenterService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ==================== createProposal ====================

  describe('createProposal', () => {
    const signer = {} as any;
    const proposalData = {
      proposalType: 1,
      khuralLevel: 2,
      khuralId: 100,
      title: 'Test Proposal',
      description: 'Description',
      votingPeriod: 86400,
    };

    it('should create proposal and parse ProposalCreated event', async () => {
      const mockReceipt = {
        hash: '0xTxHash',
        logs: [{ topics: [], data: '0x' }],
      };
      mockCreateProposal.mockResolvedValue({ hash: '0xTxHash', wait: jest.fn().mockResolvedValue(mockReceipt) });
      mockParseLog.mockReturnValue({ name: 'ProposalCreated', args: { proposalId: 42n } });

      const result = await service.createProposal(signer, proposalData);
      expect(result.proposalId).toBe(42);
      expect(result.txHash).toBe('0xTxHash');
    });

    it('should return proposalId 0 if event not found', async () => {
      const mockReceipt = { hash: '0xTxHash', logs: [{ topics: [], data: '0x' }] };
      mockCreateProposal.mockResolvedValue({ hash: '0xTxHash', wait: jest.fn().mockResolvedValue(mockReceipt) });
      mockParseLog.mockReturnValue(null);

      const result = await service.createProposal(signer, proposalData);
      expect(result.proposalId).toBe(0);
    });

    it('should pass executionData when provided', async () => {
      const mockReceipt = { hash: '0xTxHash', logs: [] };
      mockCreateProposal.mockResolvedValue({ hash: '0xTx', wait: jest.fn().mockResolvedValue(mockReceipt) });

      await service.createProposal(signer, { ...proposalData, executionData: '0xABCD' });
      expect(mockCreateProposal).toHaveBeenCalledWith(1, 2, 100, 'Test Proposal', 'Description', '0xABCD', 86400);
    });

    it('should throw on blockchain error', async () => {
      mockCreateProposal.mockRejectedValue(new Error('revert'));
      await expect(service.createProposal(signer, proposalData)).rejects.toThrow('revert');
    });
  });

  // ==================== vote ====================

  describe('vote', () => {
    const signer = {} as any;

    it('should cast vote and return txHash', async () => {
      const receipt = { hash: '0xVoteHash' };
      mockVote.mockResolvedValue({ hash: '0xVoteHash', wait: jest.fn().mockResolvedValue(receipt) });

      const result = await service.vote(signer, 1, true, 'I agree');
      expect(result.txHash).toBe('0xVoteHash');
      expect(mockVote).toHaveBeenCalledWith(1, true, 'I agree');
    });

    it('should use empty reason by default', async () => {
      const receipt = { hash: '0xHash' };
      mockVote.mockResolvedValue({ hash: '0xH', wait: jest.fn().mockResolvedValue(receipt) });

      await service.vote(signer, 1, false);
      expect(mockVote).toHaveBeenCalledWith(1, false, '');
    });

    it('should throw on error', async () => {
      mockVote.mockRejectedValue(new Error('already voted'));
      await expect(service.vote(signer, 1, true)).rejects.toThrow('already voted');
    });
  });

  // ==================== finalizeProposal ====================

  describe('finalizeProposal', () => {
    const signer = {} as any;

    it('should finalize and parse status from event', async () => {
      const receipt = { hash: '0xFinHash', logs: [{}] };
      mockFinalizeProposal.mockResolvedValue({ wait: jest.fn().mockResolvedValue(receipt) });
      mockParseLog.mockReturnValue({ name: 'ProposalFinalized', args: { status: 1 } });

      const result = await service.finalizeProposal(signer, 5);
      expect(result.status).toBe('PASSED');
      expect(result.txHash).toBe('0xFinHash');
    });

    it('should default to ACTIVE if event not found', async () => {
      const receipt = { hash: '0xHash', logs: [{}] };
      mockFinalizeProposal.mockResolvedValue({ wait: jest.fn().mockResolvedValue(receipt) });
      mockParseLog.mockReturnValue(null);

      const result = await service.finalizeProposal(signer, 5);
      expect(result.status).toBe('ACTIVE');
    });

    it('should throw on error', async () => {
      mockFinalizeProposal.mockRejectedValue(new Error('not ended'));
      await expect(service.finalizeProposal(signer, 5)).rejects.toThrow('not ended');
    });
  });

  // ==================== getProposal ====================

  describe('getProposal', () => {
    it('should return mapped proposal with results', async () => {
      mockGetProposal.mockResolvedValue({
        proposalType: 1, khuralLevel: 2, khuralId: 100,
        title: 'Title', description: 'Desc', proposer: '0xProposer',
        status: 1, votingPeriod: 86400n, startTime: 1700000000n,
        endTime: 1700086400n, finalized: true, executed: false,
      });
      mockGetProposalResults.mockResolvedValue({
        votesFor: 10n, votesAgainst: 3n, quorumRequired: 5n, totalEligible: 20n,
      });

      const result = await service.getProposal(1);
      expect(result.proposalId).toBe(1);
      expect(result.title).toBe('Title');
      expect(result.results.votesFor).toBe(10);
      expect(result.results.votesAgainst).toBe(3);
      expect(result.finalized).toBe(true);
    });

    it('should throw on error', async () => {
      mockGetProposal.mockRejectedValue(new Error('not found'));
      await expect(service.getProposal(999)).rejects.toThrow('not found');
    });
  });

  // ==================== getProposalsByLevel ====================

  describe('getProposalsByLevel', () => {
    it('should return mapped array of proposal IDs', async () => {
      mockGetProposalsByLevel.mockResolvedValue([1n, 2n, 3n]);
      const result = await service.getProposalsByLevel(2);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should throw on error', async () => {
      mockGetProposalsByLevel.mockRejectedValue(new Error('fail'));
      await expect(service.getProposalsByLevel(99)).rejects.toThrow('fail');
    });
  });

  // ==================== hasVoted ====================

  describe('hasVoted', () => {
    it('should return true', async () => {
      mockHasVoted.mockResolvedValue(true);
      const result = await service.hasVoted(1, '0xVoter');
      expect(result).toBe(true);
    });

    it('should return false', async () => {
      mockHasVoted.mockResolvedValue(false);
      const result = await service.hasVoted(1, '0xOther');
      expect(result).toBe(false);
    });

    it('should throw on error', async () => {
      mockHasVoted.mockRejectedValue(new Error('fail'));
      await expect(service.hasVoted(1, '0x')).rejects.toThrow('fail');
    });
  });

  // ==================== listenToProposalEvents ====================

  describe('listenToProposalEvents', () => {
    it('should register listeners for 3 events', () => {
      const cb = jest.fn();
      service.listenToProposalEvents(cb);
      expect(mockOn).toHaveBeenCalledTimes(3);
      expect(mockOn).toHaveBeenCalledWith('ProposalCreated', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('VoteCast', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('ProposalFinalized', expect.any(Function));
    });

    it('should invoke callback for ProposalCreated', () => {
      const cb = jest.fn();
      service.listenToProposalEvents(cb);

      // Simulate ProposalCreated event
      const handler = mockOn.mock.calls.find(c => c[0] === 'ProposalCreated')[1];
      handler(1n, 0, 2, 100, '0xProposer', { log: { blockNumber: 10, transactionHash: '0xTx' } });
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'ProposalCreated', proposalId: 1 }));
    });

    it('should invoke callback for VoteCast', () => {
      const cb = jest.fn();
      service.listenToProposalEvents(cb);

      const handler = mockOn.mock.calls.find(c => c[0] === 'VoteCast')[1];
      handler(5n, '0xVoter', true, 'reason', { log: { blockNumber: 11, transactionHash: '0xTx2' } });
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'VoteCast', proposalId: 5, voter: '0xVoter' }));
    });

    it('should invoke callback for ProposalFinalized', () => {
      const cb = jest.fn();
      service.listenToProposalEvents(cb);

      const handler = mockOn.mock.calls.find(c => c[0] === 'ProposalFinalized')[1];
      handler(7n, 2, { log: { blockNumber: 12, transactionHash: '0xTx3' } });
      expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: 'ProposalFinalized', proposalId: 7, status: 2 }));
    });
  });
});
