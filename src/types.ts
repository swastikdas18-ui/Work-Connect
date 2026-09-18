export interface User {
  id: string;
  name: string;
  avatar: string;
  cohort: string;
  level: number;
  points: number;
  rank?: number;
  bio?: string;
  skills?: string[];
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  bannerUrl?: string;
  badges?: string[];
  role?: 'owner' | 'admin' | 'member';
  joinedAt?: string;
}

export interface Comment {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  hasLiked?: boolean;
}

export interface Post {
  id: string;
  communityId?: string;
  author: User;
  title: string;
  content: string;
  codeSnippet?: string;
  mediaUrl?: string;
  category: string;
  timestamp: string;
  upvotes: number;
  hasUpvoted?: boolean;
  comments: Comment[];
  isBookmarked?: boolean;
  isNewsletter?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted: boolean;
  videoUrl?: string;
  description: string;
  downloadUrl?: string;
  discussion: Comment[];
}

export interface CourseTrack {
  id: string;
  communityId?: string;
  title: string;
  description: string;
  bannerColor: string;
  lessons: Lesson[];
}

export interface CalendarEvent {
  id: string;
  communityId?: string;
  title: string;
  description: string;
  date: string;
  time: string;
  host: User;
  zoomUrl: string;
  attendees: number;
  hasRSVPed?: boolean;
}

export interface Broadcast {
  id: string;
  communityId?: string;
  subject: string;
  cohort: string;
  content: string;
  status: 'draft' | 'sent';
  sentAt?: string;
  openRate?: number;
  clickRate?: number;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  privacy: 'public' | 'gated' | 'private';
  accentColor: string;
  memberCount: number;
  bannerUrl: string;
  isJoined?: boolean;
  createdBy?: string;
  created_by?: string;
}

