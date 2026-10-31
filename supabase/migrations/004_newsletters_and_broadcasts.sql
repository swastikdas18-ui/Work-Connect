-- 004_newsletters_and_broadcasts.sql
-- Multi-Tenant Newsletter & Company Digest Broadcast Engine

-- 1. Newsletters Table
CREATE TABLE IF NOT EXISTS public.newsletters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    summary TEXT,
    content_html TEXT NOT NULL,
    target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'employees_only', 'interns_only')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
    scheduled_for TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_newsletter_tenant_slug UNIQUE (tenant_id, slug)
);

-- 2. Newsletter Subscribers Table (Tenant-first composite key)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    receives_weekly_digest BOOLEAN NOT NULL DEFAULT TRUE,
    receives_urgent_broadcasts BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, user_id)
);

-- 3. Newsletter Broadcast Runs Table
CREATE TABLE IF NOT EXISTS public.newsletter_broadcast_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    newsletter_id UUID NOT NULL REFERENCES public.newsletters(id) ON DELETE CASCADE,
    recipient_count INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- 4. Composite Indexes
CREATE INDEX IF NOT EXISTS idx_newsletters_tenant_status ON public.newsletters(tenant_id, status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscribers_tenant_audience ON public.newsletter_subscribers(tenant_id, receives_weekly_digest);
CREATE INDEX IF NOT EXISTS idx_broadcasts_tenant_newsletter ON public.newsletter_broadcast_runs(tenant_id, newsletter_id);

-- 5. Row-Level Security (RLS) Activation
ALTER TABLE public.newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_broadcast_runs ENABLE ROW LEVEL SECURITY;

-- 6. Newsletters RLS Policies
-- SELECT: published newsletters visible to everyone in tenant; drafts visible only to moderator+
CREATE POLICY newsletters_tenant_select ON public.newsletters
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      status = 'published'
      OR public.get_current_user_role() IN ('owner', 'admin', 'moderator')
    )
  );

-- INSERT / UPDATE / DELETE: only owner, admin, moderator
CREATE POLICY newsletters_admin_insert ON public.newsletters
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin', 'moderator')
  );

CREATE POLICY newsletters_admin_update ON public.newsletters
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin', 'moderator')
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY newsletters_admin_delete ON public.newsletters
  FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  );

-- 7. Newsletter Subscribers RLS Policies
CREATE POLICY newsletter_subscribers_user_select ON public.newsletter_subscribers
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
      OR public.get_current_user_role() IN ('owner', 'admin')
    )
  );

CREATE POLICY newsletter_subscribers_user_upsert ON public.newsletter_subscribers
  FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND (
      user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
      OR public.get_current_user_role() IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

-- 8. Broadcast Runs RLS Policies
CREATE POLICY broadcast_runs_admin_all ON public.newsletter_broadcast_runs
  FOR ALL
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  );

