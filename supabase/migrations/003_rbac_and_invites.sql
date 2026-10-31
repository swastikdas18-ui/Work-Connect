-- 003_rbac_and_invites.sql
-- Role-Based Access Control (RBAC), Member Management, and Tenant Invites

-- 1. Helper to retrieve the current user's role in the active tenant
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_tenant_id UUID;
  v_user_id UUID;
BEGIN
  v_tenant_id := public.get_current_tenant_id();
  
  -- Extract user ID from Supabase auth JWT sub claim
  v_user_id := NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID;

  IF v_tenant_id IS NULL OR v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT role INTO v_role
  FROM public.users
  WHERE tenant_id = v_tenant_id AND id = v_user_id;

  RETURN v_role;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Update users table with extended roles and status
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check
  CHECK (role IN ('owner', 'admin', 'moderator', 'employee', 'intern'));

ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'employee';

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'invited', 'suspended'));

-- 3. Tenant Invites Table
CREATE TABLE IF NOT EXISTS public.tenant_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'moderator', 'employee', 'intern')),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Composite Indexes
CREATE INDEX IF NOT EXISTS idx_invites_tenant_email ON public.tenant_invites(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON public.tenant_invites(token);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON public.users(tenant_id, role);

-- 5. Row-Level Security for Invites
ALTER TABLE public.tenant_invites ENABLE ROW LEVEL SECURITY;

-- Only tenant owners and admins can view or create invites
CREATE POLICY tenant_invites_admin_select ON public.tenant_invites
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY tenant_invites_admin_insert ON public.tenant_invites
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  );

CREATE POLICY tenant_invites_admin_update ON public.tenant_invites
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY tenant_invites_admin_delete ON public.tenant_invites
  FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND public.get_current_user_role() IN ('owner', 'admin')
  );

-- 6. Hardened Announcement Permissions for Posts
-- Only owner, admin, or moderator can create announcements
CREATE OR REPLACE FUNCTION public.check_post_announcement_permission()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category = 'announcement' THEN
    IF public.get_current_user_role() NOT IN ('owner', 'admin', 'moderator') THEN
      RAISE EXCEPTION 'Forbidden: Only owners, admins, and moderators can post announcements';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_check_post_announcement ON public.posts;
CREATE TRIGGER trg_check_post_announcement
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.check_post_announcement_permission();

