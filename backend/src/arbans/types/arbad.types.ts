/**
 * TypeScript types for Two-Type Arbad System
 */

import { ArbadType, OrganizationType, PowerBranch } from '../../blockchain/abis/arbadCompletion.abi';
import { CreditType } from '../../blockchain/abis/arbadCreditLine.abi';

// ==================== FAMILY ARBAD ====================

export interface FamilyArbad {
  arbadId: number;
  husbandSeatId: string;
  wifeSeatId: string;
  childrenSeatIds: string[];
  heirSeatId: string;
  zunId: number;
  khuralRepSeatId: string;
  khuralRepBirthYear: number;
  isActive: boolean;
  createdAt: Date;
}

export interface FamilyArbadWithNames extends FamilyArbad {
  husbandName?: string;
  wifeName?: string;
  childrenNames?: string[];
  heirName?: string;
  khuralRepName?: string;
}

export interface FamilyTree {
  arbad: FamilyArbadWithNames;
  parents: {
    husband: CitizenInfo;
    wife: CitizenInfo;
  };
  children: CitizenInfo[];
  heir: CitizenInfo | null;
  khuralRep: CitizenInfo | null;
  zun?: ZunInfo;
}

// ==================== ZUN (CLAN) ====================

export interface Zun {
  zunId: number;
  name: string;
  founderArbadId: number;
  memberArbadIds: number[];
  elderSeatId: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ZunInfo extends Zun {
  founderArbad?: FamilyArbadWithNames;
  memberArbads?: FamilyArbadWithNames[];
  elder?: CitizenInfo;
}

export interface ClanTree {
  zun: ZunInfo;
  founder: FamilyArbadWithNames;
  members: FamilyArbadWithNames[];
  elder: CitizenInfo | null;
}

// ==================== ORGANIZATIONAL ARBAD ====================

export interface OrganizationalArbad {
  arbadId: number;
  name: string;
  memberSeatIds: string[];
  leaderSeatId: string;
  orgType: OrganizationType;
  powerBranch: PowerBranch;
  parentOrgId: number;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationalArbadWithNames extends OrganizationalArbad {
  leaderName?: string;
  memberNames?: string[];
  parentOrgName?: string;
}

export interface OrgChart {
  org: OrganizationalArbadWithNames;
  leader: CitizenInfo | null;
  members: CitizenInfo[];
  departments: OrganizationalArbadWithNames[];
  parent: OrganizationalArbadWithNames | null;
}

// ==================== CREDIT ====================

export interface CreditLine {
  arbadId: number;
  creditType: CreditType;
  creditRating: number; // 0-1000
  creditLimit: string;  // Changed to string for JSON serialization
  borrowed: string;
  available: string;
  totalBorrowed: string;
  totalRepaid: string;
  defaultCount: number;
  onTimeCount: number;
  isActive: boolean;
  openedAt: Date;
}

export interface Loan {
  loanId: number;
  arbadId: number;
  creditType: CreditType;
  principal: string;  // Changed to string for JSON serialization
  interest: string;
  totalDue: string;
  dueDate: Date;
  borrowedAt: Date;
  repaidAt: Date | null;
  isActive: boolean;
  isDefaulted: boolean;
}

export interface CreditDashboard {
  creditLine: CreditLine;
  activeLoans: Loan[];
  loanHistory: Loan[];
  performance: {
    onTimeRate: number; // percentage
    defaultRate: number; // percentage
    avgRepaymentDays: number;
  };
}

// ==================== TIER DISTRIBUTION ====================

export interface TierDistribution {
  seatId: string;
  accountId: number;
  tier: 1 | 2 | 3;
  arbadType: ArbadType;
  arbadId: number;
  amount: bigint;
  requestedAt: Date;
  approved: boolean;
  rejected: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  rejectedBy?: string;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface TierStatus {
  tier1: {
    eligible: boolean;
    received: boolean;
    amount: bigint;
  };
  tier2: {
    eligible: boolean;
    received: boolean;
    amount: bigint;
    requirementMet: string; // e.g., "Has children" or "10+ members"
  };
  tier3: {
    eligible: boolean;
    received: boolean;
    amount: bigint;
    requirementMet: string; // e.g., "Married (Khural eligible)" or "Leader elected"
  };
}

// ==================== CITIZEN INFO ====================

export interface CitizenInfo {
  seatId: string;
  address: string;
  name?: string;
  birthYear?: number;
  age?: number;
  arbadType?: ArbadType;
  arbadId?: number;
  isMarried: boolean;
  isKhuralRep: boolean;
}

// ==================== KHURAL ====================

export interface KhuralRepresentative {
  seatId: string;
  arbadId: number;
  name?: string;
  birthYear: number;
  age: number;
  assignedAt: Date;
  arbad?: FamilyArbadWithNames;
}

export interface KhuralMembership {
  totalSeats: number;
  representatives: KhuralRepresentative[];
  byProvince?: Record<number, KhuralRepresentative[]>;
  chairman?: KhuralRepresentative;
}

// ==================== EKHE KHURAL ====================

export interface EkheKhuralDelegate {
  nationId: string;
  delegateReps: KhuralRepresentative[]; // 10 reps per nation
  chairman: KhuralRepresentative;
}

export interface EkheKhuralSession {
  ekheKhuralId: number;
  sessionDate: Date;
  delegates: EkheKhuralDelegate[];
  agenda: string[];
}

// ==================== REQUEST/RESPONSE TYPES ====================

// Marriage
export interface RegisterMarriageRequest {
  husbandSeatId: string;
  wifeSeatId: string;
  privateKey?: string; // Optional - used for signing blockchain transactions
}

export interface RegisterMarriageResponse {
  arbadId: number;
  txHash: string;
}

// Child
export interface AddChildRequest {
  arbadId: number;
  childSeatId: string;
}

export interface ChangeHeirRequest {
  arbadId: number;
  newHeirSeatId: string;
}

// Khural
export interface SetKhuralRepRequest {
  arbadId: number;
  repSeatId: string;
  birthYear: number;
}

// Zun
export interface FormZunRequest {
  zunName: string;
  arbadIds: number[];
  privateKey?: string;
}

export interface FormZunResponse {
  zunId: number;
  txHash: string;
}

// Organizational Arbad
export interface CreateOrgArbadRequest {
  name: string;
  orgType: OrganizationType | string;  // Accept both enum value and string name
  leaderSeatId?: string;
  privateKey?: string;
}

export interface CreateOrgArbadResponse {
  arbadId: number;
  txHash: string;
}

export interface AddOrgMemberRequest {
  arbadId: number;
  seatId: string;
}

export interface SetOrgLeaderRequest {
  arbadId: number;
  leaderSeatId: string;
}

export interface CreateDepartmentRequest {
  parentOrgId: number;
  deptName: string;
}

// Credit
export interface OpenCreditLineRequest {
  arbadId: number;
  creditType: 'FAMILY' | 'ORG';
}

export interface BorrowRequest {
  arbadId: number;
  creditType: 'FAMILY' | 'ORG';
  amount: string; // bigint as string
  durationDays: number;
}

export interface BorrowResponse {
  loanId: number;
  principal: string;
  interest: string;
  totalDue: string;
  dueDate: Date;
  txHash: string;
}

export interface RepayLoanRequest {
  arbadId: number;
  creditType: 'FAMILY' | 'ORG';
  loanIdx: number;
}

// Distribution
export interface RequestDistributionRequest {
  seatId: string;
  accountId: number;
  tier: 2 | 3;
}

export interface ApproveDistributionRequest {
  pendingIdx: number;
}

export interface RejectDistributionRequest {
  pendingIdx: number;
  reason: string;
}
