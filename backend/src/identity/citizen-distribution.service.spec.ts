import { Test, TestingModule } from '@nestjs/testing';
import { CitizenDistributionService } from './citizen-distribution.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('ethers', () => ({
  ethers: {
    Contract: jest.fn().mockImplementation(() => ({
      hasReceivedDistribution: jest.fn().mockResolvedValue(false),
      perCitizenAmount: jest.fn().mockResolvedValue(BigInt(400000000)),
      totalDistributed: jest.fn().mockResolvedValue(BigInt(1000000000)),
      distributionPool: jest.fn().mockResolvedValue('0xPOOL'),
      sovereignFund: jest.fn().mockResolvedValue('0xFUND'),
    })),
    formatUnits: jest.fn().mockReturnValue('400.0'),
    ZeroAddress: '0x0000000000000000000000000000000000000000',
  },
}));

describe('CitizenDistributionService', () => {
  let service: CitizenDistributionService;
  let blockchain: any;
  let prisma: any;

  beforeEach(async () => {
    const mockBlockchain = {
      isAvailable: jest.fn().mockReturnValue(true),
      contractAddresses: {
        getAddress: jest.fn().mockReturnValue('0xBANK'),
      },
      provider: {},
    };
    const mockPrisma = {
      user: { findUnique: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CitizenDistributionService,
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(CitizenDistributionService);
    blockchain = module.get(BlockchainService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('hasReceivedDistribution', () => {
    it('returns false when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.hasReceivedDistribution('1')).toBe(false);
    });
    it('returns false when no bank address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.hasReceivedDistribution('1')).toBe(false);
    });
    it('returns result from contract', async () => {
      expect(await service.hasReceivedDistribution('1')).toBe(false);
    });
    it('returns false on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        hasReceivedDistribution: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.hasReceivedDistribution('1')).toBe(false);
    });
  });

  describe('getPerCitizenAmount', () => {
    it('returns null when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.getPerCitizenAmount()).toBeNull();
    });
    it('returns null when no bank address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getPerCitizenAmount()).toBeNull();
    });
    it('returns formatted amount', async () => {
      expect(await service.getPerCitizenAmount()).toBe('400.0');
    });
    it('returns null on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        perCitizenAmount: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.getPerCitizenAmount()).toBeNull();
    });
  });

  describe('getTotalDistributed', () => {
    it('returns null when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.getTotalDistributed()).toBeNull();
    });
    it('returns null when no bank address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getTotalDistributed()).toBeNull();
    });
    it('returns formatted total', async () => {
      expect(await service.getTotalDistributed()).toBe('400.0');
    });
    it('returns null on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        totalDistributed: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.getTotalDistributed()).toBeNull();
    });
  });

  describe('getDistributionPoolAddress', () => {
    it('returns null when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      expect(await service.getDistributionPoolAddress()).toBeNull();
    });
    it('returns null when no bank address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      expect(await service.getDistributionPoolAddress()).toBeNull();
    });
    it('returns pool address', async () => {
      expect(await service.getDistributionPoolAddress()).toBe('0xPOOL');
    });
    it('returns null for ZeroAddress', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        distributionPool: jest.fn().mockResolvedValue(ethers.ZeroAddress),
      }));
      expect(await service.getDistributionPoolAddress()).toBeNull();
    });
    it('returns null on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        distributionPool: jest.fn().mockRejectedValue(new Error('fail')),
      }));
      expect(await service.getDistributionPoolAddress()).toBeNull();
    });
  });

  describe('getDistributionStatus', () => {
    it('returns nulls when offline', async () => {
      blockchain.isAvailable.mockReturnValue(false);
      const r = await service.getDistributionStatus();
      expect(r.perCitizenAmount).toBeNull();
    });
    it('returns nulls when no bank address', async () => {
      blockchain.contractAddresses.getAddress.mockReturnValue(null);
      const r = await service.getDistributionStatus();
      expect(r.totalDistributed).toBeNull();
    });
    it('returns full status', async () => {
      const r = await service.getDistributionStatus();
      expect(r.perCitizenAmount).toBe('400.0');
    });
    it('returns nulls on error', async () => {
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        perCitizenAmount: jest.fn().mockRejectedValue(new Error('fail')),
        totalDistributed: jest.fn(),
        distributionPool: jest.fn(),
        sovereignFund: jest.fn(),
      }));
      const r = await service.getDistributionStatus();
      expect(r.perCitizenAmount).toBeNull();
    });
  });

  describe('checkEligibility', () => {
    it('returns not eligible when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const r = await service.checkEligibility('u1');
      expect(r.eligible).toBe(false);
      expect(r.reason).toContain('not found');
    });
    it('returns not eligible when no seatId', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: null, verificationStatus: 'VERIFIED' });
      const r = await service.checkEligibility('u1');
      expect(r.eligible).toBe(false);
      expect(r.reason).toContain('SeatID');
    });
    it('returns not eligible when not verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: '1', verificationStatus: 'PENDING' });
      const r = await service.checkEligibility('u1');
      expect(r.eligible).toBe(false);
      expect(r.reason).toContain('Not verified');
    });
    it('returns not eligible when already received', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: '1', verificationStatus: 'VERIFIED' });
      const { ethers } = require('ethers');
      ethers.Contract.mockImplementationOnce(() => ({
        hasReceivedDistribution: jest.fn().mockResolvedValue(true),
      }));
      const r = await service.checkEligibility('u1');
      expect(r.eligible).toBe(false);
    });
    it('returns eligible', async () => {
      prisma.user.findUnique.mockResolvedValue({ seatId: '1', verificationStatus: 'VERIFIED' });
      const r = await service.checkEligibility('u1');
      expect(r.eligible).toBe(true);
    });
  });
});
