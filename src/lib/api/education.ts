import { api } from '../api';

// ==========================================
// TYPES
// ==========================================

export type EducationType = 'ELEMENTARY' | 'SECONDARY' | 'HIGHER' | 'PROFESSIONAL' | 'SPECIALTY';

export interface EducationVerification {
  id: string;
  userId: string;
  educationType: EducationType;
  institution: string;
  fieldOfStudy: string;
  startDate: Date;
  endDate?: Date;
  documentUrl?: string;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  recommenderId?: string;
  recommender?: {
    username: string;
    seatId?: string;
  };
  createdAt: Date;
}

export interface SubmitEducationDto {
  educationType: EducationType;
  institution: string;
  fieldOfStudy: string;
  startDate: string;
  endDate?: string;
  documentUrl?: string;
  recommenderId?: string;
}

export interface EducationSpecialist {
  userId: string;
  username: string;
  fieldOfStudy: string;
  verifiedCount: number;
}

// ==========================================
// API FUNCTIONS
// ==========================================

/**
 * Submit new education for verification
 */
export const submitEducation = async (data: SubmitEducationDto): Promise<EducationVerification> => {
  return api.post<EducationVerification>('/education/submit', data);
};

/**
 * Get my education records
 */
export const getMyEducations = async (): Promise<EducationVerification[]> => {
  return api.get<EducationVerification[]>('/education/my');
};

/**
 * Get education records for specific user
 */
export const getUserEducations = async (userId: string): Promise<EducationVerification[]> => {
  return api.get<EducationVerification[]>(`/education/user/${userId}`);
};

/**
 * Get pending education verifications (for specialists)
 */
export const getPendingEducations = async (): Promise<EducationVerification[]> => {
  return api.get<EducationVerification[]>('/education/pending');
};

/**
 * Verify education (specialist only)
 */
export const verifyEducation = async (id: string): Promise<EducationVerification> => {
  return api.post<EducationVerification>(`/education/verify/${id}`, {});
};

/**
 * Reject education verification (specialist only)
 */
export const rejectEducation = async (
  id: string,
  reason: string
): Promise<EducationVerification> => {
  return api.post<EducationVerification>(`/education/reject/${id}`, { reason });
};

/**
 * Get recommendations I've given
 */
export const getGivenRecommendations = async (): Promise<EducationVerification[]> => {
  return api.get<EducationVerification[]>('/education/recommendations/given');
};

/**
 * Get specialists by field of study
 */
export const getSpecialists = async (fieldOfStudy: string): Promise<EducationSpecialist[]> => {
  return api.get<EducationSpecialist[]>(`/education/specialists/${encodeURIComponent(fieldOfStudy)}`);
};

/**
 * Check if user has verified education in specific field
 */
export const checkEducation = async (
  userId: string,
  fieldOfStudy: string
): Promise<{ hasEducation: boolean; education?: EducationVerification }> => {
  return api.get<{ hasEducation: boolean; education?: EducationVerification }>(
    `/education/check/${userId}/${encodeURIComponent(fieldOfStudy)}`
  );
};
