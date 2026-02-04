import { api } from '../api';

// Types
export interface RegisterDto {
  username: string;
  password: string;
  familyName: string;
  clanName?: string;
  personalDetails?: any;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: {
    id: string;
    seatId: string;
    username: string;
    role: string;
    isLegalSubject: boolean;
    isVerified: boolean;
    walletAddress?: string;
  };
}

export interface ConstitutionResponse {
  accepted: boolean;
  acceptedAt?: Date;
}

// API Functions

/**
 * Register a new user
 */
export async function register(data: RegisterDto): Promise<AuthResponse> {
  const response: AuthResponse = await api.post('/auth/register', data);
  
  // Store token in localStorage
  if (response.access_token) {
    localStorage.setItem('token', response.access_token);
  }
  
  return response;
}

/**
 * Login with username and password
 */
export async function login(data: LoginDto): Promise<AuthResponse> {
  const response: AuthResponse = await api.post('/auth/login', data);
  
  // Store token in localStorage
  if (response.access_token) {
    localStorage.setItem('token', response.access_token);
  }
  
  return response;
}

/**
 * Accept the Constitution
 */
export async function acceptConstitution(): Promise<ConstitutionResponse> {
  return api.post('/identity/accept-constitution', {});
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
