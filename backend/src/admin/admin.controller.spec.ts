import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CreatorGuard } from '../auth/guards/creator.guard';

describe('AdminController', () => {
  let controller: AdminController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: { getStats: jest.fn().mockResolvedValue({}) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
    .overrideGuard(CreatorGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<AdminController>(AdminController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
