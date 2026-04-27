import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { supabase, isMissingCredentials } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types/database';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signUp: (email: string, password: string, fullName: string, requestedRole?: string, companyName?: string, idCardUrl?: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null; profile: UserProfile | null }>;
  signInWithGoogle: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isAuthenticated: false,
  });

  // Fetch user profile using native fetch to avoid Supabase JS Lock issues
  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<UserProfile | null> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Get JWT from localStorage directly to avoid Lock
    let jwt = '';
    const storageKeys = Object.keys(localStorage).filter(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (storageKeys.length > 0) {
      try {
        const data = JSON.parse(localStorage.getItem(storageKeys[0]) || '{}');
        jwt = data?.access_token || '';
      } catch { /* ignore */ }
    }

    if (!jwt) {
      // Fallback: try supabase client (may hit Lock but worth trying)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        jwt = session?.access_token || '';
      } catch { /* ignore */ }
    }

    if (!jwt) return null;

    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/users?id=eq.${userId}&select=id,role,full_name,email,email_verified,account_status,avatar_url,created_at`,
          {
            headers: {
              'apikey': anonKey,
              'Authorization': `Bearer ${jwt}`,
              'Accept': 'application/json',
            },
          }
        );

        if (res.ok) {
          const rows = await res.json();
          if (rows.length > 0) return rows[0] as UserProfile;
        }
      } catch { /* ignore */ }

      if (i < retries - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    return null;
  }, []);

  // Initialize auth — check existing session
  useEffect(() => {
    const initAuth = async () => {
      if (isMissingCredentials) {
        setState(prev => ({ ...prev, loading: false }));
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            isAuthenticated: true,
          });
        } else {
          setState(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.warn('Auth init failed (credentials may be missing):', err);
        setState(prev => ({ ...prev, loading: false }));
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            loading: false,
            isAuthenticated: true,
          });
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            session: null,
            profile: null,
            loading: false,
            isAuthenticated: false,
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          setState(prev => ({ ...prev, session }));
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  // Sign up user with requested role
  const signUp = async (email: string, password: string, fullName: string, requestedRole: string = 'candidate', companyName?: string, idCardUrl?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, requested_role: requestedRole, company_name: companyName, id_card_url: idCardUrl },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট তৈরি করা হয়েছে।' };
      }
      return { error: error.message };
    }
    return { error: null };
  };

  // Sign in with email/password
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।', profile: null };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'অনুগ্রহ করে আগে আপনার ইমেইল verify করুন।', profile: null };
      }
      return { error: error.message, profile: null };
    }

    // Check account status
    let profile: UserProfile | null = null;
    if (data.user) {
      profile = await fetchProfile(data.user.id);
      if (profile?.account_status === 'suspended') {
        await supabase.auth.signOut();
        return { error: 'আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।', profile: null };
      }
      if (profile?.account_status === 'rejected') {
        await supabase.auth.signOut();
        return { error: 'আপনার অ্যাকাউন্ট রিজেক্ট করা হয়েছে।', profile: null };
      }
      if (profile?.account_status === 'pending' && profile?.role === 'recruiter') {
        await supabase.auth.signOut();
        return { error: 'আপনার অ্যাকাউন্টটি এখনো অ্যাডমিন দ্বারা ভেরিফাই করা হয়নি। অনুগ্রহ করে অপেক্ষা করুন।', profile: null };
      }
    }

    return { error: null, profile };
  };

  // Sign in with Google OAuth
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }
    return { error: null };
  };

  // Sign out
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  // Refresh profile
  const refreshProfile = async () => {
    if (state.user) {
      const profile = await fetchProfile(state.user.id);
      setState(prev => ({ ...prev, profile }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
