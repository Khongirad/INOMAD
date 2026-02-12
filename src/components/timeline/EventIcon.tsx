import {
  FileText,
  CheckCircle,
  XCircle,
  UserPlus,
  Shield,
  Trophy,
  DollarSign,
  Vote,
  Gavel,
  Calendar,
  Users,
  Scroll,
  Award,
  Briefcase,
} from 'lucide-react';

export type EventType =
  | 'ACCOUNT_CREATED' | 'IDENTITY_VERIFIED' | 'CITIZENSHIP_GRANTED'
  | 'DOCUMENT_CREATED' | 'DOCUMENT_SIGNED' | 'DOCUMENT_FINALIZED'
  | 'QUEST_CREATED' | 'QUEST_ACCEPTED' | 'QUEST_SUBMITTED' | 'QUEST_COMPLETED' | 'QUEST_REJECTED'
  | 'CONTRACT_SIGNED' | 'CONTRACT_COMPLETED' | 'CONTRACT_CANCELLED'
  | 'TASK_ASSIGNED' | 'TASK_COMPLETED' | 'TASK_REVIEWED'
  | 'LOAN_REQUESTED' | 'LOAN_APPROVED' | 'PAYMENT_MADE'
  | 'VOTE_CAST' | 'PROPOSAL_SUBMITTED' | 'LAW_ENACTED'
  | 'COURSE_COMPLETED' | 'CERTIFICATION_EARNED'
  | 'CASE_FILED' | 'JUDGMENT_RENDERED'
  | 'CUSTOM_EVENT';

interface EventIconProps {
  type: EventType;
  className?: string;
}

const iconMap: Record<EventType, any> = {
  // Identity & Verification
  ACCOUNT_CREATED: UserPlus,
  IDENTITY_VERIFIED: Shield,
  CITIZENSHIP_GRANTED: Award,

  // Documents
  DOCUMENT_CREATED: FileText,
  DOCUMENT_SIGNED: CheckCircle,
  DOCUMENT_FINALIZED: CheckCircle,

  // Quests
  QUEST_CREATED: Scroll,
  QUEST_ACCEPTED: Briefcase,
  QUEST_SUBMITTED: Trophy,
  QUEST_COMPLETED: Trophy,
  QUEST_REJECTED: XCircle,

  // Contracts
  CONTRACT_SIGNED: FileText,
  CONTRACT_COMPLETED: CheckCircle,
  CONTRACT_CANCELLED: XCircle,

  // Tasks
  TASK_ASSIGNED: Briefcase,
  TASK_COMPLETED: CheckCircle,
  TASK_REVIEWED: Award,

  // Banking
  LOAN_REQUESTED: DollarSign,
  LOAN_APPROVED: CheckCircle,
  PAYMENT_MADE: DollarSign,

  // Governance
  VOTE_CAST: Vote,
  PROPOSAL_SUBMITTED: Scroll,
  LAW_ENACTED: Gavel,

  // Education
  COURSE_COMPLETED: Award,
  CERTIFICATION_EARNED: Trophy,

  // Justice
  CASE_FILED: Gavel,
  JUDGMENT_RENDERED: Gavel,

  // Custom
  CUSTOM_EVENT: Calendar,
};

const colorMap: Record<EventType, string> = {
  // Identity - Purple
  ACCOUNT_CREATED: 'text-purple-400',
  IDENTITY_VERIFIED: 'text-purple-400',
  CITIZENSHIP_GRANTED: 'text-purple-400',

  // Documents - Blue
  DOCUMENT_CREATED: 'text-blue-400',
  DOCUMENT_SIGNED: 'text-blue-400',
  DOCUMENT_FINALIZED: 'text-green-400',

  // Quests - Gold
  QUEST_CREATED: 'text-gold-primary',
  QUEST_ACCEPTED: 'text-gold-primary',
  QUEST_SUBMITTED: 'text-yellow-400',
  QUEST_COMPLETED: 'text-green-400',
  QUEST_REJECTED: 'text-red-400',

  // Contracts - Blue
  CONTRACT_SIGNED: 'text-blue-400',
  CONTRACT_COMPLETED: 'text-green-400',
  CONTRACT_CANCELLED: 'text-red-400',

  // Tasks - Cyan
  TASK_ASSIGNED: 'text-cyan-400',
  TASK_COMPLETED: 'text-green-400',
  TASK_REVIEWED: 'text-cyan-400',

  // Banking - Green
  LOAN_REQUESTED: 'text-yellow-400',
  LOAN_APPROVED: 'text-green-400',
  PAYMENT_MADE: 'text-green-400',

  // Governance - Red
  VOTE_CAST: 'text-red-400',
  PROPOSAL_SUBMITTED: 'text-yellow-400',
  LAW_ENACTED: 'text-red-400',

  // Education - Orange
  COURSE_COMPLETED: 'text-orange-400',
  CERTIFICATION_EARNED: 'text-orange-400',

  // Justice - Red
  CASE_FILED: 'text-red-400',
  JUDGMENT_RENDERED: 'text-red-400',

  // Custom
  CUSTOM_EVENT: 'text-zinc-400',
};

export default function EventIcon({ type, className = 'w-5 h-5' }: EventIconProps) {
  const Icon = iconMap[type] || Calendar;
  const color = colorMap[type] || 'text-zinc-400';

  return <Icon className={`${className} ${color}`} />;
}
