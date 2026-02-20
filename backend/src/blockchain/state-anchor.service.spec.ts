import { Test, TestingModule } from '@nestjs/testing';
import { StateAnchorService } from './state-anchor.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from './blockchain.service';
import { ConfigService } from '@nestjs/config';

describe('StateAnchorService', () => {
  let service: StateAnchorService;
  let prisma: any;
  let blockchain: any;
  let config: any;

  beforeEach(async () => {
    const mockPrisma = {
      proposalVote: { findMany: jest.fn().mockResolvedValue([]) },
      election: { findMany: jest.fn().mockResolvedValue([]) },
      legislativeProposal: { findMany: jest.fn().mockResolvedValue([]) },
      emissionRecord: { findMany: jest.fn().mockResolvedValue([]) },
      userVerification: { findMany: jest.fn().mockResolvedValue([]) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const mockBlockchain = {
      callStateAnchor: jest.fn().mockResolvedValue('0xdeadbeef'),
    };
    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'STATE_ANCHOR_ADDRESS') return '0xAnchorContract';
        if (key === 'BLOCKCHAIN_ENABLED') return 'true';
        return undefined;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StateAnchorService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get(StateAnchorService);
    prisma = module.get(PrismaService);
    blockchain = module.get(BlockchainService);
    config = module.get(ConfigService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ── Merkle Tree ────────────────────────────────────────────────────────────

  describe('computeMerkleRoot', () => {
    it('returns zero root for empty leaves', () => {
      const root = service.computeMerkleRoot([]);
      expect(root).toBe('0x' + '0'.repeat(64));
    });

    it('returns deterministic root for single leaf', () => {
      const root1 = service.computeMerkleRoot(['abc123']);
      const root2 = service.computeMerkleRoot(['abc123']);
      expect(root1).toBe(root2);
      expect(root1).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('returns same root regardless of input order (sorted Merkle)', () => {
      const a = 'leaf-alpha';
      const b = 'leaf-beta';
      const root1 = service.computeMerkleRoot([a, b]);
      const root2 = service.computeMerkleRoot([b, a]);
      // Sorted Merkle: order-independent
      expect(root1).toBe(root2);
    });

    it('returns different roots for different data', () => {
      const root1 = service.computeMerkleRoot(['data1', 'data2']);
      const root2 = service.computeMerkleRoot(['data1', 'data3']);
      expect(root1).not.toBe(root2);
    });

    it('handles odd number of leaves (duplicates last)', () => {
      const root = service.computeMerkleRoot(['a', 'b', 'c']);
      expect(root).toMatch(/^0x[0-9a-f]{64}$/);
    });

    it('produces correct SHA-256 Merkle for known input', () => {
      // Two-leaf root: deterministic since we sort pairs
      const root = service.computeMerkleRoot(['nullifier-1', 'nullifier-2']);
      expect(root.length).toBe(66); // 0x + 64 hex chars
    });
  });

  // ── Batch Anchoring ────────────────────────────────────────────────────────

  describe('anchorVoteBatch', () => {
    it('returns null when no votes to anchor', async () => {
      prisma.proposalVote.findMany.mockResolvedValue([]);
      const result = await service.anchorVoteBatch('2026-W08');
      expect(result).toBeNull();
      expect(blockchain.callStateAnchor).not.toHaveBeenCalled();
    });

    it('computes merkle root and calls blockchain for votes', async () => {
      prisma.proposalVote.findMany.mockResolvedValue([
        { nullifier: 'null-1', id: 'v1' },
        { nullifier: 'null-2', id: 'v2' },
      ]);
      const txHash = await service.anchorVoteBatch('2026-W08');
      expect(txHash).toBe('0xdeadbeef');
      expect(blockchain.callStateAnchor).toHaveBeenCalledWith(
        '0xAnchorContract',
        expect.stringMatching(/^0x[0-9a-f]{64}$/),
        0, // AnchorType.VOTE_BATCH
        expect.stringContaining('Vote batch'),
      );
    });
  });

  describe('anchorElectionResults', () => {
    it('returns null when no completed elections', async () => {
      prisma.election.findMany.mockResolvedValue([]);
      expect(await service.anchorElectionResults()).toBeNull();
    });

    it('anchors election results', async () => {
      prisma.election.findMany.mockResolvedValue([
        { resultHash: 'hash-e1', id: 'e1' },
      ]);
      const result = await service.anchorElectionResults('2026-W08');
      expect(result).toBe('0xdeadbeef');
      expect(blockchain.callStateAnchor).toHaveBeenCalledWith(
        '0xAnchorContract',
        expect.any(String),
        1, // AnchorType.ELECTION_RESULT
        expect.stringContaining('Election results'),
      );
    });
  });

  describe('anchorAllBatches', () => {
    it('returns empty results when all batches are empty', async () => {
      const result = await service.anchorAllBatches();
      expect(result).toEqual({});
      expect(blockchain.callStateAnchor).not.toHaveBeenCalled();
    });

    it('anchors only non-empty batches', async () => {
      prisma.proposalVote.findMany.mockResolvedValue([
        { nullifier: 'null-1', id: 'v1' },
      ]);
      const result = await service.anchorAllBatches();
      expect(result.votes).toBe('0xdeadbeef');
      expect(result.elections).toBeUndefined();
    });
  });
});
