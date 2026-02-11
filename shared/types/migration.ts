// ============ Migration Service Types ============

export type PassportType = 'STANDARD' | 'DIPLOMATIC' | 'SERVICE';

export type PassportApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ISSUED';

export type PassportDocumentType =
  | 'PHOTO'
  | 'BIRTH_CERTIFICATE'
  | 'OLD_PASSPORT'
  | 'PROOF_OF_CITIZENSHIP'
  | 'OTHER';

export interface PassportApplication {
  id: string;
  fullName: string;
  dateOfBirth: Date;
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
  passportType: PassportType;
  previousPassportNumber?: string;
  status: PassportApplicationStatus;
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
  passportType: PassportType;
  previousPassportNumber?: string;
}

export interface PassportLookupResult {
  exists: boolean;
  passport?: {
    passportNumber: string;
    fullName: string;
    issuedAt: Date;
    expiresAt: Date;
    status: string;
  };
}
