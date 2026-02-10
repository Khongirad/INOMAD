import { Test, TestingModule } from '@nestjs/testing';
import { ElectionController } from './election.controller';
import { ElectionService } from './election.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('ElectionController', () => {
  let controller: ElectionController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ElectionController],
      providers: [
        { provide: ElectionService, useValue: { createElection: jest.fn(), getElection: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<ElectionController>(ElectionController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
