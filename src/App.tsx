import React, { useState, useEffect } from 'react';
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
  Profile
} from './lib/supabase';

export default function App() {
  const { user, loading: authLoading, isAdminOrOwner, setRole, updateProfile, signUp } = useAuth();
  
  // Navigation View modes: 'portal' or 'community'
  const [viewMode, setViewMode] = useState<'portal' | 'community'>('portal');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);
  
  // Tab within the selected community
  const [activeTab, setActiveTab] = useState<'feed' | 'classroom' | 'events' | 'leaderboard' | 'newsletter'>('feed');

  // Database-driven reactive states
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [courses, setCourses] = useState<CourseTrack[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [leaderboardUsers, setLeaderboardUsers] = useState<User[]>([]);

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
    if (!user) return;
    setDbLoading(true);
    try {
      // 1. Get raw communities
      const rawComm = await dbService.listCommunities();
      const memberships = await dbService.getMemberships(user.id);
      
      const mappedCommunities = rawComm.map(c => {
        const isJoined = memberships.some(m => m.community_id === c.id);
        return mapCommunityToUI(c, isJoined);
      });
      setCommunities(mappedCommunities);

      // 2. Fetch hydrated items for currently active community (if inside one)
      if (selectedCommunityId) {
        const activeId = selectedCommunityId;
        const [hydratedPosts, hydratedCourses, hydratedEvents, hydratedNewsletters] = await Promise.all([
          getHydratedPosts(activeId),
          getHydratedCourses(activeId, user.id),
          getHydratedEvents(activeId),
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
    if (user) {
      loadDatabaseData();
    }
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
  const yourJoinedCommunities = communities.filter(c => c.isJoined);
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
    if (!newCommName.trim() || !newCommSlug.trim() || !user) return;

    try {
      const commId = `c-${Date.now()}`;
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
        id: `m-${user.id}-${commId}`,
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
          id: `m-${user.id}-${communityId}`,
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
    if (!user) return;
    try {
      const postItem = posts.find(p => p.id === postId);
      if (!postItem) return;

      const incremented = (postItem.upvotes || 0) + 1;
      await dbService.updatePostUpvotes(postId, incremented);
      
      // Reward Karma Points to post author
      if (postItem.author.id) {
        const authorProfile = await dbService.getProfile(postItem.author.id);
        if (authorProfile) {
          await dbService.upsertProfile({
            ...authorProfile,
            karma_points: (authorProfile.karma_points || 0) + 10
          });
        }
      }

      showToast('Voted! Dynamic karma points allocated.');
      await loadDatabaseData();
    } catch (err) {
      console.error(err);
    }
  };

  // Add Comment Action
  const handleAddComment = async (postId: string, commentText: string) => {
    if (!user) return;
    try {
      const cId = `com-${Date.now()}`;
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
    } catch (e) {
      console.error(e);
    }
  };

  // Add Post Action
  const handleAddPost = async (postData: { title: string; content: string; codeSnippet?: string; category: string }, sendAsNewsletter: boolean) => {
    if (!user || !selectedCommunityId) return;
    try {
      const postId = `p-${Date.now()}`;
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
        const bId = `b-${Date.now()}`;
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
    } catch (e) {
      console.error(e);
    }
  };

  // Classroom - Add Course Action
  const handleAddCourse = async (title: string, description: string, bannerColor: string) => {
    if (!selectedCommunityId || !user) return;
    try {
      const courseId = `course-${Date.now()}`;
      await dbService.createCourse({
        id: courseId,
        community_id: selectedCommunityId,
        title,
        description,
        banner_color: bannerColor
      });

      // Create a default first lesson
      await dbService.createLesson({
        id: `lesson-${Date.now()}`,
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
  const handleAddEvent = async (title: string, description: string, date: string, time: string, meetUrl: string) => {
    if (!selectedCommunityId || !user) return;
    try {
      const eId = `evt-${Date.now()}`;
      await dbService.createEvent({
        id: eId,
        community_id: selectedCommunityId,
        title,
        description,
        host_name: user.full_name,
        host_avatar: user.avatar_url,
        starts_at: `${date} at ${time}`,
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
    showToast('RSVP confirmed! Added to your schedule.');
  };

  // Newsletter - Add Broadcast Action
  const handleAddBroadcast = async (broadcastData: { subject: string; cohort: string; content: string }) => {
    if (!selectedCommunityId || !user) return;
    try {
      const bId = `b-${Date.now()}`;
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

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suName.trim()) return;
    await signUp(suName, suHeadline || 'Intern', suAvatar, suRole);
    showToast('Welcome to Work Connect! Profile generated.');
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

  // Render Auth Setup if user session doesn't exist
  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl max-w-md w-full space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-indigo-500 text-white flex items-center justify-center mx-auto shadow-md">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Welcome to Work Connect</h2>
            <p className="text-xs text-zinc-500">Configure your profile identity and choose your role to begin.</p>
          </div>

          <form onSubmit={handleSignupSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Alex Rivera"
                value={suName}
                onChange={(e) => setSuName(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Headline / Cohort Title</label>
              <input 
                type="text" 
                placeholder="e.g. Software Engineering Intern"
                value={suHeadline}
                onChange={(e) => setSuHeadline(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Choose Role & Permissions Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { role: 'member', label: 'Member', desc: 'Standard Access' },
                  { role: 'admin', label: 'Admin', desc: 'Write & Edit' },
                  { role: 'owner', label: 'Owner', desc: 'Full Authority' }
                ].map((item) => (
                  <button
                    key={item.role}
                    type="button"
                    onClick={() => setSuRole(item.role as any)}
                    className={`p-3 border rounded-xl text-center transition-all ${
                      suRole === item.role
                        ? 'border-indigo-600 bg-indigo-50/20 text-indigo-700 dark:border-indigo-500 dark:text-indigo-400 dark:bg-zinc-850'
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span className="text-[8px] text-zinc-400 mt-0.5 block leading-tight">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Select Avatar</label>
              <div className="flex items-center gap-2 justify-center py-2">
                {prebuiltAvatars.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setSuAvatar(av)}
                    className={`h-10 w-10 rounded-full overflow-hidden border-2 transition-all ${
                      suAvatar === av ? 'border-indigo-500 scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={av} alt="avatar option" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-lg transition-all"
            >
              Sign Up & Join Workspace
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 flex flex-col font-sans select-none antialiased">
      
      {/* Dynamic Role Tester Banner (Visual Proof of RBAC Gating) */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center flex items-center justify-center gap-3 text-xs font-bold text-amber-700 dark:text-amber-400">
        <div className="flex items-center gap-1">
          <ShieldAlert className="h-4 w-4" />
          <span>Role Simulator: Currently testing as <strong className="uppercase font-extrabold">{user.role}</strong></span>
        </div>
        <div className="flex items-center bg-white/40 dark:bg-zinc-900/60 p-0.5 rounded-lg border border-amber-500/30">
          <button 
            onClick={() => { setRole('member'); showToast('Role toggled to Member.'); }}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${user.role === 'member' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}
          >
            Member
          </button>
          <button 
            onClick={() => { setRole('admin'); showToast('Role toggled to Admin.'); }}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${user.role === 'admin' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}
          >
            Admin
          </button>
          <button 
            onClick={() => { setRole('owner'); showToast('Role toggled to Owner.'); }}
            className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${user.role === 'owner' ? 'bg-amber-500 text-white' : 'text-zinc-500'}`}
          >
            Owner
          </button>
        </div>
      </div>

      {/* Global Header Layout */}
      <header className="sticky top-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200/60 dark:border-zinc-900/80 z-40 px-4 h-15 flex items-center shadow-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          
          {/* Logo & Cohort switcher */}
          <div className="flex items-center gap-4">
            <button 
              onClick={() => { setViewMode('portal'); setSelectedCommunityId(null); }}
              className="flex items-center gap-2"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold shadow-sm hover:scale-105 transition-transform">
                <span>W</span>
              </div>
              <span className="text-sm font-black tracking-tight text-zinc-950 dark:text-white hidden sm:block">Work Connect</span>
            </button>

            {viewMode === 'community' && activeCommunity && (
              <>
                <ChevronRight className="h-4 w-4 text-zinc-300 hidden sm:block" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-50 hidden sm:block truncate max-w-[150px]">
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

            {/* Notification Drawer trigger */}
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

            {/* PWA Direct trigger */}
            {isInstallable && (
              <button 
                onClick={install}
                className="hidden sm:flex items-center gap-1 border border-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <span>Install</span>
              </button>
            )}

            {/* Profile Level Widget with Edit Profile Trigger */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setShowProfileModal(true)}>
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
            </div>

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
                    onClick={() => setShowCreateModal(true)}
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

              {/* Discover Public Hubs Grid */}
              <div className="space-y-4" id="discover-hubs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-2 dark:border-zinc-900">
                  <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                    <Compass className="h-4 w-4 text-indigo-500" />
                    Discover Public Hubs ({discoverCommunities.length})
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

      {/* CREATE A COMMUNITY MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-indigo-500 fill-indigo-100 dark:fill-indigo-950/40" />
                  Create a Community
                </h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-250"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleCreateCommunity} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Community Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Interns Summer 2026, Frontend Guild"
                    value={newCommName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Handle Slug URL</label>
                  <div className="flex rounded-xl bg-zinc-50 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 overflow-hidden text-xs">
                    <span className="px-3.5 py-2.5 text-zinc-400 border-r border-zinc-200 bg-zinc-100 dark:bg-zinc-850 dark:border-zinc-700 select-none font-medium">
                      workconnect.com/
                    </span>
                    <input 
                      type="text" 
                      required
                      placeholder="slug"
                      value={newCommSlug}
                      onChange={(e) => setNewCommSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, ''))}
                      className="flex-1 px-3.5 py-2.5 bg-transparent focus:outline-none font-semibold text-zinc-700 dark:text-zinc-200"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Hub Description</label>
                  <textarea 
                    rows={3}
                    placeholder="Briefly describe the purpose of this community space..."
                    value={newCommDesc}
                    onChange={(e) => setNewCommDesc(e.target.value)}
                    className="w-full text-xs font-medium px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Privacy Level</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'public', label: 'Public', icon: Globe },
                      { val: 'gated', label: 'Gated', icon: UserCheck },
                      { val: 'private', label: 'Private', icon: Lock }
                    ].map((mode) => (
                      <button
                        key={mode.val}
                        type="button"
                        onClick={() => setNewCommPrivacy(mode.val as any)}
                        className={`p-2.5 border rounded-xl text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                          newCommPrivacy === mode.val
                            ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:border-indigo-500 dark:text-indigo-400 dark:bg-zinc-850'
                            : 'border-zinc-200 bg-white hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <mode.icon className="h-4 w-4" />
                        <span>{mode.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="text-xs font-bold border border-zinc-200 text-zinc-700 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-350"
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                  >
                    Launch Community
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* EDIT PROFILE MODAL */}
      <AnimatePresence>
        {showProfileModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="fixed inset-0 bg-black z-50"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50"
            >
              <div className="flex justify-between items-center pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  <UserIcon className="h-4.5 w-4.5 text-indigo-500" />
                  Your Profile Information
                </h3>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="text-zinc-400 hover:text-zinc-600"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <form onSubmit={handleProfileUpdateSubmit} className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Full Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Alex Rivera"
                    value={upName}
                    onChange={(e) => setUpName(e.target.value)}
                    className="w-full text-xs font-semibold px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Headline / Cohort Title</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Software Engineering Intern"
                    value={upHeadline}
                    onChange={(e) => setUpHeadline(e.target.value)}
                    className="w-full text-xs font-semibold px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-200"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">Select Avatar Icon</label>
                  <div className="flex items-center gap-2 justify-center py-2">
                    {prebuiltAvatars.map((av) => (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setUpAvatar(av)}
                        className={`h-10 w-10 rounded-full overflow-hidden border-2 transition-all ${
                          upAvatar === av ? 'border-indigo-500 scale-110 shadow' : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={av} alt="avatar option" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="text-xs font-bold border border-zinc-200 text-zinc-600 px-4 py-2 rounded-xl hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-350"
                  >
                    Cancel
                  </button>

                  <button 
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-md transition-all"
                  >
                    Save Modifications
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* GLOBAL Cmd+K SEARCH MODAL */}
      <AnimatePresence>
        {showSearchModal && (
          <>
            <div className="fixed inset-0 bg-black/30 z-50 backdrop-blur-xs" onClick={() => setShowSearchModal(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
                <Search className="h-4.5 w-4.5 text-zinc-400" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Global search posts, classes, users, events..."
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  className="w-full text-xs font-medium focus:outline-none bg-transparent dark:text-zinc-200"
                />
                <button 
                  onClick={() => setShowSearchModal(false)}
                  className="text-[10px] font-bold text-zinc-400 hover:text-zinc-600 bg-zinc-100 px-1.5 py-1 rounded dark:bg-zinc-850"
                >
                  ESC
                </button>
              </div>

              {/* Instant Search Results */}
              <div className="max-h-64 overflow-y-auto p-4 divide-y divide-zinc-50 dark:divide-zinc-850">
                {globalSearchQuery === '' ? (
                  <div className="text-center py-6 text-zinc-400">
                    <Laptop className="h-6 w-6 mx-auto mb-1.5 opacity-50" />
                    <p className="text-[11px]">Type something to browse communities, feeds, and classes instantly...</p>
                  </div>
                ) : (
                  <>
                    {/* Communities match */}
                    {communities.filter(c => c.name.toLowerCase().includes(globalSearchQuery.toLowerCase())).map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setSelectedCommunityId(c.id);
                          setViewMode('community');
                          setActiveTab('feed');
                          setShowSearchModal(false);
                          setGlobalSearchQuery('');
                        }}
                        className="py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded px-2 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-1 rounded dark:bg-zinc-900 dark:text-indigo-400">Community</span>
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{c.name}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />
                      </div>
                    ))}

                    {/* Posts match */}
                    {posts.filter(p => p.title.toLowerCase().includes(globalSearchQuery.toLowerCase())).map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setSelectedCommunityId(p.communityId || 'interns-2026');
                          setViewMode('community');
                          setActiveTab('feed');
                          setShowSearchModal(false);
                          setGlobalSearchQuery('');
                        }}
                        className="py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded px-2"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1 rounded dark:bg-zinc-900 dark:text-amber-400">Post</span>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{p.title}</p>
                      </div>
                    ))}

                    {/* Courses match */}
                    {courses.filter(c => c.title.toLowerCase().includes(globalSearchQuery.toLowerCase())).map(c => (
                      <div 
                        key={c.id} 
                        onClick={() => {
                          setSelectedCommunityId(c.communityId || 'interns-2026');
                          setViewMode('community');
                          setActiveTab('classroom');
                          setShowSearchModal(false);
                          setGlobalSearchQuery('');
                        }}
                        className="py-2.5 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-850 rounded px-2"
                      >
                        <span className="text-[9px] font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-1 rounded dark:bg-zinc-900 dark:text-teal-400">Course</span>
                        <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-1">{c.title}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

      <OfflineIndicator />

    </div>
  );
}
