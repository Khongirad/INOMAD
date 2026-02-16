import { Test, TestingModule } from '@nestjs/testing';
import { HistoryService } from './history.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('HistoryService', () => {
  let service: HistoryService;
  let prisma: any;

  const mockRecord = {
    id: 'rec-1', scope: 'NATIONAL', scopeId: 'nation-1',
    title: 'Foundation', narrative: 'The beginning',
    authorId: 'u1', isPublished: false,
    author: { id: 'u1', username: 'alice', role: 'CITIZEN' },
  };

  const mockPrisma = () => ({
    historicalRecord: {
      create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(),
      update: jest.fn(), delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistoryService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(HistoryService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── createRecord ──────────────────────
  describe('createRecord', () => {
    it('should create a historical record', async () => {
      prisma.historicalRecord.create.mockResolvedValue(mockRecord);
      const result = await service.createRecord({
        scope: 'NATIONAL' as any, scopeId: 'nation-1',
        periodStart: new Date(), title: 'Foundation',
        narrative: 'The beginning', authorId: 'u1', eventIds: [],
      });
      expect(result.title).toBe('Foundation');
    });
  });

  // ─── getHistory ────────────────────────
  describe('getHistory', () => {
    it('should return published records for scope', async () => {
      prisma.historicalRecord.findMany.mockResolvedValue([mockRecord]);
      const result = await service.getHistory('NATIONAL' as any, 'nation-1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── getUserNarratives ─────────────────
  describe('getUserNarratives', () => {
    it('should return user narratives', async () => {
      prisma.historicalRecord.findMany.mockResolvedValue([mockRecord]);
      const result = await service.getUserNarratives('u1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── publishRecord ─────────────────────
  describe('publishRecord', () => {
    it('should publish record by admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
      prisma.historicalRecord.findUnique.mockResolvedValue(mockRecord);
      prisma.historicalRecord.update.mockResolvedValue({ ...mockRecord, isPublished: true });
      const result = await service.publishRecord('rec-1', 'admin');
      expect(result.isPublished).toBe(true);
    });

    it('should throw if reviewer not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.publishRecord('rec-1', 'bad')).rejects.toThrow(NotFoundException);
    });

    it('should throw if reviewer not admin', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: 'CITIZEN' });
      await expect(service.publishRecord('rec-1', 'u2')).rejects.toThrow(ForbiddenException);
    });

    it('should throw if record not found', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
      prisma.historicalRecord.findUnique.mockResolvedValue(null);
      await expect(service.publishRecord('bad', 'admin')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── updateRecord ──────────────────────
  describe('updateRecord', () => {
    it('should update own unpublished record', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(mockRecord);
      prisma.historicalRecord.update.mockResolvedValue({ ...mockRecord, title: 'Updated' });
      const result = await service.updateRecord('rec-1', 'u1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('should throw if not author', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(mockRecord);
      await expect(service.updateRecord('rec-1', 'u2', {})).rejects.toThrow(ForbiddenException);
    });

    it('should throw if published', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue({ ...mockRecord, isPublished: true, authorId: 'u1' });
      await expect(service.updateRecord('rec-1', 'u1', {})).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── deleteRecord ──────────────────────
  describe('deleteRecord', () => {
    it('should delete own unpublished record', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(mockRecord);
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', role: 'CITIZEN' });
      prisma.historicalRecord.delete.mockResolvedValue({});
      const result = await service.deleteRecord('rec-1', 'u1');
      expect(result.success).toBe(true);
    });

    it('should allow admin to delete any', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue({ ...mockRecord, authorId: 'u2' });
      prisma.user.findUnique.mockResolvedValue({ id: 'admin', role: 'ADMIN' });
      prisma.historicalRecord.delete.mockResolvedValue({});
      const result = await service.deleteRecord('rec-1', 'admin');
      expect(result.success).toBe(true);
    });

    it('should throw if non-admin non-author', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue({ ...mockRecord, isPublished: true });
      prisma.user.findUnique.mockResolvedValue({ id: 'u2', role: 'CITIZEN' });
      await expect(service.deleteRecord('rec-1', 'u2')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── getRecord ─────────────────────────
  describe('getRecord', () => {
    it('should return record by id', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(mockRecord);
      const result = await service.getRecord('rec-1');
      expect(result.id).toBe('rec-1');
    });

    it('should throw NotFoundException', async () => {
      prisma.historicalRecord.findUnique.mockResolvedValue(null);
      await expect(service.getRecord('bad')).rejects.toThrow(NotFoundException);
    });
  });
});
