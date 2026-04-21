// 
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  full_name: string;
  gp_number: string;
  phone: string;
  avatar_color: string;
  avatar_url?: string;   // ← Google profile picture URL from Gmail OAuth
}

interface AuthContextType {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Extract Google avatar from session metadata if available
function getGoogleAvatar(session: Session | null): string | undefined {
  if (!session?.user) return undefined;
  // Supabase stores Google OAuth profile data in user_metadata
  return session.user.user_metadata?.avatar_url
    || session.user.user_metadata?.picture
    || undefined;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (sess: Session) => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', sess.user.id)
      .single();

    if (data) {
      // Merge Google avatar into profile if available
      const googleAvatar = getGoogleAvatar(sess);
      setProfile({
        ...data,
        avatar_url: googleAvatar || data.avatar_url || undefined,
      });
    }
  };

  const refreshProfile = async () => {
    if (session) await fetchProfile(session);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) fetchProfile(session);
        else setProfile(null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
