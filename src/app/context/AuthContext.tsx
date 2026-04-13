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
const AUTH_PROFILE_CACHE_KEY = 'auth_profile_cache_v1';

function readBiometricHint(): { refreshToken: string; role: UserRole } | null {
  try {
    const raw = localStorage.getItem('biometric_login_hint');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { refreshToken?: string; role?: UserRole };
    if (!parsed?.refreshToken || !parsed?.role) return null;
    return { refreshToken: parsed.refreshToken, role: parsed.role };
  } catch {
    return null;
  }
}

function writeBiometricHint(refreshToken: string, role: UserRole) {
  localStorage.setItem('biometric_login_hint', JSON.stringify({ refreshToken, role }));
}

function readCachedProfile(authId: string): User | null {
  try {
    const raw = localStorage.getItem(AUTH_PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { authId?: string; user?: User };
    if (parsed?.authId !== authId || !parsed.user) return null;
    return parsed.user;
  } catch {
    return null;
  }
}

function writeCachedProfile(authId: string, user: User | null) {
  if (!user) return;
  localStorage.setItem(AUTH_PROFILE_CACHE_KEY, JSON.stringify({ authId, user }));
}

function clearCachedProfile() {
  localStorage.removeItem(AUTH_PROFILE_CACHE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
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
    if (!resolvedUser && authId) {
      resolvedUser = readCachedProfile(authId);
    }
    if (resolvedUser) {
      const stored = localStorage.getItem(`intern_avatar_${resolvedUser.id}`);
      if (stored) resolvedUser = { ...resolvedUser, avatarUrl: stored };
    }
    if (authId && resolvedUser) writeCachedProfile(authId, resolvedUser);
    if (authId) lastFetch.current = { authId, user: resolvedUser, at: Date.now() };
    else lastFetch.current = null;
    setUser(resolvedUser);
    return resolvedUser;
  };

  useEffect(() => {
    let alive = true;
    let initialized = false;
    let authChangeSeq = 0;

    const finalizeInitialLoad = () => {
      if (!initialized && alive) {
        initialized = true;
        setLoading(false);
      }
    };

    const handleAuthSession = (session: any) => {
      const seq = ++authChangeSeq;
      if (session?.user) {
        setSessionActive(true);
        const existingHint = readBiometricHint();
        if (session.refresh_token && existingHint) {
          writeBiometricHint(session.refresh_token, existingHint.role);
        }

        // Keep the auth callback synchronous. Long async work here can hold
        // Supabase's internal auth lock and trigger lock-steal AbortErrors.
        void refreshUser(session.user)
          .then((profile) => {
            if (session.refresh_token && profile?.role) {
              writeBiometricHint(session.refresh_token, profile.role);
            }
          })
          .catch(() => {
            if (!alive || seq !== authChangeSeq) return;
            const cached = readCachedProfile(session.user.id);
            if (cached) {
              setUser(cached);
              lastFetch.current = { authId: session.user.id, user: cached, at: Date.now() };
            }
          })
          .finally(() => {
            if (seq !== authChangeSeq) return;
            finalizeInitialLoad();
          });
        return;
      }

      // SIGNED_OUT or no session — clear user directly without any network call
      setSessionActive(false);
      lastFetch.current = null;
      setUser(null);
      clearCachedProfile();
      finalizeInitialLoad();
    };

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!alive) return;
      handleAuthSession(session);
    });

    // Hydrate once on mount so loading resolves even if no auth event is emitted.
    void supabase.auth.getSession()
      .then(({ data: sessionData }) => {
        if (!alive || initialized) return;
        handleAuthSession(sessionData.session);
      })
      .catch(() => {
        finalizeInitialLoad();
      });

    // Safety fallback: if onAuthStateChange never fires, unblock loading after 3s
    const timeout = setTimeout(() => {
      finalizeInitialLoad();
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
      setSessionActive(true);
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
    setSessionActive(false);
    localStorage.removeItem('biometric_login_hint');
    clearCachedProfile();
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
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: sessionActive, updateHours, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
