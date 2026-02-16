import { Test, TestingModule } from '@nestjs/testing';
import { FounderService } from './founder.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn().mockImplementation(() => ({
      isBootstrapActive: jest.fn().mockResolvedValue(true),
      founder: jest.fn().mockResolvedValue('0xFOUNDER'),
      bootstrapped: jest.fn().mockResolvedValue(true),
      bootstrapTimestamp: jest.fn().mockResolvedValue(BigInt(1000)),
      founderVerifiedCount: jest.fn().mockResolvedValue(BigInt(5)),
      getRemainingVerifications: jest.fn().mockResolvedValue(BigInt(95)),
      getTimeRemaining: jest.fn().mockResolvedValue(BigInt(3600)),
      wasVerifiedByFounder: jest.fn().mockResolvedValue(true),
    })),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
  },
}));

describe('FounderService', () => {
  let service: FounderService;
  let blockchain: any;
  let prisma: any;

  beforeEach(async () => {
    const mockBlockchain = {
      isAvailable: jest.fn().mockReturnValue(true),
      contractAddresses: {
        getAddress: jest.fn().mockReturnValue('0xFOUNDER_BOOTSTRAP'),
      },
      provider: {},
    };
    const mockPrisma = {
      user: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FounderService,
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(FounderService);
    blockchain = module.get(BlockchainService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('isBootstrapActive', () => {
    it('returns false when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.isBootstrapActive()).toBe(false);
    });
    it('returns false when no contract address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.isBootstrapActive()).toBe(false);
    });
    it('returns true', async () => {
      expect(await service.isBootstrapActive()).toBe(true);
    });
    it('returns false on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        isBootstrapActive: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.isBootstrapActive()).toBe(false);
    });
  });

  describe('getFounderAddress', () => {
    it('returns null when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.getFounderAddress()).toBeNull();
    });
    it('returns null when no contract address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getFounderAddress()).toBeNull();
    });
    it('returns founder address', async () => {
      expect(await service.getFounderAddress()).toBe('0xFOUNDER');
    });
    it('returns null for ZeroAddress', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        founder: jest.fn().mockResolvedValue(ethers.ZeroAddress),
      }));
      expect(await service.getFounderAddress()).toBeNull();
    });
    it('returns null on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        founder: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.getFounderAddress()).toBeNull();
    });
  });

  describe('isFounder', () => {
    it('returns false when no user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      expect(await service.isFounder('u1')).toBe(false);
    });
    it('returns false when no walletAddress', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletAddress: null, seatId: '1' });
      expect(await service.isFounder('u1')).toBe(false);
    });
    it('returns false when founder address unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletAddress: '0xFOUNDER', seatId: '1' });
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.isFounder('u1')).toBe(false);
    });
    it('returns true when wallet matches and seatId is 1', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletAddress: '0xfounder', seatId: '1' });
      expect(await service.isFounder('u1')).toBe(true);
    });
    it('returns false when wallet matches but seatId is not 1', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletAddress: '0xfounder', seatId: '2' });
      expect(await service.isFounder('u1')).toBe(false);
    });
  });

  describe('getBootstrapStatus', () => {
    it('returns defaults when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.getBootstrapStatus();
      expect(r.isActive).toBe(false);
      expect(r.founder).toBeNull();
    });
    it('returns defaults when no contract address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      const r = await service.getBootstrapStatus();
      expect(r.verifiedCount).toBe(0);
    });
    it('returns full status', async () => {
      const r = await service.getBootstrapStatus();
      expect(r.isActive).toBe(true);
      expect(r.founder).toBe('0xFOUNDER');
      expect(r.verifiedCount).toBe(5);
      expect(r.remainingVerifications).toBe(95);
    });
    it('handles zero timestamp', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        isBootstrapActive: jest.fn().mockResolvedValue(false),
        founder: jest.fn().mockResolvedValue(ethers.ZeroAddress),
        bootstrapped: jest.fn().mockResolvedValue(false),
        bootstrapTimestamp: jest.fn().mockResolvedValue(BigInt(0)),
        founderVerifiedCount: jest.fn().mockResolvedValue(BigInt(0)),
        getRemainingVerifications: jest.fn().mockResolvedValue(BigInt(0)),
        getTimeRemaining: jest.fn().mockResolvedValue(BigInt(0)),
      }));
      const r = await service.getBootstrapStatus();
      expect(r.timestamp).toBeNull();
      expect(r.founder).toBeNull();
    });
    it('returns defaults on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        isBootstrapActive: jest.fn().mockRejectedValue(new Error('fail')),
        founder: jest.fn(),
        bootstrapped: jest.fn(),
        bootstrapTimestamp: jest.fn(),
        founderVerifiedCount: jest.fn(),
        getRemainingVerifications: jest.fn(),
        getTimeRemaining: jest.fn(),
      }));
      const r = await service.getBootstrapStatus();
      expect(r.isActive).toBe(false);
    });
  });

  describe('wasVerifiedByFounder', () => {
    it('returns false when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.wasVerifiedByFounder('1')).toBe(false);
    });
    it('returns false when no contract address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.wasVerifiedByFounder('1')).toBe(false);
    });
    it('returns true', async () => {
      expect(await service.wasVerifiedByFounder('1')).toBe(true);
    });
    it('returns false on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        wasVerifiedByFounder: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.wasVerifiedByFounder('1')).toBe(false);
    });
  });
});
