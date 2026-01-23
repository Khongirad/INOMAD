import { AuthSession } from '@/lib/auth/session';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const STORAGE_KEY_SEAT_ID = "inomad.seatId";

// Ensure endpoint has leading slash
const normalizePath = (endpoint: string) => endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

export const api = {
  /** Legacy: get seat ID from localStorage */
  getSeatId: () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY_SEAT_ID);
  },

  /** Legacy: set seat ID in localStorage */
  setSeatId: (seatId: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY_SEAT_ID, seatId);
  },

  /**
   * Get request headers.
   * Uses JWT Bearer if authenticated, falls back to x-seat-id for legacy endpoints.
   */
  getHeaders: (): Record<string, string> => {
    const token = AuthSession.getAccessToken();

    if (token && !AuthSession.isExpired(token)) {
      return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      };
    }

    // Legacy fallback: x-seat-id header
    const seatId = api.getSeatId();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (seatId) {
      headers["x-seat-id"] = seatId;
    }
    return headers;
  },

  get: async <T>(endpoint: string): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${normalizePath(endpoint)}`, {
      method: "GET",
      headers: api.getHeaders(),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },

  post: async <T>(endpoint: string, body?: any): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${normalizePath(endpoint)}`, {
      method: "POST",
      headers: api.getHeaders(),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${res.status}`);
    }

    return res.json();
  },
};
