import { Test, TestingModule } from '@nestjs/testing';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('QuestController', () => {
  let controller: QuestController;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestController],
      providers: [
        { provide: QuestService, useValue: { createQuest: jest.fn(), getQuest: jest.fn() } },
      ],
    })
    .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
    .compile();
    controller = module.get<QuestController>(QuestController);
  });
  it('should be defined', () => { expect(controller).toBeDefined(); });
});
