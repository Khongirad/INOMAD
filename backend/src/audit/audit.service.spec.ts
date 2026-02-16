import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  const mockPrisma = () => ({
    auditLog: { create: jest.fn(), findMany: jest.fn() },
    khuralEvent: { create: jest.fn(), findMany: jest.fn() },
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: PrismaService, useFactory: mockPrisma },
      ],
    }).compile();
    service = module.get(AuditService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  // ─── logAction ─────────────────────────
  describe('logAction', () => {
    it('should log action successfully', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });
      await service.logAction('u1', 'LOGIN', 'user', 'u1');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should not throw on failure (fail-safe)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB down'));
      await expect(service.logAction('u1', 'LOGIN')).resolves.toBeUndefined();
    });

    it('should handle null userId', async () => {
      prisma.auditLog.create.mockResolvedValue({ id: 'log-2' });
      await service.logAction(null, 'SYSTEM_EVENT');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: null }) }),
      );
    });
  });

  // ─── logEvent ──────────────────────────
  describe('logEvent', () => {
    it('should log governance event', async () => {
      prisma.khuralEvent.create.mockResolvedValue({ id: 'event-1', type: 'SESSION_START' });
      const result = await service.logEvent('SESSION_START', 'Session opened', 'Regular session');
      expect(result.type).toBe('SESSION_START');
    });

    it('should log event with related proposal', async () => {
      prisma.khuralEvent.create.mockResolvedValue({ id: 'event-2', relatedProposalId: 'prop-1' });
      const result = await service.logEvent('DECREE_SIGNED', 'Decree', 'Desc', 'prop-1');
      expect(result.relatedProposalId).toBe('prop-1');
    });
  });

  // ─── getLogs ───────────────────────────
  describe('getLogs', () => {
    it('should return audit logs', async () => {
      prisma.auditLog.findMany.mockResolvedValue([{ id: 'log-1' }]);
      const result = await service.getLogs(10, 0);
      expect(result).toHaveLength(1);
    });
  });

  // ─── getPublicHistory ──────────────────
  describe('getPublicHistory', () => {
    it('should return public history', async () => {
      prisma.khuralEvent.findMany.mockResolvedValue([{ id: 'ev-1' }]);
      const result = await service.getPublicHistory(10, 0);
      expect(result).toHaveLength(1);
    });
  });
});
