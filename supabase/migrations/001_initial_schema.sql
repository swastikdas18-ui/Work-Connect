-- 001_initial_schema.sql
-- Multi-Tenant Database Schema with PostgreSQL Row-Level Security (RLS)

-- 1. Enable pgcrypto / uuid-ossp if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function to retrieve the active tenant ID from JWT or session setting
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID AS $$
DECLARE
  v_tenant_id TEXT;
BEGIN
  -- First try Supabase JWT claims (e.g. auth.jwt() ->> 'tenant_id')
  v_tenant_id := NULLIF(current_setting('request.jwt.claims', true)::json->>'tenant_id', '');
  
  -- Fallback to session variable set by server middleware: SET LOCAL app.current_tenant_id = '...'
  IF v_tenant_id IS NULL THEN
    v_tenant_id := NULLIF(current_setting('app.current_tenant_id', true), '');
  END IF;

  IF v_tenant_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_tenant_id::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Tenants Table
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    domain TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Users Table (Tenant-scoped profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT users_tenant_email_unique UNIQUE (tenant_id, email)
);

-- 4. Channels Table
CREATE TABLE IF NOT EXISTS public.channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'public' CHECK (type IN ('public', 'private')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT channels_tenant_name_unique UNIQUE (tenant_id, name)
);

-- 5. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    media_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. High-Performance Multi-Tenant Indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id_id ON public.users (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_email ON public.users (tenant_id, email);

CREATE INDEX IF NOT EXISTS idx_channels_tenant_id_id ON public.channels (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_channels_tenant_type ON public.channels (tenant_id, type);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_id_id ON public.messages (tenant_id, id);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_channel ON public.messages (tenant_id, channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_user ON public.messages (tenant_id, user_id);

-- 7. Row-Level Security (RLS) Activation
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies

-- Tenants: Read-only access to one's own tenant
CREATE POLICY "tenants_isolation_select"
    ON public.tenants
    FOR SELECT
    USING (id = public.get_current_tenant_id());

-- Users: Strict tenant isolation for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "users_isolation_select"
    ON public.users
    FOR SELECT
    USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "users_isolation_insert"
    ON public.users
    FOR INSERT
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "users_isolation_update"
    ON public.users
    FOR UPDATE
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "users_isolation_delete"
    ON public.users
    FOR DELETE
    USING (tenant_id = public.get_current_tenant_id());

-- Channels: Strict tenant isolation for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "channels_isolation_select"
    ON public.channels
    FOR SELECT
    USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "channels_isolation_insert"
    ON public.channels
    FOR INSERT
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "channels_isolation_update"
    ON public.channels
    FOR UPDATE
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "channels_isolation_delete"
    ON public.channels
    FOR DELETE
    USING (tenant_id = public.get_current_tenant_id());

-- Messages: Strict tenant isolation for SELECT, INSERT, UPDATE, DELETE
CREATE POLICY "messages_isolation_select"
    ON public.messages
    FOR SELECT
    USING (tenant_id = public.get_current_tenant_id());

CREATE POLICY "messages_isolation_insert"
    ON public.messages
    FOR INSERT
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "messages_isolation_update"
    ON public.messages
    FOR UPDATE
    USING (tenant_id = public.get_current_tenant_id())
    WITH CHECK (tenant_id = public.get_current_tenant_id());

CREATE POLICY "messages_isolation_delete"
    ON public.messages
    FOR DELETE
    USING (tenant_id = public.get_current_tenant_id());

