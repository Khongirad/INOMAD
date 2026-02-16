import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthPasswordService } from './auth-password.service';
import { AuthGuard } from './auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let passwordService: any;

  beforeEach(async () => {
    authService = {
      generateNonce: jest.fn().mockResolvedValue({ nonce: 'abc123', message: 'Sign this' }),
      verifySignature: jest.fn().mockResolvedValue({ accessToken: 'jwt', refreshToken: 'rt' }),
      getMe: jest.fn().mockResolvedValue({ userId: 'u1', seatId: 's1' }),
      refreshTokens: jest.fn().mockResolvedValue({ accessToken: 'new-jwt', refreshToken: 'new-rt' }),
      logout: jest.fn().mockResolvedValue(undefined),
      logoutAll: jest.fn().mockResolvedValue(undefined),
      validateSession: jest.fn().mockResolvedValue({ userId: 'u1' }),
    };
    passwordService = {
      register: jest.fn().mockResolvedValue({ userId: 'u1', accessToken: 'jwt' }),
      login: jest.fn().mockResolvedValue({ accessToken: 'jwt' }),
      acceptTOS: jest.fn().mockResolvedValue({ accepted: true }),
      acceptConstitution: jest.fn().mockResolvedValue({ accepted: true }),
      changePassword: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthPasswordService, useValue: passwordService },
      ],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  it('requests nonce', async () => {
    const r = await controller.requestNonce({ address: '0xABC' });
    expect(r.nonce).toBe('abc123');
  });

  it('verifies signature', async () => {
    const r = await controller.verify(
      { address: '0xABC', signature: '0xSIG', nonce: 'abc123' },
      { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
    );
    expect(r.ok).toBe(true);
    expect(r.accessToken).toBe('jwt');
  });

  it('gets me', async () => {
    const r = await controller.getMe({ user: { userId: 'u1' } } as any);
    expect(r.ok).toBe(true);
  });

  it('refreshes tokens', async () => {
    const r = await controller.refresh(
      { refreshToken: 'rt' },
      { ip: '127.0.0.1', headers: { 'user-agent': 'test' } } as any,
    );
    expect(r.ok).toBe(true);
  });

  it('logs out', async () => {
    // Create a fake JWT with a jti in the payload
    const payload = Buffer.from(JSON.stringify({ jti: 'session1' })).toString('base64');
    const fakeToken = `header.${payload}.sig`;
    const r = await controller.logout({
      user: { userId: 'u1' }, headers: { authorization: `Bearer ${fakeToken}` },
    } as any);
    expect(r.ok).toBe(true);
    expect(authService.logout).toHaveBeenCalledWith('session1');
  });

  it('logs out without token', async () => {
    const r = await controller.logout({
      user: { userId: 'u1' }, headers: {},
    } as any);
    expect(r.ok).toBe(true);
  });

  it('logs out all', async () => {
    const r = await controller.logoutAll({ user: { userId: 'u1' } } as any);
    expect(r.ok).toBe(true);
  });

  it('registers', async () => {
    const r = await controller.register({ username: 'test', password: 'pass123', displayName: 'Test' } as any);
    expect(r).toBeDefined();
  });

  it('logs in with password', async () => {
    const r = await controller.loginPassword({ username: 'test', password: 'pass123' } as any);
    expect(r).toBeDefined();
  });

  it('accepts TOS', async () => {
    const r = await controller.acceptTOS({ user: { userId: 'u1' } } as any);
    expect(r).toBeDefined();
  });

  it('accepts constitution', async () => {
    const r = await controller.acceptConstitution({ user: { userId: 'u1' } } as any);
    expect(r).toBeDefined();
  });

  it('changes password', async () => {
    const r = await controller.changePassword(
      { user: { userId: 'u1' } } as any,
      { oldPassword: 'old', newPassword: 'new' } as any,
    );
    expect(r).toBeDefined();
  });
});
