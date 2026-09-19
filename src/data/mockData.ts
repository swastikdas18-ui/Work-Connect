import { User, Post, CourseTrack, CalendarEvent, Broadcast, Community } from '../types';

export const currentUser: User = {
  id: '',
  name: '',
  avatar: '',
  cohort: '',
  level: 1,
  points: 0
};

export const mockUsers: User[] = [];

export const mockCategories = [
  'All',
  'Announcements',
  'Discussions',
  'Wins & Demos',
  'Help Wanted'
];

export const initialCommunities: Community[] = [
  {
    id: 'comm-eng-core',
    name: 'Core Engineering & Platform',
    slug: 'core-eng',
    description: 'Engineering systems, dev infrastructure, and production reliability.',
    privacy: 'public',
    accentColor: '#4f46e5',
    memberCount: 42,
    bannerUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    isJoined: false
  }
];

export const mockPosts: Post[] = [];

export const mockCourses: CourseTrack[] = [];

export const mockEvents: CalendarEvent[] = [];

export const mockBroadcasts: Broadcast[] = [];
