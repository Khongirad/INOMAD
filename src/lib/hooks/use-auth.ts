'use client';

import { useState, useEffect, useCallback } from 'react';
import { AuthSession } from '@/lib/auth/session';
import { getMe, signIn, signOut } from '@/lib/auth/sign-in';
import { api } from '@/lib/api';

interface AuthUser {
  userId: string;
  seatId: string;
  address: string;
  role: string;  // Single role (CITIZEN, LEADER, ADMIN, CREATOR)
  roles: string[];  // For backward compatibility
  status: string;
  walletStatus: string;
  hasBankLink: boolean;
  bankCode: string | null;
}

/**
 * useAuth hook.
 *
 * Manages the political/identity authentication layer.
 * Returns ONLY identity data — NEVER financial information.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    if (!AuthSession.isAuthenticated()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const me = await getMe();
      setUser(me);
      setError(null);
      if (me.seatId) api.setSeatId(me.seatId);
    } catch (e: any) {
      setUser(null);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const login = async (password: string) => {
    setLoading(true);
    setError(null);
    try {
      const me = await signIn(password);
      setUser(me);
      if (me.seatId) api.setSeatId(me.seatId);
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('inomad.seatId');
    }
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    token: AuthSession.getAccessToken(),
    login,
    logout,
    refresh: fetchMe,
  };
}
