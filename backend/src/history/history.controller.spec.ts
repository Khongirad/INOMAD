import { Test, TestingModule } from '@nestjs/testing';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

describe('HistoryController', () => {
  let controller: HistoryController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistoryController],
      providers: [
        { provide: HistoryService, useValue: { getHistory: jest.fn().mockResolvedValue([]) } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .overrideGuard(AdminGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<HistoryController>(HistoryController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
