/**
 * TypeScript types for Two-Type Arban System
 */

import { ArbanType, OrganizationType, PowerBranch } from '../../blockchain/abis/arbanCompletion.abi';
import { CreditType } from '../../blockchain/abis/arbanCreditLine.abi';

// ==================== FAMILY ARBAN ====================

export interface FamilyArban {
  arbanId: number;
  husbandSeatId: number;
  wifeSeatId: number;
  childrenSeatIds: number[];
  heirSeatId: number;
  zunId: number;
  khuralRepSeatId: number;
  khuralRepBirthYear: number;
  isActive: boolean;
  createdAt: Date;
}

export interface FamilyArbanWithNames extends FamilyArban {
  husbandName?: string;
  wifeName?: string;
  childrenNames?: string[];
  heirName?: string;
  khuralRepName?: string;
}

export interface FamilyTree {
  arban: FamilyArbanWithNames;
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
  founderArbanId: number;
  memberArbanIds: number[];
  elderSeatId: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ZunInfo extends Zun {
  founderArban?: FamilyArbanWithNames;
  memberArbans?: FamilyArbanWithNames[];
  elder?: CitizenInfo;
}

export interface ClanTree {
  zun: ZunInfo;
  founder: FamilyArbanWithNames;
  members: FamilyArbanWithNames[];
  elder: CitizenInfo | null;
}

// ==================== ORGANIZATIONAL ARBAN ====================

export interface OrganizationalArban {
  arbanId: number;
  name: string;
  memberSeatIds: number[];
  leaderSeatId: number;
  orgType: OrganizationType;
  powerBranch: PowerBranch;
  parentOrgId: number;
  isActive: boolean;
  createdAt: Date;
}

export interface OrganizationalArbanWithNames extends OrganizationalArban {
  leaderName?: string;
  memberNames?: string[];
  parentOrgName?: string;
}

export interface OrgChart {
  org: OrganizationalArbanWithNames;
  leader: CitizenInfo | null;
  members: CitizenInfo[];
  departments: OrganizationalArbanWithNames[];
  parent: OrganizationalArbanWithNames | null;
}

// ==================== CREDIT ====================

export interface CreditLine {
  arbanId: number;
  creditType: CreditType;
  creditRating: number; // 0-1000
  creditLimit: bigint;
  borrowed: bigint;
  available: bigint;
  totalBorrowed: bigint;
  totalRepaid: bigint;
  defaultCount: number;
  onTimeCount: number;
  isActive: boolean;
  openedAt: Date;
}

export interface Loan {
  loanId: number;
  arbanId: number;
  creditType: CreditType;
  principal: bigint;
  interest: bigint;
  totalDue: bigint;
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
  seatId: number;
  accountId: number;
  tier: 1 | 2 | 3;
  arbanType: ArbanType;
  arbanId: number;
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
  seatId: number;
  address: string;
  name?: string;
  birthYear?: number;
  age?: number;
  arbanType?: ArbanType;
  arbanId?: number;
  isMarried: boolean;
  isKhuralRep: boolean;
}

// ==================== KHURAL ====================

export interface KhuralRepresentative {
  seatId: number;
  arbanId: number;
  name?: string;
  birthYear: number;
  age: number;
  assignedAt: Date;
  arban?: FamilyArbanWithNames;
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
  husbandSeatId: number;
  wifeSeatId: number;
}

export interface RegisterMarriageResponse {
  arbanId: number;
  txHash: string;
}

// Child
export interface AddChildRequest {
  arbanId: number;
  childSeatId: number;
}

export interface ChangeHeirRequest {
  arbanId: number;
  newHeirSeatId: number;
}

// Khural
export interface SetKhuralRepRequest {
  arbanId: number;
  repSeatId: number;
  birthYear: number;
}

// Zun
export interface FormZunRequest {
  zunName: string;
  arbanIds: number[];
}

export interface FormZunResponse {
  zunId: number;
  txHash: string;
}

// Organizational Arban
export interface CreateOrgArbanRequest {
  name: string;
  orgType: OrganizationType;
}

export interface CreateOrgArbanResponse {
  arbanId: number;
  txHash: string;
}

export interface AddOrgMemberRequest {
  arbanId: number;
  seatId: number;
}

export interface SetOrgLeaderRequest {
  arbanId: number;
  leaderSeatId: number;
}

export interface CreateDepartmentRequest {
  parentOrgId: number;
  deptName: string;
}

// Credit
export interface OpenCreditLineRequest {
  arbanId: number;
  creditType: 'FAMILY' | 'ORG';
}

export interface BorrowRequest {
  arbanId: number;
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
  arbanId: number;
  creditType: 'FAMILY' | 'ORG';
  loanIdx: number;
}

// Distribution
export interface RequestDistributionRequest {
  seatId: number;
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
