const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
const STORAGE_KEY_SEAT_ID = "inomad.seatId";

// Ensure endpoint has leading slash
const normalizePath = (endpoint: string) => endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

export const api = {
  getSeatId: () => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(STORAGE_KEY_SEAT_ID);
  },

  setSeatId: (seatId: string) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY_SEAT_ID, seatId);
  },

  getHeaders: () => {
    const seatId = api.getSeatId();
    return {
      "Content-Type": "application/json",
      ...(seatId ? { "x-seat-id": seatId } : {}),
    };
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
