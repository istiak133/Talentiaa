-- Enable RLS on the jobs table (already enabled in schema, but making sure)
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

-- 1. Admins can do everything
CREATE POLICY "Admins can do everything on jobs"
  ON public.jobs
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  );

-- 2. Recruiters can insert jobs
CREATE POLICY "Recruiters can insert their own jobs"
  ON public.jobs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The recruiter_id must match their own ID, and their role must be recruiter
    recruiter_id = auth.uid() AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'recruiter'
  );

-- 3. Recruiters can view their own jobs (both draft and published)
CREATE POLICY "Recruiters can view their own jobs"
  ON public.jobs
  FOR SELECT
  TO authenticated
  USING (
    recruiter_id = auth.uid()
  );

-- 4. Recruiters can update their own jobs
CREATE POLICY "Recruiters can update their own jobs"
  ON public.jobs
  FOR UPDATE
  TO authenticated
  USING (
    recruiter_id = auth.uid() AND
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'recruiter'
  );

-- 5. Candidates and everyone else can only view PUBLISHED jobs
CREATE POLICY "Anyone can view published jobs"
  ON public.jobs
  FOR SELECT
  USING (
    status = 'published'
  );

-- No DELETE policy for now, keeping it safe (only admins can delete via the ALL policy, or recruiters can just mark status='closed')
