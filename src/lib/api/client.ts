import { AuthSession } from '@/lib/auth/session';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// Ensure endpoint has leading slash
const normalizePath = (endpoint: string) => endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

/**
 * Refresh the access token using the refresh token
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const refreshToken = AuthSession.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    if (data.accessToken && data.refreshToken) {
      AuthSession.setTokens(data.accessToken, data.refreshToken);
      return true;
    }

    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Make a fetch request with automatic token refresh on 401
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOnAuth = true
): Promise<Response> {
  const response = await fetch(url, options);

  // If 401 and we haven't retried yet, attempt token refresh
  if (response.status === 401 && retryOnAuth) {
    const refreshed = await refreshAccessToken();
    
    if (refreshed) {
      // Retry with new token
      const newHeaders = api.getHeaders();
      const retryOptions = {
        ...options,
        headers: { ...options.headers, ...newHeaders },
      };
      return fetch(url, retryOptions); // Don't retry again
    } else {
      // Refresh failed, clear auth and redirect to login
      if (typeof window !== 'undefined') {
        AuthSession.clear();
        window.location.href = '/login';
      }
    }
  }

  return response;
}

export const api = {
  /**
   * Get request headers with JWT Bearer token.
   * Legacy x-seat-id header removed - JWT-only authentication.
   */
  getHeaders: (): Record<string, string> => {
    const token = AuthSession.getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token && !AuthSession.isExpired(token)) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  },

  get: async <T>(endpoint: string): Promise<T> => {
    const res = await fetchWithRetry(
      `${API_BASE_URL}${normalizePath(endpoint)}`,
      {
        method: "GET",
        headers: api.getHeaders(),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },

  post: async <T>(endpoint: string, body?: any): Promise<T> => {
    const res = await fetchWithRetry(
      `${API_BASE_URL}${normalizePath(endpoint)}`,
      {
        method: "POST",
        headers: api.getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },

  put: async <T>(endpoint: string, body?: any): Promise<T> => {
    const res = await fetchWithRetry(
      `${API_BASE_URL}${normalizePath(endpoint)}`,
      {
        method: "PUT",
        headers: api.getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },

  patch: async <T>(endpoint: string, body?: any): Promise<T> => {
    const res = await fetchWithRetry(
      `${API_BASE_URL}${normalizePath(endpoint)}`,
      {
        method: "PATCH",
        headers: api.getHeaders(),
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },

  delete: async <T>(endpoint: string): Promise<T> => {
    const res = await fetchWithRetry(
      `${API_BASE_URL}${normalizePath(endpoint)}`,
      {
        method: "DELETE",
        headers: api.getHeaders(),
      }
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },
};
