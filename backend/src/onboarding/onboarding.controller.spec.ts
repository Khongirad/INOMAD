import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

describe('OnboardingController', () => {
  let controller: OnboardingController;
  let service: any;
  const req = { user: { id: 'u1' } };

  beforeEach(async () => {
    const mockService = {
      getProgress: jest.fn().mockResolvedValue({ completed: 3, total: 5 }),
      completeStep: jest.fn().mockResolvedValue({ completed: true }),
      getStepsDefinition: jest.fn().mockResolvedValue([]),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: mockService }],
    }).compile();
    controller = module.get(OnboardingController);
    service = module.get(OnboardingService);
  });

  it('should be defined', () => expect(controller).toBeDefined());
  it('getProgress', async () => { await controller.getProgress(req); expect(service.getProgress).toHaveBeenCalledWith('u1'); });
  it('completeStep', async () => { await controller.completeStep(req, { stepKey: 'profile' }); expect(service.completeStep).toHaveBeenCalledWith('u1', 'profile'); });
  it('getSteps', async () => { await controller.getSteps(); expect(service.getStepsDefinition).toHaveBeenCalled(); });
});
