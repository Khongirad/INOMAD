import { Test, TestingModule } from '@nestjs/testing';
import { KhuralService } from './khural.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('KhuralService', () => {
  let service: KhuralService;
  let prisma: any;

  const mockPrisma = () => ({
    khuralGroup: { findUnique: jest.fn(), findMany: jest.fn(), create: jest.fn() },
    khuralSeat: { findFirst: jest.fn(), update: jest.fn() },
    user: { findUnique: jest.fn(), findFirst: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KhuralService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(KhuralService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('createGroup', () => {
    it('should create group with 10 seats', async () => {
      prisma.khuralGroup.create.mockResolvedValue({
        id: 'g1', level: 'ARBAD', name: 'Test', seats: Array.from({ length: 10 }, (_, i) => ({
          index: i, isLeaderSeat: i === 0,
        })),
      });
      const result = await service.createGroup({ level: 'ARBAD', name: 'Test' } as any);
      expect(result.seats).toHaveLength(10);
      expect(result.seats[0].isLeaderSeat).toBe(true);
    });
  });

  describe('getGroup', () => {
    it('should return group', async () => {
      prisma.khuralGroup.findUnique.mockResolvedValue({ id: 'g1', seats: [] });
      const result = await service.getGroup('g1');
      expect(result.id).toBe('g1');
    });

    it('should throw if not found', async () => {
      prisma.khuralGroup.findUnique.mockResolvedValue(null);
      await expect(service.getGroup('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('applySeat', () => {
    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.applySeat('g1', 0, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if no exclusive land right', async () => {
      prisma.user.findUnique.mockResolvedValue({ hasExclusiveLandRight: false });
      prisma.user.findFirst.mockResolvedValue(null); // no delegation
      await expect(service.applySeat('g1', 0, 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if seat not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ hasExclusiveLandRight: true });
      prisma.khuralSeat.findFirst.mockResolvedValueOnce(null); // seat lookup
      await expect(service.applySeat('g1', 5, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should throw if seat already occupied', async () => {
      prisma.user.findUnique.mockResolvedValue({ hasExclusiveLandRight: true });
      prisma.khuralSeat.findFirst.mockResolvedValueOnce({ id: 's1', occupantUserId: 'existing' });
      await expect(service.applySeat('g1', 0, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should throw if user already has seat in group', async () => {
      prisma.user.findUnique.mockResolvedValue({ hasExclusiveLandRight: true });
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ id: 's1', occupantUserId: null }) // target seat
        .mockResolvedValueOnce({ id: 's2' }); // existing seat
      await expect(service.applySeat('g1', 1, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should assign seat successfully', async () => {
      prisma.user.findUnique.mockResolvedValue({ hasExclusiveLandRight: true });
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ id: 's1', occupantUserId: null })
        .mockResolvedValueOnce(null); // no existing
      prisma.khuralSeat.update.mockResolvedValue({ id: 's1', occupantUserId: 'u1' });
      const result = await service.applySeat('g1', 1, 'u1');
      expect(result.occupantUserId).toBe('u1');
    });

    it('should allow delegated representative', async () => {
      prisma.user.findUnique.mockResolvedValue({ hasExclusiveLandRight: false });
      prisma.user.findFirst.mockResolvedValue({ id: 'delegator' }); // delegated
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ id: 's1', occupantUserId: null })
        .mockResolvedValueOnce(null);
      prisma.khuralSeat.update.mockResolvedValue({ id: 's1', occupantUserId: 'u1' });
      const result = await service.applySeat('g1', 1, 'u1');
      expect(result.occupantUserId).toBe('u1');
    });
  });

  describe('assignSeat', () => {
    it('should throw if not leader', async () => {
      prisma.khuralSeat.findFirst.mockResolvedValue(null);
      await expect(service.assignSeat('g1', 1, 'target', 'nonLeader'))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw if seat not found', async () => {
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ isLeaderSeat: true }) // leader check
        .mockResolvedValueOnce(null); // seat not found
      await expect(service.assignSeat('g1', 99, 'target', 'leader'))
        .rejects.toThrow(NotFoundException);
    });

    it('should assign seat as leader', async () => {
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ isLeaderSeat: true })
        .mockResolvedValueOnce({ id: 's2', occupantUserId: null });
      prisma.khuralSeat.update.mockResolvedValue({ id: 's2', occupantUserId: 'target' });
      const result = await service.assignSeat('g1', 2, 'target', 'leader');
      expect(result.occupantUserId).toBe('target');
    });
  });

  describe('listGroups', () => {
    it('should list all groups', async () => {
      prisma.khuralGroup.findMany.mockResolvedValue([{ id: 'g1' }]);
      const result = await service.listGroups();
      expect(result).toHaveLength(1);
    });

    it('should filter by level', async () => {
      prisma.khuralGroup.findMany.mockResolvedValue([]);
      await service.listGroups('ARBAD');
      expect(prisma.khuralGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { level: 'ARBAD' } }),
      );
    });
  });
});
