-- ========================================
-- RLS Policies for: applications, resumes
-- Run this in Supabase SQL Editor
-- ========================================

-- ── RESUMES ──
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can insert own resumes"
  ON public.resumes FOR INSERT TO authenticated
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Candidates can view own resumes"
  ON public.resumes FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters can view resumes of applicants"
  ON public.resumes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.resume_id = resumes.id AND j.recruiter_id = auth.uid()
    )
  );

-- ── APPLICATIONS ──
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can apply (insert)"
  ON public.applications FOR INSERT TO authenticated
  WITH CHECK (candidate_id = auth.uid());

CREATE POLICY "Candidates can view own applications"
  ON public.applications FOR SELECT TO authenticated
  USING (candidate_id = auth.uid());

CREATE POLICY "Recruiters can view applications for their jobs"
  ON public.applications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id AND j.recruiter_id = auth.uid()
    )
  );

CREATE POLICY "Recruiters can update applications for their jobs"
  ON public.applications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = applications.job_id AND j.recruiter_id = auth.uid()
    )
  );

-- Admins full access
CREATE POLICY "Admins full access resumes"
  ON public.resumes FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins full access applications"
  ON public.applications FOR ALL TO authenticated
  USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');

-- ── STORAGE BUCKET (run separately if needed) ──
-- INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
