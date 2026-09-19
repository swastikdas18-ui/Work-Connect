import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  Trophy, 
  Inbox, 
  Search, 
  Bell, 
  ChevronDown, 
  Menu, 
  X, 
  Laptop,
  CheckCircle,
  HelpCircle,
  Sparkles,
  Award,
  Plus,
  ArrowRight,
  Globe,
  Lock,
  Compass,
  ArrowLeft,
  ChevronRight,
  Grid,
  TrendingUp,
  ExternalLink,
  MessageSquare,
  Sparkle,
  UserCheck,
  Shield,
  Loader2,
  Check,
  ShieldAlert,
  Mail,
  User as UserIcon
} from 'lucide-react';

import { 
  mockCategories
} from './data/mockData';

import { User, Post, CourseTrack, CalendarEvent, Broadcast, Comment, Community } from './types';
import { CommunityTab } from './components/CommunityTab';
import { ClassroomTab } from './components/ClassroomTab';
import { CalendarTab } from './components/CalendarTab';
import { LeaderboardTab } from './components/LeaderboardTab';
import { NewsletterTab } from './components/NewsletterTab';
import { OfflineIndicator } from './components/OfflineIndicator';
import { AuthModal, AuthIntent } from './components/AuthModal';
import { CreateCommunityModal } from './components/CreateCommunityModal';
import { EditProfileModal } from './components/EditProfileModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { UserProfileModal } from './components/UserProfileModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useAuth, AuthContextType, formatAuthError } from './lib/auth';
import { CommunityProvider, useCommunity } from './context/CommunityContext';
import { 
  supabase,
  dbService, 
  getHydratedPosts, 
  getHydratedCourses, 
  getHydratedEvents, 
  getHydratedNewsletters, 
  mapProfileToUser, 
  mapCommunityToUI,
  isSupabaseConfigured,
  Profile,
  Membership
} from './lib/supabase';

function AppContent({ auth }: { auth: AuthContextType }) {
  const { user, session, loading: authLoading, signIn, signUp, signOut, setRole, updateProfile } = auth;
  const {
    communities,
    memberships,
    isInitialized,
    loading: commLoading,
    activeCommunityId: selectedCommunityId,
    activeCommunity: contextActiveCommunity,
    viewMode,
    setActiveCommunityId: setSelectedCommunityId,
    setViewMode,
    backToPortal,
    enterCommunity,
    refreshCommunities,
    setCommunities,
    setMemberships,
    addCommunityOptimistic,
    toggleMembershipOptimistic
  } = useCommunity();
  
  // Custom states for intercepted community creation and unhandled email verification
  const [authBannerMessage, setAuthBannerMessage] = useState<string | null>(null);
  const [authIntent, setAuthIntent] = useState<AuthIntent>({ type: 'general' });
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [pendingCreateCommunity, setPendingCreateCommunity] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  
  // Tab within the selected community
  const [activeTab, setActiveTab] = useState<'feed' | 'classroom' | 'events' | 'leaderboard' | 'newsletter'>('feed');

  // Profile dropdown menu popover states
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Upvote cooldown ref map
  const upvoteCooldowns = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    if (isProfileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileDropdownOpen]);

  // Database-driven reactive states for subcollections and rankings
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<CourseTrack[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [rsvpLoadingId, setRsvpLoadingId] = useState<string | null>(null);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);

  // Contextual role check: checking if they are the owner/admin of the currently selected community
  const currentMembership = selectedCommunityId && user
    ? memberships.find(m => m.community_id === selectedCommunityId)
    : null;
  const currentRole = currentMembership ? currentMembership.role : 'member';
  const isAdminOrOwner = currentRole === 'owner' || currentRole === 'admin';

  // State controls
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // New community form state
  const [newCommName, setNewCommName] = useState('');
  const [newCommSlug, setNewCommSlug] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommPrivacy, setNewCommPrivacy] = useState<'public' | 'gated' | 'private'>('public');

  // Search trigger modal (Cmd+K)
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Discover filter
  const [discoverFilter, setDiscoverFilter] = useState<'all' | 'public' | 'gated'>('all');

  // Real authentication fields
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');

  // Profile setup wizard state for new users
  const [suName, setSuName] = useState('');
  const [suHeadline, setSuHeadline] = useState('');
  const [suAvatar, setSuAvatar] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80');
  const [suRole, setSuRole] = useState<'member' | 'admin' | 'owner'>('member');

  // Profile update form state
  const [upName, setUpName] = useState('');
  const [upHeadline, setUpHeadline] = useState('');
  const [upAvatar, setUpAvatar] = useState('');
  const [upBio, setUpBio] = useState('');
  const [upSkills, setUpSkills] = useState<string[]>([]);
  const [upGithub, setUpGithub] = useState('');
  const [upLinkedin, setUpLinkedin] = useState('');
  const [upWebsite, setUpWebsite] = useState('');

  // Public user profile viewer modal state
  const [inspectingUser, setInspectingUser] = useState<User | null>(null);

  // Local alert alerts
  const [appNotifications, setAppNotifications] = useState([
    { id: 'n-1', text: 'Sarah Chen upvoted your production gateway code snippet.', time: '10m ago', read: false },
    { id: 'n-2', text: 'Marcus Vance invited you to RSVP for the milestone reviews.', time: '2h ago', read: false },
    { id: 'n-3', text: 'Elena Rostova posted a new Win in Interns Summer 2026.', time: '1d ago', read: true }
  ]);

  // Toast / Alerts system
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    if (user && pendingCreateCommunity) {
      setShowCreateModal(true);
      setPendingCreateCommunity(false);
      setAuthBannerMessage(null);
    }
  }, [user, pendingCreateCommunity]);

  // State to control on-demand auth modal visibility
  const [showAuthModal, setShowAuthModal] = useState(false);

  const openAuthModal = (options?: {
    mode?: 'signin' | 'signup';
    intent?: AuthIntent;
    bannerMessage?: string;
  }) => {
    if (options?.mode) setAuthMode(options.mode);
    if (options?.intent) setAuthIntent(options.intent);
    else setAuthIntent({ type: 'general' });
    if (options?.bannerMessage) setAuthBannerMessage(options.bannerMessage);
    else setAuthBannerMessage(null);
    setAuthErrorMessage(null);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setVerificationEmail(null);
    setAuthBannerMessage(null);
    setAuthErrorMessage(null);
    setPendingCreateCommunity(false);
    setAuthIntent({ type: 'general' });
  };

  const resumeAuthIntent = async (intentToResume: AuthIntent, authenticatedUserId?: string) => {
    const activeIntent = { ...intentToResume };
    setAuthIntent({ type: 'general' });

    if (activeIntent.type === 'create_community') {
      setShowCreateModal(true);
    } else if (activeIntent.type === 'join_community') {
      const uId = authenticatedUserId || user?.id;
      if (uId) {
        try {
          await toggleMembershipOptimistic(activeIntent.communityId, uId);
          showToast(`Successfully joined "${activeIntent.communityName}"!`);
        } catch (e) {
          console.error(e);
        }
      }
    } else if (activeIntent.type === 'rsvp_event') {
      setTimeout(() => {
        handleToggleRsvp(activeIntent.eventId);
      }, 150);
    }
  };

  const handleCreateCommunityClick = () => {
    if (!user) {
      openAuthModal({
        mode: 'signin',
        intent: { type: 'create_community' },
        bannerMessage: 'Please sign in or create an account to start a community.'
      });
    } else {
      setShowCreateModal(true);
    }
  };

  const handleBackToPortal = () => {
    backToPortal();
  };

  // Helper to guard protected actions and prompt login modal if needed
  const ensureUserAuthenticated = (actionDescription: string): boolean => {
    if (!user) {
      openAuthModal({
        mode: 'signin',
        intent: { type: 'general' },
        bannerMessage: `Please sign in to ${actionDescription}.`
      });
      showToast(`Please sign in to ${actionDescription}.`);
      return false;
    }
    return true;
  };

  const generateId = (prefix: string) => {
    if (isSupabaseConfigured) {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    return `${prefix}-${Date.now()}`;
  };

  // Pre-defined avatars selection
  const prebuiltAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
  ];

  // Initialize state when profile is ready
  useEffect(() => {
    if (user) {
      setUpName(user.full_name);
      setUpHeadline(user.headline);
      setUpAvatar(user.avatar_url);
    }
  }, [user]);

  // Load community subcollections ONLY when active community changes and is non-null
  const loadCommunitySubcollections = useCallback(async (communityId: string) => {
    setDbLoading(true);
    try {
      const [hydratedPosts, hydratedCourses, hydratedEvents, hydratedNewsletters] = await Promise.all([
        getHydratedPosts(communityId, user ? user.id : undefined),
        getHydratedCourses(communityId, user ? user.id : 'anonymous'),
        getHydratedEvents(communityId, user ? user.id : undefined),
        getHydratedNewsletters(communityId)
      ]);
      setPosts(hydratedPosts);
      setCourses(hydratedCourses);
      setEvents(hydratedEvents);
      setBroadcasts(hydratedNewsletters);
    } catch (e) {
      console.error('Error fetching community subcollections:', e);
    } finally {
      setDbLoading(false);
    }
  }, [user]);

  // Fetch subcollections when selection changes to an active community
  useEffect(() => {
    if (selectedCommunityId) {
      loadCommunitySubcollections(selectedCommunityId);
    }
  }, [selectedCommunityId, loadCommunitySubcollections]);

  // Load rankings once
  useEffect(() => {
    const loadRankings = async () => {
      try {
        const rawProfiles = await dbService.getLeaderboard();
        const mappedRankings = rawProfiles.map(p => mapProfileToUser(p));
        setLeaderboardUsers(mappedRankings);
      } catch (e) {
        console.error('Error loading leaderboard:', e);
      }
    };
    loadRankings();
  }, []);

  // Keyboard shortcut listener for Cmd+K search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearchModal((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { isInstallable, install } = usePWAInstall();

  // Find active community
  const activeCommunity = contextActiveCommunity || communities.find(c => c.id === selectedCommunityId) || communities[0];

  // Selected subcollections inside active community
  const communityPosts = posts.filter(p => p.communityId === selectedCommunityId);
  const communityCourses = courses.filter(c => c.communityId === selectedCommunityId);
  const communityEvents = events.filter(e => e.communityId === selectedCommunityId);
  const communityBroadcasts = broadcasts.filter(b => b.communityId === selectedCommunityId);

  // Safely derive joined hubs matching exact requirements
  const yourCommunities = useMemo(() => {
    if (!user) return [];
    const joinedIds = new Set(memberships.map((m) => m.community_id));
    return communities.filter((c) => 
      c.created_by === user.id || 
      c.createdBy === user.id || 
      joinedIds.has(c.id) ||
      Boolean(c.isJoined)
    );
  }, [communities, memberships, user]);

  const exploreCommunities = useMemo(() => {
    return communities.filter(c => {
      if (discoverFilter === 'public') return c.privacy === 'public';
      if (discoverFilter === 'gated') return c.privacy === 'gated';
      return true;
    });
  }, [communities, discoverFilter]);

  // Dynamic Slug auto-formatting
  const handleNameChange = (val: string) => {
    setNewCommName(val);
    const cleanSlug = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    setNewCommSlug(cleanSlug);
  };

  // Create community submit
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !session) {
      showToast('Authentication Error: An active session is required to create a community.');
      return;
    }
    if (!ensureUserAuthenticated('create a community')) return;
    if (!newCommName.trim() || !newCommSlug.trim()) return;

    try {
      const commId = generateId('c');
      const commData = {
        id: commId,
        name: newCommName,
        slug: newCommSlug,
        description: newCommDesc,
        privacy: newCommPrivacy,
        accent_color: '#4f46e5',
        created_by: user.id,
        member_count: 1
      };

      const newM: Membership = {
        id: generateId('m'),
        user_id: user.id,
        community_id: commId,
        role: 'owner',
        joined_at: new Date().toISOString()
      };

      addCommunityOptimistic(mapCommunityToUI(commData, true), newM);

      await dbService.createCommunity(commData);
      await dbService.createMembership(newM);

      showToast(`Community "${newCommName}" launched successfully!`);
      setShowCreateModal(false);
      setNewCommName('');
      setNewCommSlug('');
      setNewCommDesc('');
      setNewCommPrivacy('public');

      refreshCommunities(true);
    } catch (e) {
      console.error(e);
      showToast('Error creating community space.');
    }
  };

  // Join or Leave community
  const handleJoinOrLeaveCommunity = async (communityId: string, communityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      openAuthModal({
        mode: 'signin',
        intent: { type: 'join_community', communityId, communityName },
        bannerMessage: `Please sign in to join ${communityName}.`
      });
      return;
    }

    try {
      const comm = communities.find(c => c.id === communityId);
      await toggleMembershipOptimistic(communityId, user.id);
      if (comm?.isJoined) {
        showToast(`Left "${comm.name}".`);
      } else if (comm) {
        showToast(`Successfully joined "${comm.name}"!`);
      }
    } catch (error) {
      console.error(error);
      showToast('Membership transaction failed.');
    }
  };

  // Upvote Post Action
  const handleUpvotePost = async (postId: string) => {
    if (!ensureUserAuthenticated('upvote posts')) return;
    if (!user) return;
    
    // 300ms upvote debounce / spam protection
    if (upvoteCooldowns.current.has(postId)) {
      return;
    }
    upvoteCooldowns.current.add(postId);
    setTimeout(() => {
      upvoteCooldowns.current.delete(postId);
    }, 300);

    try {
      const postItem = posts.find(p => p.id === postId);
      if (!postItem) return;

      const { action, upvotes_count } = await dbService.togglePostUpvote(postId, user.id);
      
      // Update UI count and upvoted state immediately using server returned upvotes_count
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                upvotes: upvotes_count,
                hasUpvoted: action === 'upvoted'
              }
            : p
        )
      );

      // Reward Karma Points to post author
      if (postItem.author.id) {
        const authorProfile = await dbService.getProfile(postItem.author.id);
        if (authorProfile) {
          const karmaDiff = action === 'upvoted' ? 10 : -10;
          await dbService.upsertProfile({
            ...authorProfile,
            karma_points: Math.max(0, (authorProfile.karma_points || 0) + karmaDiff)
          });
        }
      }

      if (action === 'upvoted') {
        showToast('Post upvoted!');
      } else {
        showToast('Upvote removed.');
      }
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (err: any) {
      console.error(err);
      if (err?.message && err.message.includes('Rate limit exceeded')) {
        showToast("You are doing that a bit too fast. Please wait a few seconds.");
      } else {
        showToast('Failed to toggle upvote.');
      }
    }
  };

  // Add Comment Action
  const handleAddComment = async (postId: string, commentText: string) => {
    if (!ensureUserAuthenticated('add comments')) return;
    if (!user) return;
    try {
      const cId = generateId('com');
      await dbService.createComment({
        id: cId,
        post_id: postId,
        author_id: user.id,
        body: commentText,
        created_at: new Date().toISOString()
      });

      // Update comments count on post
      const post = posts.find(p => p.id === postId);

      showToast('Response published successfully!');
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message && e.message.includes('Rate limit exceeded')) {
        showToast("You are doing that a bit too fast. Please wait a few seconds.");
      } else {
        showToast('Failed to submit comment.');
      }
    }
  };

  // Add Post Action
  const handleAddPost = async (postData: { title: string; content: string; codeSnippet?: string; mediaUrl?: string; category: string }, sendAsNewsletter: boolean) => {
    if (!ensureUserAuthenticated('publish posts')) return;
    if (!user || !selectedCommunityId) return;
    try {
      const postId = generateId('p');
      await dbService.createPost({
        id: postId,
        community_id: selectedCommunityId,
        author_id: user.id,
        category: postData.category,
        title: postData.title,
        body: postData.content,
        media_url: postData.mediaUrl,
        upvotes_count: 1,
        comments_count: 0,
        created_at: new Date().toISOString()
      });

      // Add snippet if applicable
      if (postData.codeSnippet) {
        // Handled in frontend UI schema
      }

      showToast('Thread published on the cohort feed!');

      // If user wants to draft/broadcast this automatically to the newsletter studio
      if (sendAsNewsletter && isAdminOrOwner) {
        const bId = generateId('b');
        await dbService.createNewsletter({
          id: bId,
          community_id: selectedCommunityId,
          subject: `Curated Thread: ${postData.title}`,
          recipient_group: 'All Staff',
          status: 'sent',
          body: postData.content,
          sent_at: 'Just now',
          open_rate: 94.2,
          click_rate: 76.8
        });
        showToast('Thread dispatched as email broadcast!');
      }

      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e: any) {
      console.error(e);
      if (e?.message && e.message.includes('Rate limit exceeded')) {
        showToast("You are doing that a bit too fast. Please wait a few seconds.");
      } else {
        showToast('Failed to publish post.');
      }
    }
  };

  // Classroom - Add Course Action
  const handleAddCourse = async (title: string, description: string, bannerColor: string) => {
    if (!selectedCommunityId || !user) return;
    try {
      const courseId = generateId('course');
      await dbService.createCourse({
        id: courseId,
        community_id: selectedCommunityId,
        title,
        description,
        banner_color: bannerColor
      });

      // Create a default first lesson
      await dbService.createLesson({
        id: generateId('lesson'),
        course_id: courseId,
        title: '01: Cohort Standard Onboarding',
        duration: '12 mins',
        description: 'An overview of the engineering hub goals, sandbox repos, and milestone reviews.'
      });

      showToast('Course Track published to the community classroom.');
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Classroom - Toggle completion
  const handleToggleLessonCompleted = async (trackId: string, lessonId: string) => {
    if (!user) return;
    try {
      const isNowCompleted = await dbService.toggleLessonCompletion(user.id, lessonId);
      
      // Update karma points for lesson complete (+20 points)
      const currentKarma = user.karma_points || 0;
      const karmaDiff = isNowCompleted ? 20 : -20;
      await dbService.upsertProfile({
        ...user,
        karma_points: Math.max(0, currentKarma + karmaDiff)
      });

      showToast(isNowCompleted ? 'Lesson completed! +20 Karma Points' : 'Lesson completion cleared.');
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Classroom - Update lesson video embed
  const handleUpdateLessonVideo = async (trackId: string, lessonId: string, videoUrl: string) => {
    if (!selectedCommunityId || !isAdminOrOwner) return;
    try {
      await dbService.updateLessonVideo(lessonId, videoUrl);
      showToast('Lesson video embed updated successfully!');
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e) {
      console.error(e);
      showToast('Failed to update lesson video.');
    }
  };

  // Classroom - Add lesson discussion comment
  const handleAddLessonDiscussion = async (trackId: string, lessonId: string, commentText: string) => {
    // Add lesson comments directly in memory or local state
    showToast('Discussion comment posted!');
  };

  // Calendar - Schedule Event Action
  const handleAddEvent = async (title: string, description: string, startsAtIso: string, meetUrl: string) => {
    if (!selectedCommunityId || !user) return;
    try {
      const eId = generateId('evt');
      await dbService.createEvent({
        id: eId,
        community_id: selectedCommunityId,
        title,
        description,
        host_name: user.full_name,
        host_avatar: user.avatar_url,
        starts_at: startsAtIso,
        meet_url: meetUrl,
        attendees_count: 1
      });

      showToast('New cohort mixer has been scheduled!');
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Calendar - Atomic RSVP Handler via toggle_event_rsvp RPC
  const handleToggleRsvp = async (eventId: string) => {
    if (!user) {
      openAuthModal({
        mode: 'signin',
        intent: { type: 'rsvp_event', eventId },
        bannerMessage: 'Please sign in to reserve your spot and receive calendar updates.'
      });
      return;
    }

    setRsvpLoadingId(eventId);
    try {
      let rsvped: boolean;
      let attendees_count: number;

      if (isSupabaseConfigured) {
        const { data, error } = await supabase.rpc('toggle_event_rsvp', {
          target_event_id: eventId,
        });

        if (error) throw error;
        rsvped = data.rsvped;
        attendees_count = data.attendees_count;
      } else {
        const res = await dbService.toggleRSVP(eventId, user.id);
        rsvped = res.rsvped;
        attendees_count = res.attendees_count;
      }

      // Update state using the authoritative count and status from Postgres
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId
            ? {
                ...event,
                is_rsvped: rsvped,
                attendees_count: attendees_count,
                hasRSVPed: rsvped,
                attendees: attendees_count,
              }
            : event
        )
      );

      showToast(rsvped ? 'RSVP confirmed! Added to your schedule.' : 'RSVP cancelled.');
    } catch (err: any) {
      console.error('RSVP toggle error:', err);
      showToast(err?.message || 'Unable to update RSVP. Please try again.');
    } finally {
      setRsvpLoadingId(null);
    }
  };

  // Newsletter - Add Broadcast Action
  const handleAddBroadcast = async (broadcastData: { subject: string; cohort: string; content: string }) => {
    if (!selectedCommunityId || !user) return;
    try {
      const bId = generateId('b');
      await dbService.createNewsletter({
        id: bId,
        community_id: selectedCommunityId,
        subject: broadcastData.subject,
        recipient_group: broadcastData.cohort,
        status: 'sent',
        body: broadcastData.content,
        sent_at: 'Just now',
        open_rate: 92.5,
        click_rate: 71.2
      });

      showToast('Newsletter broadcast dispatched successfully.');
      if (selectedCommunityId) {
        await loadCommunitySubcollections(selectedCommunityId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenNewsletterComposeWithContent = (subjectText: string, bodyText: string) => {
    setActiveTab('newsletter');
    showToast('Loaded curated snippet inside Studio composer.');
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suEmail.trim() || !suPassword.trim()) {
      setAuthErrorMessage('Please enter both email and password.');
      showToast('Please enter both email and password.');
      return;
    }

    setAuthErrorMessage(null);
    try {
      if (authMode === 'signin') {
        await signIn(suEmail, suPassword);
        showToast('Successfully signed in!');
        setShowAuthModal(false);
        setAuthBannerMessage(null);
        setAuthErrorMessage(null);
        await resumeAuthIntent(authIntent);
      } else {
        if (!suName.trim()) {
          setAuthErrorMessage('Please provide your full name for sign up.');
          showToast('Please provide your full name for sign up.');
          return;
        }
        const computedAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(suName)}&background=6366f1&color=fff&size=128`;
        const res = await signUp(suEmail, suPassword, suName, suHeadline || 'Intern', computedAvatar, 'member');
        
        if (res && res.emailVerificationRequired) {
          setVerificationEmail(res.email || suEmail);
          showToast('Verification email sent!');
        } else {
          showToast('Welcome! Your profile has been created.');
          setShowAuthModal(false);
          setAuthBannerMessage(null);
          setAuthErrorMessage(null);
          await resumeAuthIntent(authIntent);
        }
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      const friendlyMsg = formatAuthError(err);
      setAuthErrorMessage(friendlyMsg);
      showToast(friendlyMsg);
    }
  };

  const openEditProfileModal = () => {
    if (!user) return;
    setUpName(user.full_name || '');
    setUpHeadline(user.headline || '');
    setUpAvatar(user.avatar_url || prebuiltAvatars[0]);
    setUpBio(user.bio || '');
    setUpSkills(user.skills || ['React', 'TypeScript']);
    setUpGithub(user.github_url || '');
    setUpLinkedin(user.linkedin_url || '');
    setUpWebsite(user.website_url || '');
    setShowProfileModal(true);
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upName.trim()) return;
    await updateProfile({
      fullName: upName,
      headline: upHeadline,
      avatarUrl: upAvatar,
      bio: upBio,
      skills: upSkills,
      githubUrl: upGithub,
      linkedinUrl: upLinkedin,
      websiteUrl: upWebsite,
    });
    showToast('Your profile details have been updated.');
    setShowProfileModal(false);
  };

  // Helper mapping currentUser to UI User format
  const mappedCurrentUser: User = user 
    ? mapProfileToUser(user)
    : { id: '', name: 'Guest', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80', cohort: 'Guest', level: 1, points: 0 };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
        <p className="text-xs text-zinc-400 mt-4 font-bold tracking-wider uppercase">Loading Workspace Connect Engine...</p>
      </div>
    );
  }

  const isAnyModalOpen = showCreateModal || showProfileModal || showSearchModal || showAuthModal || !!inspectingUser;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex flex-col font-sans select-none antialiased">
      
      {/* Outer wrapper to trap focus and prevent keyboard navigation behind modals */}
      <div 
        className="flex-1 flex flex-col"
        {...(isAnyModalOpen ? { inert: '' } : {})}
      >

      {/* Global Header Layout */}
      <header className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-900/80 z-40 px-4 h-15 flex items-center shadow-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          
          {/* Logo & Cohort switcher */}
          <div className="flex items-center gap-3">
            {viewMode === 'community' ? (
              <button 
                onClick={handleBackToPortal}
                className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 px-3 py-2 rounded-xl transition-all dark:text-zinc-300 dark:hover:text-white dark:bg-zinc-900 dark:hover:bg-zinc-800 shadow-sm"
                id="back-to-portal-breadcrumb"
              >
                <span>← Back to Portal</span>
              </button>
            ) : (
              <button 
                onClick={handleBackToPortal}
                className="flex items-center gap-2"
              >
                <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-sm hover:scale-105 transition-transform">
                  <span>W</span>
                </div>
                <span className="text-sm font-black tracking-tight text-zinc-950 dark:text-white hidden sm:block">Work Connect</span>
              </button>
            )}

            {viewMode === 'community' && activeCommunity && (
              <>
                <ChevronRight className="h-4 w-4 text-zinc-300 hidden md:block" />
                <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50 hidden md:block truncate max-w-[150px]">
                  {activeCommunity.name}
                </span>
              </>
            )}
          </div>

          {/* Desktop Sub-Nav when INSIDE community */}
          {viewMode === 'community' && (
            <nav className="hidden md:flex items-center gap-1 bg-zinc-100/60 p-0.5 rounded-lg border border-zinc-200/40 dark:bg-zinc-900/50 dark:border-zinc-800">
              <button
                onClick={() => setActiveTab('feed')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'feed'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Feed
              </button>

              <button
                onClick={() => setActiveTab('classroom')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'classroom'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Classroom
              </button>

              <button
                onClick={() => setActiveTab('events')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'events'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Events
              </button>

              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'leaderboard'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Leaderboard
              </button>

              <button
                onClick={() => setActiveTab('newsletter')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'newsletter'
                    ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
                }`}
              >
                Studio
              </button>
            </nav>
          )}

          {/* Right Action Widgets */}
          <div className="flex items-center gap-3">
            
            {/* Search Trigger (⌘K) */}
            <button 
              onClick={() => setShowSearchModal(true)}
              className="flex items-center justify-center p-2 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-850"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Notification Drawer trigger (only for logged in users) */}
            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                  className="p-2 rounded-lg bg-zinc-50 border border-zinc-100 hover:bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-850 relative"
                >
                  <Bell className="h-4 w-4" />
                  {appNotifications.some(n => !n.read) && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
                  )}
                </button>

                <AnimatePresence>
                  {showNotificationDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowNotificationDropdown(false)} />
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-20 overflow-hidden"
                      >
                        <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Alerts</span>
                          <button 
                            onClick={() => {
                              setAppNotifications(prev => prev.map(n => ({ ...n, read: true })));
                              showToast('All notifications marked read.');
                            }}
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400"
                          >
                            Mark read
                          </button>
                        </div>

                        <div className="max-h-64 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
                          {appNotifications.map((notif) => (
                            <div 
                              key={notif.id} 
                              className={`p-3 text-xs leading-normal ${
                                notif.read ? 'bg-white dark:bg-zinc-900 text-zinc-500' : 'bg-indigo-50/10 dark:bg-zinc-900/40 text-zinc-800 dark:text-zinc-200 font-medium'
                              }`}
                            >
                              <p>{notif.text}</p>
                              <span className="text-[10px] text-zinc-400 mt-1 block font-mono">{notif.time}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : null}

            {/* Create Community Navigation control */}
            {viewMode === 'portal' && (
              <button 
                onClick={handleCreateCommunityClick}
                className="hidden md:flex items-center gap-1.5 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900 transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-indigo-500" />
                <span>Create Community</span>
              </button>
            )}

            {/* PWA Direct trigger */}
            {isInstallable && (
              <button 
                onClick={install}
                className="hidden sm:flex items-center gap-1 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <span>Install</span>
              </button>
            )}

            {/* Profile Level Widget with Edit Profile Trigger OR Sign In Action */}
            {user ? (
              <div className="relative" ref={profileDropdownRef}>
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 cursor-pointer focus:outline-none"
                  id="profile-dropdown-trigger"
                >
                  <div className="relative">
                    <img 
                      src={mappedCurrentUser.avatar} 
                      alt={mappedCurrentUser.name} 
                      className="w-7.5 h-7.5 rounded-full object-cover border border-zinc-200 dark:border-zinc-800 hover:scale-105 transition-transform"
                    />
                    <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[8px] font-bold h-3.5 w-3.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-900">
                      {mappedCurrentUser.level}
                    </span>
                  </div>
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-72 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                      {/* Header Section: Name & Headline, and Email */}
                      <div className="p-4 border-b border-zinc-100 dark:border-zinc-850">
                        <div className="font-bold text-zinc-900 dark:text-white text-sm truncate flex items-center gap-1.5">
                          <span>{mappedCurrentUser.name}</span>
                          {mappedCurrentUser.cohort && (
                            <>
                              <span className="text-zinc-400 font-normal">•</span>
                              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400 truncate">
                                {mappedCurrentUser.cohort}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-1">
                          {session?.user?.email || (user as any)?.email || `${mappedCurrentUser.name.toLowerCase().replace(/\s+/g, '')}@company.com`}
                        </div>
                      </div>

                      {/* Quick Links Section */}
                      <div className="p-1.5 space-y-0.5 border-b border-zinc-100 dark:border-zinc-850">
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            openEditProfileModal();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-900 rounded-lg transition-all"
                        >
                          Profile Settings
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            backToPortal();
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-900 rounded-lg transition-all"
                        >
                          Your Communities
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setInspectingUser(mappedCurrentUser);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40 rounded-lg transition-all flex items-center justify-between"
                        >
                          <span>View Public Profile</span>
                          <span className="text-[10px] font-mono font-bold bg-indigo-100 dark:bg-indigo-900/60 px-1.5 py-0.5 rounded">Card</span>
                        </button>
                      </div>

                      {/* Log Out Button */}
                      <div className="p-1.5">
                        <button
                          onClick={async () => {
                            setIsProfileDropdownOpen(false);
                            try {
                              await signOut();
                              setMemberships([]);
                              try {
                                localStorage.removeItem('wc_cached_memberships');
                              } catch {}
                              backToPortal();
                              showToast('Logged out successfully');
                            } catch (err: any) {
                              showToast('Failed to log out: ' + (err?.message || 'Unknown error'));
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 rounded-lg transition-all"
                        >
                          Log Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAuthMode('signin');
                    setShowAuthModal(true);
                  }}
                  className="px-3.5 py-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all"
                >
                  Get Started
                </button>
              </div>
            )}

          </div>

        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 pb-20 md:pb-6">
        {dbLoading && (
          <div className="bg-indigo-50/40 border-b border-indigo-100/50 dark:bg-zinc-900 dark:border-zinc-850 px-4 py-2 text-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Synchronizing Database...</span>
          </div>
        )}

        <AnimatePresence mode="wait">
          {viewMode === 'portal' ? (
            
            /* GLOBAL LANDING & PORTAL PAGE */
            <motion.div
              key="portal"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto px-4 py-12 space-y-12"
            >
              
              {/* Refined Sophisticated Hero Section */}
              <div className="text-center space-y-4 max-w-2xl mx-auto py-6 relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/50 text-indigo-600 text-[11px] font-bold dark:bg-zinc-900 dark:border-zinc-800 dark:text-indigo-400">
                  <Sparkle className="h-3 w-3 fill-indigo-200 dark:fill-indigo-950/20" />
                  <span>The Unified Multi-Community Hub</span>
                </div>

                <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-tight">
                  Where Teams, Cohorts & Interns Build <span className="text-indigo-600">Thriving Communities</span>
                </h1>
                
                <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Work Connect brings employees, guilds, design squads, and cohorts into separate, lightning-fast workspaces. Exchange knowledge, log lesson milestones, and schedule mixers instantly.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button 
                    onClick={handleCreateCommunityClick}
                    className="bg-zinc-950 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 text-xs font-bold px-5 py-2.5 rounded-xl shadow-md flex items-center gap-1.5 transition-transform hover:scale-105"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create a Community</span>
                  </button>

                  <button 
                    onClick={() => backToPortal('discover-hubs')}
                    className="border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850 text-xs font-bold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Explore Public Hubs
                  </button>
                </div>
              </div>

              {/* Your Joined Communities Slider / Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-900">
                  <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Grid className="h-4 w-4 text-indigo-500" />
                    Your Communities ({yourCommunities.length})
                  </h2>
                </div>

                {yourCommunities.length === 0 ? (
                  isInitialized && !commLoading ? (
                    <div className="border border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 bg-white dark:bg-zinc-950 dark:border-zinc-850" id="portal-empty">
                      <Compass className="h-8 w-8 text-zinc-300 mx-auto mb-2 animate-pulse" />
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">You haven't joined any communities yet.</h3>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                        Explore communities below to find your cohort, join discussion hubs, and coordinate events.
                      </p>
                      <button 
                        onClick={() => backToPortal('discover-hubs')}
                        className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block cursor-pointer"
                      >
                        Browse active spaces
                      </button>
                    </div>
                  ) : (
                    <div className="border border-zinc-200/60 rounded-2xl p-8 text-center bg-white dark:bg-zinc-950 dark:border-zinc-850 flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <span>Synchronizing your communities...</span>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {yourCommunities.map((comm) => (
                      <div
                        key={comm.id}
                        onClick={() => {
                          enterCommunity(comm.id);
                          setActiveTab('feed');
                        }}
                        className="group cursor-pointer bg-white rounded-2xl border border-zinc-200/80 hover:border-zinc-300 hover:shadow-md transition-all overflow-hidden flex flex-col dark:bg-zinc-950 dark:border-zinc-850"
                      >
                        {/* Cover Image Placeholder */}
                        <div className="h-28 w-full overflow-hidden relative bg-zinc-100 dark:bg-zinc-900">
                          <img 
                            src={comm.bannerUrl} 
                            alt={comm.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2.5 right-2.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-white bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded-full">
                              Member
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div>
                            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 transition-colors">
                              {comm.name}
                            </h3>
                            <p className="text-[11px] text-zinc-400 mt-0.5 font-semibold font-mono">
                              workconnect.com/{comm.slug}
                            </p>
                            <p className="text-xs text-zinc-500 mt-2 line-clamp-2 leading-relaxed dark:text-zinc-400">
                              {comm.description}
                            </p>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400 dark:border-zinc-900">
                            <span className="font-semibold">{comm.memberCount} active members</span>
                            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                              <span>Enter</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Explore Public Communities Grid */}
              <div className="space-y-4" id="discover-hubs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-zinc-900">
                  <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-indigo-500" />
                    Explore Communities ({exploreCommunities.length})
                  </h2>

                  <div className="flex bg-zinc-100 p-0.5 rounded-lg dark:bg-zinc-900">
                    <button
                      onClick={() => setDiscoverFilter('all')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        discoverFilter === 'all' ? 'bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white' : 'text-zinc-400'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setDiscoverFilter('public')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        discoverFilter === 'public' ? 'bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white' : 'text-zinc-400'
                      }`}
                    >
                      Public
                    </button>
                    <button
                      onClick={() => setDiscoverFilter('gated')}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
                        discoverFilter === 'gated' ? 'bg-white text-zinc-950 shadow dark:bg-zinc-800 dark:text-white' : 'text-zinc-400'
                      }`}
                    >
                      Gated
                    </button>
                  </div>
                </div>

                {exploreCommunities.length === 0 ? (
                  isInitialized && !commLoading ? (
                    <div className="border border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 bg-white dark:bg-zinc-950 dark:border-zinc-850">
                      <Compass className="h-8 w-8 text-zinc-300 mx-auto mb-2 opacity-50" />
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">No communities found</h3>
                      <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                        Create the first community space to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-zinc-200/60 rounded-2xl p-8 text-center bg-white dark:bg-zinc-950 dark:border-zinc-850 flex items-center justify-center gap-2 text-xs text-zinc-400">
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                      <span>Loading active spaces...</span>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {exploreCommunities.map((comm) => (
                      <div
                        key={comm.id}
                        onClick={() => {
                          enterCommunity(comm.id);
                          setActiveTab('feed');
                        }}
                        className="cursor-pointer bg-white rounded-2xl border border-zinc-200/80 p-5 shadow-sm hover:border-zinc-300 hover:shadow-md transition-all flex gap-4 dark:bg-zinc-950 dark:border-zinc-850"
                      >
                        {/* Left thumbnail */}
                        <img 
                          src={comm.bannerUrl} 
                          alt={comm.name} 
                          className="w-16 h-16 rounded-xl object-cover shrink-0"
                        />

                        {/* Right info */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="text-sm font-bold text-zinc-900 truncate dark:text-zinc-100">
                                {comm.name}
                              </h3>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                comm.privacy === 'public' 
                                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                              }`}>
                                {comm.privacy}
                              </span>
                            </div>
                            
                            <p className="text-[10px] text-zinc-400 mt-0.5 font-bold font-mono">workconnect.com/{comm.slug}</p>
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2 dark:text-zinc-400 leading-normal">{comm.description}</p>
                          </div>

                          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 mt-3 flex items-center justify-between">
                            <span className="text-[11px] text-zinc-400 font-semibold">{comm.memberCount} members</span>
                            
                            <button
                              onClick={(e) => handleJoinOrLeaveCommunity(comm.id, comm.name, e)}
                              className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all ${
                                comm.isJoined
                                  ? 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
                              }`}
                            >
                              {comm.isJoined ? 'Leave Space' : 'Join Space'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          ) : (
            
            /* INSIDE A COMMUNITY VIEW */
            <motion.div
              key="community"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              
              {!user && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:bg-amber-950/10 dark:border-amber-900/30">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800 dark:text-amber-300">You are exploring as a Guest</p>
                      <p className="text-xs text-amber-600/90 dark:text-amber-400/80 mt-0.5 leading-normal">
                        Sign in or register an account to interact in this community, upvote insights, enroll in classes, RSVP to events, or start your own workspace.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setAuthMode('signin');
                      setShowAuthModal(true);
                    }}
                    className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all w-full sm:w-auto text-center font-semibold"
                  >
                    Authenticate Account
                  </button>
                </div>
              )}
              
              {/* Active Tab Panel */}
              {activeTab === 'feed' && (
                <CommunityTab 
                  activeCommunity={activeCommunity}
                  posts={communityPosts}
                  categories={mockCategories}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onUpvotePost={handleUpvotePost}
                  onAddPost={handleAddPost}
                  onAddComment={handleAddComment}
                  onToggleBookmark={() => {}}
                  currentUser={mappedCurrentUser}
                  leaderboardUsers={leaderboardUsers}
                  onOpenNewsletterComposeWithContent={handleOpenNewsletterComposeWithContent}
                  onSelectUser={(u) => setInspectingUser(u)}
                />
              )}

              {activeTab === 'classroom' && (
                <ClassroomTab 
                  courses={communityCourses}
                  currentUser={mappedCurrentUser}
                  isAdminOrOwner={isAdminOrOwner}
                  onToggleLessonCompleted={handleToggleLessonCompleted}
                  onAddLessonDiscussion={handleAddLessonDiscussion}
                  onAddCourse={handleAddCourse}
                  onUpdateLessonVideo={handleUpdateLessonVideo}
                />
              )}

              {activeTab === 'events' && (
                <CalendarTab 
                  events={communityEvents}
                  isAdminOrOwner={isAdminOrOwner}
                  onRSVP={handleToggleRsvp}
                  rsvpLoadingId={rsvpLoadingId}
                  onShowNotification={showToast}
                  onAddEvent={handleAddEvent}
                />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardTab 
                  users={leaderboardUsers}
                  currentUser={mappedCurrentUser}
                  onSelectUser={(u) => setInspectingUser(u)}
                />
              )}

              {activeTab === 'newsletter' && (
                <NewsletterTab 
                  broadcasts={communityBroadcasts}
                  trendingPosts={communityPosts.slice(0, 2)}
                  isAdminOrOwner={isAdminOrOwner}
                  onAddBroadcast={handleAddBroadcast}
                  onShowNotification={showToast}
                />
              )}

            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Mobile sub navigation bar (Inside a community only) */}
      {viewMode === 'community' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200/80 z-30 dark:bg-zinc-900 dark:border-zinc-800 shadow-lg px-4 h-16 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-center ${
              activeTab === 'feed' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('classroom')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-center ${
              activeTab === 'classroom' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">Class</span>
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-center ${
              activeTab === 'events' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">Events</span>
          </button>

          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-center ${
              activeTab === 'leaderboard' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`}
          >
            <Trophy className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">Ranks</span>
          </button>

          <button
            onClick={() => setActiveTab('newsletter')}
            className={`flex flex-col items-center justify-center flex-1 h-full text-center ${
              activeTab === 'newsletter' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'
            }`}
          >
            <Inbox className="h-5 w-5" />
            <span className="text-[10px] font-bold mt-1">Studio</span>
          </button>
        </div>
      )}

      </div>

      {/* CREATE A COMMUNITY MODAL */}
      <CreateCommunityModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        newCommName={newCommName}
        newCommSlug={newCommSlug}
        newCommDesc={newCommDesc}
        newCommPrivacy={newCommPrivacy}
        onNameChange={handleNameChange}
        onSlugChange={setNewCommSlug}
        onDescChange={setNewCommDesc}
        onPrivacyChange={setNewCommPrivacy}
        onSubmit={handleCreateCommunity}
      />

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        upName={upName}
        setUpName={setUpName}
        upHeadline={upHeadline}
        setUpHeadline={setUpHeadline}
        upAvatar={upAvatar}
        setUpAvatar={setUpAvatar}
        upBio={upBio}
        setUpBio={setUpBio}
        upSkills={upSkills}
        setUpSkills={setUpSkills}
        upGithub={upGithub}
        setUpGithub={setUpGithub}
        upLinkedin={upLinkedin}
        setUpLinkedin={setUpLinkedin}
        upWebsite={upWebsite}
        setUpWebsite={setUpWebsite}
        prebuiltAvatars={prebuiltAvatars}
        onSubmit={handleProfileUpdateSubmit}
      />

      {/* PUBLIC USER PROFILE DRAWER / MODAL */}
      <UserProfileModal 
        user={inspectingUser}
        isOpen={!!inspectingUser}
        onClose={() => setInspectingUser(null)}
        isCurrentUser={inspectingUser?.id === mappedCurrentUser.id}
        onEditProfile={() => {
          setInspectingUser(null);
          openEditProfileModal();
        }}
      />

      {/* GLOBAL Cmd+K SEARCH MODAL */}
      <GlobalSearchModal 
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        query={globalSearchQuery}
        setQuery={setGlobalSearchQuery}
        communities={communities}
        posts={posts}
        courses={courses}
        onSelectCommunity={(communityId) => {
          enterCommunity(communityId);
          setActiveTab('feed');
          setShowSearchModal(false);
          setGlobalSearchQuery('');
        }}
        onSelectPost={(communityId) => {
          enterCommunity(communityId);
          setActiveTab('feed');
          setShowSearchModal(false);
          setGlobalSearchQuery('');
        }}
        onSelectCourse={(communityId) => {
          enterCommunity(communityId);
          setActiveTab('classroom');
          setShowSearchModal(false);
          setGlobalSearchQuery('');
        }}
      />

      {/* Global Toast Alerts */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl px-4 py-3 shadow-2xl flex items-center gap-2 text-xs font-bold"
          >
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ON-DEMAND AUTH MODAL */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={closeAuthModal}
        authMode={authMode}
        setAuthMode={setAuthMode}
        verificationEmail={verificationEmail}
        setVerificationEmail={setVerificationEmail}
        authBannerMessage={authBannerMessage}
        intent={authIntent}
        errorMessage={authErrorMessage}
        suEmail={suEmail}
        setSuEmail={setSuEmail}
        suPassword={suPassword}
        setSuPassword={setSuPassword}
        suName={suName}
        setSuName={setSuName}
        suHeadline={suHeadline}
        setSuHeadline={setSuHeadline}
        handleAuthSubmit={handleAuthSubmit}
      />

      <OfflineIndicator />

    </div>
  );
}

export default function App() {
  const auth = useAuth();
  return (
    <CommunityProvider user={auth.user}>
      <AppContent auth={auth} />
    </CommunityProvider>
  );
}
