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
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
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

  // Fetch user profile from public.users with retry logic to handle DB trigger latency
  const fetchProfile = useCallback(async (userId: string, retries = 3): Promise<UserProfile | null> => {
    for (let i = 0; i < retries; i++) {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, full_name, email, email_verified, account_status, avatar_url, created_at')
        .eq('id', userId)
        .single();

      if (!error && data) {
        return data as UserProfile;
      }
      
      // If error is "PGRST116" (not found) and we have retries left, wait and try again
      if (i < retries - 1) {
        console.log(`Profile not found yet, retrying... (${i + 1}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s
      } else {
        console.error('Error fetching profile after retries:', error?.message);
        return null;
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

  // Sign up as candidate
  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
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
        return { error: 'ইমেইল অথবা পাসওয়ার্ড ভুল হয়েছে।' };
      }
      if (error.message.includes('Email not confirmed')) {
        return { error: 'অনুগ্রহ করে আগে আপনার ইমেইল verify করুন।' };
      }
      return { error: error.message };
    }

    // Check account status
    if (data.user) {
      const profile = await fetchProfile(data.user.id);
      if (profile?.account_status === 'suspended') {
        await supabase.auth.signOut();
        return { error: 'আপনার অ্যাকাউন্ট সাসপেন্ড করা হয়েছে। অ্যাডমিনের সাথে যোগাযোগ করুন।' };
      }
      if (profile?.account_status === 'rejected') {
        await supabase.auth.signOut();
        return { error: 'আপনার অ্যাকাউন্ট রিজেক্ট করা হয়েছে।' };
      }
    }

    return { error: null };
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
