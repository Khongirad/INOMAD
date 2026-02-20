import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthPasswordService } from './auth-password.service';
import { AccountRecoveryService } from './account-recovery.service';
import { AuthGuard } from './auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: any;
  let passwordService: any;
  let recoveryService: any;

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
    recoveryService = {
      setSecretQuestion: jest.fn().mockResolvedValue({ ok: true, message: 'Set' }),
      requestViaGuarantor: jest.fn().mockResolvedValue({ ok: true, requestId: 'req1', message: 'Sent' }),
      requestViaSecretQuestion: jest.fn().mockResolvedValue({ ok: true, recoveryToken: 'tok', expiresAt: new Date().toISOString() }),
      requestViaOfficialOrgans: jest.fn().mockResolvedValue({ ok: true, requestId: 'req2', message: 'Submitted' }),
      confirmAsGuarantor: jest.fn().mockResolvedValue({ ok: true, message: 'Confirmed' }),
      officialApprove: jest.fn().mockResolvedValue({ ok: true, message: 'Approved' }),
      getPendingRequests: jest.fn().mockResolvedValue([]),
      getRecoveryRequest: jest.fn().mockResolvedValue({ id: 'req1', status: 'PENDING' }),
      resetPasswordWithToken: jest.fn().mockResolvedValue({ ok: true, message: 'Reset' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: AuthPasswordService, useValue: passwordService },
        { provide: AccountRecoveryService, useValue: recoveryService },
      ],
    })
      .overrideGuard(AuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => expect(controller).toBeDefined());

  // ─── Wallet auth ──────────────────────────────────────────────────────────

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

  it('logs out with token', async () => {
    const payload = Buffer.from(JSON.stringify({ jti: 'session1' })).toString('base64');
    const r = await controller.logout({
      user: { userId: 'u1' }, headers: { authorization: `Bearer header.${payload}.sig` },
    } as any);
    expect(r.ok).toBe(true);
    expect(authService.logout).toHaveBeenCalledWith('session1');
  });

  it('logs out without token', async () => {
    const r = await controller.logout({ user: { userId: 'u1' }, headers: {} } as any);
    expect(r.ok).toBe(true);
  });

  it('logs out all', async () => {
    const r = await controller.logoutAll({ user: { userId: 'u1' } } as any);
    expect(r.ok).toBe(true);
  });

  // ─── Password auth ────────────────────────────────────────────────────────

  it('registers', async () => {
    const r = await controller.register({ username: 'test', password: 'pass123' } as any);
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

  // ─── Recovery endpoints ───────────────────────────────────────────────────

  it('returns available secret questions', () => {
    const r = controller.getSecretQuestions();
    expect(r.ok).toBe(true);
    expect(r.questions.length).toBeGreaterThan(0);
  });

  it('sets secret question', async () => {
    const r = await controller.setSecretQuestion(
      { user: { userId: 'u1' } } as any,
      { question: "What is your mother's maiden name?", answer: 'Smith' },
    );
    expect(r.ok).toBe(true);
  });

  it('requests recovery via guarantor', async () => {
    const r = await controller.recoveryViaGuarantor({
      claimedUsername: 'alice', claimedFullName: 'Alice Smith',
      claimedBirthDate: '1990-01-01', guarantorSeatId: 'KHURAL-ABC',
    });
    expect(r.ok).toBe(true);
    expect(r.requestId).toBe('req1');
  });

  it('requests recovery via secret question', async () => {
    const r = await controller.recoveryViaSecretQuestion({
      claimedUsername: 'alice', claimedFullName: 'Alice Smith',
      claimedBirthDate: '1990-01-01', secretAnswer: 'Smith',
    });
    expect(r.ok).toBe(true);
    expect(r.recoveryToken).toBe('tok');
  });

  it('requests recovery via official organs', async () => {
    const r = await controller.recoveryViaOfficial({
      claimedUsername: 'alice', claimedFullName: 'Alice Smith',
      claimedBirthDate: '1990-01-01', claimedPassportNumber: '1234567',
      officialServiceType: 'MIGRATION_SERVICE',
    });
    expect(r.ok).toBe(true);
    expect(r.requestId).toBe('req2');
  });

  it('guarantor confirms a request', async () => {
    const r = await controller.guarantorConfirm(
      { user: { userId: 'u-guarantor' } } as any, 'req1',
    );
    expect(r.ok).toBe(true);
  });

  it('admin approves official request', async () => {
    const r = await controller.officialApprove(
      { user: { userId: 'u-admin' } } as any, 'req2',
      { approved: true, note: 'Verified in person' },
    );
    expect(r.ok).toBe(true);
  });

  it('resets password via recovery token', async () => {
    const r = await controller.resetPasswordViaToken({
      recoveryToken: 'tok', newPassword: 'newpass123',
    });
    expect(r.ok).toBe(true);
  });

  it('gets pending recovery requests', async () => {
    const r = await controller.getPendingRecoveries();
    expect(r.ok).toBe(true);
    expect(Array.isArray(r.requests)).toBe(true);
  });

  it('gets a specific recovery request', async () => {
    const r = await controller.getRecoveryRequest('req1');
    expect(r.ok).toBe(true);
    expect(r.request.id).toBe('req1');
  });
});
