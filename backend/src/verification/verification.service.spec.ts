import { Test, TestingModule } from '@nestjs/testing';
import { VerificationService } from './verification.service';
import { PrismaService } from '../prisma/prisma.service';
import { TimelineService } from '../timeline/timeline.service';

describe('VerificationService', () => {
  let service: VerificationService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
      verification: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), count: jest.fn().mockResolvedValue(5), update: jest.fn() },
    };
    const timeline = { addEvent: jest.fn().mockResolvedValue({}) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: TimelineService, useValue: timeline },
      ],
    }).compile();
    service = module.get<VerificationService>(VerificationService);
  });

  it('getPendingUsers returns unverified users', async () => {
    await service.getPendingUsers();
    expect(prisma.user.findMany).toHaveBeenCalled();
  });

  it('getVerifierStats returns stats', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', verifiedUsers: [] });
    prisma.verification.findMany.mockResolvedValue([]);
    const r = await service.getVerifierStats('u1');
    expect(r).toBeDefined();
  });
});
