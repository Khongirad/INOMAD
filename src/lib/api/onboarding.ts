import { api } from './client';

// Types
export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  xpReward: number;
  order: number;
}

export interface OnboardingProgress {
  userId: string;
  completedSteps: string[];
  totalXpEarned: number;
  isComplete: boolean;
  completionBonus?: number;
}

// API Functions

/** Get current user's onboarding progress */
export const getOnboardingProgress = () =>
  api.get<OnboardingProgress>('/onboarding/progress');

/** Complete an onboarding step */
export const completeOnboardingStep = (stepKey: string) =>
  api.post<{ ok: boolean; step: string; xpAwarded: number }>('/onboarding/complete-step', { stepKey });

/** Get all onboarding step definitions */
export const getOnboardingSteps = () =>
  api.get<OnboardingStep[]>('/onboarding/steps');
