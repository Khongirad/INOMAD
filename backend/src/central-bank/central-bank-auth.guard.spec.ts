import { Test, TestingModule } from '@nestjs/testing';
import { CentralBankAuthGuard, CB_ROLES_KEY } from './central-bank-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CentralBankAuthService } from './central-bank-auth.service';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException, ExecutionContext } from '@nestjs/common';

describe('CentralBankAuthGuard', () => {
  let guard: CentralBankAuthGuard;
  let jwtService: any;
  let configService: any;
  let cbAuthService: any;
  let reflector: any;
  let prisma: any;

  const createMockContext = (headers: Record<string, string> = {}): ExecutionContext => ({
    switchToHttp: () => ({
      getRequest: () => ({ headers, cbUser: undefined, user: undefined }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as any);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CentralBankAuthGuard,
        { provide: JwtService, useValue: { verify: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('secret') } },
        { provide: CentralBankAuthService, useValue: { validateTicket: jest.fn() } },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: PrismaService, useValue: { user: { findUnique: jest.fn() } } },
      ],
    }).compile();
    guard = module.get(CentralBankAuthGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    cbAuthService = module.get(CentralBankAuthService);
    reflector = module.get(Reflector);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => expect(guard).toBeDefined());

  describe('Creator bypass', () => {
    it('allows Creator with Bearer token', async () => {
      jwtService.verify.mockReturnValue({ sub: 'creator1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'creator1', role: 'CREATOR' });
      const ctx = createMockContext({ authorization: 'Bearer validjwt' });
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('skips non-Creator users', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user1' });
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', role: 'USER' });
      // Should fall through to CB ticket check, which will fail
      const ctx = createMockContext({ authorization: 'Bearer validjwt' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('skips on invalid JWT', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      const ctx = createMockContext({ authorization: 'Bearer badjwt' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('skips when no auth header', async () => {
      const ctx = createMockContext({});
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('CB Ticket auth', () => {
    beforeEach(() => {
      // Ensure creator bypass fails
      jwtService.verify.mockImplementation((token, opts) => {
        if (opts?.secret === 'secret' && token === 'cb-ticket') {
          return { officerId: 'o1', role: 'GOVERNOR', walletAddress: '0x1', jti: 'j1' };
        }
        throw new Error('invalid');
      });
    });

    it('allows with x-cb-ticket header', async () => {
      cbAuthService.validateTicket.mockReturnValue({ officerId: 'o1', role: 'GOVERNOR', walletAddress: '0x1', jti: 'j1' });
      reflector.getAllAndOverride.mockReturnValue(null);
      const ctx = createMockContext({ 'x-cb-ticket': 'cb-ticket' });
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('allows with CBTicket authorization header', async () => {
      cbAuthService.validateTicket.mockReturnValue({ officerId: 'o1', role: 'GOVERNOR', walletAddress: '0x1', jti: 'j1' });
      reflector.getAllAndOverride.mockReturnValue(null);
      const ctx = createMockContext({ authorization: 'CBTicket cb-ticket' });
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('rejects wrong role', async () => {
      cbAuthService.validateTicket.mockReturnValue({ officerId: 'o1', role: 'BOARD_MEMBER', walletAddress: '0x1', jti: 'j1' });
      reflector.getAllAndOverride.mockReturnValue(['GOVERNOR']);
      const ctx = createMockContext({ 'x-cb-ticket': 'cb-ticket' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('allows matching role', async () => {
      cbAuthService.validateTicket.mockReturnValue({ officerId: 'o1', role: 'GOVERNOR', walletAddress: '0x1', jti: 'j1' });
      reflector.getAllAndOverride.mockReturnValue(['GOVERNOR', 'BOARD_MEMBER']);
      const ctx = createMockContext({ 'x-cb-ticket': 'cb-ticket' });
      expect(await guard.canActivate(ctx)).toBe(true);
    });

    it('rejects expired ticket', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('expired'); });
      const ctx = createMockContext({ 'x-cb-ticket': 'expired-ticket' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('extractToken', () => {
    it('returns null for non-CBTicket auth type', async () => {
      jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
      const ctx = createMockContext({ authorization: 'Basic abc' });
      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });
});
