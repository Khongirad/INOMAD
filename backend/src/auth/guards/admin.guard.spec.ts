import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from './admin.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminGuard],
    }).compile();
    guard = module.get(AdminGuard);
  });

  const createMockContext = (user: any): ExecutionContext =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any);

  it('should be defined', () => expect(guard).toBeDefined());

  it('allows ADMIN role', () => {
    expect(guard.canActivate(createMockContext({ role: 'ADMIN', isFrozen: false }))).toBe(true);
  });

  it('allows CREATOR role', () => {
    expect(guard.canActivate(createMockContext({ role: 'CREATOR' }))).toBe(true);
  });

  it('rejects non-admin roles', () => {
    expect(() => guard.canActivate(createMockContext({ role: 'CITIZEN' }))).toThrow(ForbiddenException);
  });

  it('rejects missing user', () => {
    expect(() => guard.canActivate(createMockContext(null))).toThrow(ForbiddenException);
  });

  it('rejects frozen ADMIN', () => {
    expect(() =>
      guard.canActivate(createMockContext({ role: 'ADMIN', isFrozen: true })),
    ).toThrow(ForbiddenException);
  });

  it('allows frozen CREATOR (freeze only affects ADMIN)', () => {
    // Creator frozen check is NOT in AdminGuard — it only checks admin freeze
    expect(guard.canActivate(createMockContext({ role: 'CREATOR', isFrozen: true }))).toBe(true);
  });
});
