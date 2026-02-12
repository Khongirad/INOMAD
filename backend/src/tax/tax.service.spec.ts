import { Test, TestingModule } from '@nestjs/testing';
import { TaxService } from './tax.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('TaxService', () => {
  let service: TaxService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      taxRecord: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      quest: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaxService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TaxService>(TaxService);
  });

  describe('generateTaxRecord', () => {
    it('should create a tax record for a user', async () => {
      const userId = 'user-1';
      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        regionalReputations: [{ republicId: 'rep-1', republic: { id: 'rep-1' } }],
      });
      prisma.taxRecord.findUnique.mockResolvedValue(null);
      prisma.quest.findMany.mockResolvedValue([
        { rewardAltan: 100 },
        { rewardAltan: 200 },
      ]);
      prisma.taxRecord.create.mockResolvedValue({
        id: 'tax-1',
        userId,
        taxYear: 2025,
        totalIncome: 300,
        totalTaxDue: 30,
      });

      const result = await service.generateTaxRecord(userId, 2025);
      expect(result.totalIncome).toBe(300);
      expect(prisma.taxRecord.create).toHaveBeenCalled();
    });

    it('should throw if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.generateTaxRecord('nope', 2025)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if record already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        regionalReputations: [{ republicId: 'r1' }],
      });
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.generateTaxRecord('u1', 2025)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('fileTaxReturn', () => {
    it('should transition DRAFT → FILED', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({
        id: 'tax-1',
        userId: 'u1',
        status: 'DRAFT',
      });
      prisma.taxRecord.update.mockResolvedValue({ status: 'FILED' });

      const result = await service.fileTaxReturn('u1', 'tax-1');
      expect(result.status).toBe('FILED');
    });
  });

  describe('payTax', () => {
    it('should transition FILED → PAID', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({
        id: 'tax-1',
        userId: 'u1',
        status: 'FILED',
        totalTaxDue: 30,
      });
      prisma.taxRecord.update.mockResolvedValue({ status: 'PAID', isPaid: true });

      const result = await service.payTax('u1', 'tax-1');
      expect(result.status).toBe('PAID');
    });
  });

  describe('getTaxHistory', () => {
    it('should return user tax records', async () => {
      prisma.taxRecord.findMany.mockResolvedValue([
        { id: 'tax-1', taxYear: 2025 },
      ]);

      const result = await service.getTaxHistory('u1');
      expect(result).toHaveLength(1);
    });
  });
});
