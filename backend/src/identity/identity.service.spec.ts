import { Test, TestingModule } from '@nestjs/testing';
import { IdentityService } from './identity.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

describe('IdentityService', () => {
  let service: IdentityService;
  let prisma: any;

  const mockUser = { id: 'u1', walletStatus: 'LOCKED', unlockRequest: null };

  const mockPrisma = () => ({
    user: { findUnique: jest.fn(), update: jest.fn() },
    unlockRequest: {
      findUnique: jest.fn(), upsert: jest.fn(),
      update: jest.fn(),
    },
    unlockApproval: { create: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdentityService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(IdentityService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── getStatus ─────────────────────────
  describe('getStatus', () => {
    it('should return user status', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      const result = await service.getStatus('u1');
      expect(result.id).toBe('u1');
    });

    it('should throw if not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getStatus('bad')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── requestUnlock ─────────────────────
  describe('requestUnlock', () => {
    it('should create unlock request', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.unlockRequest.upsert.mockResolvedValue({ id: 'req-1', status: 'PENDING' });
      prisma.user.update.mockResolvedValue({});
      const result = await service.requestUnlock('u1');
      expect(result.status).toBe('PENDING');
    });

    it('should throw if already unlocked', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, walletStatus: 'UNLOCKED' });
      await expect(service.requestUnlock('u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approveUnlock ─────────────────────
  describe('approveUnlock', () => {
    it('should create approval', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({ id: 'req-1', status: 'PENDING' });
      prisma.unlockApproval.create.mockResolvedValue({ id: 'appr-1' });
      const result = await service.approveUnlock('u2', 'u1');
      expect(result.id).toBe('appr-1');
    });

    it('should throw for self-approval', async () => {
      await expect(service.approveUnlock('u1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if not pending', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({ id: 'req-1', status: 'UNLOCKED' });
      await expect(service.approveUnlock('u2', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── finalizeUnlock ────────────────────
  describe('finalizeUnlock', () => {
    it('should finalize with 3 approvals', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({
        id: 'req-1', approvals: [1, 2, 3], // 3 approvals
      });
      const result = await service.finalizeUnlock('u1');
      expect(result.status).toBe('UNLOCKED');
    });

    it('should throw if quorum not reached', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue({
        id: 'req-1', approvals: [1, 2], // only 2
      });
      await expect(service.finalizeUnlock('u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if no request', async () => {
      prisma.unlockRequest.findUnique.mockResolvedValue(null);
      await expect(service.finalizeUnlock('u1')).rejects.toThrow(BadRequestException);
    });
  });
});
