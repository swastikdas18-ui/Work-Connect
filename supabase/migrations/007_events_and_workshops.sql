-- Migration 007: Events, Workshops, and RSVPs

CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('workshop', 'tech_talk', 'demo_day', 'office_hours', 'social')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'employees_only', 'interns_only')),
  meeting_url TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_valid_time_range CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'attending' CHECK (status IN ('attending', 'declined', 'waitlisted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, event_id, user_id)
);

-- Tenant-first composite indexes
CREATE INDEX IF NOT EXISTS idx_events_tenant_schedule ON public.events(tenant_id, starts_at ASC);
CREATE INDEX IF NOT EXISTS idx_events_tenant_type ON public.events(tenant_id, event_type, starts_at ASC);
CREATE INDEX IF NOT EXISTS idx_rsvps_tenant_event ON public.event_rsvps(tenant_id, event_id, status);
CREATE INDEX IF NOT EXISTS idx_rsvps_tenant_user ON public.event_rsvps(tenant_id, user_id);

-- Enable RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- Events RLS Policies
CREATE POLICY tenant_isolation_events_select ON public.events
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY tenant_isolation_events_mutation ON public.events
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

-- RSVPs RLS Policies
CREATE POLICY tenant_isolation_rsvps_select ON public.event_rsvps
  FOR SELECT USING (
    tenant_id = public.get_current_tenant_id()
  );

CREATE POLICY tenant_isolation_rsvps_mutation ON public.event_rsvps
  FOR ALL USING (
    tenant_id = public.get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = public.get_current_tenant_id()
  );

