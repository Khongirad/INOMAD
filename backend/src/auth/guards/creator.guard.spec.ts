import { CreatorGuard } from './creator.guard';
describe('CreatorGuard', () => {
  let guard: CreatorGuard;
  beforeEach(() => {
    guard = new (CreatorGuard as any)();
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
