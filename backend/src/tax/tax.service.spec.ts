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

    service = module.get(TaxService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ======================== generateTaxRecord ========================

  describe('generateTaxRecord', () => {
    it('throws if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.generateTaxRecord('u1', 2025)).rejects.toThrow(NotFoundException);
    });

    it('throws if user has no republic', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', regionalReputations: [] });
      await expect(service.generateTaxRecord('u1', 2025)).rejects.toThrow(BadRequestException);
    });

    it('throws if record already exists', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        regionalReputations: [{ republicId: 'r1', republic: {} }],
      });
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', status: 'DRAFT' });
      await expect(service.generateTaxRecord('u1', 2025)).rejects.toThrow(BadRequestException);
    });

    it('creates tax record with correct calculations', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        regionalReputations: [{ republicId: 'r1', republic: {} }],
      });
      prisma.taxRecord.findUnique.mockResolvedValue(null);
      prisma.quest.findMany.mockResolvedValue([
        { rewardAltan: 1000 },
        { rewardAltan: 2000 },
      ]);
      const created = { id: 'tr1', totalIncome: 3000, totalTaxDue: 300 };
      prisma.taxRecord.create.mockResolvedValue(created);

      const result = await service.generateTaxRecord('u1', 2025);
      expect(result).toEqual(created);
      expect(prisma.taxRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            taxYear: 2025,
            totalIncome: 3000,
            totalQuestsCompleted: 2,
            taxRate: 0.1,
            totalTaxDue: 300,
            status: 'DRAFT',
          }),
        }),
      );
    });
  });

  // ======================== fileTaxReturn ========================

  describe('fileTaxReturn', () => {
    it('throws if record not found', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue(null);
      await expect(service.fileTaxReturn('u1', 'tr1')).rejects.toThrow(NotFoundException);
    });

    it('throws if not your record', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', userId: 'u2', status: 'DRAFT' });
      await expect(service.fileTaxReturn('u1', 'tr1')).rejects.toThrow(BadRequestException);
    });

    it('throws if not DRAFT', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', userId: 'u1', status: 'FILED' });
      await expect(service.fileTaxReturn('u1', 'tr1')).rejects.toThrow(BadRequestException);
    });

    it('files DRAFT record', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', userId: 'u1', status: 'DRAFT' });
      prisma.taxRecord.update.mockResolvedValue({ id: 'tr1', status: 'FILED' });
      const result = await service.fileTaxReturn('u1', 'tr1');
      expect(result.status).toBe('FILED');
    });
  });

  // ======================== payTax ========================

  describe('payTax', () => {
    it('throws if record not found', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue(null);
      await expect(service.payTax('u1', 'tr1')).rejects.toThrow(NotFoundException);
    });

    it('throws if not your record', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', userId: 'u2', status: 'FILED' });
      await expect(service.payTax('u1', 'tr1')).rejects.toThrow(BadRequestException);
    });

    it('throws if not FILED', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', userId: 'u1', status: 'DRAFT' });
      await expect(service.payTax('u1', 'tr1')).rejects.toThrow(BadRequestException);
    });

    it('pays FILED record', async () => {
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1', userId: 'u1', status: 'FILED', totalTaxDue: 300 });
      prisma.taxRecord.update.mockResolvedValue({ id: 'tr1', status: 'PAID', isPaid: true });
      const result = await service.payTax('u1', 'tr1');
      expect(result.status).toBe('PAID');
    });
  });

  // ======================== getTaxHistory ========================

  it('gets tax history', async () => {
    prisma.taxRecord.findMany.mockResolvedValue([{ id: 'tr1', taxYear: 2025 }]);
    const result = await service.getTaxHistory('u1');
    expect(result).toHaveLength(1);
  });

  // ======================== getTaxRecord ========================

  it('gets tax record', async () => {
    prisma.taxRecord.findUnique.mockResolvedValue({ id: 'tr1' });
    const result = await service.getTaxRecord('tr1');
    expect(result.id).toBe('tr1');
  });

  it('throws if tax record not found', async () => {
    prisma.taxRecord.findUnique.mockResolvedValue(null);
    await expect(service.getTaxRecord('bad')).rejects.toThrow(NotFoundException);
  });

  // ======================== autoGenerateTaxRecords ========================

  describe('autoGenerateTaxRecords', () => {
    it('does nothing if not January 1st', async () => {
      // Current date is not Jan 1, so should return early
      const spy = jest.spyOn(prisma.quest, 'findMany');
      await service.autoGenerateTaxRecords();
      // If not Jan 1, quest.findMany should not be called
      const now = new Date();
      if (now.getMonth() !== 0 || now.getDate() !== 1) {
        expect(spy).not.toHaveBeenCalled();
      }
    });

    it('generates tax records on January 1st', async () => {
      // Mock Date to be January 1st
      const realDate = global.Date;
      const jan1 = new realDate(2026, 0, 1, 2, 0, 0);
      const MockDate = jest.fn((...args: any[]) => {
        if (args.length === 0) return jan1;
        return new realDate(...(args as [any]));
      }) as any;
      MockDate.now = realDate.now;
      MockDate.parse = realDate.parse;
      MockDate.UTC = realDate.UTC;
      MockDate.prototype = realDate.prototype;
      global.Date = MockDate;

      prisma.quest.findMany.mockResolvedValue([{ takerId: 'u1' }, { takerId: 'u2' }]);
      // Mock generateTaxRecord via prisma chain
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        regionalReputations: [{ republicId: 'r1', republic: {} }],
      });
      prisma.taxRecord.findUnique.mockResolvedValue(null);
      prisma.quest.findMany
        .mockResolvedValueOnce([{ takerId: 'u1' }, { takerId: 'u2' }]) // for cron
        .mockResolvedValue([{ rewardAltan: 1000 }]); // for each generateTaxRecord
      prisma.taxRecord.create.mockResolvedValue({ id: 'tr1' });

      await service.autoGenerateTaxRecords();
      expect(prisma.quest.findMany).toHaveBeenCalled();

      global.Date = realDate;
    });

    it('skips null takerIds', async () => {
      const realDate = global.Date;
      const jan1 = new realDate(2026, 0, 1, 2, 0, 0);
      const MockDate = jest.fn((...args: any[]) => {
        if (args.length === 0) return jan1;
        return new realDate(...(args as [any]));
      }) as any;
      MockDate.now = realDate.now;
      MockDate.parse = realDate.parse;
      MockDate.UTC = realDate.UTC;
      MockDate.prototype = realDate.prototype;
      global.Date = MockDate;

      prisma.quest.findMany.mockResolvedValue([{ takerId: null }]);
      await service.autoGenerateTaxRecords();
      // Should not attempt generateTaxRecord for null takerId
      expect(prisma.user.findUnique).not.toHaveBeenCalled();

      global.Date = realDate;
    });

    it('skips "already exists" errors silently', async () => {
      const realDate = global.Date;
      const jan1 = new realDate(2026, 0, 1, 2, 0, 0);
      const MockDate = jest.fn((...args: any[]) => {
        if (args.length === 0) return jan1;
        return new realDate(...(args as [any]));
      }) as any;
      MockDate.now = realDate.now;
      MockDate.parse = realDate.parse;
      MockDate.UTC = realDate.UTC;
      MockDate.prototype = realDate.prototype;
      global.Date = MockDate;

      prisma.quest.findMany.mockResolvedValue([{ takerId: 'u1' }]);
      // generateTaxRecord will find existing record
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        regionalReputations: [{ republicId: 'r1', republic: {} }],
      });
      prisma.taxRecord.findUnique.mockResolvedValue({ id: 'existing', status: 'DRAFT' });
      // Should not throw — error contains "already exists"
      await expect(service.autoGenerateTaxRecords()).resolves.not.toThrow();

      global.Date = realDate;
    });

    it('logs non-exists errors', async () => {
      const realDate = global.Date;
      const jan1 = new realDate(2026, 0, 1, 2, 0, 0);
      const MockDate = jest.fn((...args: any[]) => {
        if (args.length === 0) return jan1;
        return new realDate(...(args as [any]));
      }) as any;
      MockDate.now = realDate.now;
      MockDate.parse = realDate.parse;
      MockDate.UTC = realDate.UTC;
      MockDate.prototype = realDate.prototype;
      global.Date = MockDate;

      prisma.quest.findMany.mockResolvedValue([{ takerId: 'u1' }]);
      prisma.user.findUnique.mockResolvedValue(null); // will cause NotFoundException
      await expect(service.autoGenerateTaxRecords()).resolves.not.toThrow();

      global.Date = realDate;
    });
  });
});
