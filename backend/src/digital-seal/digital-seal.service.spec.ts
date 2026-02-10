import { Test, TestingModule } from '@nestjs/testing';
import { DigitalSealService } from './digital-seal.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { ConfigService } from '@nestjs/config';

describe('DigitalSealService', () => {
  let service: DigitalSealService;
  let prisma: any;
  let blockchain: any;
  let config: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      digitalSeal: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn(),
      },
    };
    blockchain = {
      isAvailable: jest.fn().mockReturnValue(false),
      getWallet: jest.fn(),
      getProvider: jest.fn(),
    };
    config = { get: jest.fn().mockReturnValue('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigitalSealService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<DigitalSealService>(DigitalSealService);
  });

  describe('getSeal', () => {
    it('should return seal by ID', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue({ id: 'seal-1', status: 'PENDING' });
      const result = await service.getSeal('seal-1');
      expect(result.id).toBe('seal-1');
    });

    it('should return null for missing seal', async () => {
      prisma.digitalSeal.findUnique.mockResolvedValue(null);
      const result = await service.getSeal('bad');
      expect(result).toBeNull();
    });
  });

  describe('getSealsForUser', () => {
    it('should return seals for seatId', async () => {
      prisma.digitalSeal.findMany.mockResolvedValue([{ id: 'seal-1' }]);
      const result = await service.getSealsForUser('S1');
      expect(result).toHaveLength(1);
    });
  });

  describe('createSeal', () => {
    it('should create seal after resolving signers', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ walletAddress: '0xABC' })
        .mockResolvedValueOnce({ walletAddress: '0xDEF' });
      prisma.digitalSeal.create.mockResolvedValue({
        id: 'seal-1', signer1SeatId: 'S1', signer2SeatId: 'S2', status: 'PENDING',
      });
      const result = await service.createSeal({
        signer1SeatId: 'S1', signer2SeatId: 'S2', title: 'Test Seal',
      });
      expect(result.id).toBe('seal-1');
    });
  });
});
