export type UserRole = "owner" | "admin" | "moderator" | "employee" | "intern";
export type UserStatus = "active" | "invited" | "suspended";
export type ChannelType = "public" | "private";
export type PostCategory =
  | "announcement"
  | "general"
  | "intern_spotlight"
  | "qna"
  | "event";

export type NewsletterAudience = "all" | "employees_only" | "interns_only";
export type NewsletterStatus = "draft" | "scheduled" | "published" | "archived";
export type BroadcastRunStatus = "queued" | "processing" | "completed" | "failed";
export type PresenceStatus = "online" | "busy" | "away" | "offline";

export type EventType = "workshop" | "tech_talk" | "demo_day" | "office_hours" | "social";
export type EventAudience = "all" | "employees_only" | "interns_only";
export type RsvpStatus = "attending" | "declined" | "waitlisted";

export type NotificationType =
  | "post_comment"
  | "post_like"
  | "mention"
  | "newsletter_broadcast"
  | "event_reminder"
  | "event_waitlist_promoted";

export interface AppNotification {
  id: string;
  tenant_id: string;
  recipient_id: string;
  actor_id: string;
  actor?: {
    full_name: string;
    avatar_url?: string | null;
    role?: UserRole;
  } | null;
  type: NotificationType;
  resource_id: string;
  payload: {
    title: string;
    snippet?: string;
    url: string;
  };
  read_at: string | null;
  created_at: string;
}

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  created_at: string;
}

export interface UserRow {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface TenantInvite {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export type TenantInviteRow = TenantInvite;

export interface ChannelRow {
  id: string;
  tenant_id: string;
  name: string;
  type: ChannelType;
  created_at: string;
}

export interface MessageRow {
  id: string;
  tenant_id: string;
  channel_id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  created_at: string;
}

export interface ChannelReadState {
  tenant_id: string;
  channel_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string;
}

export type ChannelReadStateRow = ChannelReadState;

export interface Post {
  id: string;
  tenant_id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  category: PostCategory;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: string;
  tenant_id: string;
  post_id: string;
  author_id: string;
  content: string;
  parent_comment_id: string | null;
  created_at: string;
}

export interface PostReaction {
  tenant_id: string;
  post_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export interface Newsletter {
  id: string;
  tenant_id: string;
  author_id: string;
  title: string;
  slug: string;
  summary: string | null;
  content_html: string;
  target_audience: NewsletterAudience;
  status: NewsletterStatus;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewsletterSubscriber {
  id: string;
  tenant_id: string;
  user_id: string;
  email: string;
  receives_weekly_digest: boolean;
  receives_urgent_broadcasts: boolean;
  created_at: string;
}

export interface NewsletterBroadcastRun {
  id: string;
  tenant_id: string;
  newsletter_id: string;
  recipient_count: number;
  status: BroadcastRunStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CommunityEvent {
  id: string;
  tenant_id: string;
  organizer_id: string;
  title: string;
  description: string;
  event_type: EventType;
  target_audience: EventAudience;
  meeting_url: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface EngagementSummary {
  period: "7d" | "30d" | "90d";
  generatedAt: string;
  totalMembers: number;
  activeMembers: number; // Users who sent a message, posted, or RSVP'd
  internCount: number;
  employeeCount: number;
  internEngagementRate: number; // Percentage of interns active in period
  postsPublished: number;
  commentsCount: number;
  reactionsCount: number;
  messagesSent: number;
  eventAttendanceRate: number; // Total attendees / total capacity across period events
  topContributors: {
    userId: string;
    fullName: string;
    role: UserRole;
    postsCount: number;
    commentsCount: number;
  }[];
  activityTimeline: {
    date: string;
    messages: number;
    posts: number;
    rsvps: number;
  }[];
}

export interface EventRsvp {
  id: string;
  tenant_id: string;
  event_id: string;
  user_id: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export type PostRow = Post;
export type PostCommentRow = PostComment;
export type PostReactionRow = PostReaction;
export type NewsletterRow = Newsletter;
export type NewsletterSubscriberRow = NewsletterSubscriber;
export type NewsletterBroadcastRunRow = NewsletterBroadcastRun;
export type CommunityEventRow = CommunityEvent;
export type EventRsvpRow = EventRsvp;
export type AppNotificationRow = AppNotification;

// Database schema definition for Supabase client typing
export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: TenantRow;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          domain?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          domain?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: UserRow;
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          role?: UserRole;
          status?: UserStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      tenant_invites: {
        Row: TenantInvite;
        Insert: {
          id?: string;
          tenant_id: string;
          email: string;
          role: UserRole;
          token: string;
          invited_by: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          email?: string;
          role?: UserRole;
          token?: string;
          invited_by?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      channels: {
        Row: ChannelRow;
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          type?: ChannelType;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          type?: ChannelType;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: MessageRow;
        Insert: {
          id?: string;
          tenant_id: string;
          channel_id: string;
          user_id: string;
          content: string;
          media_urls?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          channel_id?: string;
          user_id?: string;
          content?: string;
          media_urls?: string[];
          created_at?: string;
        };
        Relationships: [];
      };
      channel_read_states: {
        Row: ChannelReadState;
        Insert: {
          tenant_id: string;
          channel_id: string;
          user_id: string;
          last_read_message_id?: string | null;
          last_read_at?: string;
        };
        Update: {
          tenant_id?: string;
          channel_id?: string;
          user_id?: string;
          last_read_message_id?: string | null;
          last_read_at?: string;
        };
        Relationships: [];
      };
      posts: {
        Row: Post;
        Insert: {
          id?: string;
          tenant_id: string;
          author_id: string;
          content: string;
          media_urls?: string[];
          category: PostCategory;
          likes_count?: number;
          comments_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          author_id?: string;
          content?: string;
          media_urls?: string[];
          category?: PostCategory;
          likes_count?: number;
          comments_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      post_comments: {
        Row: PostComment;
        Insert: {
          id?: string;
          tenant_id: string;
          post_id: string;
          author_id: string;
          content: string;
          parent_comment_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          post_id?: string;
          author_id?: string;
          content?: string;
          parent_comment_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      post_reactions: {
        Row: PostReaction;
        Insert: {
          tenant_id: string;
          post_id: string;
          user_id: string;
          reaction_type?: string;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          post_id?: string;
          user_id?: string;
          reaction_type?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      newsletters: {
        Row: Newsletter;
        Insert: {
          id?: string;
          tenant_id: string;
          author_id: string;
          title: string;
          slug: string;
          summary?: string | null;
          content_html: string;
          target_audience?: NewsletterAudience;
          status?: NewsletterStatus;
          scheduled_for?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          author_id?: string;
          title?: string;
          slug?: string;
          summary?: string | null;
          content_html?: string;
          target_audience?: NewsletterAudience;
          status?: NewsletterStatus;
          scheduled_for?: string | null;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      newsletter_subscribers: {
        Row: NewsletterSubscriber;
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          email: string;
          receives_weekly_digest?: boolean;
          receives_urgent_broadcasts?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          user_id?: string;
          email?: string;
          receives_weekly_digest?: boolean;
          receives_urgent_broadcasts?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      newsletter_broadcast_runs: {
        Row: NewsletterBroadcastRun;
        Insert: {
          id?: string;
          tenant_id: string;
          newsletter_id: string;
          recipient_count?: number;
          status?: BroadcastRunStatus;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          newsletter_id?: string;
          recipient_count?: number;
          status?: BroadcastRunStatus;
          error_message?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      events: {
        Row: CommunityEvent;
        Insert: {
          id?: string;
          tenant_id: string;
          organizer_id: string;
          title: string;
          description: string;
          event_type: EventType;
          target_audience?: EventAudience;
          meeting_url?: string | null;
          location?: string | null;
          starts_at: string;
          ends_at: string;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          organizer_id?: string;
          title?: string;
          description?: string;
          event_type?: EventType;
          target_audience?: EventAudience;
          meeting_url?: string | null;
          location?: string | null;
          starts_at?: string;
          ends_at?: string;
          capacity?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      event_rsvps: {
        Row: EventRsvp;
        Insert: {
          id?: string;
          tenant_id: string;
          event_id: string;
          user_id: string;
          status?: RsvpStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          event_id?: string;
          user_id?: string;
          status?: RsvpStatus;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: AppNotification;
        Insert: {
          id?: string;
          tenant_id: string;
          recipient_id: string;
          actor_id: string;
          type: NotificationType;
          resource_id: string;
          payload: {
            title: string;
            snippet?: string;
            url: string;
          };
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          recipient_id?: string;
          actor_id?: string;
          type?: NotificationType;
          resource_id?: string;
          payload?: {
            title: string;
            snippet?: string;
            url: string;
          };
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_tenant_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      get_current_user_role: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
