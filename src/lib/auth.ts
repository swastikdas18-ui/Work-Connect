import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured, Profile, dbService } from './supabase';
import { Session } from '@supabase/supabase-js';
export { formatAuthError } from './formatAuthError';

export interface AuthContextType {
  user: Profile | null;
  session: Session | null;
  loading: boolean;
  isAdminOrOwner: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, headline: string, avatarUrl: string, role: 'owner' | 'admin' | 'member') => Promise<{ emailVerificationRequired: boolean; email?: string } | void>;
  signOut: () => Promise<void>;
  setRole: (role: 'owner' | 'admin' | 'member') => Promise<void>;
  updateProfile: (data: {
    fullName: string;
    headline: string;
    avatarUrl: string;
    bio?: string;
    skills?: string[];
    githubUrl?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
  }) => Promise<void>;
}

const LOCAL_SESSION_KEY = 'wc_auth_session_profile';
const LOCAL_MOCK_USER_KEY = 'wc_mock_user_profile';

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Sync session and auth state from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Mock Fallback Loader
      const loadMockSession = async () => {
        setLoading(true);
        try {
          const cached = localStorage.getItem(LOCAL_MOCK_USER_KEY);
          if (cached) {
            const parsed = JSON.parse(cached) as Profile;
            const fresh = await dbService.getProfile(parsed.id);
            if (fresh) {
              setUser(fresh);
            } else {
              await dbService.upsertProfile(parsed);
              setUser(parsed);
            }
          }
        } catch (e) {
          console.error('Failed to load mock auth session:', e);
        } finally {
          setLoading(false);
        }
      };
      loadMockSession();
      return;
    }

    // Set up Supabase auth listener
    setLoading(true);
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      if (initialSession?.user) {
        fetchProfile(initialSession.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const profile = await dbService.getProfile(userId);
      if (profile) {
        setUser(profile);
      } else {
        // If profile doesn't exist yet, we create a default one (trigger fallback)
        const newProfile: Profile = {
          id: userId,
          full_name: 'Guest User',
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
          headline: 'Software Engineering Intern',
          cohort_tag: 'Interns Summer 2026',
          karma_points: 0,
          role: 'member'
        };
        const saved = await dbService.upsertProfile(newProfile);
        setUser(saved);
      }
    } catch (e) {
      console.error('Error fetching auth user profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        // Local simulation fallback: create a mock profile if email matches or mock login
        const generatedId = `mock-u-${email.replace(/[^a-zA-Z0-9]/g, '')}`;
        const existingProfile = await dbService.getProfile(generatedId);
        
        let profileToLogin: Profile;
        if (existingProfile) {
          profileToLogin = existingProfile;
        } else {
          profileToLogin = {
            id: generatedId,
            full_name: email.split('@')[0],
            avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
            headline: 'Engineering Intern',
            cohort_tag: 'Interns Summer 2026',
            karma_points: 0,
            role: 'member'
          };
          await dbService.upsertProfile(profileToLogin);
        }
        
        setUser(profileToLogin);
        localStorage.setItem(LOCAL_MOCK_USER_KEY, JSON.stringify(profileToLogin));
      }
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    fullName: string, 
    headline: string, 
    avatarUrl: string, 
    role: 'owner' | 'admin' | 'member'
  ): Promise<{ emailVerificationRequired: boolean; email?: string } | void> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              headline: headline || 'Intern',
              avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
              role
            }
          }
        });
        if (error) throw error;
        
        if (!data.session && data.user) {
          return { emailVerificationRequired: true, email };
        } else if (data.user) {
          await fetchProfile(data.user.id);
        }
        return { emailVerificationRequired: false };
      } else {
        // Local Mock Signup
        const generatedId = `mock-u-${email.replace(/[^a-zA-Z0-9]/g, '')}`;
        const newProfile: Profile = {
          id: generatedId,
          full_name: fullName,
          avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
          headline,
          cohort_tag: 'Interns Summer 2026',
          karma_points: 0,
          role
        };
        await dbService.upsertProfile(newProfile);
        setUser(newProfile);
        localStorage.setItem(LOCAL_MOCK_USER_KEY, JSON.stringify(newProfile));
        return { emailVerificationRequired: false };
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      } else {
        localStorage.removeItem(LOCAL_MOCK_USER_KEY);
      }
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const setRole = async (role: 'owner' | 'admin' | 'member') => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    if (!isSupabaseConfigured) {
      localStorage.setItem(LOCAL_MOCK_USER_KEY, JSON.stringify(updated));
    }
    await dbService.upsertProfile(updated);
  };

  const updateProfile = async (data: {
    fullName: string;
    headline: string;
    avatarUrl: string;
    bio?: string;
    skills?: string[];
    githubUrl?: string;
    linkedinUrl?: string;
    websiteUrl?: string;
  }) => {
    if (!user) return;
    const updated: Profile = { 
      ...user, 
      full_name: data.fullName, 
      headline: data.headline, 
      avatar_url: data.avatarUrl,
      bio: data.bio ?? user.bio,
      skills: data.skills ?? user.skills,
      github_url: data.githubUrl ?? user.github_url,
      linkedin_url: data.linkedinUrl ?? user.linkedin_url,
      website_url: data.websiteUrl ?? user.website_url,
    };
    setUser(updated);
    if (!isSupabaseConfigured) {
      localStorage.setItem(LOCAL_MOCK_USER_KEY, JSON.stringify(updated));
    }
    await dbService.upsertProfile(updated);
  };

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  return {
    user,
    session,
    loading,
    isAdminOrOwner,
    signIn,
    signUp,
    signOut,
    setRole,
    updateProfile
  };
}
