import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let jwtService: any;
  let configService: any;
  let authService: any;
  let reflector: any;

  beforeEach(() => {
    jwtService = { verify: jest.fn().mockReturnValue({ sub: 'u1', jti: 's1' }) };
    configService = { get: jest.fn().mockReturnValue('jwt-secret') };
    authService = { validateSession: jest.fn().mockResolvedValue({ userId: 'u1', seatId: 's1', address: '0x' }) };
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new AuthGuard(jwtService, configService, authService, reflector);
  });

  const createContext = (token?: string, isPublic = false): ExecutionContext => {
    const request: any = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('allows public endpoints', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const result = await guard.canActivate(createContext());
    expect(result).toBe(true);
  });

  it('rejects when no token', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException);
  });

  it('validates token and sets user', async () => {
    const ctx = createContext('valid-token');
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('valid-token', { secret: 'jwt-secret' });
  });

  it('rejects invalid token', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('invalid'); });
    await expect(guard.canActivate(createContext('bad-token'))).rejects.toThrow(UnauthorizedException);
  });

  it('rethrows UnauthorizedException from service', async () => {
    authService.validateSession.mockRejectedValue(new UnauthorizedException('session revoked'));
    await expect(guard.canActivate(createContext('token'))).rejects.toThrow('session revoked');
  });

  it('extracts token from Bearer header', () => {
    const token = (guard as any).extractToken({ headers: { authorization: 'Bearer abc123' } });
    expect(token).toBe('abc123');
  });

  it('returns null for no auth header', () => {
    const token = (guard as any).extractToken({ headers: {} });
    expect(token).toBeNull();
  });

  it('returns null for non-Bearer header', () => {
    const token = (guard as any).extractToken({ headers: { authorization: 'Basic abc' } });
    expect(token).toBeNull();
  });
});
