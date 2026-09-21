import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Community } from '../types';
import { Membership, Profile, dbService, mapCommunityToUI, isValidUUID } from '../lib/supabase';

export interface CommunityContextType {
  communities: Community[];
  memberships: Membership[];
  isInitialized: boolean;
  loading: boolean;
  activeCommunityId: string | null;
  activeCommunity: Community | null;
  viewMode: 'portal' | 'community';
  setActiveCommunityId: (id: string | null) => void;
  setViewMode: (mode: 'portal' | 'community') => void;
  backToPortal: (targetSectionId?: string) => void;
  enterCommunity: (communityId: string) => void;
  refreshCommunities: (silent?: boolean) => Promise<void>;
  setCommunities: React.Dispatch<React.SetStateAction<Community[]>>;
  setMemberships: React.Dispatch<React.SetStateAction<Membership[]>>;
  addCommunityOptimistic: (newCommunity: Community, membership?: Membership) => void;
  toggleMembershipOptimistic: (communityId: string, userId: string) => Promise<void>;
}

const LOCAL_STORAGE_COMMUNITIES_KEY = 'wc_cached_communities';
const LOCAL_STORAGE_MEMBERSHIPS_KEY = 'wc_cached_memberships';

const loadFromLocalStorage = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as unknown as T;
    }
  } catch (e) {
    console.warn(`Failed to read ${key} from localStorage:`, e);
  }
  return fallback;
};

import { initialCommunities } from '../data/mockData';

let globalCommunitiesCache: Community[] = loadFromLocalStorage<Community[]>(LOCAL_STORAGE_COMMUNITIES_KEY, initialCommunities);
if (typeof window !== 'undefined' && !localStorage.getItem(LOCAL_STORAGE_COMMUNITIES_KEY) && globalCommunitiesCache.length > 0) {
  try {
    localStorage.setItem(LOCAL_STORAGE_COMMUNITIES_KEY, JSON.stringify(globalCommunitiesCache));
  } catch {}
}
let globalMembershipsCache: Membership[] = loadFromLocalStorage<Membership[]>(LOCAL_STORAGE_MEMBERSHIPS_KEY, []);
let globalIsInitialized = globalCommunitiesCache.length > 0;

export const clearCommunityCaches = () => {
  globalMembershipsCache = [];
  try {
    localStorage.removeItem(LOCAL_STORAGE_MEMBERSHIPS_KEY);
    localStorage.removeItem('wc_communities');
    localStorage.removeItem('wc_memberships');
  } catch {}
};

const CommunityContext = createContext<CommunityContextType | undefined>(undefined);

export interface CommunityProviderProps {
  children: React.ReactNode;
  user?: Profile | null;
}

export const CommunityProvider: React.FC<CommunityProviderProps> = ({ children, user }) => {
  const [communities, setCommunitiesState] = useState<Community[]>(globalCommunitiesCache);
  const [memberships, setMembershipsState] = useState<Membership[]>(globalMembershipsCache);
  const [isInitialized, setIsInitialized] = useState<boolean>(globalIsInitialized);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'portal' | 'community'>('portal');

  const currentUserRef = useRef<Profile | null | undefined>(user);
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // Synchronized setters that update module-level singleton cache
  const setCommunities: React.Dispatch<React.SetStateAction<Community[]>> = useCallback((action) => {
    setCommunitiesState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      if (next && next.length > 0) {
        globalCommunitiesCache = next;
        globalIsInitialized = true;
        try {
          localStorage.setItem(LOCAL_STORAGE_COMMUNITIES_KEY, JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const setMemberships: React.Dispatch<React.SetStateAction<Membership[]>> = useCallback((action) => {
    setMembershipsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      globalMembershipsCache = next;
      try {
        localStorage.setItem(LOCAL_STORAGE_MEMBERSHIPS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Fetch communities & memberships with cache-first and stale-while-revalidate
  const refreshCommunities = useCallback(async (silent = true) => {
    // Only show global loading spinner if we literally have zero cached communities
    if (!silent && globalCommunitiesCache.length === 0) {
      setLoading(true);
    }

    try {
      const currentUser = currentUserRef.current;
      const [rawComm, userMemberships] = await Promise.all([
        dbService.listCommunities(),
        currentUser ? dbService.getMemberships(currentUser.id) : Promise.resolve([])
      ]);

      // 1. Process memberships
      if (currentUser && Array.isArray(userMemberships)) {
        globalMembershipsCache = userMemberships;
        setMembershipsState(userMemberships);
        try {
          localStorage.setItem(LOCAL_STORAGE_MEMBERSHIPS_KEY, JSON.stringify(userMemberships));
        } catch {}
      }

      // 2. Process communities with SWR logic
      if (Array.isArray(rawComm) && rawComm.length > 0) {
        const activeMemberships = (currentUser && Array.isArray(userMemberships))
          ? userMemberships
          : globalMembershipsCache;
        const joinedIds = new Set(activeMemberships.map((m) => m.community_id));

        const mappedCommunities = rawComm.map((c) => {
          const isJoined = joinedIds.has(c.id);
          return mapCommunityToUI(c, isJoined);
        });

        globalCommunitiesCache = mappedCommunities;
        globalIsInitialized = true;
        setCommunitiesState(mappedCommunities);
        setIsInitialized(true);
        try {
          localStorage.setItem(LOCAL_STORAGE_COMMUNITIES_KEY, JSON.stringify(mappedCommunities));
        } catch {}
      } else if (globalCommunitiesCache.length > 0) {
        // Retain existing cached communities if remote query returns empty or failed
        setCommunitiesState([...globalCommunitiesCache]);
        setIsInitialized(true);
      } else if (Array.isArray(rawComm)) {
        // Legitimate empty database on cold start
        setCommunitiesState([]);
        setIsInitialized(true);
      }
    } catch (err) {
      console.warn('[CommunityContext] Silent revalidation error, retaining cached records:', err);
      // Retain existing cached communities on network error
      if (globalCommunitiesCache.length > 0) {
        setCommunitiesState([...globalCommunitiesCache]);
      }
      setIsInitialized(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Navigation handlers
  const backToPortal = useCallback((targetSectionId?: string) => {
    // 1. Reset active community state - NEVER clear communities or userMemberships array
    setActiveCommunityId(null);
    setViewMode('portal');

    // 2. Clear any hash loop without triggering page reload or unmount
    if (window.location.hash) {
      try {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      } catch {}
    }

    // 3. Smooth scroll cleanly to the top or target section
    if (targetSectionId) {
      setTimeout(() => {
        const el = document.getElementById(targetSectionId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // 4. Stale-while-revalidate: communities remain immediately visible from cache
    // Silently re-check in background without blanking out UI
    refreshCommunities(true);
  }, [refreshCommunities]);

  const enterCommunity = useCallback((communityId: string) => {
    setActiveCommunityId(communityId);
    setViewMode('community');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addCommunityOptimistic = useCallback((newCommunity: Community, membership?: Membership) => {
    const updated = [newCommunity, ...globalCommunitiesCache.filter((c) => c.id !== newCommunity.id)];
    globalCommunitiesCache = updated;
    globalIsInitialized = true;
    setCommunitiesState(updated);
    setIsInitialized(true);
    try {
      localStorage.setItem(LOCAL_STORAGE_COMMUNITIES_KEY, JSON.stringify(updated));
    } catch {}

    if (membership) {
      const updatedMems = [membership, ...globalMembershipsCache.filter((m) => m.community_id !== membership.community_id)];
      globalMembershipsCache = updatedMems;
      setMembershipsState(updatedMems);
      try {
        localStorage.setItem(LOCAL_STORAGE_MEMBERSHIPS_KEY, JSON.stringify(updatedMems));
      } catch {}
    }
  }, []);

  const toggleMembershipOptimistic = useCallback(async (communityId: string, userId: string) => {
    const comm = globalCommunitiesCache.find((c) => c.id === communityId);
    if (!comm) return;

    const willBeJoined = !comm.isJoined;

    // Optimistic update communities
    const updatedCommunities = globalCommunitiesCache.map((c) =>
      c.id === communityId
        ? {
            ...c,
            isJoined: willBeJoined,
            memberCount: Math.max(0, c.memberCount + (willBeJoined ? 1 : -1))
          }
        : c
    );
    globalCommunitiesCache = updatedCommunities;
    setCommunitiesState(updatedCommunities);
    try {
      localStorage.setItem(LOCAL_STORAGE_COMMUNITIES_KEY, JSON.stringify(updatedCommunities));
    } catch {}

    // Optimistic update memberships
    if (willBeJoined) {
      const newM: Membership = {
        id: `m-${Date.now()}`,
        user_id: userId,
        community_id: communityId,
        role: 'member',
        joined_at: new Date().toISOString()
      };
      const updatedMems = [...globalMembershipsCache, newM];
      globalMembershipsCache = updatedMems;
      setMembershipsState(updatedMems);
      try {
        localStorage.setItem(LOCAL_STORAGE_MEMBERSHIPS_KEY, JSON.stringify(updatedMems));
      } catch {}

      if (!isValidUUID(userId) || !isValidUUID(communityId)) {
        console.warn('Skipping membership sync: invalid user or community UUID', { userId, communityId });
      } else {
        await dbService.createMembership(newM);
      }
    } else {
      const updatedMems = globalMembershipsCache.filter((m) => m.community_id !== communityId);
      globalMembershipsCache = updatedMems;
      setMembershipsState(updatedMems);
      try {
        localStorage.setItem(LOCAL_STORAGE_MEMBERSHIPS_KEY, JSON.stringify(updatedMems));
      } catch {}

      if (!isValidUUID(userId) || !isValidUUID(communityId)) {
        console.warn('Skipping membership sync: invalid user or community UUID', { userId, communityId });
      } else {
        await dbService.deleteMembership(userId, communityId);
      }
    }

    refreshCommunities(true);
  }, [refreshCommunities]);

  // Clean up stale memberships whenever authentication changes
  useEffect(() => {
    // Clear legacy/stale local storage keys so old dev state doesn't persist
    try {
      localStorage.removeItem('wc_communities');
      localStorage.removeItem('wc_memberships');
    } catch {}

    if (!user) {
      // Guest mode
      globalMembershipsCache = [];
      setMembershipsState([]);
      try {
        localStorage.removeItem(LOCAL_STORAGE_MEMBERSHIPS_KEY);
      } catch {}
    }
  }, [user]);

  // Initial load / revalidation on user change
  useEffect(() => {
    const isColdBoot = globalCommunitiesCache.length === 0;
    refreshCommunities(!isColdBoot);
  }, [user, refreshCommunities]);

  // Handle hash changes (e.g. #discover-hubs) without re-mounting or wiping state
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#discover-hubs') {
        setViewMode((curr) => {
          if (curr !== 'portal') return 'portal';
          return curr;
        });
        setActiveCommunityId(null);
        setTimeout(() => {
          const el = document.getElementById('discover-hubs');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 50);
      }
    };

    window.addEventListener('hashchange', handleHash);
    if (window.location.hash === '#discover-hubs') {
      handleHash();
    }
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const activeCommunity = useMemo(() => {
    if (!activeCommunityId) return null;
    return communities.find((c) => c.id === activeCommunityId) || null;
  }, [communities, activeCommunityId]);

  const value = useMemo<CommunityContextType>(() => ({
    communities,
    memberships,
    isInitialized,
    loading,
    activeCommunityId,
    activeCommunity,
    viewMode,
    setActiveCommunityId,
    setViewMode,
    backToPortal,
    enterCommunity,
    refreshCommunities,
    setCommunities,
    setMemberships,
    addCommunityOptimistic,
    toggleMembershipOptimistic
  }), [
    communities,
    memberships,
    isInitialized,
    loading,
    activeCommunityId,
    activeCommunity,
    viewMode,
    backToPortal,
    enterCommunity,
    refreshCommunities,
    setCommunities,
    setMemberships,
    addCommunityOptimistic,
    toggleMembershipOptimistic
  ]);

  return (
    <CommunityContext.Provider value={value}>
      {children}
    </CommunityContext.Provider>
  );
};

export function useCommunity(): CommunityContextType {
  const context = useContext(CommunityContext);
  if (!context) {
    throw new Error('useCommunity must be used within a CommunityProvider');
  }
  return context;
}
