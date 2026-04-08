-- Enable pg_net for async HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Trigger function: fires on every INSERT into notifications
-- and calls the send-push Edge Function via pg_net
CREATE OR REPLACE FUNCTION public.notify_send_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://atxhshirummpenfqtwku.supabase.co/functions/v1/send-push',
    body    := jsonb_build_object(
                 'type',   'INSERT',
                 'table',  'notifications',
                 'schema', 'public',
                 'record', to_jsonb(NEW)
               ),
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0eGhzaGlydW1tcGVuZnF0d2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NTAwMTksImV4cCI6MjA5MDUyNjAxOX0.2Q54dc59CvfT34tEWxPTB8n25mHWCTHpvQyKsAOVE5E'
               ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block the INSERT even if the push call fails
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER notifications_send_push
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();
