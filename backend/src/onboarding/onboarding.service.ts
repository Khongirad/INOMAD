import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GamificationService } from '../gamification/gamification.service';

/**
 * Onboarding steps definition with XP rewards.
 */
const ONBOARDING_STEPS = [
  {
    index: 0,
    key: 'constitutionRead',
    name: 'Прочитать Конституцию',
    description: 'Ознакомьтесь с Конституцией INOMAD KHURAL',
    icon: '📜',
    xpReward: 20,
  },
  {
    index: 1,
    key: 'walletCreated',
    name: 'Создать Кошелёк',
    description: 'Активируйте ваш цифровой кошелёк ALTAN',
    icon: '💳',
    xpReward: 20,
  },
  {
    index: 2,
    key: 'firstTransfer',
    name: 'Первый Перевод',
    description: 'Совершите первую P2P транзакцию',
    icon: '💸',
    xpReward: 25,
  },
  {
    index: 3,
    key: 'arbadJoined',
    name: 'Вступить в Арбан',
    description: 'Присоединитесь к Арбану (ячейка из 10 граждан)',
    icon: '🐴',
    xpReward: 30,
  },
  {
    index: 4,
    key: 'questCompleted',
    name: 'Выполнить Квест',
    description: 'Возьмите и выполните первый квест',
    icon: '⚔️',
    xpReward: 30,
  },
  {
    index: 5,
    key: 'voteCast',
    name: 'Проголосовать',
    description: 'Примите участие в голосовании Хурала',
    icon: '🗳️',
    xpReward: 25,
  },
];

const COMPLETION_BONUS_XP = 100;

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gamificationService: GamificationService,
  ) {}

  /**
   * Get or create onboarding progress for a user.
   */
  async getProgress(userId: string) {
    let progress = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await this.prisma.onboardingProgress.create({
        data: { userId },
      });
    }

    // Build step-by-step status
    const steps = ONBOARDING_STEPS.map((step) => ({
      ...step,
      completed: (progress as any)[step.key] as boolean,
    }));

    return {
      ...progress,
      steps,
      percentComplete: Math.round(
        (progress.currentStep / progress.totalSteps) * 100,
      ),
    };
  }

  /**
   * Mark a step as completed and award XP.
   */
  async completeStep(
    userId: string,
    stepKey: string,
  ) {
    const step = ONBOARDING_STEPS.find((s) => s.key === stepKey);
    if (!step) {
      throw new NotFoundException(`Unknown onboarding step: ${stepKey}`);
    }

    let progress = await this.prisma.onboardingProgress.findUnique({
      where: { userId },
    });

    if (!progress) {
      progress = await this.prisma.onboardingProgress.create({
        data: { userId },
      });
    }

    // Already completed?
    if ((progress as any)[stepKey]) {
      return { alreadyCompleted: true, progress: await this.getProgress(userId) };
    }

    // Mark step complete
    const completedCount = ONBOARDING_STEPS.filter(
      (s) => s.key === stepKey || (progress as any)[s.key],
    ).length;

    const allComplete = completedCount >= ONBOARDING_STEPS.length;

    const updated = await this.prisma.onboardingProgress.update({
      where: { userId },
      data: {
        [stepKey]: true,
        currentStep: completedCount,
        isComplete: allComplete,
        completedAt: allComplete ? new Date() : undefined,
      },
    });

    // Award XP for the step
    await this.gamificationService.awardXP(userId, 'DAILY_LOGIN', {
      amount: step.xpReward,
      reason: `Онбординг: ${step.name}`,
      sourceId: `onboarding:${stepKey}`,
    });

    // Award completion bonus if all steps done
    if (allComplete && !progress.xpBonusClaimed) {
      await this.prisma.onboardingProgress.update({
        where: { userId },
        data: { xpBonusClaimed: true },
      });

      await this.gamificationService.awardXP(userId, 'ACHIEVEMENT_EARNED', {
        amount: COMPLETION_BONUS_XP,
        reason: 'Онбординг завершён — бонус!',
        sourceId: 'onboarding:complete',
      });

      this.logger.log(`🎓 User ${userId} completed onboarding!`);
    }

    return {
      stepCompleted: stepKey,
      xpAwarded: step.xpReward,
      allComplete,
      progress: await this.getProgress(userId),
    };
  }

  /**
   * Get the list of all onboarding steps (for frontend rendering).
   */
  getStepsDefinition() {
    return ONBOARDING_STEPS;
  }
}
