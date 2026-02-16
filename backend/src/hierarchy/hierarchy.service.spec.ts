import { Test, TestingModule } from '@nestjs/testing';
import { HierarchyService } from './hierarchy.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('HierarchyService', () => {
  let service: HierarchyService;
  let prisma: any;

  const mockPrisma = () => ({
    republicanKhural: { findMany: jest.fn() },
    confederativeKhural: { findFirst: jest.fn() },
    zun: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    familyArban: { findUnique: jest.fn(), update: jest.fn() },
    myangan: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tumen: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tumenCooperation: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    notification: { create: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HierarchyService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(HierarchyService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── FULL TREE ─────────────────────────
  describe('getHierarchyTree', () => {
    it('should return confederation and republics', async () => {
      prisma.republicanKhural.findMany.mockResolvedValue([{ id: 'r1', name: 'Rep1' }]);
      prisma.confederativeKhural.findFirst.mockResolvedValue({ id: 'c1' });
      const result = await service.getHierarchyTree();
      expect(result).toHaveProperty('confederation');
      expect(result).toHaveProperty('republics');
    });
  });

  // ─── ZUN MANAGEMENT ────────────────────
  describe('listZuns', () => {
    it('should list all active zuns', async () => {
      prisma.zun.findMany.mockResolvedValue([{ id: 'z1' }]);
      const result = await service.listZuns();
      expect(result).toHaveLength(1);
    });
    it('should filter by myanganId', async () => {
      prisma.zun.findMany.mockResolvedValue([]);
      await service.listZuns('m1');
      expect(prisma.zun.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ myanganId: 'm1' }),
      }));
    });
  });

  describe('getZun', () => {
    it('should return zun when found', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1' });
      expect(await service.getZun('z1')).toEqual({ id: 'z1' });
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.getZun('z-bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinZun', () => {
    it('should join arban to zun', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', zunId: 'z1', memberArbans: [] });
      prisma.familyArban.findUnique.mockResolvedValue({ arbanId: 1n, zunId: null });
      prisma.familyArban.update.mockResolvedValue({ arbanId: 1n, zunId: 'z1' });
      const result = await service.joinZun(1n, 'z1');
      expect(result.zunId).toBe('z1');
    });
    it('should throw NotFoundException for missing zun', async () => {
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.joinZun(1n, 'z-bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when zun is full (10)', async () => {
      const members = Array.from({ length: 10 }, (_, i) => ({ arbanId: BigInt(i) }));
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', memberArbans: members });
      await expect(service.joinZun(1n, 'z1')).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing arban', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', memberArbans: [] });
      prisma.familyArban.findUnique.mockResolvedValue(null);
      await expect(service.joinZun(1n, 'z1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if arban already in another zun', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', memberArbans: [] });
      prisma.familyArban.findUnique.mockResolvedValue({ arbanId: 1n, zunId: 'z-other' });
      await expect(service.joinZun(1n, 'z1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveZun', () => {
    it('should remove arban from zun', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({ arbanId: 1n, zunId: 'z1' });
      prisma.familyArban.update.mockResolvedValue({ arbanId: 1n, zunId: null });
      const result = await service.leaveZun(1n);
      expect(result.zunId).toBeNull();
    });
    it('should throw NotFoundException for missing arban', async () => {
      prisma.familyArban.findUnique.mockResolvedValue(null);
      await expect(service.leaveZun(1n)).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if arban not in a zun', async () => {
      prisma.familyArban.findUnique.mockResolvedValue({ arbanId: 1n, zunId: null });
      await expect(service.leaveZun(1n)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── MYANGAN MANAGEMENT ────────────────
  describe('listMyangans', () => {
    it('should list all myangans', async () => {
      prisma.myangan.findMany.mockResolvedValue([{ id: 'm1' }]);
      expect(await service.listMyangans()).toHaveLength(1);
    });
    it('should filter by tumenId', async () => {
      prisma.myangan.findMany.mockResolvedValue([]);
      await service.listMyangans('t1');
      expect(prisma.myangan.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tumenId: 't1' }),
      }));
    });
  });

  describe('getMyangan', () => {
    it('should return myangan when found', async () => {
      prisma.myangan.findUnique.mockResolvedValue({ id: 'm1' });
      expect(await service.getMyangan('m1')).toEqual({ id: 'm1' });
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.myangan.findUnique.mockResolvedValue(null);
      await expect(service.getMyangan('m-bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinMyangan', () => {
    it('should join zun to myangan and recalc stats', async () => {
      prisma.myangan.findUnique
        .mockResolvedValueOnce({ id: 'm1', memberZuns: [] }) // first call: joinMyangan check
        .mockResolvedValueOnce({ id: 'm1', memberZuns: [{ memberArbans: [{ arbanId: 1n }] }] }); // recalc
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', myanganId: null });
      prisma.zun.update.mockResolvedValue({ id: 'z1', myanganId: 'm1' });
      prisma.myangan.update.mockResolvedValue({});
      const result = await service.joinMyangan('z1', 'm1');
      expect(result.myanganId).toBe('m1');
    });
    it('should throw NotFoundException for missing myangan', async () => {
      prisma.myangan.findUnique.mockResolvedValue(null);
      await expect(service.joinMyangan('z1', 'm-bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when myangan is full (10)', async () => {
      prisma.myangan.findUnique.mockResolvedValue({ id: 'm1', memberZuns: Array(10).fill({}) });
      await expect(service.joinMyangan('z1', 'm1')).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing zun', async () => {
      prisma.myangan.findUnique.mockResolvedValue({ id: 'm1', memberZuns: [] });
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.joinMyangan('z-bad', 'm1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if zun already in another myangan', async () => {
      prisma.myangan.findUnique.mockResolvedValue({ id: 'm1', memberZuns: [] });
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', myanganId: 'm-other' });
      await expect(service.joinMyangan('z1', 'm1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── TUMEN MANAGEMENT ─────────────────
  describe('listTumens', () => {
    it('should list all tumens', async () => {
      prisma.tumen.findMany.mockResolvedValue([{ id: 't1' }]);
      expect(await service.listTumens()).toHaveLength(1);
    });
    it('should filter by republicId', async () => {
      prisma.tumen.findMany.mockResolvedValue([]);
      await service.listTumens('rep1');
      expect(prisma.tumen.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ republicId: 'rep1' }),
      }));
    });
  });

  describe('getTumen', () => {
    it('should return tumen when found', async () => {
      prisma.tumen.findUnique.mockResolvedValue({ id: 't1' });
      expect(await service.getTumen('t1')).toEqual({ id: 't1' });
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.tumen.findUnique.mockResolvedValue(null);
      await expect(service.getTumen('t-bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinTumen', () => {
    it('should join myangan to tumen and recalc stats', async () => {
      prisma.tumen.findUnique
        .mockResolvedValueOnce({ id: 't1', memberMyangans: [] }) // first call
        .mockResolvedValueOnce({ id: 't1', memberMyangans: [{ memberZuns: [{ memberArbans: [{}] }] }] }); // recalc
      prisma.myangan.findUnique.mockResolvedValue({ id: 'm1', tumenId: null });
      prisma.myangan.update.mockResolvedValue({ id: 'm1', tumenId: 't1' });
      prisma.tumen.update.mockResolvedValue({});
      const result = await service.joinTumen('m1', 't1');
      expect(result.tumenId).toBe('t1');
    });
    it('should throw NotFoundException for missing tumen', async () => {
      prisma.tumen.findUnique.mockResolvedValue(null);
      await expect(service.joinTumen('m1', 't-bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when tumen is full (10)', async () => {
      prisma.tumen.findUnique.mockResolvedValue({ id: 't1', memberMyangans: Array(10).fill({}) });
      await expect(service.joinTumen('m1', 't1')).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing myangan', async () => {
      prisma.tumen.findUnique.mockResolvedValue({ id: 't1', memberMyangans: [] });
      prisma.myangan.findUnique.mockResolvedValue(null);
      await expect(service.joinTumen('m-bad', 't1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if myangan already in another tumen', async () => {
      prisma.tumen.findUnique.mockResolvedValue({ id: 't1', memberMyangans: [] });
      prisma.myangan.findUnique.mockResolvedValue({ id: 'm1', tumenId: 't-other' });
      await expect(service.joinTumen('m1', 't1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── TUMEN COOPERATION ────────────────
  const mockTumenA = { id: 'tA', name: 'TumenA', leaderUserId: 'leader-a' };
  const mockTumenB = { id: 'tB', name: 'TumenB', leaderUserId: 'leader-b' };

  describe('proposeCooperation', () => {
    it('should create cooperation proposal', async () => {
      prisma.tumen.findUnique
        .mockResolvedValueOnce(mockTumenA)
        .mockResolvedValueOnce(mockTumenB);
      prisma.tumenCooperation.findFirst.mockResolvedValue(null);
      prisma.tumenCooperation.create.mockResolvedValue({ id: 'coop-1', status: 'PROPOSED' });
      prisma.notification.create.mockResolvedValue({});
      const result = await service.proposeCooperation('tA', 'tB', 'leader-a', { title: 'Trade' });
      expect(result.status).toBe('PROPOSED');
    });
    it('should throw NotFoundException for missing tumen', async () => {
      prisma.tumen.findUnique.mockResolvedValue(null);
      await expect(service.proposeCooperation('t-bad', 'tB', 'u1', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if not leader', async () => {
      prisma.tumen.findUnique.mockResolvedValue({ ...mockTumenA, leaderUserId: 'other' });
      await expect(service.proposeCooperation('tA', 'tB', 'leader-a', { title: 'X' })).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if cooperation already exists', async () => {
      prisma.tumen.findUnique
        .mockResolvedValueOnce(mockTumenA)
        .mockResolvedValueOnce(mockTumenB);
      prisma.tumenCooperation.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.proposeCooperation('tA', 'tB', 'leader-a', { title: 'X' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToCooperation', () => {
    const mockCoop = { id: 'coop-1', status: 'PROPOSED', tumenAId: 'tA', tumenBId: 'tB', tumenA: mockTumenA, tumenB: mockTumenB };
    it('should accept cooperation', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(mockCoop);
      prisma.tumenCooperation.update.mockResolvedValue({ ...mockCoop, status: 'ACTIVE' });
      const result = await service.respondToCooperation('coop-1', 'leader-b', true);
      expect(result.status).toBe('ACTIVE');
    });
    it('should reject cooperation', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(mockCoop);
      prisma.tumenCooperation.update.mockResolvedValue({ ...mockCoop, status: 'DISSOLVED' });
      const result = await service.respondToCooperation('coop-1', 'leader-b', false);
      expect(result.status).toBe('DISSOLVED');
    });
    it('should throw NotFoundException for missing cooperation', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(null);
      await expect(service.respondToCooperation('bad', 'u1', true)).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if already processed', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue({ ...mockCoop, status: 'ACTIVE' });
      await expect(service.respondToCooperation('coop-1', 'leader-b', true)).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if not target leader', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(mockCoop);
      await expect(service.respondToCooperation('coop-1', 'wrong-user', true)).rejects.toThrow(BadRequestException);
    });
  });

  describe('dissolveCooperation', () => {
    const activeCoop = { id: 'coop-1', status: 'ACTIVE', tumenA: mockTumenA, tumenB: mockTumenB };
    it('should dissolve active cooperation', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(activeCoop);
      prisma.tumenCooperation.update.mockResolvedValue({ ...activeCoop, status: 'DISSOLVED' });
      const result = await service.dissolveCooperation('coop-1', 'leader-a');
      expect(result.status).toBe('DISSOLVED');
    });
    it('should throw NotFoundException for missing cooperation', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(null);
      await expect(service.dissolveCooperation('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if not active', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue({ ...activeCoop, status: 'DISSOLVED' });
      await expect(service.dissolveCooperation('coop-1', 'leader-a')).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if not leader of either tumen', async () => {
      prisma.tumenCooperation.findUnique.mockResolvedValue(activeCoop);
      await expect(service.dissolveCooperation('coop-1', 'random')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listCooperations', () => {
    it('should list cooperations for a tumen', async () => {
      prisma.tumenCooperation.findMany.mockResolvedValue([{ id: 'coop-1' }]);
      const result = await service.listCooperations('tA');
      expect(result).toHaveLength(1);
    });
  });
});
