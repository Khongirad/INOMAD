// ============ ZAGS (Civil Registry) Types ============

export type CivilStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED';

export type MarriageStatus =
  | 'PENDING_CONSENT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REGISTERED'
  | 'REJECTED'
  | 'CANCELLED';

export type DivorceStatus = 'FILED' | 'UNDER_REVIEW' | 'FINALIZED' | 'REJECTED';

export type ConsentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type CeremonyType = 'Civil' | 'Religious' | 'Traditional';

export type PropertyRegime = 'SEPARATE' | 'JOINT' | 'CUSTOM';

export interface Marriage {
  id: string;
  certificateNumber: string;
  spouse1Id: string;
  spouse2Id: string;
  spouse1FullName: string;
  spouse2FullName: string;
  spouse1DateOfBirth: Date;
  spouse2DateOfBirth: Date;
  marriageDate: Date;
  ceremonyLocation?: string;
  ceremonyType?: CeremonyType;
  witness1Name?: string;
  witness2Name?: string;
  witness1Id?: string;
  witness2Id?: string;
  propertyRegime?: PropertyRegime;
  propertyAgreement?: string;
  spouse1ConsentGranted?: boolean;
  spouse2ConsentGranted?: boolean;
  spouse1ConsentedAt?: Date;
  spouse2ConsentedAt?: Date;
  status: MarriageStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MarriageApplicationData {
  spouse2Id: string;
  spouse1FullName: string;
  spouse2FullName: string;
  spouse1DateOfBirth: string;
  spouse2DateOfBirth: string;
  marriageDate: string;
  ceremonyLocation?: string;
  ceremonyType?: CeremonyType;
  witness1Name?: string;
  witness2Name?: string;
  propertyRegime?: PropertyRegime;
}

export interface EligibilityResult {
  isEligible: boolean;
  currentStatus: CivilStatus;
  reason?: string;
}

export interface CertificateVerification {
  isValid: boolean;
  certificate?: {
    certificateNumber: string;
    type: 'MARRIAGE' | 'DIVORCE';
    issuedAt: Date;
  };
}

export interface Divorce {
  id: string;
  marriageId: string;
  filedById: string;
  reason: string;
  status: DivorceStatus;
  filedAt: Date;
  finalizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
