export const SUPABASE_SETUP_SQL = `-- ==========================================================
-- 1. EXTENSIONS & SCHEMA PREPARATION
-- ==========================================================
create extension if not exists "uuid-ossp";

-- ==========================================================
-- 2. TABLE DEFINITIONS
-- ==========================================================

-- A. Profiles (Linked to auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  headline text,
  cohort_tag text default 'Interns Summer 2026',
  karma_points integer default 0,
  role text default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now()
);

-- B. Communities (Public, gated, or private cohort centers)
create table if not exists public.communities (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  slug text unique not null,
  description text,
  privacy text default 'public' check (privacy in ('public', 'gated', 'private')),
  accent_color text default '#4f46e5',
  created_by uuid references public.profiles(id) on delete set null,
  member_count integer default 1,
  banner_url text,
  created_at timestamptz default now()
);

-- C. Memberships (Grounded pivot linking members and spaces)
create table if not exists public.memberships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  community_id uuid references public.communities(id) on delete cascade not null,
  role text default 'member' check (role in ('owner', 'admin', 'moderator', 'member')),
  joined_at timestamptz default now(),
  unique (user_id, community_id)
);

-- D. Posts (Category threads inside feed)
create table if not exists public.posts (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  category text not null,
  title text not null,
  body text not null,
  upvotes_count integer default 0,
  comments_count integer default 0,
  created_at timestamptz default now()
);

-- E. Comments (Responses inside threads)
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now()
);

-- F. Events (Cohort Mixers / Technical reviews)
create table if not exists public.events (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  title text not null,
  description text,
  host_name text not null,
  host_avatar text,
  starts_at text not null,
  meet_url text not null,
  attendees_count integer default 0,
  created_at timestamptz default now()
);

-- G. Newsletters (Broadcast archives)
create table if not exists public.newsletters (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  subject text not null,
  recipient_group text not null,
  status text default 'draft' check (status in ('draft', 'sent')),
  sent_at text,
  body text,
  open_rate numeric default 92.5,
  click_rate numeric default 71.2,
  created_at timestamptz default now()
);

-- H. Courses (Classroom Tracks)
create table if not exists public.courses (
  id uuid default gen_random_uuid() primary key,
  community_id uuid references public.communities(id) on delete cascade not null,
  title text not null,
  description text not null,
  banner_color text not null,
  created_at timestamptz default now()
);

-- I. Lessons (Classroom Chapters)
create table if not exists public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  duration text not null,
  description text not null,
  video_url text,
  download_url text,
  created_at timestamptz default now()
);

-- J. Lesson Completions (Onboarding logs)
create table if not exists public.lesson_completions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed_at timestamptz default now(),
  unique (user_id, lesson_id)
);


-- ==========================================================
-- 3. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.memberships enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.events enable row level security;
alter table public.newsletters enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_completions enable row level security;

-- Profiles Policies
create policy "Allow public read of profiles" on public.profiles for select using (true);
create policy "Allow individual profile updates" on public.profiles for all using (auth.uid() = id);

-- Communities Policies
create policy "Allow public select of communities" on public.communities for select using (true);
create policy "Allow auth community creation" on public.communities for insert with check (auth.uid() is not null);
create policy "Allow owners to edit communities" on public.communities for all using (auth.uid() = created_by);

-- Memberships Policies
create policy "Allow members select of memberships" on public.memberships for select using (true);
create policy "Allow user self join-leave memberships" on public.memberships for all using (auth.uid() = user_id);

-- Posts Policies
create policy "Allow public select of posts" on public.posts for select using (true);
create policy "Allow auth post creation" on public.posts for insert with check (auth.uid() = author_id);
create policy "Allow author post modification" on public.posts for all using (auth.uid() = author_id);

-- Comments Policies
create policy "Allow public select of comments" on public.comments for select using (true);
create policy "Allow auth comment creation" on public.comments for insert with check (auth.uid() = author_id);
create policy "Allow author comment modification" on public.comments for all using (auth.uid() = author_id);

-- Events Policies
create policy "Allow public select of events" on public.events for select using (true);
create policy "Allow auth event updates" on public.events for all using (auth.uid() is not null);

-- Newsletters Policies
create policy "Allow select of newsletters" on public.newsletters for select using (true);
create policy "Allow admin managing newsletters" on public.newsletters for all using (auth.uid() is not null);

-- Courses Policies
create policy "Allow public select of courses" on public.courses for select using (true);
create policy "Allow admin managing courses" on public.courses for all using (auth.uid() is not null);

-- Lessons Policies
create policy "Allow public select of lessons" on public.lessons for select using (true);
create policy "Allow admin managing lessons" on public.lessons for all using (auth.uid() is not null);

-- Lesson Completions Policies
create policy "Allow select of completions" on public.lesson_completions for select using (true);
create policy "Allow user self completion management" on public.lesson_completions for all using (auth.uid() = user_id);


-- ==========================================================
-- 4. AUTOMATIC AUTH -> PROFILE TRIGGER
-- ==========================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, headline, cohort_tag, karma_points, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', substring(new.email from '([^@]+)')),
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80'),
    coalesce(new.raw_user_meta_data->>'headline', 'Software Engineering Intern'),
    'Interns Summer 2026',
    0,
    coalesce(new.raw_user_meta_data->>'role', 'member')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
`;
