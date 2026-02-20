import { api } from './client';
import { AuthSession } from '../auth/session';

// Types
export interface RegisterDto {
  username: string;
  password: string;
  familyName?: string;
  email?: string;
  clanName?: string;
  personalDetails?: any;
  // Census / demographic fields
  gender?: string;
  dateOfBirth?: string;
  ethnicity?: string[];
  birthPlace?: { city?: string; district?: string; country?: string };
  clan?: string;
  nationality?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: {
    userId: string;
    seatId: string;
    username: string;
    role: string;
    isLegalSubject: boolean;
    status?: string;
    walletStatus?: string;
    walletAddress?: string;
  };
}

export interface ConstitutionResponse {
  ok: boolean;
  hasAcceptedConstitution?: boolean;
  constitutionAcceptedAt?: Date;
  isLegalSubject?: boolean;
  message?: string;
}

// API Functions

/**
 * Register a new user
 */
export async function register(data: RegisterDto): Promise<AuthResponse> {
  const response: AuthResponse = await api.post('/auth/register', data);
  
  // Store tokens using AuthSession
  if (response.accessToken) {
    AuthSession.setTokens(response.accessToken, response.refreshToken || '');
  }
  
  return response;
}

/**
 * Login with username and password
 */
export async function login(data: LoginDto): Promise<AuthResponse> {
  const response: AuthResponse = await api.post('/auth/login-password', data);
  
  // Store tokens using AuthSession
  if (response.accessToken) {
    AuthSession.setTokens(response.accessToken, response.refreshToken || '');
  }
  
  return response;
}

/**
 * Accept Terms of Service
 */
export async function acceptTOS(): Promise<{ ok: boolean; hasAcceptedTOS?: boolean }> {
  return api.post('/auth/accept-tos', {});
}

/**
 * Accept the Constitution
 */
export async function acceptConstitution(): Promise<ConstitutionResponse> {
  return api.post('/auth/accept-constitution', {});
}

/**
 * Get current user's profile
 */
export async function getMyProfile(): Promise<AuthResponse['user']> {
  return api.get('/auth/profile');
}

/**
 * Logout (clear local token)
 */
export function logout(): void {
  localStorage.removeItem('token');
}

// ─── Account Recovery API ────────────────────────────────────────────────────

export interface RecoveryGuarantorDto {
  claimedUsername: string;
  claimedFullName: string;
  claimedBirthDate: string;     // YYYY-MM-DD
  claimedBirthCity?: string;
  guarantorSeatId: string;
  claimedPassportNumber?: string;
}

export interface RecoverySecretQuestionDto {
  claimedUsername: string;
  claimedFullName: string;
  claimedBirthDate: string;
  secretAnswer: string;
}

export interface RecoveryOfficialDto {
  claimedUsername: string;
  claimedFullName: string;
  claimedBirthDate: string;
  claimedBirthCity?: string;
  claimedPassportNumber: string;
  claimedPassportSeries?: string;
  claimedPassportIssuedBy?: string;
  officialServiceType: 'MIGRATION_SERVICE' | 'COUNCIL';
}

export interface RecoveryRequestResult {
  ok: boolean;
  requestId?: string;
  recoveryToken?: string;
  expiresAt?: string;
  message?: string;
}

/**
 * Get list of pre-defined secret questions
 */
export async function getSecretQuestions(): Promise<string[]> {
  const res = await api.get<{ ok: boolean; questions: string[] }>('/auth/recovery/questions');
  return res.questions;
}

/**
 * Set secret question for Path 2.1 recovery (call after profile creation)
 */
export async function setSecretQuestion(question: string, answer: string): Promise<{ ok: boolean }> {
  return api.post('/auth/set-secret-question', { question, answer });
}

/**
 * Request account recovery via guarantor (Path A)
 */
export async function requestRecoveryViaGuarantor(dto: RecoveryGuarantorDto): Promise<RecoveryRequestResult> {
  return api.post('/auth/recovery/via-guarantor', dto);
}

/**
 * Request account recovery via secret question (Path 2.1)
 * Returns a recovery token immediately if the answer is correct.
 */
export async function requestRecoveryViaSecretQuestion(dto: RecoverySecretQuestionDto): Promise<RecoveryRequestResult> {
  return api.post('/auth/recovery/via-secret-question', dto);
}

/**
 * Request account recovery via official organ (Path 2.2)
 */
export async function requestRecoveryViaOfficial(dto: RecoveryOfficialDto): Promise<RecoveryRequestResult> {
  return api.post('/auth/recovery/via-official', dto);
}

/**
 * Reset password using a one-time recovery token
 */
export async function resetPasswordViaToken(recoveryToken: string, newPassword: string): Promise<{ ok: boolean }> {
  return api.post('/auth/recovery/reset-password', { recoveryToken, newPassword });
}

/**
 * Guarantor confirms a recovery request (requires logged-in guarantor)
 */
export async function confirmAsGuarantor(requestId: string): Promise<{ ok: boolean; message: string }> {
  return api.post(`/auth/recovery/${requestId}/guarantor-confirm`, {});
}

