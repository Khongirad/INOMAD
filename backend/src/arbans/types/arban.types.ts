/**
 * TypeScript types for Two-Type Arban System
 */

import { ArbanType, OrganizationType, PowerBranch } from '../../blockchain/abis/arbanCompletion.abi';
import { CreditType } from '../../blockchain/abis/arbanCreditLine.abi';

// ==================== FAMILY ARBAN ====================

export interface FamilyArban {
  arbanId: number;
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
  elderSeatId: string;
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
  memberSeatIds: string[];
  leaderSeatId: string;
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
  arbanId: number;
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
  seatId: string;
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
  seatId: string;
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
  husbandSeatId: string;
  wifeSeatId: string;
  privateKey?: string; // Optional - used for signing blockchain transactions
}

export interface RegisterMarriageResponse {
  arbanId: number;
  txHash: string;
}

// Child
export interface AddChildRequest {
  arbanId: number;
  childSeatId: string;
}

export interface ChangeHeirRequest {
  arbanId: number;
  newHeirSeatId: string;
}

// Khural
export interface SetKhuralRepRequest {
  arbanId: number;
  repSeatId: string;
  birthYear: number;
}

// Zun
export interface FormZunRequest {
  zunName: string;
  arbanIds: number[];
  privateKey?: string;
}

export interface FormZunResponse {
  zunId: number;
  txHash: string;
}

// Organizational Arban
export interface CreateOrgArbanRequest {
  name: string;
  orgType: OrganizationType | string;  // Accept both enum value and string name
  leaderSeatId?: string;
  privateKey?: string;
}

export interface CreateOrgArbanResponse {
  arbanId: number;
  txHash: string;
}

export interface AddOrgMemberRequest {
  arbanId: number;
  seatId: string;
}

export interface SetOrgLeaderRequest {
  arbanId: number;
  leaderSeatId: string;
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
