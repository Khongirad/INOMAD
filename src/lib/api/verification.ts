import { api } from './client';

// Types
export interface VerificationChainNode {
  username: string;
  role: string;
  verifiedAt: Date;
}

export interface VerifierStats {
  verificationCount: number;
  maxVerifications: number;
  remainingQuota: number;
  isUnlimited: boolean;
  verificationsGiven: Array<{
    id: string;
    verifiedUser: {
      id: string;
      username: string;
      verifiedAt: Date;
    };
    createdAt: Date;
  }>;
}

export interface PendingUser {
  id: string;
  seatId: string;
  username: string;
  createdAt: Date;
  constitutionAcceptedAt: Date;
}

// API Functions

/**
 * Get list of pending users awaiting verification
 */
export async function getPendingUsers(): Promise<PendingUser[]> {
  return api.get('/verification/pending');
}

/**
 * Verify a user with optional notes and location
 */
export async function verifyUser(
  userId: string,
  data?: { notes?: string; location?: string }
): Promise<any> {
  return api.post(`/verification/verify/${userId}`, data || {});
}

/**
 * Get verification chain for a user (path to Creator/Admin)
 */
export async function getVerificationChain(userId: string): Promise<VerificationChainNode[]> {
  return api.get(`/verification/chain/${userId}`);
}

/**
 * Get current user's verifier statistics
 */
export async function getMyVerifierStats(): Promise<VerifierStats> {
  return api.get('/verification/stats');
}

/**
 * Revoke a verification (Admin only)
 */
export async function revokeVerification(
  verificationId: string,
  reason: string
): Promise<{ success: boolean }> {
  return api.post(`/verification/revoke/${verificationId}`, { reason });
}
