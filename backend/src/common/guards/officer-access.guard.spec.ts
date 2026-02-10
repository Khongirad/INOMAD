import { OfficerAccessGuard } from './officer-access.guard';
describe('OfficerAccessGuard', () => {
  let guard: OfficerAccessGuard;
  beforeEach(() => {
    const reflector = { get: jest.fn() } as any;
    const prisma = { user: { findUnique: jest.fn() } } as any;
    guard = new OfficerAccessGuard(reflector, prisma);
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
