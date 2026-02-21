import { Test, TestingModule } from '@nestjs/testing';
import { AuthMiddleware, AuthenticatedRequest } from './auth.middleware';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthMiddleware', () => {
  let middleware: AuthMiddleware;
  let prisma: any;
  let next: jest.Mock;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
    };
    next = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthMiddleware,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    middleware = module.get(AuthMiddleware);
  });

  const createReq = (originalUrl: string, headers: any = {}): AuthenticatedRequest =>
    ({
      originalUrl,
      path: '/',
      method: 'GET',
      headers,
    } as any);

  it('should be defined', () => expect(middleware).toBeDefined());

  // ======================== Public endpoints bypass ========================

  it('skips auth for /api/transparency', async () => {
    const req = createReq('/api/transparency/dashboard');
    await middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('skips auth for /api/activities', async () => {
    const req = createReq('/api/activities');
    await middleware.use(req, {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/auth/register', async () => {
    await middleware.use(createReq('/api/auth/register'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/auth/login', async () => {
    await middleware.use(createReq('/api/auth/login'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/auth/nonce', async () => {
    await middleware.use(createReq('/api/auth/nonce'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/auth/verify', async () => {
    await middleware.use(createReq('/api/auth/verify'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/auth/refresh', async () => {
    await middleware.use(createReq('/api/auth/refresh'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('skips auth for /api/health', async () => {
    await middleware.use(createReq('/api/health'), {} as any, next);
    expect(next).toHaveBeenCalled();
  });

  // ======================== Protected endpoints ========================

  it('throws if missing x-seat-id header', async () => {
    const req = createReq('/api/arbads', {});
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(UnauthorizedException);
  });

  it('throws if user not found by seatId', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const req = createReq('/api/arbads', { 'x-seat-id': 'bad-seat' });
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(UnauthorizedException);
  });

  it('attaches user to request on valid seatId', async () => {
    const user = { id: 'u1', seatId: 'seat1', role: 'CITIZEN' };
    prisma.user.findUnique.mockResolvedValue(user);
    const req = createReq('/api/arbads', { 'x-seat-id': 'seat1' });

    await middleware.use(req, {} as any, next);
    expect(req.user).toEqual(user);
    expect(next).toHaveBeenCalled();
  });
});
