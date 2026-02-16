import { Test, TestingModule } from '@nestjs/testing';
import { AdminController, CreatorController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorGuard } from '../auth/guards/creator.guard';

describe('AdminController', () => {
  let controller: AdminController;
  const req = { user: { userId: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getStats: jest.fn().mockResolvedValue({ totalUsers: 100 }),
      listUsers: jest.fn().mockResolvedValue([]),
      getPendingUsers: jest.fn().mockResolvedValue([]),
      getUserById: jest.fn().mockResolvedValue({ id: 'u1' }),
      verifyUser: jest.fn().mockResolvedValue({ id: 'u1', verified: true }),
      rejectUser: jest.fn().mockResolvedValue({ id: 'u1' }),
    };
    const module = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AdminController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('gets stats', async () => { await controller.getStats(); });
  it('lists users', async () => { await controller.listUsers('ACTIVE', 'USER', '10', '0'); });
  it('lists users without filters', async () => { await controller.listUsers(); });
  it('gets pending users', async () => { await controller.getPendingUsers(); });
  it('gets user by id', async () => { await controller.getUserById('u1'); });
  it('verifies user', async () => { await controller.verifyUser('u1', req); });
  it('rejects user', async () => { await controller.rejectUser('u1', 'spam'); });
});

describe('CreatorController', () => {
  let controller: CreatorController;
  const req = { user: { userId: 'creator1' } };

  beforeEach(async () => {
    const mockService = {
      listAdmins: jest.fn().mockResolvedValue([]),
      createAdmin: jest.fn().mockResolvedValue({ id: 'a1' }),
      toggleFreezeAdmin: jest.fn().mockResolvedValue({ id: 'a1' }),
      removeAdmin: jest.fn().mockResolvedValue({ id: 'a1' }),
    };
    const module = await Test.createTestingModule({
      controllers: [CreatorController],
      providers: [{ provide: AdminService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .overrideGuard(CreatorGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(CreatorController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('lists admins', async () => { await controller.listAdmins(); });
  it('creates admin', async () => { await controller.createAdmin('s1', req); });
  it('freezes admin', async () => { await controller.freezeAdmin('u1', req); });
  it('unfreezes admin', async () => { await controller.unfreezeAdmin('u1', req); });
  it('removes admin', async () => { await controller.removeAdmin('u1'); });
});
