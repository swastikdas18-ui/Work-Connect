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
  'Wins',
  'Help Wanted'
];

export const initialCommunities: Community[] = [];

export const mockPosts: Post[] = [];

export const mockCourses: CourseTrack[] = [];

export const mockEvents: CalendarEvent[] = [];

export const mockBroadcasts: Broadcast[] = [];
