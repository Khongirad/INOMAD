import { AdminGuard } from './admin.guard';
describe('AdminGuard', () => {
  let guard: AdminGuard;
  beforeEach(() => {
    guard = new (AdminGuard as any)();
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
