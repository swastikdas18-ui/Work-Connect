import { createClient } from '@supabase/supabase-js';

// Database Schemas & Interfaces as requested by the user
export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  headline: string;
  cohort_tag: string;
  karma_points: number;
  role: 'owner' | 'admin' | 'member';
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  privacy: 'public' | 'gated' | 'private';
  accent_color: string;
  created_by: string;
  member_count: number;
  banner_url?: string;
}

export interface Membership {
  id: string;
  user_id: string;
  community_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  category: string;
  title: string;
  body: string;
  upvotes_count: number;
  comments_count: number;
  created_at: string;
}

export interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  created_at: string;
}

export interface Event {
  id: string;
  community_id: string;
  title: string;
  description?: string;
  host_name: string;
  host_avatar?: string;
  starts_at: string;
  meet_url: string;
  attendees_count: number;
}

export interface Newsletter {
  id: string;
  community_id: string;
  subject: string;
  recipient_group: string;
  status: 'draft' | 'sent';
  sent_at?: string;
  body?: string;
  open_rate?: number;
  click_rate?: number;
}

export interface Course {
  id: string;
  community_id: string;
  title: string;
  description: string;
  banner_color: string;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  duration: string;
  description: string;
  video_url?: string;
  download_url?: string;
  is_completed?: boolean;
}

export interface LessonCompletion {
  id: string;
  user_id: string;
  lesson_id: string;
  completed_at: string;
}

// Check configuration status
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder-url.supabase.co');

// Instantiate Supabase client (using fallback URL/key to avoid initialization error)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

// Fallback empty local-storage mock DB so the app functions instantly if no credentials are added yet
const getLocalData = <T>(key: string, defaultVal: T): T => {
  try {
    const saved = localStorage.getItem(`wc_db_${key}`);
    return saved ? JSON.parse(saved) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setLocalData = <T>(key: string, val: T): void => {
  try {
    localStorage.setItem(`wc_db_${key}`, JSON.stringify(val));
  } catch {}
};

// Initial state is strictly clean and empty as requested
const initialLocalDB = {
  profiles: [] as Profile[],
  communities: [] as Community[],
  memberships: [] as Membership[],
  posts: [] as Post[],
  comments: [] as Comment[],
  events: [] as Event[],
  newsletters: [] as Newsletter[],
  courses: [] as Course[],
  lessons: [] as Lesson[],
  lessonCompletions: [] as LessonCompletion[]
};

// Database Service Layer with dual Support: Real Supabase API calls & Local Fallback
export const dbService = {
  // Profiles
  async getProfile(userId: string): Promise<Profile | null> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) return null;
      return data;
    } else {
      const profiles = getLocalData<Profile[]>('profiles', []);
      return profiles.find(p => p.id === userId) || null;
    }
  },

  async upsertProfile(profile: Profile): Promise<Profile> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profile)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const profiles = getLocalData<Profile[]>('profiles', []);
      const index = profiles.findIndex(p => p.id === profile.id);
      if (index >= 0) {
        profiles[index] = profile;
      } else {
        profiles.push(profile);
      }
      setLocalData('profiles', profiles);
      return profile;
    }
  },

  async getLeaderboard(): Promise<Profile[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('karma_points', { ascending: false });
      if (error) return [];
      return data || [];
    } else {
      const profiles = getLocalData<Profile[]>('profiles', []);
      return [...profiles].sort((a, b) => b.karma_points - a.karma_points);
    }
  },

  // Communities
  async listCommunities(): Promise<Community[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('communities')
        .select('*');
      if (error) return [];
      return data || [];
    } else {
      return getLocalData<Community[]>('communities', []);
    }
  },

  async createCommunity(community: Community): Promise<Community> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('communities')
        .insert(community)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const communities = getLocalData<Community[]>('communities', []);
      communities.push(community);
      setLocalData('communities', communities);
      return community;
    }
  },

  // Memberships
  async getMemberships(userId: string): Promise<Membership[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data || [];
    } else {
      const memberships = getLocalData<Membership[]>('memberships', []);
      return memberships.filter(m => m.user_id === userId);
    }
  },

  async createMembership(membership: Membership): Promise<Membership> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('memberships')
        .insert(membership)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const memberships = getLocalData<Membership[]>('memberships', []);
      memberships.push(membership);
      setLocalData('memberships', memberships);

      // Increment community member count
      const communities = getLocalData<Community[]>('communities', []);
      const commIdx = communities.findIndex(c => c.id === membership.community_id);
      if (commIdx >= 0) {
        communities[commIdx].member_count += 1;
        setLocalData('communities', communities);
      }
      return membership;
    }
  },

  async deleteMembership(userId: string, communityId: string): Promise<void> {
    if (isSupabaseConfigured) {
      await supabase
        .from('memberships')
        .delete()
        .eq('user_id', userId)
        .eq('community_id', communityId);
    } else {
      const memberships = getLocalData<Membership[]>('memberships', []);
      const filtered = memberships.filter(m => !(m.user_id === userId && m.community_id === communityId));
      setLocalData('memberships', filtered);

      // Decrement community member count
      const communities = getLocalData<Community[]>('communities', []);
      const commIdx = communities.findIndex(c => c.id === communityId);
      if (commIdx >= 0) {
        communities[commIdx].member_count = Math.max(0, communities[commIdx].member_count - 1);
        setLocalData('communities', communities);
      }
    }
  },

  // Posts
  async listPosts(communityId: string): Promise<Post[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('community_id', communityId)
        .order('created_at', { ascending: false });
      if (error) return [];
      return data || [];
    } else {
      const posts = getLocalData<Post[]>('posts', []);
      return posts.filter(p => p.community_id === communityId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  },

  async createPost(post: Post): Promise<Post> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('posts')
        .insert(post)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const posts = getLocalData<Post[]>('posts', []);
      posts.push(post);
      setLocalData('posts', posts);
      return post;
    }
  },

  async updatePostUpvotes(postId: string, increment: number): Promise<void> {
    if (isSupabaseConfigured) {
      // In a real environment, you'd increment or use a RPC
      const { data } = await supabase
        .from('posts')
        .select('upvotes_count')
        .eq('id', postId)
        .single();
      if (data) {
        await supabase
          .from('posts')
          .update({ upvotes_count: (data.upvotes_count || 0) + increment })
          .eq('id', postId);
      }
    } else {
      const posts = getLocalData<Post[]>('posts', []);
      const index = posts.findIndex(p => p.id === postId);
      if (index >= 0) {
        posts[index].upvotes_count += increment;
        setLocalData('posts', posts);
      }
    }
  },

  // Comments
  async listComments(postId: string): Promise<Comment[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      if (error) return [];
      return data || [];
    } else {
      const comments = getLocalData<Comment[]>('comments', []);
      return comments.filter(c => c.post_id === postId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }
  },

  async createComment(comment: Comment): Promise<Comment> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('comments')
        .insert(comment)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const comments = getLocalData<Comment[]>('comments', []);
      comments.push(comment);
      setLocalData('comments', comments);

      // Increment post comments_count
      const posts = getLocalData<Post[]>('posts', []);
      const postIdx = posts.findIndex(p => p.id === comment.post_id);
      if (postIdx >= 0) {
        posts[postIdx].comments_count += 1;
        setLocalData('posts', posts);
      }
      return comment;
    }
  },

  // Events
  async listEvents(communityId: string): Promise<Event[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('community_id', communityId)
        .order('starts_at', { ascending: true });
      if (error) return [];
      return data || [];
    } else {
      const events = getLocalData<Event[]>('events', []);
      return events.filter(e => e.community_id === communityId)
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    }
  },

  async createEvent(event: Event): Promise<Event> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('events')
        .insert(event)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const events = getLocalData<Event[]>('events', []);
      events.push(event);
      setLocalData('events', events);
      return event;
    }
  },

  async rsvpEvent(eventId: string, increment: number): Promise<void> {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('events')
        .select('attendees_count')
        .eq('id', eventId)
        .single();
      if (data) {
        await supabase
          .from('events')
          .update({ attendees_count: (data.attendees_count || 0) + increment })
          .eq('id', eventId);
      }
    } else {
      const events = getLocalData<Event[]>('events', []);
      const index = events.findIndex(e => e.id === eventId);
      if (index >= 0) {
        events[index].attendees_count += increment;
        setLocalData('events', events);
      }
    }
  },

  // Newsletters
  async listNewsletters(communityId: string): Promise<Newsletter[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('newsletters')
        .select('*')
        .eq('community_id', communityId)
        .order('sent_at', { ascending: false });
      if (error) return [];
      return data || [];
    } else {
      const newsletters = getLocalData<Newsletter[]>('newsletters', []);
      return newsletters.filter(n => n.community_id === communityId);
    }
  },

  async createNewsletter(newsletter: Newsletter): Promise<Newsletter> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('newsletters')
        .insert(newsletter)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const newsletters = getLocalData<Newsletter[]>('newsletters', []);
      newsletters.push(newsletter);
      setLocalData('newsletters', newsletters);
      return newsletter;
    }
  },

  // Courses & Lessons
  async listCourses(communityId: string): Promise<Course[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('community_id', communityId);
      if (error) return [];
      return data || [];
    } else {
      const courses = getLocalData<Course[]>('courses', []);
      return courses.filter(c => c.community_id === communityId);
    }
  },

  async createCourse(course: Course): Promise<Course> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('courses')
        .insert(course)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const courses = getLocalData<Course[]>('courses', []);
      courses.push(course);
      setLocalData('courses', courses);
      return course;
    }
  },

  async listLessons(courseId: string): Promise<Lesson[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId);
      if (error) return [];
      return data || [];
    } else {
      const lessons = getLocalData<Lesson[]>('lessons', []);
      return lessons.filter(l => l.course_id === courseId);
    }
  },

  async createLesson(lesson: Lesson): Promise<Lesson> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('lessons')
        .insert(lesson)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const lessons = getLocalData<Lesson[]>('lessons', []);
      lessons.push(lesson);
      setLocalData('lessons', lessons);
      return lesson;
    }
  },

  async listLessonCompletions(userId: string): Promise<LessonCompletion[]> {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('lesson_completions')
        .select('*')
        .eq('user_id', userId);
      if (error) return [];
      return data || [];
    } else {
      const completions = getLocalData<LessonCompletion[]>('lesson_completions', []);
      return completions.filter(c => c.user_id === userId);
    }
  },

  async toggleLessonCompletion(userId: string, lessonId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      const { data } = await supabase
        .from('lesson_completions')
        .select('id')
        .eq('user_id', userId)
        .eq('lesson_id', lessonId)
        .single();
      
      if (data) {
        await supabase
          .from('lesson_completions')
          .delete()
          .eq('id', data.id);
        return false;
      } else {
        await supabase
          .from('lesson_completions')
          .insert({
            id: `comp-${userId}-${lessonId}`,
            user_id: userId,
            lesson_id: lessonId,
            completed_at: new Date().toISOString()
          });
        return true;
      }
    } else {
      const completions = getLocalData<LessonCompletion[]>('lesson_completions', []);
      const index = completions.findIndex(c => c.user_id === userId && c.lesson_id === lessonId);
      if (index >= 0) {
        completions.splice(index, 1);
        setLocalData('lesson_completions', completions);
        return false;
      } else {
        completions.push({
          id: `comp-${userId}-${lessonId}`,
          user_id: userId,
          lesson_id: lessonId,
          completed_at: new Date().toISOString()
        });
        setLocalData('lesson_completions', completions);
        return true;
      }
    }
  }
};

// Frontend hydration helper mappers
import { 
  User as UIUser, 
  Post as UIPost, 
  Comment as UIComment, 
  Lesson as UILesson, 
  CourseTrack as UICourseTrack, 
  CalendarEvent as UICalendarEvent, 
  Broadcast as UIBroadcast,
  Community as UICommunity
} from '../types';

export function mapProfileToUser(p: Profile): UIUser {
  return {
    id: p.id,
    name: p.full_name || 'Anonymous',
    avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    cohort: p.headline || p.cohort_tag || 'Member',
    level: Math.max(1, Math.floor((p.karma_points || 0) / 300) + 1),
    points: p.karma_points || 0
  };
}

export function mapCommunityToUI(c: Community, joined: boolean): UICommunity {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    privacy: c.privacy,
    accentColor: c.accent_color || '#4f46e5',
    memberCount: c.member_count || 0,
    bannerUrl: c.banner_url || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    isJoined: joined
  };
}

export async function getHydratedComments(postId: string): Promise<UIComment[]> {
  const dbComments = await dbService.listComments(postId);
  const uiComments: UIComment[] = [];
  
  for (const c of dbComments) {
    const authorProfile = await dbService.getProfile(c.author_id);
    const author = authorProfile 
      ? mapProfileToUser(authorProfile) 
      : { id: c.author_id, name: 'Anonymous', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80', cohort: 'Member', level: 1, points: 0 };
    
    uiComments.push({
      id: c.id,
      author,
      content: c.body,
      timestamp: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      likes: 0
    });
  }
  
  return uiComments;
}

export async function getHydratedPosts(communityId: string): Promise<UIPost[]> {
  const dbPosts = await dbService.listPosts(communityId);
  const uiPosts: UIPost[] = [];
  
  for (const p of dbPosts) {
    const authorProfile = await dbService.getProfile(p.author_id);
    const author = authorProfile 
      ? mapProfileToUser(authorProfile) 
      : { id: p.author_id, name: 'Anonymous', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80', cohort: 'Member', level: 1, points: 0 };
    
    const comments = await getHydratedComments(p.id);
    
    uiPosts.push({
      id: p.id,
      communityId: p.community_id,
      author,
      title: p.title,
      content: p.body,
      category: p.category,
      timestamp: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      upvotes: p.upvotes_count || 0,
      comments
    });
  }
  
  return uiPosts;
}

export async function getHydratedCourses(communityId: string, currentUserId: string): Promise<UICourseTrack[]> {
  const dbCourses = await dbService.listCourses(communityId);
  const uiCourses: UICourseTrack[] = [];
  
  for (const c of dbCourses) {
    const dbLessons = await dbService.listLessons(c.id);
    const completions = await dbService.listLessonCompletions(currentUserId);
    
    const uiLessons: UILesson[] = dbLessons.map(l => {
      const isCompleted = completions.some(comp => comp.lesson_id === l.id);
      return {
        id: l.id,
        title: l.title,
        duration: l.duration,
        isCompleted,
        description: l.description,
        videoUrl: l.video_url || 'https://www.w3schools.com/html/mov_bbb.mp4',
        downloadUrl: l.download_url || '#',
        discussion: []
      };
    });
    
    uiCourses.push({
      id: c.id,
      communityId: c.community_id,
      title: c.title,
      description: c.description,
      bannerColor: c.banner_color || 'from-indigo-500 to-indigo-600',
      lessons: uiLessons
    });
  }
  
  return uiCourses;
}

export async function getHydratedEvents(communityId: string): Promise<UICalendarEvent[]> {
  const dbEvents = await dbService.listEvents(communityId);
  return dbEvents.map(e => {
    return {
      id: e.id,
      communityId: e.community_id,
      title: e.title,
      description: e.description || '',
      date: e.starts_at,
      time: 'Starts at ' + new Date(e.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      host: {
        id: 'host',
        name: e.host_name,
        avatar: e.host_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        cohort: 'Organizer',
        level: 5,
        points: 1200
      },
      zoomUrl: e.meet_url,
      attendees: e.attendees_count || 0
    };
  });
}

export async function getHydratedNewsletters(communityId: string): Promise<UIBroadcast[]> {
  const dbNewsletters = await dbService.listNewsletters(communityId);
  return dbNewsletters.map(n => {
    return {
      id: n.id,
      communityId: n.community_id,
      subject: n.subject,
      cohort: n.recipient_group || 'All Staff',
      content: n.body || '',
      status: n.status,
      sentAt: n.sent_at,
      openRate: n.open_rate || 92.5,
      clickRate: n.click_rate || 71.2
    };
  });
}
