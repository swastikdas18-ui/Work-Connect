-- 005_chat_read_receipts.sql
-- Message Read Receipts & Unread Tracking with Tenant Isolation

-- 1. Channel Read States Table (Tenant-first composite primary key)
CREATE TABLE IF NOT EXISTS public.channel_read_states (
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, channel_id, user_id)
);

-- 2. Composite Indexes for High-Performance Badge Counter Lookups
CREATE INDEX IF NOT EXISTS idx_channel_read_states_lookup
  ON public.channel_read_states(tenant_id, user_id, channel_id);

CREATE INDEX IF NOT EXISTS idx_channel_read_states_user
  ON public.channel_read_states(tenant_id, user_id);

-- 3. Row-Level Security (RLS) Activation
ALTER TABLE public.channel_read_states ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Users can only read and manage their own read states within their tenant
CREATE POLICY channel_read_states_user_select ON public.channel_read_states
  FOR SELECT
  USING (
    tenant_id = public.get_current_tenant_id()
    AND user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
  );

CREATE POLICY channel_read_states_user_insert ON public.channel_read_states
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
  );

CREATE POLICY channel_read_states_user_update ON public.channel_read_states
  FOR UPDATE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
  );

CREATE POLICY channel_read_states_user_delete ON public.channel_read_states
  FOR DELETE
  USING (
    tenant_id = public.get_current_tenant_id()
    AND user_id = (NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::UUID)
  );

