import { Test, TestingModule } from '@nestjs/testing';
import { WorkActService } from './work-act.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('WorkActService', () => {
  let service: WorkActService;
  let prisma: any;

  const mockWorkAct = {
    id: 'wa-1', contractorId: 'con-1', clientId: 'cli-1',
    title: 'Design Work', description: 'Logo design', amount: 500,
    currency: 'ALTN', status: 'DRAFTED', deliverables: ['logo.png'],
    contractorSignature: null, clientSignature: null,
    contractor: { id: 'con-1', username: 'Contractor' },
    client: { id: 'cli-1', username: 'Client' },
  };

  const mockPrisma = () => ({
    workAct: {
      create: jest.fn(), findUnique: jest.fn(), update: jest.fn(),
      findMany: jest.fn(), count: jest.fn(),
    },
    notification: { create: jest.fn(), createMany: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkActService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(WorkActService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── create ────────────────────────────
  describe('create', () => {
    it('should create work act and notify client', async () => {
      prisma.workAct.create.mockResolvedValue(mockWorkAct);
      prisma.notification.create.mockResolvedValue({});
      const data = { clientId: 'cli-1', title: 'Design', description: 'Logo', deliverables: ['logo.png'], amount: 500 };
      const result = await service.create('con-1', data);
      expect(result.id).toBe('wa-1');
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('should default currency to ALTN', async () => {
      prisma.workAct.create.mockResolvedValue(mockWorkAct);
      prisma.notification.create.mockResolvedValue({});
      await service.create('con-1', { clientId: 'cli-1', title: 'X', description: 'Y', deliverables: [], amount: 100 });
      expect(prisma.workAct.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ currency: 'ALTN' }),
      }));
    });
  });

  // ─── getById ───────────────────────────
  describe('getById', () => {
    it('should return work act', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      const result = await service.getById('wa-1');
      expect(result.title).toBe('Design Work');
    });

    it('should throw NotFoundException', async () => {
      prisma.workAct.findUnique.mockResolvedValue(null);
      await expect(service.getById('bad')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── submit ────────────────────────────
  describe('submit', () => {
    it('should submit drafted work act', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'SUBMITTED' });
      prisma.notification.create.mockResolvedValue({});
      const result = await service.submit('wa-1', 'con-1');
      expect(result.status).toBe('SUBMITTED');
    });

    it('should throw ForbiddenException for non-contractor', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      await expect(service.submit('wa-1', 'other')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-DRAFTED status', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, status: 'SUBMITTED' });
      await expect(service.submit('wa-1', 'con-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── review ────────────────────────────
  describe('review', () => {
    it('should review submitted work act', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, status: 'SUBMITTED' });
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'REVIEWED' });
      const result = await service.review('wa-1', 'cli-1');
      expect(result.status).toBe('REVIEWED');
    });

    it('should throw ForbiddenException for non-client', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, status: 'SUBMITTED' });
      await expect(service.review('wa-1', 'other')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-SUBMITTED status', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct); // DRAFTED
      await expect(service.review('wa-1', 'cli-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── sign ──────────────────────────────
  describe('sign', () => {
    it('should sign as contractor (first signer)', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'SIGNED_BY_CONTRACTOR', contractorSignature: '0xsig' });
      prisma.notification.create.mockResolvedValue({});
      const result = await service.sign('wa-1', 'con-1', '0xsig');
      expect(result.status).toBe('SIGNED_BY_CONTRACTOR');
    });

    it('should sign as client (first signer)', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'SIGNED_BY_CLIENT', clientSignature: '0xsig' });
      prisma.notification.create.mockResolvedValue({});
      const result = await service.sign('wa-1', 'cli-1', '0xsig');
      expect(result.status).toBe('SIGNED_BY_CLIENT');
    });

    it('should complete when both parties signed', async () => {
      prisma.workAct.findUnique.mockResolvedValue({
        ...mockWorkAct, status: 'SIGNED_BY_CONTRACTOR', contractorSignature: '0xcon',
      });
      prisma.workAct.update
        .mockResolvedValueOnce({ ...mockWorkAct, contractorSignature: '0xcon', clientSignature: '0xcli' })
        .mockResolvedValueOnce({ ...mockWorkAct, status: 'COMPLETED' });
      prisma.notification.create.mockResolvedValue({});
      prisma.notification.createMany.mockResolvedValue({});
      const result = await service.sign('wa-1', 'cli-1', '0xcli');
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw ForbiddenException for non-party', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      await expect(service.sign('wa-1', 'stranger', '0xsig')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for double contractor signature', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, contractorSignature: 'existing' });
      await expect(service.sign('wa-1', 'con-1', '0xsig')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for double client signature', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, clientSignature: 'existing' });
      await expect(service.sign('wa-1', 'cli-1', '0xsig')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── dispute ───────────────────────────
  describe('dispute', () => {
    it('should dispute as contractor', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'DISPUTED' });
      const result = await service.dispute('wa-1', 'con-1', 'Bad quality');
      expect(result.status).toBe('DISPUTED');
    });

    it('should dispute as client', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'DISPUTED' });
      const result = await service.dispute('wa-1', 'cli-1', 'Not delivered');
      expect(result.status).toBe('DISPUTED');
    });

    it('should throw ForbiddenException for non-party', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      await expect(service.dispute('wa-1', 'stranger', 'reason')).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── cancel ────────────────────────────
  describe('cancel', () => {
    it('should cancel drafted work act', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, status: 'CANCELLED' });
      const result = await service.cancel('wa-1', 'con-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should throw ForbiddenException for non-contractor', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct);
      await expect(service.cancel('wa-1', 'cli-1')).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for non-DRAFTED', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, status: 'SUBMITTED' });
      await expect(service.cancel('wa-1', 'con-1')).rejects.toThrow(BadRequestException);
    });
  });

  // ─── list ──────────────────────────────
  describe('list', () => {
    it('should list with pagination', async () => {
      prisma.workAct.findMany.mockResolvedValue([mockWorkAct]);
      prisma.workAct.count.mockResolvedValue(1);
      const result = await service.list({ contractorId: 'con-1', page: 1, limit: 10 });
      expect(result.workActs).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should list with default pagination', async () => {
      prisma.workAct.findMany.mockResolvedValue([]);
      prisma.workAct.count.mockResolvedValue(0);
      const result = await service.list();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  // ─── recordPayment ────────────────────
  describe('recordPayment', () => {
    it('should record payment for completed work act', async () => {
      prisma.workAct.findUnique.mockResolvedValue({ ...mockWorkAct, status: 'COMPLETED' });
      prisma.workAct.update.mockResolvedValue({ ...mockWorkAct, paymentTxHash: '0xhash' });
      const result = await service.recordPayment('wa-1', '0xhash');
      expect(result.paymentTxHash).toBe('0xhash');
    });

    it('should throw BadRequestException for non-COMPLETED', async () => {
      prisma.workAct.findUnique.mockResolvedValue(mockWorkAct); // DRAFTED
      await expect(service.recordPayment('wa-1', '0xhash')).rejects.toThrow(BadRequestException);
    });
  });
});
