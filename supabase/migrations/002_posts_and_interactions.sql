-- 002_posts_and_interactions.sql
-- Community Feed, Media Posts, Comments, and Reactions with Tenant RLS

-- 1. Posts Table
CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    category TEXT NOT NULL CHECK (category IN ('announcement', 'general', 'intern_spotlight', 'qna', 'event')),
    likes_count INT NOT NULL DEFAULT 0,
    comments_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Post Comments Table
CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    parent_comment_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Post Reactions Table (Tenant-first composite primary key)
CREATE TABLE IF NOT EXISTS public.post_reactions (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, post_id, user_id, reaction_type)
);

-- 4. Composite Indexes (Tenant-first indexing)
CREATE INDEX IF NOT EXISTS idx_posts_tenant_created ON public.posts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_tenant_category ON public.posts(tenant_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_tenant_post ON public.post_comments(tenant_id, post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_reactions_tenant_post ON public.post_reactions(tenant_id, post_id);

-- 5. Row-Level Security (RLS) Activation
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

-- 6. Tenant Isolation Policies
CREATE POLICY tenant_isolation_posts ON public.posts
  FOR ALL USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_comments ON public.post_comments
  FOR ALL USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY tenant_isolation_reactions ON public.post_reactions
  FOR ALL USING (tenant_id = public.get_current_tenant_id())
  WITH CHECK (tenant_id = public.get_current_tenant_id());

-- 7. Supabase Storage Bucket & RLS Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-media', 'community-media', true)
ON CONFLICT (id) DO NOTHING;

-- Restrict storage objects to tenant path prefix: {tenant_id}/posts/...
CREATE POLICY "tenant_storage_isolation_select" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  );

CREATE POLICY "tenant_storage_isolation_insert" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  );

CREATE POLICY "tenant_storage_isolation_delete" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'community-media'
    AND (storage.foldername(name))[1] = public.get_current_tenant_id()::text
  );

