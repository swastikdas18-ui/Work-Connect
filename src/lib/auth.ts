import { useState, useEffect } from 'react';
import { Profile, dbService } from './supabase';

export interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  isAdminOrOwner: boolean;
  setRole: (role: 'owner' | 'admin' | 'member') => Promise<void>;
  updateProfile: (fullName: string, headline: string, avatarUrl: string) => Promise<void>;
  signUp: (fullName: string, headline: string, avatarUrl: string, role: 'owner' | 'admin' | 'member') => Promise<Profile>;
}

const LOCAL_SESSION_KEY = 'wc_auth_session_profile';

export function useAuth() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      try {
        const cached = localStorage.getItem(LOCAL_SESSION_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as Profile;
          // Refresh from database if possible
          const fresh = await dbService.getProfile(parsed.id);
          if (fresh) {
            setUser(fresh);
            localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(fresh));
          } else {
            // Re-upsert cache to ensure it is in DB
            await dbService.upsertProfile(parsed);
            setUser(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load auth session:', e);
      } finally {
        setLoading(false);
      }
    }
    loadSession();
  }, []);

  const signUp = async (fullName: string, headline: string, avatarUrl: string, role: 'owner' | 'admin' | 'member'): Promise<Profile> => {
    const id = `u-${Date.now()}`;
    const newProfile: Profile = {
      id,
      full_name: fullName,
      avatar_url: avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
      headline,
      cohort_tag: 'Interns Summer 2026',
      karma_points: 0,
      role
    };
    
    setLoading(true);
    try {
      const saved = await dbService.upsertProfile(newProfile);
      setUser(saved);
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(saved));
      return saved;
    } finally {
      setLoading(false);
    }
  };

  const setRole = async (role: 'owner' | 'admin' | 'member') => {
    if (!user) return;
    const updated = { ...user, role };
    setUser(updated);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
    await dbService.upsertProfile(updated);
  };

  const updateProfile = async (fullName: string, headline: string, avatarUrl: string) => {
    if (!user) return;
    const updated = { ...user, full_name: fullName, headline, avatar_url: avatarUrl };
    setUser(updated);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(updated));
    await dbService.upsertProfile(updated);
  };

  const isAdminOrOwner = user?.role === 'admin' || user?.role === 'owner';

  return {
    user,
    loading,
    isAdminOrOwner,
    setRole,
    updateProfile,
    signUp
  };
}
