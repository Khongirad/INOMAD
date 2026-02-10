import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      prisma.user.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(10)  // pending
        .mockResolvedValueOnce(80)  // verified
        .mockResolvedValueOnce(5)   // rejected
        .mockResolvedValueOnce(3);  // admins
      const stats = await service.getStats();
      expect(stats.totalUsers).toBe(100);
      expect(stats.pendingUsers).toBe(10);
    });
  });

  describe('listUsers', () => {
    it('should list users with filters', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
      const result = await service.listUsers({ status: 'VERIFIED', limit: 10 });
      expect(result).toEqual({ users: [], total: 0 });
    });
  });

  describe('verifyUser', () => {
    it('should throw NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyUser('bad', 'admin1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', verificationStatus: 'VERIFIED' });
      await expect(service.verifyUser('u1', 'admin1')).rejects.toThrow(BadRequestException);
    });

    it('should verify and unlock wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', verificationStatus: 'PENDING' });
      prisma.user.update.mockResolvedValue({ id: 'u1', verificationStatus: 'VERIFIED', walletStatus: 'UNLOCKED' });
      const result = await service.verifyUser('u1', 'admin1');
      expect(result.verificationStatus).toBe('VERIFIED');
    });
  });

  describe('rejectUser', () => {
    it('should throw NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.rejectUser('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createAdmin', () => {
    it('should throw if max 9 admins reached', async () => {
      prisma.user.count.mockResolvedValue(9);
      await expect(service.createAdmin('SEAT-1', 'creator')).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not found', async () => {
      prisma.user.count.mockResolvedValue(3);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createAdmin('BAD', 'creator')).rejects.toThrow(NotFoundException);
    });

    it('should promote citizen to admin', async () => {
      prisma.user.count.mockResolvedValue(3);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      prisma.user.update.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
      const result = await service.createAdmin('SEAT-1', 'creator');
      expect(result.role).toBe('ADMIN');
    });
  });

  describe('toggleFreezeAdmin', () => {
    it('should throw ForbiddenException for creator account', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CREATOR' });
      await expect(service.toggleFreezeAdmin('u1', 'c1', true)).rejects.toThrow(ForbiddenException);
    });

    it('should freeze admin account', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
      prisma.user.update.mockResolvedValue({ id: 'u1', isFrozen: true });
      const result = await service.toggleFreezeAdmin('u1', 'c1', true);
      expect(result.isFrozen).toBe(true);
    });
  });

  describe('removeAdmin', () => {
    it('should throw ForbiddenException for creator role', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CREATOR' });
      await expect(service.removeAdmin('u1')).rejects.toThrow(ForbiddenException);
    });

    it('should demote admin to citizen', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'ADMIN' });
      prisma.user.update.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      const result = await service.removeAdmin('u1');
      expect(result.role).toBe('CITIZEN');
    });
  });
});
