import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { fetchCurrentUser, resolveLoginEmail } from '../lib/supabaseApi';
import { User, UserRole } from '../types/models';

export type { User, UserRole };

interface AuthContextType {
  user: User | null;
  login: (identifier: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  updateHours: (hours: number) => void;
  updateUser: (partial: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_CACHE_MS = 2000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetch = useRef<{ authId: string; user: User | null; at: number } | null>(null);

  const refreshUser = async (sessionUser?: { id: string } | null) => {
    let authId = sessionUser?.id;
    if (!authId) {
      const { data } = await supabase.auth.getSession();
      authId = data.session?.user?.id ?? null;
    }
    if (authId && lastFetch.current?.authId === authId && Date.now() - lastFetch.current.at < PROFILE_CACHE_MS) {
      setUser(lastFetch.current.user);
      return lastFetch.current.user;
    }
    const currentUser = await fetchCurrentUser(sessionUser ?? (authId ? { id: authId } : undefined));
    let resolvedUser = currentUser;
    if (resolvedUser) {
      const stored = localStorage.getItem(`intern_avatar_${resolvedUser.id}`);
      if (stored) resolvedUser = { ...resolvedUser, avatarUrl: stored };
    }
    if (authId) lastFetch.current = { authId, user: resolvedUser, at: Date.now() };
    else lastFetch.current = null;
    setUser(resolvedUser);
    return resolvedUser;
  };

  useEffect(() => {
    let alive = true;
    let initialized = false;

    const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return;
      if (session?.user) {
        await refreshUser(session.user);
      } else {
        // SIGNED_OUT or no session — clear user directly without any network call
        lastFetch.current = null;
        setUser(null);
      }
      if (!initialized && alive) {
        initialized = true;
        setLoading(false);
      }
    });

    // Safety fallback: if onAuthStateChange never fires, unblock loading after 3s
    const timeout = setTimeout(() => {
      if (!initialized && alive) {
        initialized = true;
        setLoading(false);
      }
    }, 3000);

    return () => {
      alive = false;
      clearTimeout(timeout);
      data.subscription.unsubscribe();
    };
  }, []);

  const login = async (identifier: string, password: string, role: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      const email = await resolveLoginEmail(identifier.trim(), role);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { success: false, error: error.message };
      // Use session we already have so we don't call getUser() again and avoid duplicate profile fetch
      const profile = await refreshUser(data?.user ?? undefined);
      if (!profile) return { success: false, error: 'Account profile not found. Please contact your administrator.' };
      if (profile.role !== role) return { success: false, error: `This account is not registered as ${role === 'admin' ? 'an administrator' : 'an intern'}. Please select the correct role.` };
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message ?? 'Login failed. Please try again.' };
    }
  };

  const logout = async () => {
    lastFetch.current = null;
    localStorage.removeItem('biometric_login_hint');
    setUser(null); // clear immediately so UI responds at once
    try {
      await supabase.auth.signOut(); // global scope — revokes server token
    } catch { /* ignore network errors */ }
  };

  const updateHours = (additional: number) => {
    if (user) setUser(prev => prev ? { ...prev, renderedHours: prev.renderedHours + additional } : null);
  };

  const updateUser = (partial: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...partial } : null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, updateHours, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
