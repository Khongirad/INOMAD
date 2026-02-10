import { BankAuthGuard } from './bank-auth.guard';
describe('BankAuthGuard', () => {
  let guard: BankAuthGuard;
  beforeEach(() => {
    const jwt = { verify: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('secret') } as any;
    const bankAuthService = { validateTicket: jest.fn() } as any;
    guard = new BankAuthGuard(jwt, config, bankAuthService);
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
