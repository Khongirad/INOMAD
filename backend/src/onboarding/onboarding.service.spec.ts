import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: any;
  let gamification: any;

  const mockProgress = {
    userId: 'u1', constitutionRead: false, walletCreated: false,
    firstTransfer: false, arbanJoined: false, questCompleted: false,
    voteCast: false, currentStep: 0, totalSteps: 6, isComplete: false,
    completedAt: null, xpBonusClaimed: false,
  };

  beforeEach(async () => {
    const mockPrisma = {
      onboardingProgress: {
        findUnique: jest.fn().mockResolvedValue(mockProgress),
        create: jest.fn().mockResolvedValue(mockProgress),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({ ...mockProgress, ...data }),
        ),
      },
    };
    const mockGamification = {
      awardXP: jest.fn().mockResolvedValue({ xp: 20 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: GamificationService, useValue: mockGamification },
      ],
    }).compile();
    service = module.get(OnboardingService);
    prisma = module.get(PrismaService);
    gamification = module.get(GamificationService);
  });

  it('should be defined', () => expect(service).toBeDefined());

  describe('getProgress', () => {
    it('returns existing progress with steps', async () => {
      const r = await service.getProgress('u1');
      expect(r.steps).toHaveLength(6);
      expect(r.percentComplete).toBe(0);
    });
    it('creates progress if not exists', async () => {
      prisma.onboardingProgress.findUnique.mockResolvedValue(null);
      prisma.onboardingProgress.create.mockResolvedValue(mockProgress);
      const r = await service.getProgress('u1');
      expect(prisma.onboardingProgress.create).toHaveBeenCalled();
    });
  });

  describe('completeStep', () => {
    it('completes a step and awards XP', async () => {
      const r = await service.completeStep('u1', 'constitutionRead');
      expect(r.stepCompleted).toBe('constitutionRead');
      expect(r.xpAwarded).toBe(20);
      expect(gamification.awardXP).toHaveBeenCalled();
    });
    it('throws for unknown step', async () => {
      await expect(service.completeStep('u1', 'badStep')).rejects.toThrow('Unknown');
    });
    it('returns alreadyCompleted when step done', async () => {
      prisma.onboardingProgress.findUnique.mockResolvedValue({
        ...mockProgress, constitutionRead: true,
      });
      const r = await service.completeStep('u1', 'constitutionRead');
      expect(r.alreadyCompleted).toBe(true);
    });
    it('awards completion bonus when all steps done', async () => {
      prisma.onboardingProgress.findUnique.mockResolvedValue({
        ...mockProgress,
        constitutionRead: true, walletCreated: true, firstTransfer: true,
        arbanJoined: true, questCompleted: true, voteCast: false,
        xpBonusClaimed: false,
      });
      const r = await service.completeStep('u1', 'voteCast');
      expect(r.allComplete).toBe(true);
      // awardXP called for step + completion bonus
      expect(gamification.awardXP).toHaveBeenCalledTimes(2);
    });
    it('creates progress if not exists then completes', async () => {
      prisma.onboardingProgress.findUnique.mockResolvedValue(null);
      prisma.onboardingProgress.create.mockResolvedValue(mockProgress);
      const r = await service.completeStep('u1', 'walletCreated');
      expect(r.stepCompleted).toBe('walletCreated');
    });
  });

  describe('getStepsDefinition', () => {
    it('returns all 6 steps', () => {
      const steps = service.getStepsDefinition();
      expect(steps).toHaveLength(6);
      expect(steps[0].key).toBe('constitutionRead');
    });
  });
});
