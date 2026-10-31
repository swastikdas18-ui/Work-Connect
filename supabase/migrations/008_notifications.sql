-- Migration 008: Notifications & Live In-App Alerts

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'post_comment', 
    'post_like', 
    'mention', 
    'newsletter_broadcast', 
    'event_reminder', 
    'event_waitlist_promoted'
  )),
  resource_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tenant-first composite indexes for high performance querying and unread counts
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_recipient 
  ON notifications(tenant_id, recipient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_unread 
  ON notifications(tenant_id, recipient_id) 
  WHERE read_at IS NULL;

-- Enable Row-Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tenant isolation RLS policies
DROP POLICY IF EXISTS tenant_isolation_notifications ON notifications;
CREATE POLICY tenant_isolation_notifications ON notifications
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
    AND recipient_id = auth.uid()
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
    AND recipient_id = auth.uid()
  );

