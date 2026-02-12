import { api } from './client';

// ============ Types ============

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

export interface Marriage {
  id: string;
  certificateNumber: string;
  
  // Spouses
  spouse1Id: string;
  spouse2Id: string;
  spouse1FullName: string;
  spouse2FullName: string;
  spouse1DateOfBirth: Date;
  spouse2DateOfBirth: Date;
  
  // Marriage details
  marriageDate: Date;
  ceremonyLocation?: string;
  ceremonyType?: 'Civil' | 'Religious' | 'Traditional';
  
  // Witnesses
  witness1Name?: string;
  witness2Name?: string;
  witness1Id?: string;
  witness2Id?: string;
  
  // Property regime
  propertyRegime?: 'SEPARATE' | 'JOINT' | 'CUSTOM';
  propertyAgreement?: string;
  
  // Consent tracking
  spouse1ConsentGranted?: boolean;
  spouse2ConsentGranted?: boolean;
  spouse1ConsentedAt?: Date;
  spouse2ConsentedAt?: Date;
  
  // Status
  status: MarriageStatus;
  
  // Registration
  registeredBy?: string;
  registeredAt?: Date;
  
  isPublic: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMarriageApplicationData {
  partnerId: string; // userId of partner
  spouse1FullName: string;
  spouse2FullName: string;
  spouse1DateOfBirth: string;
  spouse2DateOfBirth: string;
  marriageDate: string;
  ceremonyLocation?: string;
  ceremonyType?: 'Civil' | 'Religious' | 'Traditional';
  witness1Name?: string;
  witness2Name?: string;
  witness1Id?: string;
  witness2Id?: string;
  propertyRegime?: 'SEPARATE' | 'JOINT' | 'CUSTOM';
  propertyAgreement?: string;
}

export interface MarriageConsent {
  id: string;
  marriageId: string;
  userId: string;
  status: ConsentStatus;
  consentedAt?: Date;
  signature?: string;
  createdAt: Date;
}

export interface Divorce {
  id: string;
  marriageId: string;
  divorceCertificateNumber: string;
  initiatedBy: string;
  reason: string;
  status: DivorceStatus;
  finalizedDate?: Date;
  finalizedBy?: string;
  propertyDivision?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDivorceData {
  marriageId: string;
  reason: string;
  propertyDivision?: string;
}

export interface EligibilityCheck {
  isEligible: boolean;
  currentStatus: CivilStatus;
  reasons?: string[];
}

export interface CertificateVerification {
  isValid: boolean;
  certificateNumber: string;
  type: 'MARRIAGE' | 'DIVORCE';
  issuedDate?: Date;
  details?: {
    spouse1Name?: string;
    spouse2Name?: string;
    marriageDate?: Date;
  };
}

// ============ API Functions ============

/**
 * Check if user is eligible to marry
 */
export const checkMarriageEligibility = async (
  userId: string
): Promise<EligibilityCheck> => {
  const response = await api.get<EligibilityCheck>(
    `/zags/eligibility/${userId}`
  );
  return response;
};

/**
 * Create marriage application
 */
export const createMarriageApplication = async (
  data: CreateMarriageApplicationData
): Promise<Marriage> => {
  const response = await api.post<Marriage>('/zags/marriages', data);
  return response;
};

/**
 * Get current user's marriages
 */
export const getMyMarriages = async (): Promise<Marriage[]> => {
  const response = await api.get<Marriage[]>('/zags/marriages/me');
  return response;
};

/**
 * Get specific marriage by ID
 */
export const getMarriage = async (marriageId: string): Promise<Marriage> => {
  const response = await api.get<Marriage>(`/zags/marriages/${marriageId}`);
  return response;
};

/**
 * Get pending consents for current user
 */
export const getPendingConsents = async (): Promise<MarriageConsent[]> => {
  const response = await api.get<MarriageConsent[]>('/zags/consents/pending');
  return response;
};

/**
 * Grant or reject consent for marriage
 */
export const grantMarriageConsent = async (
  marriageId: string,
  approve: boolean,
  signature?: string
): Promise<Marriage> => {
  const response = await api.post<Marriage>(
    `/zags/marriages/${marriageId}/consent`,
    { approve, signature }
  );
  return response;
};

/**
 * File for divorce
 */
export const fileDivorce = async (data: CreateDivorceData): Promise<Divorce> => {
  const response = await api.post<Divorce>('/zags/divorces', data);
  return response;
};

/**
 * Get marriage certificate
 */
export const getMarriageCertificate = async (
  certificateNumber: string
): Promise<any> => {
  const response = await api.get(
    `/zags/certificates/${certificateNumber}`
  );
  return response;
};

/**
 * Verify certificate (public)
 */
export const verifyCertificate = async (
  certificateNumber: string
): Promise<CertificateVerification> => {
  const response = await api.get<CertificateVerification>(
    `/zags/certificates/${certificateNumber}/verify`
  );
  return response;
};

/**
 * Public certificate lookup (limited info)
 */
export const publicCertificateLookup = async (
  certificateNumber: string
): Promise<any> => {
  const response = await api.get(`/zags/public/${certificateNumber}`);
  return response;
};

/**
 * Get all marriages (Officer only)
 */
export const getAllMarriages = async (): Promise<Marriage[]> => {
  const response = await api.get<Marriage[]>('/zags/officer/marriages');
  return response;
};

/**
 * Get all pending marriages (Officer only)
 */
export const getPendingMarriages = async (): Promise<Marriage[]> => {
  const response = await api.get<Marriage[]>('/zags/marriages/pending/all');
  return response;
};

/**
 * Approve marriage application (Officer only)
 */
export const approveMarriage = async (
  marriageId: string,
  certificateNumber: string
): Promise<Marriage> => {
  const response = await api.post<Marriage>(
    `/zags/marriages/${marriageId}/approve`,
    { certificateNumber }
  );
  return response;
};

/**
 * Reject marriage application (Officer only)
 */
export const rejectMarriage = async (
  marriageId: string,
  notes: string
): Promise<Marriage> => {
  const response = await api.post<Marriage>(
    `/zags/marriages/${marriageId}/reject`,
    { notes }
  );
  return response;
};

/**
 * Register marriage (Officer only)
 */
export const registerMarriage = async (
  marriageId: string
): Promise<Marriage> => {
  const response = await api.post<Marriage>(
    `/zags/marriages/${marriageId}/register`
  );
  return response;
};

/**
 * Finalize divorce (Officer only)
 */
export const finalizeDivorce = async (divorceId: string): Promise<Divorce> => {
  const response = await api.post<Divorce>(
    `/zags/divorces/${divorceId}/finalize`
  );
  return response;
};

export default {
  checkMarriageEligibility,
  createMarriageApplication,
  getMyMarriages,
  getMarriage,
  getPendingConsents,
  grantMarriageConsent,
  fileDivorce,
  getMarriageCertificate,
  verifyCertificate,
  publicCertificateLookup,
  getPendingMarriages,
  registerMarriage,
  finalizeDivorce,
};
