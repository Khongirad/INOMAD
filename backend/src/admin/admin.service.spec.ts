import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('AdminService', () => {
  let service: AdminService;
  let prisma: any;

  const mockUser = {
    id: 'u1', seatId: 'S-001', role: 'CITIZEN', verificationStatus: 'PENDING',
    isFrozen: false, walletStatus: 'LOCKED', createdAt: new Date(),
  };

  const mockPrisma = () => ({
    user: {
      count: jest.fn().mockResolvedValue(10),
      findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(),
    },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(AdminService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── getStats ──────────────────────────
  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      const result = await service.getStats();
      expect(result.totalUsers).toBe(10);
      expect(result).toHaveProperty('pendingUsers');
      expect(result).toHaveProperty('verifiedUsers');
    });
  });

  // ─── listUsers ─────────────────────────
  describe('listUsers', () => {
    it('should return paginated users', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      prisma.user.count.mockResolvedValue(1);
      const result = await service.listUsers({ status: 'PENDING' });
      expect(result.total).toBe(1);
      expect(result.users).toHaveLength(1);
    });
  });

  // ─── getPendingUsers ───────────────────
  describe('getPendingUsers', () => {
    it('should return pending users', async () => {
      prisma.user.findMany.mockResolvedValue([mockUser]);
      const result = await service.getPendingUsers();
      expect(result).toHaveLength(1);
    });
  });

  // ─── verifyUser ────────────────────────
  describe('verifyUser', () => {
    it('should verify user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, verificationStatus: 'VERIFIED' });
      const result = await service.verifyUser('u1', 'admin-1');
      expect(result.verificationStatus).toBe('VERIFIED');
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.verifyUser('bad', 'admin')).rejects.toThrow(NotFoundException);
    });

    it('should throw if already verified', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, verificationStatus: 'VERIFIED' });
      await expect(service.verifyUser('u1', 'admin')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── rejectUser ────────────────────────
  describe('rejectUser', () => {
    it('should reject user', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, verificationStatus: 'REJECTED' });
      const result = await service.rejectUser('u1');
      expect(result.verificationStatus).toBe('REJECTED');
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.rejectUser('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getUserById ───────────────────────
  describe('getUserById', () => {
    it('should return user with wallet', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, mpcWallet: null });
      const result = await service.getUserById('u1');
      expect(result.id).toBe('u1');
    });

    it('should throw NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getUserById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── createAdmin ───────────────────────
  describe('createAdmin', () => {
    it('should promote user to admin', async () => {
      prisma.user.count.mockResolvedValue(3);
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.user.update.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      const result = await service.createAdmin('S-001', 'creator');
      expect(result.role).toBe('ADMIN');
    });

    it('should throw if max 9 admins reached', async () => {
      prisma.user.count.mockResolvedValue(9);
      await expect(service.createAdmin('S-001', 'creator')).rejects.toThrow(BadRequestException);
    });

    it('should throw if user already admin', async () => {
      prisma.user.count.mockResolvedValue(3);
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      await expect(service.createAdmin('S-001', 'creator')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── toggleFreezeAdmin ─────────────────
  describe('toggleFreezeAdmin', () => {
    it('should freeze admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      prisma.user.update.mockResolvedValue({ isFrozen: true });
      const result = await service.toggleFreezeAdmin('u1', 'creator', true);
      expect(result.isFrozen).toBe(true);
    });

    it('should throw for CREATOR account', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'CREATOR' });
      await expect(service.toggleFreezeAdmin('u1', 'cr', true)).rejects.toThrow(ForbiddenException);
    });

    it('should throw for non-ADMIN account', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); // role CITIZEN
      await expect(service.toggleFreezeAdmin('u1', 'cr', true)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── removeAdmin ───────────────────────
  describe('removeAdmin', () => {
    it('should remove admin privileges', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN' });
      prisma.user.update.mockResolvedValue({ ...mockUser, role: 'CITIZEN' });
      const result = await service.removeAdmin('u1');
      expect(result.role).toBe('CITIZEN');
    });

    it('should throw for CREATOR', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'CREATOR' });
      await expect(service.removeAdmin('u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if not admin', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser); // CITIZEN
      await expect(service.removeAdmin('u1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── listAdmins ────────────────────────
  describe('listAdmins', () => {
    it('should return admin and creator users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { ...mockUser, role: 'ADMIN' },
        { ...mockUser, id: 'u2', role: 'CREATOR' },
      ]);
      const result = await service.listAdmins();
      expect(result).toHaveLength(2);
    });
  });

  // ─── listUsers with role filter ────────
  describe('listUsers with role and pagination', () => {
    it('should apply role filter', async () => {
      prisma.user.findMany.mockResolvedValue([{ ...mockUser, role: 'ADMIN' }]);
      prisma.user.count.mockResolvedValue(1);
      const result = await service.listUsers({ role: 'ADMIN' });
      expect(result.total).toBe(1);
    });
    it('should apply limit and offset', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      prisma.user.count.mockResolvedValue(0);
      const result = await service.listUsers({ limit: 10, offset: 5 });
      expect(result.total).toBe(0);
    });
  });

  // ─── toggleFreezeAdmin user not found ──
  describe('toggleFreezeAdmin user not found', () => {
    it('should throw NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.toggleFreezeAdmin('bad', 'cr', true)).rejects.toThrow(NotFoundException);
    });
    it('should unfreeze admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, role: 'ADMIN', isFrozen: true });
      prisma.user.update.mockResolvedValue({ isFrozen: false });
      const result = await service.toggleFreezeAdmin('u1', 'creator', false);
      expect(result.isFrozen).toBe(false);
    });
  });

  // ─── createAdmin user not found ────────
  describe('createAdmin user not found', () => {
    it('should throw NotFoundException when seatId not found', async () => {
      prisma.user.count.mockResolvedValue(3);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.createAdmin('BAD-SEAT', 'creator')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── removeAdmin user not found ────────
  describe('removeAdmin user not found', () => {
    it('should throw NotFoundException', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.removeAdmin('bad')).rejects.toThrow(NotFoundException);
    });
  });
});

