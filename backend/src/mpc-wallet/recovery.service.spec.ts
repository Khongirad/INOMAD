import { Test, TestingModule } from '@nestjs/testing';
import { RecoveryService } from './recovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

describe('RecoveryService', () => {
  let service: RecoveryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      recoveryGuardian: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'g1' }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      mPCWallet: { findUnique: jest.fn(), update: jest.fn() },
      recoverySession: { findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      user: { findUnique: jest.fn() },
      familyArban: { findMany: jest.fn().mockResolvedValue([]) },
      orgArbanMember: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const notification = { sendRecoveryNotification: jest.fn(), sendGuardianRequest: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecoveryService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notification },
      ],
    }).compile();
    service = module.get<RecoveryService>(RecoveryService);
  });

  it('getGuardians returns list', async () => {
    await service.getGuardians('w1');
    expect(prisma.recoveryGuardian.findMany).toHaveBeenCalled();
  });

  it('suggestGuardians returns suggestions', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const r = await service.suggestGuardians('u1');
    expect(Array.isArray(r)).toBe(true);
  });
});
