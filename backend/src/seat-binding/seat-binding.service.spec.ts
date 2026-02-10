import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { SeatBindingService } from './seat-binding.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('SeatBindingService', () => {
  let service: SeatBindingService;
  let prisma: any;
  let blockchain: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };

    blockchain = {
      isAvailable: jest.fn().mockReturnValue(true),
      verifySeatOwnership: jest.fn(),
      getSeatOwner: jest.fn(),
      getSeatsOwnedBy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatBindingService,
        { provide: PrismaService, useValue: prisma },
        { provide: BlockchainService, useValue: blockchain },
      ],
    }).compile();

    service = module.get<SeatBindingService>(SeatBindingService);
  });

  describe('bindSeatToUser', () => {
    it('should throw when blockchain unavailable', async () => {
      blockchain.isAvailable.mockReturnValue(false);

      await expect(
        service.bindSeatToUser('user-1', 'SEAT-001', '0xAddr'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw when wallet does not own seat', async () => {
      blockchain.verifySeatOwnership.mockResolvedValue(false);
      blockchain.getSeatOwner.mockResolvedValue('0xOtherAddr');

      await expect(
        service.bindSeatToUser('user-1', 'SEAT-001', '0xAddr'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw when seat bound to another user', async () => {
      blockchain.verifySeatOwnership.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({ id: 'other-user' });

      await expect(
        service.bindSeatToUser('user-1', 'SEAT-001', '0xAddr'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should bind seat successfully', async () => {
      const now = new Date();
      blockchain.verifySeatOwnership.mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(null); // no existing binding
      prisma.user.upsert.mockResolvedValue({
        id: 'user-1',
        seatId: 'SEAT-001',
        updatedAt: now,
      });

      const result = await service.bindSeatToUser('user-1', 'SEAT-001', '0xAddr');

      expect(result.verified).toBe(true);
      expect(result.seatId).toBe('SEAT-001');
      expect(result.walletAddress).toBe('0xAddr');
    });
  });

  describe('verifySeatBinding', () => {
    it('should return false for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.verifySeatBinding('unknown');
      expect(result).toBe(false);
    });

    it('should return false for user without seat', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: null });

      const result = await service.verifySeatBinding('user-1');
      expect(result).toBe(false);
    });

    it('should return false when blockchain unavailable', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: 'SEAT-001' });
      blockchain.isAvailable.mockReturnValue(false);

      const result = await service.verifySeatBinding('user-1');
      expect(result).toBe(false);
    });
  });

  describe('syncSeatsFromBlockchain', () => {
    it('should throw when blockchain unavailable', async () => {
      blockchain.isAvailable.mockReturnValue(false);

      await expect(
        service.syncSeatsFromBlockchain('0xAddr'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return seat IDs', async () => {
      blockchain.getSeatsOwnedBy.mockResolvedValue(['SEAT-001', 'SEAT-002']);

      const result = await service.syncSeatsFromBlockchain('0xAddr');
      expect(result).toEqual(['SEAT-001', 'SEAT-002']);
    });
  });

  describe('getSeatBindingStatus', () => {
    it('should return not bound for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.getSeatBindingStatus('unknown');
      expect(result.bound).toBe(false);
    });

    it('should return bound status with on-chain info', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        seatId: 'SEAT-001',
        role: 'CITIZEN',
        updatedAt: new Date(),
      });
      blockchain.getSeatOwner.mockResolvedValue('0xAddr');

      const result = await service.getSeatBindingStatus('user-1');
      expect(result.bound).toBe(true);
      expect(result.onChainStatus.exists).toBe(true);
    });
  });

  describe('unbindSeat', () => {
    it('should throw for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.unbindSeat('unknown', 'test'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should unbind seat with reason', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        seatId: 'SEAT-001',
      });
      prisma.user.update.mockResolvedValue({});

      await service.unbindSeat('user-1', 'admin request');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          seatId: expect.stringContaining('UNBOUND_SEAT-001_'),
        },
      });
    });
  });
});
