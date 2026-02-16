import { Test, TestingModule } from '@nestjs/testing';
import { CreatorGuard } from './creator.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

describe('CreatorGuard', () => {
  let guard: CreatorGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CreatorGuard],
    }).compile();
    guard = module.get(CreatorGuard);
  });

  const createMockContext = (user: any): ExecutionContext =>
    ({ switchToHttp: () => ({ getRequest: () => ({ user }) }) } as any);

  it('should be defined', () => expect(guard).toBeDefined());

  it('allows CREATOR role', () => {
    expect(guard.canActivate(createMockContext({ role: 'CREATOR', isFrozen: false }))).toBe(true);
  });

  it('rejects ADMIN role', () => {
    expect(() => guard.canActivate(createMockContext({ role: 'ADMIN' }))).toThrow(ForbiddenException);
  });

  it('rejects CITIZEN role', () => {
    expect(() => guard.canActivate(createMockContext({ role: 'CITIZEN' }))).toThrow(ForbiddenException);
  });

  it('rejects missing user', () => {
    expect(() => guard.canActivate(createMockContext(null))).toThrow(ForbiddenException);
  });

  it('rejects frozen CREATOR', () => {
    expect(() =>
      guard.canActivate(createMockContext({ role: 'CREATOR', isFrozen: true })),
    ).toThrow(ForbiddenException);
  });
});
