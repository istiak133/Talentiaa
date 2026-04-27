-- ========================================
-- RLS Policies for: notifications
-- Run this in Supabase SQL Editor
-- ========================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications (mark as read)"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System/Authenticated can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true); -- Any authenticated user (recruiter/candidate) can trigger a notification for someone else

-- Admin full access
CREATE POLICY "Admins full access notifications"
  ON public.notifications FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
