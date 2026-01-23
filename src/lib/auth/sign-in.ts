import { AuthSession } from './session';
import { EmbeddedWallet } from '@/lib/wallet/embedded';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuthVerifyResponse {
  ok: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthMeResponse {
  ok: boolean;
  me: {
    userId: string;
    seatId: string;
    address: string;
    roles: string[];
    status: string;
    walletStatus: string;
    hasBankLink: boolean;
    bankCode: string | null;
  };
}

/**
 * Sign in with wallet signature.
 *
 * Flow:
 * 1. Unlock embedded wallet with PIN
 * 2. Request nonce from backend
 * 3. Sign message: "Sign in to INOMAD: ${nonce}"
 * 4. Send signature to backend for verification
 * 5. Store JWT tokens in session
 */
export async function signIn(password: string): Promise<AuthMeResponse['me']> {
  // 1. Unlock wallet
  const wallet = await EmbeddedWallet.unlock(password);
  const address = wallet.address;

  // 2. Request nonce
  const nonceRes = await fetch(`${API_BASE_URL}/auth/nonce`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });

  if (!nonceRes.ok) {
    const err = await nonceRes.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to request nonce');
  }

  const { nonce, message } = await nonceRes.json();

  // 3. Sign the message
  const signature = await wallet.signMessage(message);

  // 4. Verify with backend
  const verifyRes = await fetch(`${API_BASE_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature, nonce }),
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json().catch(() => ({}));
    throw new Error(err.message || 'Signature verification failed');
  }

  const data: AuthVerifyResponse = await verifyRes.json();

  // 5. Store tokens
  AuthSession.setTokens(data.accessToken, data.refreshToken);

  // 6. Fetch identity
  const me = await getMe();
  return me;
}

/**
 * Get current user identity from /auth/me.
 * Returns ONLY identity data — NO financial information.
 */
export async function getMe(): Promise<AuthMeResponse['me']> {
  const token = AuthSession.getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      // Try refresh
      const refreshed = await refreshSession();
      if (!refreshed) {
        AuthSession.clear();
        throw new Error('Session expired');
      }
      return getMe(); // Retry with new token
    }
    throw new Error('Failed to fetch identity');
  }

  const data: AuthMeResponse = await res.json();
  return data.me;
}

/**
 * Refresh the access token.
 */
export async function refreshSession(): Promise<boolean> {
  const refreshToken = AuthSession.getRefreshToken();
  if (!refreshToken) return false;

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) return false;

  const data = await res.json();
  AuthSession.setTokens(data.accessToken, data.refreshToken);
  return true;
}

/**
 * Sign out — revoke current session.
 */
export async function signOut(): Promise<void> {
  const token = AuthSession.getAccessToken();
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  AuthSession.clear();
}

/**
 * Sign out all sessions.
 */
export async function signOutAll(): Promise<void> {
  const token = AuthSession.getAccessToken();
  if (token) {
    await fetch(`${API_BASE_URL}/auth/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  AuthSession.clear();
}
