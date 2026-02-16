import { Test, TestingModule } from '@nestjs/testing';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('QuestController', () => {
  let controller: QuestController;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      createQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      getAvailableQuests: jest.fn().mockResolvedValue([]),
      getMyQuests: jest.fn().mockResolvedValue([]),
      getQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      acceptQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      updateProgress: jest.fn().mockResolvedValue({ id: 'q1' }),
      submitQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      approveQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
      rejectQuest: jest.fn().mockResolvedValue({ id: 'q1' }),
    };
    const module = await Test.createTestingModule({
      controllers: [QuestController],
      providers: [{ provide: QuestService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate: () => true })
      .compile();
    controller = module.get(QuestController);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('creates quest', async () => {
    await controller.create(req, { title: 'Q', description: 'D', objectives: [{ description: 'obj' }], deadline: '2025-06-01' });
  });
  it('creates quest without deadline', async () => {
    await controller.create(req, { title: 'Q', description: 'D', objectives: [] });
  });
  it('gets available', async () => { await controller.getAvailable(); });
  it('gets my quests', async () => { await controller.getMyQuests(req); });
  it('gets quest', async () => { await controller.getQuest('q1'); });
  it('accepts quest', async () => { await controller.accept(req, 'q1'); });
  it('updates progress', async () => { await controller.updateProgress(req, 'q1', { objectives: [] }); });
  it('submits quest', async () => { await controller.submit(req, 'q1', { evidence: [] }); });
  it('approves quest', async () => { await controller.approve(req, 'q1', { rating: 5 }); });
  it('rejects quest', async () => { await controller.reject(req, 'q1', { feedback: 'incomplete' }); });
});
