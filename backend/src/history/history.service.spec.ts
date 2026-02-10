import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { HistoryService } from './history.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HistoryService', () => {
  let service: HistoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      historicalRecord: {
        create: jest.fn().mockResolvedValue({ id: 'hr-1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [HistoryService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<HistoryService>(HistoryService);
  });

  describe('createRecord', () => {
    it('should create unpublished record', async () => {
      const result = await service.createRecord({
        scope: 'NATION' as any, scopeId: 'n1', periodStart: new Date(),
        title: 'Era 1', narrative: 'Story', authorId: 'u1', eventIds: [],
      });
      expect(result.id).toBe('hr-1');
    });
  });

  describe('getHistory', () => {
    it('should return published records for scope', async () => {
      await service.getHistory('NATION' as any, 'n1');
      expect(prisma.historicalRecord.findMany).toHaveBeenCalled();
    });
  });

  describe('publishRecord', () => {
    it('should throw NotFoundException for unknown reviewer', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.publishRecord('hr-1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for non-admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      await expect(service.publishRecord('hr-1', 'u1')).rejects.toThrow(ForbiddenException);
    });

    it('should publish record as admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'a1', role: 'ADMIN' });
      prisma.historicalRecord.findUnique.mockResolvedValue({ id: 'hr-1' });
      prisma.historicalRecord.update.mockResolvedValue({ id: 'hr-1', isPublished: true });
      const result = await service.publishRecord('hr-1', 'a1');
      expect(result.isPublished).toBe(true);
    });
  });

  describe('updateRecord', () => {
    it('should throw ForbiddenException for non-author', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue({ id: 'hr-1', authorId: 'u2', isPublished: false });
      await expect(service.updateRecord('hr-1', 'u1', { title: 'X' })).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for published record', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue({ id: 'hr-1', authorId: 'u1', isPublished: true });
      await expect(service.updateRecord('hr-1', 'u1', { title: 'X' })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteRecord', () => {
    it('should throw NotFoundException for missing record', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(null);
      await expect(service.deleteRecord('bad', 'u1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getRecord', () => {
    it('should throw NotFoundException for missing record', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(null);
      await expect(service.getRecord('bad')).rejects.toThrow(NotFoundException);
    });
  });
});
