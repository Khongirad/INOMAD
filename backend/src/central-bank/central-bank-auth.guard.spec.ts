import { CentralBankAuthGuard } from './central-bank-auth.guard';
describe('CentralBankAuthGuard', () => {
  let guard: CentralBankAuthGuard;
  beforeEach(() => {
    const jwt = { verify: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('secret') } as any;
    const prisma = {} as any;
    const cbAuthService = { validateTicket: jest.fn() } as any;
    const reflector = { getAllAndOverride: jest.fn() } as any;
    guard = new CentralBankAuthGuard(jwt, config, prisma, cbAuthService, reflector);
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
