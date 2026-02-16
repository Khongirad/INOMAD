import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankGuard } from './central-bank.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('CentralBankGuard', () => {
  let guard: CentralBankGuard;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      centralBankOfficer: { findFirst: jest.fn() },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralBankGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    guard = module.get(CentralBankGuard);
  });

  const createCtx = (user: any) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any);

  it('should be defined', () => expect(guard).toBeDefined());

  it('throws if no user address', async () => {
    await expect(guard.canActivate(createCtx({}))).rejects.toThrow(ForbiddenException);
  });

  it('throws if null user', async () => {
    await expect(guard.canActivate(createCtx(null))).rejects.toThrow(ForbiddenException);
  });

  it('throws if not a central bank officer', async () => {
    prisma.centralBankOfficer.findFirst.mockResolvedValue(null);
    await expect(
      guard.canActivate(createCtx({ address: '0xabc' })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows active officer and attaches info', async () => {
    const officer = { id: 'o1', role: 'GOVERNOR', name: 'John' };
    prisma.centralBankOfficer.findFirst.mockResolvedValue(officer);
    const req = { user: { address: '0xABC' } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    expect(await guard.canActivate(ctx)).toBe(true);
    expect(req['cbOfficer']).toEqual({ id: 'o1', role: 'GOVERNOR', name: 'John' });
  });

  it('queries with lowercased address', async () => {
    prisma.centralBankOfficer.findFirst.mockResolvedValue({ id: 'o1', role: 'MEMBER', name: null });
    await guard.canActivate(createCtx({ address: '0xABC123' }));
    expect(prisma.centralBankOfficer.findFirst).toHaveBeenCalledWith({
      where: { walletAddress: '0xabc123', isActive: true, revokedAt: null },
    });
  });
});
