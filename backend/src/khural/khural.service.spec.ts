import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { KhuralService } from './khural.service';
import { PrismaService } from '../prisma/prisma.service';

describe('KhuralService', () => {
  let service: KhuralService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      khuralGroup: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      khuralSeat: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KhuralService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<KhuralService>(KhuralService);
  });

  describe('createGroup', () => {
    it('should create group with 10 seats', async () => {
      prisma.khuralGroup.create.mockResolvedValue({
        id: 'g1', level: 'ARBAN', name: 'Arban-1',
        seats: Array.from({ length: 10 }, (_, i) => ({ index: i, isLeaderSeat: i === 0, occupant: null })),
      });
      const result = await service.createGroup({ level: 'ARBAN' as any, name: 'Arban-1' } as any);
      expect(result.seats).toHaveLength(10);
      expect(result.seats[0].isLeaderSeat).toBe(true);
    });
  });

  describe('getGroup', () => {
    it('should throw NotFoundException for missing group', async () => {
      prisma.khuralGroup.findUnique.mockResolvedValue(null);
      await expect(service.getGroup('bad')).rejects.toThrow(NotFoundException);
    });

    it('should return group with seats', async () => {
      prisma.khuralGroup.findUnique.mockResolvedValue({
        id: 'g1', level: 'ARBAN', seats: [], parentGroup: null, childGroups: [],
      });
      const result = await service.getGroup('g1');
      expect(result.id).toBe('g1');
    });
  });

  describe('applySeat', () => {
    it('should throw NotFoundException for missing seat', async () => {
      prisma.khuralSeat.findFirst.mockResolvedValue(null);
      await expect(service.applySeat('g1', 0, 'u1')).rejects.toThrow(NotFoundException);
    });

    it('should reject occupied seat', async () => {
      prisma.khuralSeat.findFirst.mockResolvedValue({ id: 's1', occupantUserId: 'other' });
      await expect(service.applySeat('g1', 0, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should reject if user already has seat in group', async () => {
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ id: 's1', occupantUserId: null })
        .mockResolvedValueOnce({ id: 's2', occupantUserId: 'u1' });
      await expect(service.applySeat('g1', 1, 'u1')).rejects.toThrow(BadRequestException);
    });

    it('should assign empty seat to user', async () => {
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ id: 's1', occupantUserId: null })
        .mockResolvedValueOnce(null);
      prisma.khuralSeat.update.mockResolvedValue({
        id: 's1', occupantUserId: 'u1', occupant: { id: 'u1' }, group: { id: 'g1' },
      });
      const result = await service.applySeat('g1', 1, 'u1');
      expect(result.occupantUserId).toBe('u1');
    });
  });

  describe('assignSeat', () => {
    it('should reject non-leader', async () => {
      prisma.khuralSeat.findFirst.mockResolvedValue(null);
      await expect(service.assignSeat('g1', 1, 'target', 'notLeader')).rejects.toThrow(ForbiddenException);
    });

    it('should reject occupied seat', async () => {
      prisma.khuralSeat.findFirst
        .mockResolvedValueOnce({ id: 'leader', isLeaderSeat: true })
        .mockResolvedValueOnce({ id: 's1', occupantUserId: 'occupant' });
      await expect(service.assignSeat('g1', 1, 'target', 'leader')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listGroups', () => {
    it('should list without filter', async () => {
      await service.listGroups();
      expect(prisma.khuralGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
    });

    it('should filter by level', async () => {
      await service.listGroups('ARBAN');
      expect(prisma.khuralGroup.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { level: 'ARBAN' } }),
      );
    });
  });
});
