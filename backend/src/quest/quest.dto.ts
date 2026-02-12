import { QuestCategory } from '@prisma/client';

// ════════════════════════════════════
// CREATE
// ════════════════════════════════════

export class CreateQuestDto {
  title: string;
  description: string;
  objectives: Array<{ description: string }>;
  category: QuestCategory;
  rewardAltan: number;       // Mandatory > 0
  reputationGain?: number;   // Default 50
  deadline?: string;         // ISO date string
  estimatedDuration?: number; // Minutes
  organizationId?: string;
  requirements?: Record<string, any>;
  minReputation?: number;
}

// ════════════════════════════════════
// PROGRESS
// ════════════════════════════════════

export class UpdateProgressDto {
  objectives: Array<{ description: string; completed: boolean }>;
}

// ════════════════════════════════════
// SUBMIT
// ════════════════════════════════════

export class SubmitQuestDto {
  evidence: Array<{ type: string; url?: string; description?: string }>;
}

// ════════════════════════════════════
// APPROVE
// ════════════════════════════════════

export class ApproveQuestDto {
  rating: number;     // 1-5
  feedback?: string;
}

// ════════════════════════════════════
// REJECT
// ════════════════════════════════════

export class RejectQuestDto {
  feedback: string;
}
