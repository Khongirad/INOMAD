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
    familyArbad: { findUnique: jest.fn(), update: jest.fn() },
    myangad: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tumed: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    tumedCooperation: { findFirst: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
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
    it('should filter by myangadId', async () => {
      prisma.zun.findMany.mockResolvedValue([]);
      await service.listZuns('m1');
      expect(prisma.zun.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ myangadId: 'm1' }),
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
    it('should join arbad to zun', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', zunId: 'z1', memberArbads: [] });
      prisma.familyArbad.findUnique.mockResolvedValue({ arbadId: 1n, zunId: null });
      prisma.familyArbad.update.mockResolvedValue({ arbadId: 1n, zunId: 'z1' });
      const result = await service.joinZun(1n, 'z1');
      expect(result.zunId).toBe('z1');
    });
    it('should throw NotFoundException for missing zun', async () => {
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.joinZun(1n, 'z-bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when zun is full (10)', async () => {
      const members = Array.from({ length: 10 }, (_, i) => ({ arbadId: BigInt(i) }));
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', memberArbads: members });
      await expect(service.joinZun(1n, 'z1')).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing arbad', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', memberArbads: [] });
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(service.joinZun(1n, 'z1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if arbad already in another zun', async () => {
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', memberArbads: [] });
      prisma.familyArbad.findUnique.mockResolvedValue({ arbadId: 1n, zunId: 'z-other' });
      await expect(service.joinZun(1n, 'z1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('leaveZun', () => {
    it('should remove arbad from zun', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue({ arbadId: 1n, zunId: 'z1' });
      prisma.familyArbad.update.mockResolvedValue({ arbadId: 1n, zunId: null });
      const result = await service.leaveZun(1n);
      expect(result.zunId).toBeNull();
    });
    it('should throw NotFoundException for missing arbad', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue(null);
      await expect(service.leaveZun(1n)).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if arbad not in a zun', async () => {
      prisma.familyArbad.findUnique.mockResolvedValue({ arbadId: 1n, zunId: null });
      await expect(service.leaveZun(1n)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── MYANGAD MANAGEMENT ────────────────
  describe('listMyangads', () => {
    it('should list all myangads', async () => {
      prisma.myangad.findMany.mockResolvedValue([{ id: 'm1' }]);
      expect(await service.listMyangads()).toHaveLength(1);
    });
    it('should filter by tumedId', async () => {
      prisma.myangad.findMany.mockResolvedValue([]);
      await service.listMyangads('t1');
      expect(prisma.myangad.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ tumedId: 't1' }),
      }));
    });
  });

  describe('getMyangad', () => {
    it('should return myangad when found', async () => {
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1' });
      expect(await service.getMyangad('m1')).toEqual({ id: 'm1' });
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.myangad.findUnique.mockResolvedValue(null);
      await expect(service.getMyangad('m-bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinMyangad', () => {
    it('should join zun to myangad and recalc stats', async () => {
      prisma.myangad.findUnique
        .mockResolvedValueOnce({ id: 'm1', memberZuns: [] }) // first call: joinMyangad check
        .mockResolvedValueOnce({ id: 'm1', memberZuns: [{ memberArbads: [{ arbadId: 1n }] }] }); // recalc
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', myangadId: null });
      prisma.zun.update.mockResolvedValue({ id: 'z1', myangadId: 'm1' });
      prisma.myangad.update.mockResolvedValue({});
      const result = await service.joinMyangad('z1', 'm1');
      expect(result.myangadId).toBe('m1');
    });
    it('should throw NotFoundException for missing myangad', async () => {
      prisma.myangad.findUnique.mockResolvedValue(null);
      await expect(service.joinMyangad('z1', 'm-bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when myangad is full (10)', async () => {
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', memberZuns: Array(10).fill({}) });
      await expect(service.joinMyangad('z1', 'm1')).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing zun', async () => {
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', memberZuns: [] });
      prisma.zun.findUnique.mockResolvedValue(null);
      await expect(service.joinMyangad('z-bad', 'm1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if zun already in another myangad', async () => {
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', memberZuns: [] });
      prisma.zun.findUnique.mockResolvedValue({ id: 'z1', myangadId: 'm-other' });
      await expect(service.joinMyangad('z1', 'm1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── TUMED MANAGEMENT ─────────────────
  describe('listTumeds', () => {
    it('should list all tumeds', async () => {
      prisma.tumed.findMany.mockResolvedValue([{ id: 't1' }]);
      expect(await service.listTumeds()).toHaveLength(1);
    });
    it('should filter by republicId', async () => {
      prisma.tumed.findMany.mockResolvedValue([]);
      await service.listTumeds('rep1');
      expect(prisma.tumed.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ republicId: 'rep1' }),
      }));
    });
  });

  describe('getTumed', () => {
    it('should return tumed when found', async () => {
      prisma.tumed.findUnique.mockResolvedValue({ id: 't1' });
      expect(await service.getTumed('t1')).toEqual({ id: 't1' });
    });
    it('should throw NotFoundException when not found', async () => {
      prisma.tumed.findUnique.mockResolvedValue(null);
      await expect(service.getTumed('t-bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('joinTumed', () => {
    it('should join myangad to tumed and recalc stats', async () => {
      prisma.tumed.findUnique
        .mockResolvedValueOnce({ id: 't1', memberMyangads: [] }) // first call
        .mockResolvedValueOnce({ id: 't1', memberMyangads: [{ memberZuns: [{ memberArbads: [{}] }] }] }); // recalc
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', tumedId: null });
      prisma.myangad.update.mockResolvedValue({ id: 'm1', tumedId: 't1' });
      prisma.tumed.update.mockResolvedValue({});
      const result = await service.joinTumed('m1', 't1');
      expect(result.tumedId).toBe('t1');
    });
    it('should throw NotFoundException for missing tumed', async () => {
      prisma.tumed.findUnique.mockResolvedValue(null);
      await expect(service.joinTumed('m1', 't-bad')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException when tumed is full (10)', async () => {
      prisma.tumed.findUnique.mockResolvedValue({ id: 't1', memberMyangads: Array(10).fill({}) });
      await expect(service.joinTumed('m1', 't1')).rejects.toThrow(BadRequestException);
    });
    it('should throw NotFoundException for missing myangad', async () => {
      prisma.tumed.findUnique.mockResolvedValue({ id: 't1', memberMyangads: [] });
      prisma.myangad.findUnique.mockResolvedValue(null);
      await expect(service.joinTumed('m-bad', 't1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if myangad already in another tumed', async () => {
      prisma.tumed.findUnique.mockResolvedValue({ id: 't1', memberMyangads: [] });
      prisma.myangad.findUnique.mockResolvedValue({ id: 'm1', tumedId: 't-other' });
      await expect(service.joinTumed('m1', 't1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── TUMED COOPERATION ────────────────
  const mockTumedA = { id: 'tA', name: 'TumedA', leaderUserId: 'leader-a' };
  const mockTumedB = { id: 'tB', name: 'TumedB', leaderUserId: 'leader-b' };

  describe('proposeCooperation', () => {
    it('should create cooperation proposal', async () => {
      prisma.tumed.findUnique
        .mockResolvedValueOnce(mockTumedA)
        .mockResolvedValueOnce(mockTumedB);
      prisma.tumedCooperation.findFirst.mockResolvedValue(null);
      prisma.tumedCooperation.create.mockResolvedValue({ id: 'coop-1', status: 'PROPOSED' });
      prisma.notification.create.mockResolvedValue({});
      const result = await service.proposeCooperation('tA', 'tB', 'leader-a', { title: 'Trade' });
      expect(result.status).toBe('PROPOSED');
    });
    it('should throw NotFoundException for missing tumed', async () => {
      prisma.tumed.findUnique.mockResolvedValue(null);
      await expect(service.proposeCooperation('t-bad', 'tB', 'u1', { title: 'X' })).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if not leader', async () => {
      prisma.tumed.findUnique.mockResolvedValue({ ...mockTumedA, leaderUserId: 'other' });
      await expect(service.proposeCooperation('tA', 'tB', 'leader-a', { title: 'X' })).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if cooperation already exists', async () => {
      prisma.tumed.findUnique
        .mockResolvedValueOnce(mockTumedA)
        .mockResolvedValueOnce(mockTumedB);
      prisma.tumedCooperation.findFirst.mockResolvedValue({ id: 'existing' });
      await expect(service.proposeCooperation('tA', 'tB', 'leader-a', { title: 'X' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('respondToCooperation', () => {
    const mockCoop = { id: 'coop-1', status: 'PROPOSED', tumedAId: 'tA', tumedBId: 'tB', tumedA: mockTumedA, tumedB: mockTumedB };
    it('should accept cooperation', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(mockCoop);
      prisma.tumedCooperation.update.mockResolvedValue({ ...mockCoop, status: 'ACTIVE' });
      const result = await service.respondToCooperation('coop-1', 'leader-b', true);
      expect(result.status).toBe('ACTIVE');
    });
    it('should reject cooperation', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(mockCoop);
      prisma.tumedCooperation.update.mockResolvedValue({ ...mockCoop, status: 'DISSOLVED' });
      const result = await service.respondToCooperation('coop-1', 'leader-b', false);
      expect(result.status).toBe('DISSOLVED');
    });
    it('should throw NotFoundException for missing cooperation', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(null);
      await expect(service.respondToCooperation('bad', 'u1', true)).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if already processed', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue({ ...mockCoop, status: 'ACTIVE' });
      await expect(service.respondToCooperation('coop-1', 'leader-b', true)).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if not target leader', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(mockCoop);
      await expect(service.respondToCooperation('coop-1', 'wrong-user', true)).rejects.toThrow(BadRequestException);
    });
  });

  describe('dissolveCooperation', () => {
    const activeCoop = { id: 'coop-1', status: 'ACTIVE', tumedA: mockTumedA, tumedB: mockTumedB };
    it('should dissolve active cooperation', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(activeCoop);
      prisma.tumedCooperation.update.mockResolvedValue({ ...activeCoop, status: 'DISSOLVED' });
      const result = await service.dissolveCooperation('coop-1', 'leader-a');
      expect(result.status).toBe('DISSOLVED');
    });
    it('should throw NotFoundException for missing cooperation', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(null);
      await expect(service.dissolveCooperation('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
    it('should throw BadRequestException if not active', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue({ ...activeCoop, status: 'DISSOLVED' });
      await expect(service.dissolveCooperation('coop-1', 'leader-a')).rejects.toThrow(BadRequestException);
    });
    it('should throw BadRequestException if not leader of either tumed', async () => {
      prisma.tumedCooperation.findUnique.mockResolvedValue(activeCoop);
      await expect(service.dissolveCooperation('coop-1', 'random')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listCooperations', () => {
    it('should list cooperations for a tumed', async () => {
      prisma.tumedCooperation.findMany.mockResolvedValue([{ id: 'coop-1' }]);
      const result = await service.listCooperations('tA');
      expect(result).toHaveLength(1);
    });
  });
});
