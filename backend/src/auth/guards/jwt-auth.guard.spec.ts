import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  beforeEach(() => {
    const jwt = { verify: jest.fn() } as any;
    guard = new JwtAuthGuard(jwt);
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
