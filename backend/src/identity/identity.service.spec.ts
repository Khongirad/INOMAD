import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IdentityService', () => {
  let service: IdentityService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      unlockRequest: {
        findUnique: jest.fn(),
        upsert: jest.fn().mockResolvedValue({ id: 'req-1', userId: 'u1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      unlockApproval: {
        create: jest.fn().mockResolvedValue({ id: 'approval-1' }),
      },
      $transaction: jest.fn().mockResolvedValue({}),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<IdentityService>(IdentityService);
  });

  describe('getStatus', () => {
    it('should throw for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getStatus('bad')).rejects.toThrow(BadRequestException);
    });

    it('should return user with unlock request', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', unlockRequest: null });
      const result = await service.getStatus('u1');
      expect(result.id).toBe('u1');
    });
  });

  describe('requestUnlock', () => {
    it('should throw for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.requestUnlock('bad')).rejects.toThrow(BadRequestException);
    });

    it('should throw if already unlocked', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletStatus: 'UNLOCKED' });
      await expect(service.requestUnlock('u1')).rejects.toThrow(BadRequestException);
    });

    it('should create unlock request', async () => {
      prisma.user.findUnique.mockResolvedValue({ walletStatus: 'LOCKED' });
      const result = await service.requestUnlock('u1');
      expect(result.id).toBe('req-1');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { walletStatus: 'PENDING' } }),
      );
    });
  });

  describe('approveUnlock', () => {
    it('should reject self-approval', async () => {
      await expect(service.approveUnlock('u1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should reject if target not pending', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue(null);
      await expect(service.approveUnlock('approver', 'target')).rejects.toThrow(BadRequestException);
    });

    it('should create approval record', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({ id: 'req-1', status: 'PENDING' });
      const result = await service.approveUnlock('approver', 'target');
      expect(result.id).toBe('approval-1');
    });
  });

  describe('finalizeUnlock', () => {
    it('should throw if no request', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue(null);
      await expect(service.finalizeUnlock('u1')).rejects.toThrow(BadRequestException);
    });

    it('should reject if quorum not reached', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        approvals: [{ id: '1' }, { id: '2' }], // only 2 of 3
      });
      await expect(service.finalizeUnlock('u1')).rejects.toThrow(ForbiddenException);
    });

    it('should unlock when quorum reached', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        approvals: [{ id: '1' }, { id: '2' }, { id: '3' }],
      });
      const result = await service.finalizeUnlock('u1');
      expect(result.status).toBe('UNLOCKED');
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });
});
