/**
 * Auth Session Manager.
 *
 * Manages JWT access/refresh tokens for the political/identity layer.
 * These tokens authenticate identity (SeatSBT ownership) — NOT banking.
 */

const STORAGE_ACCESS_TOKEN = 'inomad_access_token';
const STORAGE_REFRESH_TOKEN = 'inomad_refresh_token';

export const AuthSession = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_ACCESS_TOKEN);
  },

  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(STORAGE_REFRESH_TOKEN);
  },

  setTokens: (accessToken: string, refreshToken: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_ACCESS_TOKEN, accessToken);
    window.localStorage.setItem(STORAGE_REFRESH_TOKEN, refreshToken);
  },

  clear: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_ACCESS_TOKEN);
    window.localStorage.removeItem(STORAGE_REFRESH_TOKEN);
  },

  isAuthenticated: (): boolean => {
    const token = AuthSession.getAccessToken();
    if (!token) return false;
    return !AuthSession.isExpired(token);
  },

  isExpired: (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  },

  getPayload: (): { sub: string; seatId: string; address: string; jti: string } | null => {
    const token = AuthSession.getAccessToken();
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch {
      return null;
    }
  },
};
