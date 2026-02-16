import { Test, TestingModule } from '@nestjs/testing';
import { ReputationController } from './reputation.controller';
import { ReputationService } from './reputation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ReputationController', () => {
  let controller: ReputationController;
  let reputationService: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReputationController],
      providers: [
        {
          provide: ReputationService,
          useValue: {
            getReputationProfile: jest.fn().mockResolvedValue({
              userId: 'u1',
              score: 850,
              level: 'TRUSTED',
              questsCompleted: 15,
              contractsSigned: 5,
            }),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReputationController>(ReputationController);
    reputationService = module.get(ReputationService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return reputation profile for userId', async () => {
      const result = await controller.getProfile('u1');
      expect(result).toBeDefined();
      expect(reputationService.getReputationProfile).toHaveBeenCalledWith('u1');
    });

    it('should call service with correct userId', async () => {
      await controller.getProfile('user-abc');
      expect(reputationService.getReputationProfile).toHaveBeenCalledWith('user-abc');
    });

    it('should propagate service errors', async () => {
      reputationService.getReputationProfile.mockRejectedValue(new Error('not found'));
      await expect(controller.getProfile('bad')).rejects.toThrow('not found');
    });
  });
});
