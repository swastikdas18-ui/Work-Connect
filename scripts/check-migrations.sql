-- Run in Supabase SQL Editor on Production to verify all migrations and RLS enablement
SELECT 
  tablename, 
  rowsecurity AS rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'tenants', 
    'users', 
    'channels', 
    'messages', 
    'posts', 
    'post_comments', 
    'post_reactions', 
    'tenant_invites', 
    'newsletters', 
    'newsletter_subscribers', 
    'channel_read_states', 
    'events', 
    'event_rsvps'
  )
ORDER BY tablename ASC;

