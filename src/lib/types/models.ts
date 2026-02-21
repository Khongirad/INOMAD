/**
 * Shared model types for the INOMAD KHURAL frontend.
 * Mirrors the Prisma schema enums and key model shapes
 * so API wrappers and pages share a single source of truth.
 */

// ============================================================
// COMMON
// ============================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiListParams {
  page?: number;
  limit?: number;
  search?: string;
}

// ============================================================
// DISPUTES
// ============================================================

export type DisputeSourceType = 'CONTRACT' | 'QUEST' | 'WORK_ACT';

export type DisputeStatus =
  | 'OPENED'
  | 'NEGOTIATING'
  | 'SETTLED'
  | 'COMPLAINT_FILED'
  | 'COURT_FILED';

export interface Dispute {
  id: string;
  partyAId: string;
  partyA: { id: string; username: string };
  partyBId: string;
  partyB: { id: string; username: string };
  sourceType: DisputeSourceType;
  sourceId: string;
  title: string;
  description: string;
  status: DisputeStatus;
  resolution?: string;
  conversationId?: string;
  complaintId?: string;
  courtCaseId?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { complaints: number };
}

export interface OpenDisputeDto {
  partyBId: string;
  sourceType: DisputeSourceType;
  sourceId: string;
  title: string;
  description: string;
}

// ============================================================
// COMPLAINTS
// ============================================================

export type ComplaintStatus =
  | 'FILED'
  | 'UNDER_REVIEW'
  | 'RESPONDED'
  | 'ESCALATED_L2'
  | 'ESCALATED_L3'
  | 'ESCALATED_L4'
  | 'ESCALATED_L5'
  | 'ESCALATED_L6'
  | 'IN_COURT'
  | 'RESOLVED'
  | 'DISMISSED';

export type ComplaintCategory =
  | 'SERVICE_QUALITY'
  | 'CORRUPTION'
  | 'RIGHTS_VIOLATION'
  | 'FINANCIAL_DISPUTE'
  | 'WORKPLACE'
  | 'GOVERNANCE'
  | 'OTHER';

export interface Complaint {
  id: string;
  filerId: string;
  filer: { id: string; username: string };
  targetUserId?: string;
  targetUser?: { id: string; username: string };
  targetOrgId?: string;
  sourceType: DisputeSourceType;
  sourceId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  currentLevel: number;
  status: ComplaintStatus;
  deadline?: string;
  resolution?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { responses: number; escalationHistory: number };
}

export interface FileComplaintDto {
  sourceType: DisputeSourceType;
  sourceId: string;
  category: ComplaintCategory;
  title: string;
  description: string;
  targetUserId?: string;
  targetOrgId?: string;
  evidence?: string[];
  disputeId?: string;
}

export interface ComplaintStats {
  total: number;
  filed: number;
  underReview: number;
  inCourt: number;
  resolved: number;
  byLevel: { level: number; name: string; count: number }[];
}

// ============================================================
// GUILDS / COOPERATIVES
// ============================================================

export type GuildType = 'CLAN' | 'PROFESSION' | 'ORGANIZATION' | 'GOVERNMENT';

export type MemberRole =
  | 'APPRENTICE'
  | 'MEMBER'
  | 'SECRETARY'
  | 'TREASURER'
  | 'OFFICER'
  | 'DEPUTY'
  | 'LEADER';

export interface Guild {
  id: string;
  name: string;
  type: GuildType;
  description?: string;
  leaderId: string;
  leader?: { id: string; username: string };
  memberCount: number;
  maxMembers: number;
  treasury: number;
  createdAt: string;
}

export interface GuildMember {
  id: string;
  userId: string;
  user: { id: string; username: string; seatId?: string };
  role: MemberRole;
  joinedAt: string;
}

// ============================================================
// KHURAL
// ============================================================

export type KhuralLevel = 'ARBAD' | 'ZUN' | 'MYANGAD' | 'TUMED';

export interface KhuralGroup {
  id: string;
  name: string;
  level: KhuralLevel;
  parentId?: string;
  seats: KhuralSeat[];
  children?: KhuralGroup[];
  memberCount: number;
  maxSeats: number;
  createdAt: string;
}

export interface KhuralSeat {
  index: number;
  userId?: string;
  user?: { id: string; username: string; seatId?: string };
  assignedAt?: string;
}

// ============================================================
// CHANCELLERY
// ============================================================

export interface ChancelleryContract {
  id: string;
  title: string;
  status: string;
  stage: string;
  parties: { userId: string; username: string; role: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface ChancelleryStats {
  totalContracts: number;
  activeContracts: number;
  totalDisputes: number;
  totalComplaints: number;
  pendingReview: number;
}

// ============================================================
// COURTS / JUSTICE
// ============================================================

export type CourtCaseStatus =
  | 'FILED'
  | 'HEARING_SCHEDULED'
  | 'IN_HEARING'
  | 'VERDICT_ISSUED'
  | 'ENFORCING'
  | 'CLOSED'
  | 'APPEALED';

export interface CourtCase {
  id: string;
  caseNumber: string;
  plaintiffId: string;
  plaintiff: { id: string; username: string };
  defendantId: string;
  defendant: { id: string; username: string };
  title: string;
  description: string;
  status: CourtCaseStatus;
  verdict?: string;
  judgeId?: string;
  judge?: { id: string; username: string };
  hearingDate?: string;
  filedAt: string;
  closedAt?: string;
  sourceComplaintId?: string;
  sourceDisputeId?: string;
}

export interface CourtCaseStats {
  total: number;
  filed: number;
  inHearing: number;
  verdictIssued: number;
  closed: number;
}

// ============================================================
// HIERARCHY / TERRITORY
// ============================================================

export type OrganizationType =
  | 'ARBAD'
  | 'ZUN'
  | 'MYANGAD'
  | 'TUMED'
  | 'REPUBLIC'
  | 'CONFEDERATION'
  | 'GUILD'
  | 'COOPERATIVE';

export type BranchType = 'LEGISLATIVE' | 'EXECUTIVE' | 'JUDICIAL' | 'BANKING';

export interface HierarchyNode {
  id: string;
  name: string;
  type: OrganizationType;
  branch?: BranchType;
  memberCount: number;
  maxMembers: number;
  leaderId?: string;
  leader?: { id: string; username: string };
  children: HierarchyNode[];
  ratings?: { overall: number; reputation: number };
}

export interface Territory {
  id: string;
  name: string;
  type: OrganizationType;
  size: number;
  population: number;
  status: 'ACTIVE' | 'FORMING' | 'INACTIVE';
  leader?: { id: string; username: string };
  children: Territory[];
}

// ============================================================
// SOVEREIGN FUND
// ============================================================

export interface FundInvestment {
  id: string;
  name: string;
  sector: string;
  amount: number;
  return: number;
  status: 'ACTIVE' | 'MATURED' | 'PENDING';
  startDate: string;
  maturityDate?: string;
}

export interface FundTransaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'DIVIDEND' | 'REINVEST';
  amount: number;
  description: string;
  createdAt: string;
}

export interface FundStats {
  totalBalance: number;
  activeInvestments: number;
  avgReturn: number;
  totalDividends: number;
}
