import { Test, TestingModule } from '@nestjs/testing';
import { GamificationController } from './gamification.controller';
import { GamificationService } from './gamification.service';

describe('GamificationController', () => {
  let controller: GamificationController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getCitizenLevel: jest.fn().mockResolvedValue({ level: 5, xp: 1000 }),
      getLeaderboard: jest.fn().mockResolvedValue([]),
      getAchievementProgress: jest.fn().mockResolvedValue([]),
      awardXP: jest.fn().mockResolvedValue({ xp: 100 }),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamificationController],
      providers: [{ provide: GamificationService, useValue: mockService }],
    }).compile();
    controller = module.get(GamificationController);
    service = module.get(GamificationService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getMyProfile', async () => { await controller.getMyProfile(req); expect(service.getCitizenLevel).toHaveBeenCalledWith('u1'); });
  it('getProfile', async () => { await controller.getProfile('u2'); expect(service.getCitizenLevel).toHaveBeenCalledWith('u2'); });
  it('getLeaderboard', async () => { await controller.getLeaderboard('25'); expect(service.getLeaderboard).toHaveBeenCalledWith(25); });
  it('getLeaderboard default', async () => { await controller.getLeaderboard(); expect(service.getLeaderboard).toHaveBeenCalledWith(50); });
  it('getAchievements', async () => { await controller.getAchievements(req); expect(service.getAchievementProgress).toHaveBeenCalledWith('u1'); });
  it('awardXP', async () => { await controller.awardXP(req, { action: 'QUEST', amount: 50 }); expect(service.awardXP).toHaveBeenCalledWith('u1', 'QUEST', { amount: 50, reason: undefined, sourceId: undefined }); });
});
