import api from './api';

// ============ Types ============

export interface PassportApplication {
  id: string;
  fullName: string;
  dateOfBirth: Date;
  placeOfBirth: string;
  nationality: string;
  sex: string;
  height?: number;
  eyeColor?: string;
  
  // Parents
  fatherName?: string;
  motherName?: string;
  
  // Address
  address: string;
  city: string;
  region: string;
  postalCode?: string;
  
  // Passport details
  passportType: 'STANDARD' | 'DIPLOMATIC' | 'SERVICE';
  previousPassportNumber?: string;
  
  // Status
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'ISSUED';
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  issuedPassportNumber?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePassportApplicationData {
  fullName: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  sex: string;
  height?: number;
  eyeColor?: string;
  fatherName?: string;
  motherName?: string;
  address: string;
  city: string;
  region: string;
  postalCode?: string;
  passportType: 'STANDARD' | 'DIPLOMATIC' | 'SERVICE';
  previousPassportNumber?: string;
}

export interface Document {
  id: string;
  applicationId: string;
  type: 'PHOTO' | 'SIGNATURE' | 'BIRTH_CERTIFICATE' | 'OTHER';
  filename: string;
  mimeType: string;
  size: number;
  isEncrypted: boolean;
  uploadedAt: Date;
}

export interface PassportLookupResult {
  exists: boolean;
  passportNumber?: string;
  fullName?: string;
  isValid?: boolean;
  expiresAt?: Date;
}

// ============ API Functions ============

/**
 * Create a new passport application (DRAFT status)
 */
export const createPassportApplication = async (
  data: CreatePassportApplicationData
): Promise<PassportApplication> => {
  const response = await api.post<PassportApplication>(
    '/migration-service/applications',
    data
  );
  return response;
};

/**
 * Submit passport application for review
 */
export const submitPassportApplication = async (
  applicationId: string
): Promise<PassportApplication> => {
  const response = await api.post<PassportApplication>(
    `/migration-service/applications/${applicationId}/submit`
  );
  return response;
};

/**
 * Get current user's passport applications
 */
export const getMyPassportApplications = async (): Promise<PassportApplication[]> => {
  const response = await api.get<PassportApplication[]>(
    '/migration-service/applications/me'
  );
  return response;
};

/**
 * Get specific passport application by ID
 */
export const getPassportApplication = async (
  applicationId: string
): Promise<PassportApplication> => {
  const response = await api.get<PassportApplication>(
    `/migration-service/applications/${applicationId}`
  );
  return response;
};

/**
 * Upload document for passport application
 */
export const uploadPassportDocument = async (
  applicationId: string,
  file: File,
  type: 'PHOTO' | 'SIGNATURE' | 'BIRTH_CERTIFICATE' | 'OTHER'
): Promise<Document> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  const response = await api.post<Document>(
    `/migration-service/applications/${applicationId}/documents`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response;
};

/**
 * Get documents for passport application
 */
export const getPassportDocuments = async (
  applicationId: string
): Promise<Document[]> => {
  const response = await api.get<Document[]>(
    `/migration-service/applications/${applicationId}/documents`
  );
  return response;
};

/**
 * Public passport lookup (limited data)
 */
export const lookupPassport = async (
  passportNumber: string
): Promise<PassportLookupResult> => {
  const response = await api.get<PassportLookupResult>(
    `/migration-service/lookup/${passportNumber}`
  );
  return response;
};

// ============ Officer Functions (Admin) ============

/**
 * Get all passport applications (Officer only)
 */
export const getAllPassportApplications = async (): Promise<PassportApplication[]> => {
  const response = await api.get<PassportApplication[]>(
    '/migration-service/officer/applications'
  );
  return response;
};

/**
 * Get all pending passport applications (Officer only)
 */
export const getPendingApplications = async (): Promise<PassportApplication[]> => {
  const response = await api.get<PassportApplication[]>(
    '/migration-service/applications'
  );
  return response;
};

/**
 * Review passport application (Officer only)
 */
export const reviewPassportApplication = async (
  applicationId: string,
  decision: 'APPROVE' | 'REJECT',
  notes?: string,
  passportNumber?: string
): Promise<PassportApplication> => {
  const response = await api.put<PassportApplication>(
    `/migration-service/applications/${applicationId}/review`,
    { decision, notes, passportNumber }
  );
  return response;
};

export default {
  createPassportApplication,
  submitPassportApplication,
  getMyPassportApplications,
  getPassportApplication,
  uploadPassportDocument,
  getPassportDocuments,
  lookupPassport,
  getPendingApplications,
  reviewPassportApplication,
};
