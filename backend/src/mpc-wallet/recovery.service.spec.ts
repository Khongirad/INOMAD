import { Test, TestingModule } from '@nestjs/testing';
import { RecoveryService } from './recovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('RecoveryService', () => {
  let service: RecoveryService;
  let prisma: any;
  let notificationService: any;

  const mockWallet = {
    id: 'wallet-1', userId: 'user-1',
    address: '0x1234', serverShareEnc: 'enc', status: 'ACTIVE',
    guardians: [
      { id: 'g1', guardianType: 'SPOUSE', isConfirmed: true, guardianUserId: 'guard-1', recoveryApproved: false },
      { id: 'g2', guardianType: 'FAMILY', isConfirmed: true, guardianUserId: 'guard-2', recoveryApproved: false },
      { id: 'g3', guardianType: 'FRIEND', isConfirmed: false, guardianUserId: 'guard-3', recoveryApproved: false },
    ],
  };

  const mockSession = {
    id: 'session-1', walletId: 'wallet-1', status: 'PENDING',
    method: 'SOCIAL', verificationCode: null, requiredApprovals: 2,
    currentApprovals: 0, expiresAt: new Date(Date.now() + 86400000),
  };

  const mockPrisma = () => ({
    recoveryGuardian: {
      count: jest.fn(), create: jest.fn(), findMany: jest.fn(),
      findFirst: jest.fn(), update: jest.fn(),
    },
    recoverySession: {
      findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(),
    },
    mPCWallet: { findUnique: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn() },
    familyArban: { findMany: jest.fn() },
    orgArbanMember: { findMany: jest.fn() },
  });

  const mockNotification = () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    notifyGuardian: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryService,
        { provide: PrismaService, useFactory: mockPrisma },
        { provide: NotificationService, useFactory: mockNotification },
      ],
    }).compile();
    service = module.get(RecoveryService);
    prisma = module.get(PrismaService);
    notificationService = module.get(NotificationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── addGuardian ───────────────────────
  describe('addGuardian', () => {
    it('should add guardian when under limit', async () => {
      prisma.recoveryGuardian.count.mockResolvedValue(3);
      prisma.recoveryGuardian.create.mockResolvedValue({ id: 'g-new' });
      const result = await service.addGuardian('wallet-1', 'SPOUSE' as any, 'user-2', 'Spouse Name', 'user-2');
      expect(result.id).toBe('g-new');
    });

    it('should throw BadRequestException when max 5 guardians reached', async () => {
      prisma.recoveryGuardian.count.mockResolvedValue(5);
      await expect(
        service.addGuardian('wallet-1', 'SPOUSE' as any, 'user-2'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── getGuardians ──────────────────────
  describe('getGuardians', () => {
    it('should return guardians ordered by confirmation', async () => {
      prisma.recoveryGuardian.findMany.mockResolvedValue(mockWallet.guardians);
      const result = await service.getGuardians('wallet-1');
      expect(result).toHaveLength(3);
    });
  });

  // ─── suggestGuardians ──────────────────
  describe('suggestGuardians', () => {
    it('should suggest spouse as HIGH trust', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: 'seat-1' });
      prisma.familyArban.findMany.mockResolvedValue([{
        husbandSeatId: 'seat-1', wifeSeatId: 'seat-2', khuralRepSeatId: 'seat-3',
        children: [{ childSeatId: 'seat-4' }],
      }]);
      prisma.orgArbanMember.findMany.mockResolvedValue([]);
      const result = await service.suggestGuardians('user-1');
      expect(result.length).toBeGreaterThanOrEqual(1);
      const spouse = result.find(s => s.trust === 'HIGH' && s.type === 'SPOUSE');
      expect(spouse).toBeDefined();
    });

    it('should suggest khural rep as HIGH trust', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: 'seat-1' });
      prisma.familyArban.findMany.mockResolvedValue([{
        husbandSeatId: 'seat-1', wifeSeatId: null, khuralRepSeatId: 'seat-rep',
        children: [],
      }]);
      prisma.orgArbanMember.findMany.mockResolvedValue([]);
      const result = await service.suggestGuardians('user-1');
      const rep = result.find(s => s.type === 'KHURAL_REP');
      expect(rep?.trust).toBe('HIGH');
    });

    it('should suggest children as MEDIUM trust', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: 'seat-1' });
      prisma.familyArban.findMany.mockResolvedValue([{
        husbandSeatId: 'seat-1', wifeSeatId: null, khuralRepSeatId: null,
        children: [{ childSeatId: 'seat-child' }],
      }]);
      prisma.orgArbanMember.findMany.mockResolvedValue([]);
      const result = await service.suggestGuardians('user-1');
      const child = result.find(s => s.type === 'FAMILY');
      expect(child?.trust).toBe('MEDIUM');
    });

    it('should suggest org leader as MEDIUM trust', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-1', seatId: 'seat-1' });
      prisma.familyArban.findMany.mockResolvedValue([]);
      prisma.orgArbanMember.findMany.mockResolvedValue([{
        org: { leaderSeatId: 'seat-leader' },
      }]);
      const result = await service.suggestGuardians('user-1');
      const leader = result.find(s => s.relationship === 'Organization Leader');
      expect(leader?.trust).toBe('MEDIUM');
    });

    it('should return empty for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      const result = await service.suggestGuardians('bad');
      expect(result).toEqual([]);
    });
  });

  // ─── initiateRecovery ──────────────────
  describe('initiateRecovery', () => {
    it('should create social recovery session', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(mockWallet);
      prisma.recoverySession.findFirst.mockResolvedValue(null);
      prisma.recoverySession.create.mockResolvedValue(mockSession);
      prisma.mPCWallet.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ email: 'test@test.com', username: 'tester' });
      const result = await service.initiateRecovery('0x1234', 'SOCIAL' as any);
      expect(result.status).toBe('PENDING');
    });

    it('should throw NotFoundException for unknown address', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(null);
      await expect(service.initiateRecovery('0xbad', 'SOCIAL' as any)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if recovery already in progress', async () => {
      prisma.mPCWallet.findUnique.mockResolvedValue(mockWallet);
      prisma.recoverySession.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.initiateRecovery('0x1234', 'SOCIAL' as any)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for social recovery with < 2 confirmed guardians', async () => {
      const walletFewGuardians = {
        ...mockWallet,
        guardians: [{ isConfirmed: true, guardianUserId: 'g1' }], // only 1 confirmed
      };
      prisma.mPCWallet.findUnique.mockResolvedValue(walletFewGuardians);
      prisma.recoverySession.findFirst.mockResolvedValue(null);
      await expect(service.initiateRecovery('0x1234', 'SOCIAL' as any)).rejects.toThrow(BadRequestException);
    });

    it('should create EMAIL recovery with verification code', async () => {
      const emailWallet = { ...mockWallet, guardians: [] };
      prisma.mPCWallet.findUnique.mockResolvedValue(emailWallet);
      prisma.recoverySession.findFirst.mockResolvedValue(null);
      prisma.recoverySession.create.mockResolvedValue({ ...mockSession, method: 'EMAIL', verificationCode: '123456' });
      prisma.mPCWallet.update.mockResolvedValue({});
      prisma.user.findUnique.mockResolvedValue({ email: 'test@test.com' });
      const result = await service.initiateRecovery('0x1234', 'EMAIL' as any);
      expect(result.verificationCode).toBe('123456');
    });
  });

  // ─── confirmRecovery ───────────────────
  describe('confirmRecovery', () => {
    it('should confirm email recovery with valid code', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue({
        ...mockSession, method: 'EMAIL', verificationCode: '123456',
      });
      prisma.recoverySession.update.mockResolvedValue({});
      prisma.mPCWallet.findUnique.mockResolvedValue(mockWallet);
      prisma.mPCWallet.update.mockResolvedValue({});
      const result = await service.confirmRecovery('session-1', '123456');
      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for missing session', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue(null);
      await expect(service.confirmRecovery('bad')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for expired session (status)', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue({ ...mockSession, status: 'EXPIRED' });
      await expect(service.confirmRecovery('session-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired session (time)', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue({
        ...mockSession, status: 'PENDING', expiresAt: new Date(Date.now() - 1000),
      });
      prisma.recoverySession.update.mockResolvedValue({});
      await expect(service.confirmRecovery('session-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid verification code', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue({
        ...mockSession, method: 'EMAIL', verificationCode: '123456',
      });
      await expect(service.confirmRecovery('session-1', 'wrong')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for social recovery with insufficient approvals', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue({
        ...mockSession, method: 'SOCIAL', currentApprovals: 0, requiredApprovals: 2,
      });
      await expect(service.confirmRecovery('session-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── approveRecovery ───────────────────
  describe('approveRecovery', () => {
    it('should approve recovery by valid guardian', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue(mockSession);
      prisma.recoveryGuardian.findFirst.mockResolvedValue({
        id: 'g1', guardianUserId: 'guard-1', isConfirmed: true, recoveryApproved: false,
      });
      prisma.recoveryGuardian.update.mockResolvedValue({});
      prisma.recoverySession.update.mockResolvedValue({});
      const result = await service.approveRecovery('session-1', 'guard-1');
      expect(result.approved).toBe(true);
    });

    it('should throw NotFoundException for missing session', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue(null);
      await expect(service.approveRecovery('bad', 'guard-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid guardian', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue(mockSession);
      prisma.recoveryGuardian.findFirst.mockResolvedValue(null);
      await expect(service.approveRecovery('session-1', 'bad-guard')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for already approved guardian', async () => {
      prisma.recoverySession.findUnique.mockResolvedValue(mockSession);
      prisma.recoveryGuardian.findFirst.mockResolvedValue({
        id: 'g1', guardianUserId: 'guard-1', isConfirmed: true, recoveryApproved: true,
      });
      await expect(service.approveRecovery('session-1', 'guard-1')).rejects.toThrow(BadRequestException);
    });
  });
});
