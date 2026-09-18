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
  starts_at timestamptz not null,
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

-- K. Event RSVPs (Event attendance)
create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (event_id, user_id)
);

-- L. Post Upvotes (Idempotent post upvoting)
create table if not exists public.post_upvotes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique (post_id, user_id)
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
alter table public.event_rsvps enable row level security;
alter table public.post_upvotes enable row level security;

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

-- Event RSVPs Policies
create policy "Allow read access to authenticated" on public.event_rsvps for select using (true);
create policy "Allow user to RSVP" on public.event_rsvps for insert with check (auth.uid() = user_id);
create policy "Allow user to cancel RSVP" on public.event_rsvps for delete using (auth.uid() = user_id);

-- Post Upvotes Policies
create policy "Allow select of post upvotes" on public.post_upvotes for select using (true);
create policy "Allow insert of post upvote" on public.post_upvotes for insert with check (auth.uid() = user_id);
create policy "Allow delete of post upvote" on public.post_upvotes for delete using (auth.uid() = user_id);


-- ==========================================================
-- 4. AUTOMATIC AUTH -> PROFILE TRIGGER
-- ==========================================================
create or replace function public.handle_new_user()
returns trigger as $$      begin        insert into public.profiles (id, full_name, headline, avatar_url, karma_points)        values (          new.id,          coalesce(new.raw_user_meta_data->>'full_name', 'Member'),          coalesce(new.raw_user_meta_data->>'headline', 'Community Member'),          coalesce(new.raw_user_meta_data->>'avatar_url', null),          0        );        return new;      end;      $$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==========================================================
-- 5. ATOMIC IDEMPOTENT UPVOTE TRANSACTION
-- ==========================================================
create or replace function public.toggle_post_upvote(target_post_id uuid)
returns json as $$
declare
  calling_user_id uuid;
  existing_id uuid;
  current_count integer;
  action_taken text;
begin
  calling_user_id := auth.uid();
  if calling_user_id is null then
    return json_build_object('success', false, 'error', 'unauthenticated');
  end if;

  select id into existing_id 
  from public.post_upvotes 
  where post_id = target_post_id and user_id = calling_user_id;

  if existing_id is not null then
    -- Delete upvote
    delete from public.post_upvotes where id = existing_id;
    -- Decrement upvotes_count on posts
    update public.posts 
    set upvotes_count = greatest(0, upvotes_count - 1) 
    where id = target_post_id
    returning upvotes_count into current_count;
    action_taken := 'downvoted';
  else
    -- Insert upvote
    insert into public.post_upvotes (post_id, user_id) 
    values (target_post_id, calling_user_id);
    -- Increment upvotes_count on posts
    update public.posts 
    set upvotes_count = upvotes_count + 1 
    where id = target_post_id
    returning upvotes_count into current_count;
    action_taken := 'upvoted';
  end if;

  return json_build_object('success', true, 'action', action_taken, 'upvotes_count', current_count);
end;
$$ language plpgsql security definer;


-- ==========================================================
-- 6. ATOMIC IDEMPOTENT EVENT RSVP TRANSACTION
-- ==========================================================
create or replace function public.toggle_event_rsvp(target_event_id uuid)
returns json as $$
declare
  calling_user_id uuid;
  existing_id uuid;
  current_attendees integer;
  is_now_rsvped boolean;
begin
  calling_user_id := auth.uid();
  if calling_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select id into existing_id 
  from public.event_rsvps 
  where event_id = target_event_id and user_id = calling_user_id;

  if existing_id is not null then
    -- Cancel RSVP
    delete from public.event_rsvps where id = existing_id;
    update public.events 
    set attendees_count = greatest(0, attendees_count - 1) 
    where id = target_event_id
    returning attendees_count into current_attendees;
    is_now_rsvped := false;
  else
    -- Register RSVP
    insert into public.event_rsvps (event_id, user_id) 
    values (target_event_id, calling_user_id);
    update public.events 
    set attendees_count = attendees_count + 1 
    where id = target_event_id
    returning attendees_count into current_attendees;
    is_now_rsvped := true;
  end if;

  return json_build_object(
    'success', true, 
    'rsvped', is_now_rsvped, 
    'attendees_count', current_attendees
  );
end;
$$ language plpgsql security definer;
`;
