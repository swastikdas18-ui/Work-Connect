import React, { useState, useEffect, useRef } from 'react';
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
import { AuthModal } from './components/AuthModal';
import { CreateCommunityModal } from './components/CreateCommunityModal';
import { EditProfileModal } from './components/EditProfileModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { usePWAInstall } from './hooks/usePWAInstall';
import { useAuth } from './lib/auth';
import { 
  dbService, 
  getHydratedPosts, 
  getHydratedCourses, 
  getHydratedEvents, 
  getHydratedNewsletters, 
  mapProfileToUser, 
  mapCommunityToUI,
  isSupabaseConfigured,
  isSupabaseSchemaMissing,
  onSupabaseSchemaMissing,
  Profile,
  Membership
} from './lib/supabase';
import { SUPABASE_SETUP_SQL } from './data/setupSql';

// Persistent in-memory cache for switching between community and portal views seamlessly
let cachedCommunities: Community[] | null = null;
let cachedMemberships: Membership[] | null = null;

export default function App() {
  const { user, session, loading: authLoading, signIn, signUp, signOut, setRole, updateProfile } = useAuth();
  
  // Custom states for intercepted community creation and unhandled email verification
  const [authBannerMessage, setAuthBannerMessage] = useState<string | null>(null);
  const [pendingCreateCommunity, setPendingCreateCommunity] = useState<boolean>(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  
  // Navigation View modes: 'portal' or 'community'
  const [viewMode, setViewMode] = useState<'portal' | 'community'>('portal');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  
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

  // Database-driven reactive states
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Community[]>(cachedCommunities || []);
  const [memberships, setMemberships] = useState<Membership[]>(cachedMemberships || []);
  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<CourseTrack[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
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

  // State to track if live Supabase schema is missing
  const [schemaMissing, setSchemaMissing] = useState(isSupabaseSchemaMissing);

  useEffect(() => {
    onSupabaseSchemaMissing(() => {
      setSchemaMissing(true);
      showToast('Live database is uninitialized. Running in local sandbox.');
    });
  }, []);

  useEffect(() => {
    if (user && pendingCreateCommunity) {
      setShowCreateModal(true);
      setPendingCreateCommunity(false);
      setAuthBannerMessage(null);
    }
  }, [user, pendingCreateCommunity]);

  const handleCreateCommunityClick = () => {
    if (!user) {
      setAuthBannerMessage("Please sign in or create an account to start a community.");
      setPendingCreateCommunity(true);
      setAuthMode('signin');
      setShowAuthModal(true);
    } else {
      setShowCreateModal(true);
    }
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
    setVerificationEmail(null);
    setAuthBannerMessage(null);
    setPendingCreateCommunity(false);
  };

  const handleBackToPortal = () => {
    setSelectedCommunityId(null);
    setViewMode('portal');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // State to control on-demand auth modal visibility
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Helper to guard protected actions and prompt login modal if needed
  const ensureUserAuthenticated = (actionDescription: string): boolean => {
    if (!user) {
      setAuthMode('signin');
      setShowAuthModal(true);
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

  // Async data loader calling Supabase DB Service
  const loadDatabaseData = async () => {
    setDbLoading(true);
    try {
      // 1. Get raw communities
      const rawComm = await dbService.listCommunities();
      const userMemberships = user ? await dbService.getMemberships(user.id) : [];
      setMemberships(userMemberships);
      cachedMemberships = userMemberships;
      
      const mappedCommunities = rawComm.map(c => {
        const isJoined = userMemberships.some(m => m.community_id === c.id);
        return mapCommunityToUI(c, isJoined);
      });
      setCommunities(mappedCommunities);
      cachedCommunities = mappedCommunities;

      // 2. Fetch hydrated items for currently active community (if inside one)
      if (selectedCommunityId) {
        const activeId = selectedCommunityId;
        const [hydratedPosts, hydratedCourses, hydratedEvents, hydratedNewsletters] = await Promise.all([
          getHydratedPosts(activeId, user ? user.id : undefined),
          getHydratedCourses(activeId, user ? user.id : 'anonymous'),
          getHydratedEvents(activeId, user ? user.id : undefined),
          getHydratedNewsletters(activeId)
        ]);
        setPosts(hydratedPosts);
        setCourses(hydratedCourses);
        setEvents(hydratedEvents);
        setBroadcasts(hydratedNewsletters);
      }

      // 3. Load rankings
      const rawProfiles = await dbService.getLeaderboard();
      const mappedRankings = rawProfiles.map(p => mapProfileToUser(p));
      setLeaderboardUsers(mappedRankings);

    } catch (e) {
      console.error('Error fetching database collections:', e);
      showToast('Database sync issue. Using local persistence fallback.');
    } finally {
      setDbLoading(false);
    }
  };

  // Fetch at boot and when selection switches
  useEffect(() => {
    loadDatabaseData();
  }, [user, selectedCommunityId]);

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
  const activeCommunity = communities.find(c => c.id === selectedCommunityId) || communities[0];

  // Selected subcollections inside active community
  const communityPosts = posts.filter(p => p.communityId === selectedCommunityId);
  const communityCourses = courses.filter(c => c.communityId === selectedCommunityId);
  const communityEvents = events.filter(e => e.communityId === selectedCommunityId);
  const communityBroadcasts = broadcasts.filter(b => b.communityId === selectedCommunityId);

  // Helper selectors for Portal Page
  const joinedCommunityIds = new Set(memberships.map((m) => m.community_id));
  const yourJoinedCommunities = communities.filter((c) => 
    c.created_by === user?.id || joinedCommunityIds.has(c.id) || c.isJoined
  );
  const discoverCommunities = communities.filter(c => {
    if (discoverFilter === 'public') return c.privacy === 'public';
    if (discoverFilter === 'gated') return c.privacy === 'gated';
    return true;
  });

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

      await dbService.createCommunity(commData);
      // Auto join as admin/owner
      await dbService.createMembership({
        id: generateId('m'),
        user_id: user.id,
        community_id: commId,
        role: 'owner',
        joined_at: new Date().toISOString()
      });

      showToast(`Community "${newCommName}" launched successfully!`);
      setShowCreateModal(false);
      setNewCommName('');
      setNewCommSlug('');
      setNewCommDesc('');
      setNewCommPrivacy('public');
      
      // Reload lists
      await loadDatabaseData();
    } catch (e) {
      console.error(e);
      showToast('Error creating community space.');
    }
  };

  // Join or Leave community
  const handleJoinOrLeaveCommunity = async (communityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ensureUserAuthenticated('join communities')) return;
    if (!user) return;

    try {
      const comm = communities.find(c => c.id === communityId);
      if (!comm) return;

      if (comm.isJoined) {
        // Leave
        await dbService.deleteMembership(user.id, communityId);
        showToast(`Left "${comm.name}".`);
      } else {
        // Join
        await dbService.createMembership({
          id: generateId('m'),
          user_id: user.id,
          community_id: communityId,
          role: 'member',
          joined_at: new Date().toISOString()
        });
        showToast(`Successfully joined "${comm.name}"!`);
      }

      await loadDatabaseData();
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
      await loadDatabaseData();
    } catch (err: any) {
      console.error(err);
      if (err?.message && err.message.includes('Rate limit exceeded')) {
        showToast("You're doing that too fast. Please wait a moment before trying again.");
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
      await loadDatabaseData();
    } catch (e: any) {
      console.error(e);
      if (e?.message && e.message.includes('Rate limit exceeded')) {
        showToast("You're doing that too fast. Please wait a moment before trying again.");
      } else {
        showToast('Failed to submit comment.');
      }
    }
  };

  // Add Post Action
  const handleAddPost = async (postData: { title: string; content: string; codeSnippet?: string; category: string }, sendAsNewsletter: boolean) => {
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

      await loadDatabaseData();
    } catch (e: any) {
      console.error(e);
      if (e?.message && e.message.includes('Rate limit exceeded')) {
        showToast("You're doing that too fast. Please wait a moment before trying again.");
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
      await loadDatabaseData();
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
      await loadDatabaseData();
    } catch (e) {
      console.error(e);
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
      await loadDatabaseData();
    } catch (e) {
      console.error(e);
    }
  };

  // Calendar - RSVP
  const handleRSVPEvent = async (eventId: string) => {
    if (!user) {
      showToast('Please sign in or create an account to RSVP.');
      setShowAuthModal(true);
      return;
    }
    try {
      const { rsvped } = await dbService.toggleRSVP(eventId, user.id);
      if (rsvped) {
        showToast('RSVP confirmed! Added to your schedule.');
      } else {
        showToast('RSVP cancelled successfully.');
      }
      await loadDatabaseData();
    } catch (e) {
      console.error('RSVP Error:', e);
      showToast('Failed to register RSVP.');
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
      await loadDatabaseData();
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
      showToast('Please enter both email and password.');
      return;
    }

    try {
      if (authMode === 'signin') {
        await signIn(suEmail, suPassword);
        showToast('Successfully signed in!');
        if (pendingCreateCommunity) {
          setShowCreateModal(true);
          setPendingCreateCommunity(false);
          setAuthBannerMessage(null);
        }
        setShowAuthModal(false);
      } else {
        if (!suName.trim()) {
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
          if (pendingCreateCommunity) {
            setShowCreateModal(true);
            setPendingCreateCommunity(false);
            setAuthBannerMessage(null);
          }
          setShowAuthModal(false);
        }
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Authentication transaction failed.');
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upName.trim()) return;
    await updateProfile(upName, upHeadline, upAvatar);
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

  const isAnyModalOpen = showCreateModal || showProfileModal || showSearchModal || showAuthModal;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex flex-col font-sans select-none antialiased">
      
      {/* Outer wrapper to trap focus and prevent keyboard navigation behind modals */}
      <div 
        className="flex-1 flex flex-col"
        {...(isAnyModalOpen ? { inert: '' } : {})}
      >

      {/* Supabase Schema Missing Resilient Fallback Banner */}
      {schemaMissing && (
        <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-4 py-3 text-xs text-indigo-950 dark:text-indigo-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 font-semibold">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
              <span>
                ⚡ <strong>Supabase Connected (Sandbox Mode Active)</strong>: We detected that your Supabase tables haven't been created yet. The app remains fully functional using an automatic Local Storage fallback.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
                  showToast('Supabase SQL Setup script copied to clipboard!');
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>Copy Setup SQL</span>
              </button>
              <button
                onClick={() => setSchemaMissing(false)}
                className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200 text-[10px] font-bold px-2 py-1.5"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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
                      {/* Header Section: Name, Headline & Email */}
                      <div className="p-4 border-b border-zinc-100 dark:border-zinc-850">
                        <div className="font-bold text-zinc-900 dark:text-white truncate">
                          {mappedCurrentUser.name}
                        </div>
                        {mappedCurrentUser.cohort && (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {mappedCurrentUser.cohort}
                          </div>
                        )}
                        <div className="text-xs text-zinc-400 dark:text-zinc-500 truncate mt-1">
                          {session?.user?.email || `${mappedCurrentUser.name.toLowerCase().replace(/\s+/g, '')}@company.com`}
                        </div>
                      </div>

                      {/* Quick Links Section */}
                      <div className="p-1.5 space-y-0.5 border-b border-zinc-100 dark:border-zinc-850">
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setShowProfileModal(true);
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-900 rounded-lg transition-all"
                        >
                          Profile Settings
                        </button>
                        <button
                          onClick={() => {
                            setIsProfileDropdownOpen(false);
                            setViewMode('portal');
                            setSelectedCommunityId(null);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="w-full text-left px-3 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:text-white dark:hover:bg-zinc-900 rounded-lg transition-all"
                        >
                          Your Communities
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
                              setSelectedCommunityId(null);
                              setViewMode('portal');
                              showToast('Logged out successfully');
                            } catch (err: any) {
                              showToast('Failed to log out: ' + err.message);
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

                  <a 
                    href="#discover-hubs"
                    className="border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-850 text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
                  >
                    Explore Public Hubs
                  </a>
                </div>
              </div>

              {/* Your Joined Communities Slider / Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-900">
                  <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Grid className="h-4 w-4 text-indigo-500" />
                    Your Communities ({yourJoinedCommunities.length})
                  </h2>
                </div>

                {yourJoinedCommunities.length === 0 ? (
                  <div className="border border-zinc-200 rounded-2xl p-8 text-center text-zinc-400 bg-white dark:bg-zinc-950 dark:border-zinc-850" id="portal-empty">
                    <Compass className="h-8 w-8 text-zinc-300 mx-auto mb-2 animate-pulse" />
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">You haven't joined any communities yet.</h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 leading-relaxed">
                      Explore communities below to find your cohort, join discussion hubs, and coordinate events.
                    </p>
                    <a href="#discover-hubs" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-2 inline-block">Browse active spaces</a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {yourJoinedCommunities.map((comm) => (
                      <div
                        key={comm.id}
                        onClick={() => {
                          setSelectedCommunityId(comm.id);
                          setViewMode('community');
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
                    Explore Communities ({discoverCommunities.length})
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {discoverCommunities.map((comm) => (
                    <div
                      key={comm.id}
                      onClick={() => {
                        setSelectedCommunityId(comm.id);
                        setViewMode('community');
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
                            onClick={(e) => handleJoinOrLeaveCommunity(comm.id, e)}
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
                />
              )}

              {activeTab === 'events' && (
                <CalendarTab 
                  events={communityEvents}
                  isAdminOrOwner={isAdminOrOwner}
                  onRSVP={handleRSVPEvent}
                  onShowNotification={showToast}
                  onAddEvent={handleAddEvent}
                />
              )}

              {activeTab === 'leaderboard' && (
                <LeaderboardTab 
                  users={leaderboardUsers}
                  currentUser={mappedCurrentUser}
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
        prebuiltAvatars={prebuiltAvatars}
        onSubmit={handleProfileUpdateSubmit}
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
          setSelectedCommunityId(communityId);
          setViewMode('community');
          setActiveTab('feed');
          setShowSearchModal(false);
          setGlobalSearchQuery('');
        }}
        onSelectPost={(communityId) => {
          setSelectedCommunityId(communityId);
          setViewMode('community');
          setActiveTab('feed');
          setShowSearchModal(false);
          setGlobalSearchQuery('');
        }}
        onSelectCourse={(communityId) => {
          setSelectedCommunityId(communityId);
          setViewMode('community');
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
