import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      auditLog: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
      khuralEvent: { create: jest.fn().mockResolvedValue({ id: 'ev-1' }), findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  describe('logAction', () => {
    it('should create audit log entry', async () => {
      await service.logAction('u1', 'LOGIN', 'session', 'sess-1');
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });

    it('should not throw on failure (fail-safe)', async () => {
      prisma.auditLog.create.mockRejectedValue(new Error('DB error'));
      await expect(service.logAction('u1', 'LOGIN')).resolves.not.toThrow();
    });
  });

  describe('logEvent', () => {
    it('should create governance event', async () => {
      const result = await service.logEvent('SESSION_START', 'Session 1', 'First session');
      expect(result.id).toBe('ev-1');
    });
  });

  describe('getLogs', () => {
    it('should return audit logs with pagination', async () => {
      await service.getLogs(10, 0);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10, skip: 0 }),
      );
    });
  });

  describe('getPublicHistory', () => {
    it('should return public events', async () => {
      await service.getPublicHistory(20, 5);
      expect(prisma.khuralEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20, skip: 5 }),
      );
    });
  });
});
