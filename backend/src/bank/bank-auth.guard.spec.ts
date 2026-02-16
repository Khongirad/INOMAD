import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { BankAuthGuard } from './bank-auth.guard';

describe('BankAuthGuard', () => {
  let guard: BankAuthGuard;
  let jwtService: any;
  let configService: any;
  let bankAuthService: any;

  beforeEach(() => {
    jwtService = { verify: jest.fn().mockReturnValue({ bankRef: 'BANK-ABC', role: 'TELLER' }) };
    configService = { get: jest.fn().mockReturnValue('bank-secret') };
    bankAuthService = { validateTicket: jest.fn().mockReturnValue({ bankRef: 'BANK-ABC', role: 'TELLER' }) };
    guard = new BankAuthGuard(jwtService, configService, bankAuthService);
  });

  const createContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request: any = { headers };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;
  };

  it('rejects when no token', async () => {
    await expect(guard.canActivate(createContext())).rejects.toThrow(UnauthorizedException);
  });

  it('validates x-bank-ticket header', async () => {
    const result = await guard.canActivate(createContext({ 'x-bank-ticket': 'ticket123' }));
    expect(result).toBe(true);
    expect(jwtService.verify).toHaveBeenCalledWith('ticket123', { secret: 'bank-secret' });
  });

  it('validates BankTicket authorization header', async () => {
    const result = await guard.canActivate(createContext({ authorization: 'BankTicket ticket123' }));
    expect(result).toBe(true);
  });

  it('rejects non-BankTicket auth header', async () => {
    await expect(guard.canActivate(createContext({ authorization: 'Bearer token' }))).rejects.toThrow();
  });

  it('rejects invalid token', async () => {
    jwtService.verify.mockImplementation(() => { throw new Error('expired'); });
    await expect(guard.canActivate(createContext({ 'x-bank-ticket': 'bad' }))).rejects.toThrow(UnauthorizedException);
  });

  it('rethrows UnauthorizedException', async () => {
    bankAuthService.validateTicket.mockImplementation(() => { throw new UnauthorizedException('bad ticket'); });
    await expect(guard.canActivate(createContext({ 'x-bank-ticket': 't' }))).rejects.toThrow('bad ticket');
  });
});
