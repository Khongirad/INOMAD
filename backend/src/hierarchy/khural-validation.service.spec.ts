import { Test, TestingModule } from '@nestjs/testing';
import { KhuralValidationService } from './khural-validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('KhuralValidationService', () => {
  let service: KhuralValidationService;
  let prisma: any;

  const makeTx = (p: any) => ({ ...p, $queryRaw: p.$queryRaw, $executeRaw: p.$executeRaw });

  beforeEach(async () => {
    prisma = {
      khuralChairmanTerm: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
      },
      khuralSecretaryTerm: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      republicanKhural: {
        update: jest.fn(),
        updateMany: jest.fn(),
        findMany: jest.fn(),
      },
      confederativeKhural: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb: any) =>
        typeof cb === 'function' ? cb(makeTx(prisma)) : Promise.all(cb),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KhuralValidationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(KhuralValidationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── Chairman Term Limit ────────────────────────────────────
  describe('validateChairmanTermLimit', () => {
    it('passes for 0 terms served', async () => {
      prisma.khuralChairmanTerm.count.mockResolvedValue(0);
      await expect(service.validateChairmanTermLimit('rep1', 'u1')).resolves.not.toThrow();
    });

    it('passes for 1 term served', async () => {
      prisma.khuralChairmanTerm.count.mockResolvedValue(1);
      await expect(service.validateChairmanTermLimit('rep1', 'u1')).resolves.not.toThrow();
    });

    it('throws BadRequestException at 2 terms served', async () => {
      prisma.khuralChairmanTerm.count.mockResolvedValue(2);
      await expect(service.validateChairmanTermLimit('rep1', 'u1')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException at 3+ terms (corrupt state guard)', async () => {
      prisma.khuralChairmanTerm.count.mockResolvedValue(3);
      await expect(service.validateChairmanTermLimit('rep1', 'u1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('electChairman', () => {
    beforeEach(() => {
      prisma.khuralChairmanTerm.count.mockResolvedValue(0); // 0 terms served = eligible
      prisma.khuralChairmanTerm.updateMany.mockResolvedValue({ count: 0 });
      prisma.khuralChairmanTerm.create.mockResolvedValue({ id: 'term1', termNumber: 1 });
      prisma.republicanKhural.update.mockResolvedValue({});
    });

    it('elects chairman and creates term record', async () => {
      await expect(service.electChairman('rep1', 'u1', 'seat1')).resolves.not.toThrow();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws if already at 2 terms', async () => {
      prisma.khuralChairmanTerm.count.mockResolvedValue(2);
      await expect(service.electChairman('rep1', 'u1', 'seat1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Secretary Rotation ─────────────────────────────────────
  describe('validateSecretaryRotation', () => {
    it('passes when user has never served', async () => {
      prisma.khuralSecretaryTerm.findUnique.mockResolvedValue(null);
      prisma.khuralSecretaryTerm.findFirst.mockResolvedValue(null);
      await expect(
        service.validateSecretaryRotation('conf1', 'u1', 'rep1'),
      ).resolves.not.toThrow();
    });

    it('throws BadRequestException if user already served (no-repeat rotation)', async () => {
      prisma.khuralSecretaryTerm.findUnique.mockResolvedValue({
        id: 'term1', confederationId: 'conf1', userId: 'u1',
      });
      await expect(
        service.validateSecretaryRotation('conf1', 'u1', 'rep1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('electSecretary', () => {
    beforeEach(() => {
      prisma.khuralSecretaryTerm.findUnique.mockResolvedValue(null);
      prisma.khuralSecretaryTerm.findFirst.mockResolvedValue(null);
      prisma.khuralSecretaryTerm.updateMany.mockResolvedValue({ count: 0 });
      prisma.khuralSecretaryTerm.create.mockResolvedValue({ id: 'term1' });
      prisma.confederativeKhural.update.mockResolvedValue({});
    });

    it('elects secretary and creates term record', async () => {
      await expect(service.electSecretary('conf1', 'u1', 'rep1')).resolves.not.toThrow();
      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('throws if user served before', async () => {
      prisma.khuralSecretaryTerm.findUnique.mockResolvedValue({ id: 'old' });
      await expect(service.electSecretary('conf1', 'u1', 'rep1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── Cron: checkAndExpireTerms ───────────────────────────────
  describe('checkAndExpireTerms (cron)', () => {
    it('expires chairman terms past termEnd', async () => {
      prisma.khuralChairmanTerm.findMany.mockResolvedValue([
        { id: 'ct1', republicId: 'rep1' },
      ]);
      prisma.khuralSecretaryTerm.findMany.mockResolvedValue([]);
      prisma.khuralChairmanTerm.updateMany.mockResolvedValue({ count: 1 });
      prisma.republicanKhural.updateMany.mockResolvedValue({ count: 1 });

      await service.checkAndExpireTerms();

      expect(prisma.khuralChairmanTerm.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { endReason: 'term_expired' } }),
      );
      expect(prisma.republicanKhural.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ chairmanUserId: null }) }),
      );
    });

    it('expires secretary terms past termEnd', async () => {
      prisma.khuralChairmanTerm.findMany.mockResolvedValue([]);
      prisma.khuralSecretaryTerm.findMany.mockResolvedValue([
        { id: 'st1', confederationId: 'conf1' },
      ]);
      prisma.khuralSecretaryTerm.updateMany.mockResolvedValue({ count: 1 });
      prisma.confederativeKhural.updateMany.mockResolvedValue({ count: 1 });

      await service.checkAndExpireTerms();

      expect(prisma.khuralSecretaryTerm.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { endReason: 'term_expired' } }),
      );
      expect(prisma.confederativeKhural.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ secretaryUserId: null }) }),
      );
    });

    it('skips if no expired terms', async () => {
      prisma.khuralChairmanTerm.findMany.mockResolvedValue([]);
      prisma.khuralSecretaryTerm.findMany.mockResolvedValue([]);

      await service.checkAndExpireTerms();

      expect(prisma.khuralChairmanTerm.updateMany).not.toHaveBeenCalled();
      expect(prisma.khuralSecretaryTerm.updateMany).not.toHaveBeenCalled();
    });
  });

  // ─── Next Rotation Candidate ─────────────────────────────────
  describe('getNextSecretaryRotationCandidate', () => {
    it('returns the next unserved republic', async () => {
      prisma.khuralSecretaryTerm.findMany.mockResolvedValue([
        { republicId: 'rep1' },
      ]);
      prisma.republicanKhural.findMany.mockResolvedValue([
        { id: 'rep1', name: 'Buryad', republicKey: 'buryad' },
        { id: 'rep2', name: 'Russian', republicKey: 'russian' },
      ]);

      const result = await service.getNextSecretaryRotationCandidate('conf1');
      expect(result.nextRepublic?.id).toBe('rep2');
      expect(result.servedCount).toBe(1);
      expect(result.cycleComplete).toBe(false);
    });

    it('returns cycleComplete=true when all republics served', async () => {
      prisma.khuralSecretaryTerm.findMany.mockResolvedValue([
        { republicId: 'rep1' },
        { republicId: 'rep2' },
      ]);
      prisma.republicanKhural.findMany.mockResolvedValue([
        { id: 'rep1', name: 'Buryad', republicKey: 'buryad' },
        { id: 'rep2', name: 'Russian', republicKey: 'russian' },
      ]);

      const result = await service.getNextSecretaryRotationCandidate('conf1');
      expect(result.nextRepublic).toBeNull();
      expect(result.cycleComplete).toBe(true);
    });
  });
});
