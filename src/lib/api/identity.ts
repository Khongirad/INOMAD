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
