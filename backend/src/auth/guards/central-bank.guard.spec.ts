import { CentralBankGuard } from './central-bank.guard';
describe('CentralBankGuard', () => {
  let guard: CentralBankGuard;
  beforeEach(() => {
    const prisma = {} as any;
    guard = new CentralBankGuard(prisma);
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
