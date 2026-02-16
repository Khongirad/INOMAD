import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: any;

  beforeEach(async () => {
    jwtService = {
      verifyAsync: jest.fn().mockResolvedValue({ sub: 'u1', role: 'CITIZEN' }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: JwtService, useValue: jwtService },
        Reflector,
      ],
    }).compile();
    guard = module.get(JwtAuthGuard);
    process.env.AUTH_JWT_SECRET = 'test-secret';
  });

  afterEach(() => {
    delete process.env.AUTH_JWT_SECRET;
  });

  const createContext = (headers: any = {}, isPublic = false): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ headers, user: undefined }),
      }),
      getHandler: () => (isPublic ? function PublicHandler() {} : function Handler() {}),
      getClass: () => (isPublic ? class PublicClass {} : class NormalClass {}),
    } as any);

  it('should be defined', () => expect(guard).toBeDefined());

  it('extracts Bearer token and sets user', async () => {
    const ctx = createContext({ authorization: 'Bearer valid-token' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', { secret: 'test-secret' });
  });

  it('throws if no token provided', async () => {
    await expect(guard.canActivate(createContext({}))).rejects.toThrow(UnauthorizedException);
  });

  it('throws if non-Bearer auth', async () => {
    await expect(
      guard.canActivate(createContext({ authorization: 'Basic abc123' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws if token verification fails', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('invalid signature'));
    await expect(
      guard.canActivate(createContext({ authorization: 'Bearer bad' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws config error if no secret defined', async () => {
    delete process.env.AUTH_JWT_SECRET;
    delete process.env.JWT_SECRET;
    await expect(
      guard.canActivate(createContext({ authorization: 'Bearer tok' })),
    ).rejects.toThrow('environment variable');
  });

  it('uses JWT_SECRET as fallback', async () => {
    delete process.env.AUTH_JWT_SECRET;
    process.env.JWT_SECRET = 'fallback-secret';
    await guard.canActivate(createContext({ authorization: 'Bearer tok' }));
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('tok', { secret: 'fallback-secret' });
    delete process.env.JWT_SECRET;
  });
});
