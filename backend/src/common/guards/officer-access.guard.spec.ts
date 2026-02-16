import { Test, TestingModule } from '@nestjs/testing';
import { OfficerAccessGuard } from './officer-access.guard';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('OfficerAccessGuard', () => {
  let guard: OfficerAccessGuard;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficerAccessGuard,
        Reflector,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    guard = module.get(OfficerAccessGuard);
  });

  const createCtx = (userId?: string) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user: userId ? { id: userId } : undefined }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any);

  it('should be defined', () => expect(guard).toBeDefined());

  it('throws if no user', async () => {
    await expect(guard.canActivate(createCtx())).rejects.toThrow(ForbiddenException);
  });

  it('throws if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(guard.canActivate(createCtx('u1'))).rejects.toThrow(ForbiddenException);
  });

  it('allows CREATOR', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CREATOR', verificationLevel: 'NONE' });
    expect(await guard.canActivate(createCtx('u1'))).toBe(true);
  });

  it('allows ADMIN', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'ADMIN', verificationLevel: 'NONE' });
    expect(await guard.canActivate(createCtx('u1'))).toBe(true);
  });

  it('denies CITIZEN', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: 'CITIZEN', verificationLevel: 'NONE' });
    await expect(guard.canActivate(createCtx('u1'))).rejects.toThrow(ForbiddenException);
  });
});
