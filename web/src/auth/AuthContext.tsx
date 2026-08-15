import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, type Profile } from '../utils/supabaseClient';
import { clearLocalAnalysisHistory } from '../utils/knowledgeBase';
import { isWaitlistEnabled } from '../config/waitlist';

const LOCAL_MODE_KEY = 'TRELLIS_LOCAL_MODE';

interface AuthContextValue {
  isSupabaseConfigured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  profileReady: boolean;
  isAccessApproved: boolean;
  // True when the app should render without requiring sign-in: either no
  // Supabase project is configured, or the user chose "continue without an
  // account" from the login screen.
  isLocalMode: boolean;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueInLocalMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileReady, setProfileReady] = useState(!isSupabaseConfigured);
  const [localModeChosen, setLocalModeChosen] = useState(
    () => typeof window !== 'undefined' && window.localStorage.getItem(LOCAL_MODE_KEY) === 'true'
  );

  const loadProfile = async (userId: string) => {
    if (!supabase) {
      setProfileReady(true);
      return;
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user || authData.user.id !== userId) {
        clearLocalAnalysisHistory();
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load profile', error);
        setProfile(null);
        return;
      }

      if (!data) {
        // Profile gone — e.g. account deleted from admin. Clear stale session.
        clearLocalAnalysisHistory();
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
        return;
      }

      setProfile(data as Profile);
    } finally {
      setProfileReady(true);
    }
  };

  const isAccessApproved =
    !isWaitlistEnabled || !isSupabaseConfigured || profile?.access_status === 'approved';

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Local/unauthenticated mode: no Supabase project configured, skip auth entirely.
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) {
        void loadProfile(data.session.user.id);
      } else {
        setProfileReady(true);
      }
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (nextSession) {
        // Avoid spinner loops on TOKEN_REFRESHED — only reload profile on sign-in / first load.
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          setProfileReady(false);
          void loadProfile(nextSession.user.id);
        }
      } else {
        setProfile(null);
        setProfileReady(true);
      }
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (session) await loadProfile(session.user.id);
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    window.localStorage.removeItem(LOCAL_MODE_KEY);
    setLocalModeChosen(false);
    if (isSupabaseConfigured) {
      clearLocalAnalysisHistory();
    }
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const continueInLocalMode = () => {
    window.localStorage.setItem(LOCAL_MODE_KEY, 'true');
    setLocalModeChosen(true);
  };

  const value: AuthContextValue = {
    isSupabaseConfigured,
    loading,
    session,
    user: session?.user ?? null,
    profile,
    profileReady,
    isAccessApproved,
    isLocalMode: !isSupabaseConfigured || localModeChosen,
    refreshProfile,
    signInWithGoogle,
    signOut,
    continueInLocalMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
