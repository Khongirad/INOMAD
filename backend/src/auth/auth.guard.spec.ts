import { AuthGuard } from './auth.guard';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
describe('AuthGuard', () => {
  let guard: AuthGuard;
  beforeEach(() => {
    const jwt = { verify: jest.fn() } as any;
    const config = { get: jest.fn().mockReturnValue('secret') } as any;
    const authService = { validateSession: jest.fn() } as any;
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) } as any;
    guard = new AuthGuard(jwt, config, authService, reflector);
  });
  it('should be defined', () => { expect(guard).toBeDefined(); });
});
