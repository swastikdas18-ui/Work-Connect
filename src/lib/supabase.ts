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
  bio?: string;
  skills?: string[];
  github_url?: string;
  linkedin_url?: string;
  website_url?: string;
  banner_url?: string;
  created_at?: string;
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
  media_url?: string;
  image_url?: string;
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

export interface EventRSVP {
  id: string;
  event_id: string;
  user_id: string;
  created_at?: string;
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

// Validate standard UUID format to prevent Postgres 22P02 invalid input syntax errors
export const isValidUUID = (id: any): boolean =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id.trim());

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

// Universal call wrapper: real Supabase when configured, local storage only as dev fallback
async function wrapDbCall<T>(
  supabaseCall: () => PromiseLike<{ data: any; error: any }> | any, 
  localFallback: () => T | Promise<T>
): Promise<T> {
  if (isSupabaseConfigured) {
    const { data, error } = await supabaseCall();
    if (error) {
      throw error;
    }
    return data;
  }
  // Only use local storage when Supabase credentials are not configured at all (local dev)
  return await localFallback();
}

// Database Service Layer with dual Support: Real Supabase API calls & Local Fallback
export const dbService = {
  // Profiles
  async getProfile(userId: string): Promise<Profile | null> {
    return wrapDbCall(
      () => supabase.from('profiles').select('*').eq('id', userId).single(),
      () => {
        const profiles = getLocalData<Profile[]>('profiles', []);
        return profiles.find(p => p.id === userId) || null;
      }
    );
  },

  async upsertProfile(profile: Profile): Promise<Profile> {
    return wrapDbCall(
      () => supabase.from('profiles').upsert(profile).select().single(),
      () => {
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
    );
  },

  async getLeaderboard(): Promise<Profile[]> {
    return wrapDbCall(
      () => supabase.from('profiles').select('*').not('full_name', 'in', '("QA Auditor","Guest User")').order('karma_points', { ascending: false }),
      () => {
        const profiles = getLocalData<Profile[]>('profiles', []);
        return [...profiles]
          .filter(p => p.full_name !== 'QA Auditor' && p.full_name !== 'Guest User')
          .sort((a, b) => b.karma_points - a.karma_points);
      }
    );
  },

  // Communities
  async listCommunities(): Promise<Community[]> {
    return wrapDbCall(
      () => supabase.from('communities').select('*'),
      () => getLocalData<Community[]>('communities', [
        {
          id: 'comm-eng-core',
          name: 'Core Engineering & Platform',
          slug: 'core-eng',
          description: 'Engineering systems, dev infrastructure, and production reliability.',
          privacy: 'public',
          accent_color: '#4f46e5',
          created_by: 'seed-admin',
          member_count: 42,
          banner_url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80'
        }
      ])
    );
  },

  async createCommunity(community: Community): Promise<Community> {
    return wrapDbCall(
      () => supabase.from('communities').insert(community).select().single(),
      () => {
        const communities = getLocalData<Community[]>('communities', []);
        communities.push(community);
        setLocalData('communities', communities);
        return community;
      }
    );
  },

  // Memberships
  async getMemberships(userId: string): Promise<Membership[]> {
    if (!isValidUUID(userId)) {
      console.warn('Skipping membership sync: invalid user UUID', { userId });
      const memberships = getLocalData<Membership[]>('memberships', []);
      return memberships.filter(m => m.user_id === userId);
    }
    return wrapDbCall(
      () => supabase.from('memberships').select('*').eq('user_id', userId),
      () => {
        const memberships = getLocalData<Membership[]>('memberships', []);
        return memberships.filter(m => m.user_id === userId);
      }
    );
  },

  async createMembership(membership: Membership): Promise<Membership> {
    const userId = membership.user_id;
    const communityId = membership.community_id;

    if (!isValidUUID(userId) || !isValidUUID(communityId)) {
      console.warn('Skipping membership sync: invalid user or community UUID', { userId, communityId });
      // Record locally in mock store so UI remains consistent without firing 22P02 to Supabase
      const memberships = getLocalData<Membership[]>('memberships', []);
      memberships.push(membership);
      setLocalData('memberships', memberships);

      const communities = getLocalData<Community[]>('communities', []);
      const commIdx = communities.findIndex(c => c.id === membership.community_id);
      if (commIdx >= 0) {
        communities[commIdx].member_count += 1;
        setLocalData('communities', communities);
      }
      return membership;
    }

    // Build payload ensuring valid UUID fields (drop mock ID if not valid UUID so Postgres generates gen_random_uuid())
    const insertPayload: any = {
      user_id: userId,
      community_id: communityId,
      role: membership.role || 'member',
      joined_at: membership.joined_at || new Date().toISOString()
    };
    if (isValidUUID(membership.id)) {
      insertPayload.id = membership.id;
    }

    return wrapDbCall(
      () => supabase.from('memberships').insert(insertPayload).select().single(),
      () => {
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
    );
  },

  async deleteMembership(userId: string, communityId: string): Promise<void> {
    if (!isValidUUID(userId) || !isValidUUID(communityId)) {
      console.warn('Skipping membership deletion sync: invalid user or community UUID', { userId, communityId });
      const memberships = getLocalData<Membership[]>('memberships', []);
      const filtered = memberships.filter(m => !(m.user_id === userId && m.community_id === communityId));
      setLocalData('memberships', filtered);

      const communities = getLocalData<Community[]>('communities', []);
      const commIdx = communities.findIndex(c => c.id === communityId);
      if (commIdx >= 0) {
        communities[commIdx].member_count = Math.max(0, communities[commIdx].member_count - 1);
        setLocalData('communities', communities);
      }
      return;
    }

    return wrapDbCall(
      () => supabase.from('memberships').delete().eq('user_id', userId).eq('community_id', communityId),
      () => {
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
    );
  },

  // Posts
  async listPosts(communityId: string): Promise<Post[]> {
    return wrapDbCall(
      () => supabase.from('posts').select('*').eq('community_id', communityId).order('created_at', { ascending: false }),
      () => {
        const posts = getLocalData<Post[]>('posts', []);
        return posts.filter(p => p.community_id === communityId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    );
  },

  async createPost(post: Post): Promise<Post> {
    return wrapDbCall(
      async () => {
        const { data: newPost, error } = await supabase.rpc('create_post_with_rate_limit', {
          p_community_id: post.community_id,
          p_category: post.category,
          p_title: post.title.trim(),
          p_body: post.body.trim(),
          p_image_url: post.media_url || null,
        });

        if (error) {
          throw error;
        }

        return { data: newPost, error: null };
      },
      () => {
        const posts = getLocalData<Post[]>('posts', []);
        posts.push(post);
        setLocalData('posts', posts);
        return post;
      }
    );
  },

  async togglePostUpvote(postId: string, userId: string): Promise<{ action: 'upvoted' | 'downvoted'; upvotes_count: number }> {
    return wrapDbCall(
      async () => {
        const { data, error } = await supabase.rpc('toggle_post_upvote', { target_post_id: postId });
        if (error) {
          console.warn("RPC toggle_post_upvote failed or not found, falling back to client transaction:", error);
          const { data: existing, error: findError } = await supabase
            .from('post_upvotes')
            .select('*')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .maybeSingle();

          if (findError) return { data: null, error: findError };

          const { data: postData } = await supabase
            .from('posts')
            .select('upvotes_count')
            .eq('id', postId)
            .single();
          const currentCount = postData?.upvotes_count || 0;

          if (existing) {
            await supabase.from('post_upvotes').delete().eq('post_id', postId).eq('user_id', userId);
            const newCount = Math.max(0, currentCount - 1);
            await supabase.from('posts').update({ upvotes_count: newCount }).eq('id', postId);
            return { data: { action: 'downvoted', upvotes_count: newCount }, error: null };
          } else {
            await supabase.from('post_upvotes').insert({ post_id: postId, user_id: userId });
            const newCount = currentCount + 1;
            await supabase.from('posts').update({ upvotes_count: newCount }).eq('id', postId);
            return { data: { action: 'upvoted', upvotes_count: newCount }, error: null };
          }
        }
        return { data, error: null };
      },
      () => {
        const upvotes = getLocalData<any[]>('post_upvotes', []);
        const idx = upvotes.findIndex(u => u.post_id === postId && u.user_id === userId);
        const posts = getLocalData<Post[]>('posts', []);
        const postIdx = posts.findIndex(p => p.id === postId);
        let action: 'upvoted' | 'downvoted' = 'upvoted';
        let upvotes_count = 1;

        if (postIdx >= 0) {
          upvotes_count = posts[postIdx].upvotes_count || 0;
        }

        if (idx >= 0) {
          upvotes.splice(idx, 1);
          upvotes_count = Math.max(0, upvotes_count - 1);
          action = 'downvoted';
        } else {
          upvotes.push({ id: `upvote-${Date.now()}`, post_id: postId, user_id: userId });
          upvotes_count = upvotes_count + 1;
          action = 'upvoted';
        }

        if (postIdx >= 0) {
          posts[postIdx].upvotes_count = upvotes_count;
          setLocalData('posts', posts);
        }
        setLocalData('post_upvotes', upvotes);

        return { action, upvotes_count };
      }
    );
  },

  // Comments
  async listComments(postId: string): Promise<Comment[]> {
    return wrapDbCall(
      () => supabase.from('comments').select('*').eq('post_id', postId).order('created_at', { ascending: true }),
      () => {
        const comments = getLocalData<Comment[]>('comments', []);
        return comments.filter(c => c.post_id === postId)
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
    );
  },

  async createComment(comment: Comment): Promise<Comment> {
    return wrapDbCall(
      () => supabase.from('comments').insert(comment).select().single(),
      () => {
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
    );
  },

  // Events
  async listEvents(communityId: string): Promise<Event[]> {
    return wrapDbCall(
      () => supabase.from('events').select('*').eq('community_id', communityId).order('starts_at', { ascending: true }),
      () => {
        const events = getLocalData<Event[]>('events', []);
        return events.filter(e => e.community_id === communityId)
          .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
      }
    );
  },

  async createEvent(event: Event): Promise<Event> {
    return wrapDbCall(
      () => supabase.from('events').insert(event).select().single(),
      () => {
        const events = getLocalData<Event[]>('events', []);
        events.push(event);
        setLocalData('events', events);
        return event;
      }
    );
  },

  async listEventRSVPs(userId: string): Promise<EventRSVP[]> {
    return wrapDbCall(
      () => supabase.from('event_rsvps').select('*').eq('user_id', userId),
      () => {
        const rsvps = getLocalData<EventRSVP[]>('event_rsvps', []);
        return rsvps.filter(r => r.user_id === userId);
      }
    );
  },

  async toggleRSVP(eventId: string, userId: string): Promise<{ rsvped: boolean; attendees_count: number }> {
    return wrapDbCall(
      async () => {
        const { data, error } = await supabase.rpc('toggle_event_rsvp', {
          target_event_id: eventId,
        });
        if (error) throw error;
        return {
          data: {
            rsvped: Boolean(data?.rsvped),
            attendees_count: Number(data?.attendees_count ?? 0),
          },
          error: null,
        };
      },
      () => {
        const rsvps = getLocalData<EventRSVP[]>('event_rsvps', []);
        const idx = rsvps.findIndex(r => r.event_id === eventId && r.user_id === userId);
        const events = getLocalData<Event[]>('events', []);
        const eventIdx = events.findIndex(e => e.id === eventId);
        let rsvped = false;

        if (idx >= 0) {
          rsvps.splice(idx, 1);
          if (eventIdx >= 0) {
            events[eventIdx].attendees_count = Math.max(0, (events[eventIdx].attendees_count || 0) - 1);
          }
          rsvped = false;
        } else {
          rsvps.push({ id: `rsvp-${Date.now()}`, event_id: eventId, user_id: userId });
          if (eventIdx >= 0) {
            events[eventIdx].attendees_count = (events[eventIdx].attendees_count || 0) + 1;
          }
          rsvped = true;
        }

        setLocalData('event_rsvps', rsvps);
        setLocalData('events', events);
        const attendees_count = eventIdx >= 0 ? events[eventIdx].attendees_count : (rsvped ? 1 : 0);
        return { rsvped, attendees_count };
      }
    );
  },

  // Newsletters
  async listNewsletters(communityId: string): Promise<Newsletter[]> {
    return wrapDbCall(
      () => supabase.from('newsletters').select('*').eq('community_id', communityId).order('sent_at', { ascending: false }),
      () => {
        const newsletters = getLocalData<Newsletter[]>('newsletters', []);
        return newsletters.filter(n => n.community_id === communityId);
      }
    );
  },

  async createNewsletter(newsletter: Newsletter): Promise<Newsletter> {
    return wrapDbCall(
      () => supabase.from('newsletters').insert(newsletter).select().single(),
      () => {
        const newsletters = getLocalData<Newsletter[]>('newsletters', []);
        newsletters.push(newsletter);
        setLocalData('newsletters', newsletters);
        return newsletter;
      }
    );
  },

  // Courses & Lessons
  async listCourses(communityId: string): Promise<Course[]> {
    return wrapDbCall(
      () => supabase.from('courses').select('*').eq('community_id', communityId),
      () => {
        const courses = getLocalData<Course[]>('courses', []);
        return courses.filter(c => c.community_id === communityId);
      }
    );
  },

  async createCourse(course: Course): Promise<Course> {
    return wrapDbCall(
      () => supabase.from('courses').insert(course).select().single(),
      () => {
        const courses = getLocalData<Course[]>('courses', []);
        courses.push(course);
        setLocalData('courses', courses);
        return course;
      }
    );
  },

  async listLessons(courseId: string): Promise<Lesson[]> {
    return wrapDbCall(
      () => supabase.from('lessons').select('*').eq('course_id', courseId),
      () => {
        const lessons = getLocalData<Lesson[]>('lessons', []);
        return lessons.filter(l => l.course_id === courseId);
      }
    );
  },

  async createLesson(lesson: Lesson): Promise<Lesson> {
    return wrapDbCall(
      () => supabase.from('lessons').insert(lesson).select().single(),
      () => {
        const lessons = getLocalData<Lesson[]>('lessons', []);
        lessons.push(lesson);
        setLocalData('lessons', lessons);
        return lesson;
      }
    );
  },

  async updateLessonVideo(lessonId: string, videoUrl: string): Promise<void> {
    return wrapDbCall(
      () => supabase.from('lessons').update({ video_url: videoUrl }).eq('id', lessonId),
      () => {
        const lessons = getLocalData<Lesson[]>('lessons', []);
        const target = lessons.find(l => l.id === lessonId);
        if (target) {
          target.video_url = videoUrl;
          setLocalData('lessons', lessons);
        }
      }
    );
  },

  async listLessonCompletions(userId: string): Promise<LessonCompletion[]> {
    return wrapDbCall(
      () => supabase.from('lesson_completions').select('*').eq('user_id', userId),
      () => {
        const completions = getLocalData<LessonCompletion[]>('lesson_completions', []);
        return completions.filter(c => c.user_id === userId);
      }
    );
  },

  async toggleLessonCompletion(userId: string, lessonId: string): Promise<boolean> {
    return wrapDbCall(
      async () => {
        const { data, error: selectErr } = await supabase
          .from('lesson_completions')
          .select('id')
          .eq('user_id', userId)
          .eq('lesson_id', lessonId)
          .maybeSingle();
        
        if (selectErr) return { data: null, error: selectErr };
        
        if (data) {
          const { error: delErr } = await supabase
            .from('lesson_completions')
            .delete()
            .eq('id', data.id);
          return { data: false, error: delErr };
        } else {
          const { error: insErr } = await supabase
            .from('lesson_completions')
            .insert({
              id: `comp-${userId}-${lessonId}`,
              user_id: userId,
              lesson_id: lessonId,
              completed_at: new Date().toISOString()
            });
          return { data: true, error: insErr };
        }
      },
      () => {
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
    );
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
  const points = p.karma_points || 0;
  const level = Math.max(1, Math.floor(points / 300) + 1);
  
  // Calculate dynamic badges based on achievements, points and roles
  const badges: string[] = [];
  if (p.role === 'owner') badges.push('Founder');
  else if (p.role === 'admin') badges.push('Lead');
  else badges.push('Contributor');

  if (points >= 1000) badges.push('Master');
  else if (points >= 500) badges.push('Rising Star');
  else badges.push('Explorer');

  if (p.skills && p.skills.length > 0) badges.push('Specialist');

  return {
    id: p.id,
    name: p.full_name || 'Anonymous',
    avatar: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
    cohort: p.headline || p.cohort_tag || 'Member',
    level,
    points,
    bio: p.bio || 'Passionate developer and continuous learner building great products with peers.',
    skills: p.skills || ['React', 'TypeScript', 'Frontend'],
    githubUrl: p.github_url || 'https://github.com',
    linkedinUrl: p.linkedin_url || 'https://linkedin.com',
    websiteUrl: p.website_url,
    bannerUrl: p.banner_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    badges,
    role: p.role || 'member',
    joinedAt: p.created_at || 'Jan 2026'
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
    isJoined: joined,
    created_by: c.created_by,
    createdBy: c.created_by
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

export async function getHydratedPosts(communityId: string, currentUserId?: string): Promise<UIPost[]> {
  const dbPosts = await dbService.listPosts(communityId);
  const uiPosts: UIPost[] = [];
  
  let userUpvotes: any[] = [];
  if (currentUserId) {
    try {
      const { data } = await supabase
        .from('post_upvotes')
        .select('post_id')
        .eq('user_id', currentUserId);
      userUpvotes = data || [];
    } catch {
      userUpvotes = getLocalData<any[]>('post_upvotes', []).filter(u => u.user_id === currentUserId);
    }
  }
  
  for (const p of dbPosts) {
    const authorProfile = await dbService.getProfile(p.author_id);
    const author = authorProfile 
      ? mapProfileToUser(authorProfile) 
      : { id: p.author_id, name: 'Anonymous', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80', cohort: 'Member', level: 1, points: 0 };
    
    const comments = await getHydratedComments(p.id);
    const hasUpvoted = userUpvotes.some(u => u.post_id === p.id);
    
    uiPosts.push({
      id: p.id,
      communityId: p.community_id,
      author,
      title: p.title,
      content: p.body,
      mediaUrl: p.image_url || p.media_url,
      category: p.category,
      timestamp: new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      upvotes: p.upvotes_count || 0,
      comments,
      hasUpvoted
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

export function formatEventDate(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Date TBA";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export async function getHydratedEvents(communityId: string, currentUserId?: string): Promise<UICalendarEvent[]> {
  const dbEvents = await dbService.listEvents(communityId);
  
  let userRsvps: EventRSVP[] = [];
  if (currentUserId) {
    try {
      userRsvps = await dbService.listEventRSVPs(currentUserId);
    } catch (e) {
      console.error('Error fetching RSVPs:', e);
    }
  }

  return dbEvents.map(e => {
    const hasRSVPed = userRsvps.some(r => r.event_id === e.id);
    return {
      id: e.id,
      communityId: e.community_id,
      title: e.title,
      description: e.description || '',
      date: e.starts_at,
      time: formatEventDate(e.starts_at),
      host: {
        id: 'host',
        name: e.host_name,
        avatar: e.host_avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
        cohort: 'Organizer',
        level: 5,
        points: 1200
      },
      zoomUrl: e.meet_url,
      attendees: e.attendees_count || 0,
      attendees_count: e.attendees_count || 0,
      hasRSVPed,
      is_rsvped: hasRSVPed
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
