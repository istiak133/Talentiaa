-- Talentiaa Database Setup Script
-- Run this in your Supabase SQL Editor

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create Users Table (Public Profile)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'candidate' CHECK (role IN ('admin', 'recruiter', 'candidate')),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    account_status TEXT DEFAULT 'active' CHECK (account_status IN ('pending', 'active', 'suspended', 'rejected')),
    avatar_url TEXT,
    company_name TEXT,
    id_card_url TEXT,
    university TEXT,
    major TEXT,
    cgpa NUMERIC,
    hometown TEXT,
    study_program TEXT,
    profile_pic_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Resumes Table
CREATE TABLE IF NOT EXISTS public.resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT,
    file_type TEXT,
    file_size_bytes BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Jobs Table
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recruiter_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department TEXT,
    job_type TEXT DEFAULT 'full_time' CHECK (job_type IN ('full_time', 'part_time', 'contract', 'internship')),
    workplace_type TEXT DEFAULT 'onsite' CHECK (workplace_type IN ('onsite', 'hybrid', 'remote')),
    location TEXT NOT NULL,
    salary_min NUMERIC,
    salary_max NUMERIC,
    salary_currency TEXT DEFAULT 'BDT',
    salary_visible BOOLEAN DEFAULT TRUE,
    experience_level TEXT DEFAULT 'mid' CHECK (experience_level IN ('junior', 'mid', 'senior', 'lead')),
    required_skills TEXT[] DEFAULT '{}',
    description TEXT NOT NULL,
    application_deadline DATE,
    hiring_count INTEGER DEFAULT 1,
    threshold_score NUMERIC DEFAULT 70,
    scoring_config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'paused', 'closed')),
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Applications Table
CREATE TABLE IF NOT EXISTS public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
    score_overall NUMERIC,
    score_breakdown JSONB DEFAULT '{}',
    current_stage TEXT DEFAULT 'REVIEW' CHECK (current_stage IN ('REVIEW', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED')),
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id, candidate_id)
);

-- 6. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. RLS Setup (Allow everyone to read for testing, restrict in production)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow authenticated update own user" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow public read jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow recruiters to manage jobs" ON public.jobs FOR ALL USING (auth.uid() = recruiter_id);
CREATE POLICY "Allow candidates to apply" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow users to read applications" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Allow recruiters to update stage" ON public.applications FOR UPDATE USING (true);

-- 8. Trigger to Auto-Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, full_name, email, role, company_name, id_card_url, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'requested_role', 'candidate'),
    NEW.raw_user_meta_data->>'company_name',
    NEW.raw_user_meta_data->>'id_card_url',
    CASE WHEN (NEW.raw_user_meta_data->>'requested_role' = 'recruiter') THEN 'active' ELSE 'active' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Insert Sample Job (Optional - Change recruiter_id to your own if needed)
-- Note: Replace the UUID below with a real recruiter ID to see it in the dashboard
-- INSERT INTO public.jobs (title, department, location, required_skills, description)
-- VALUES ('Senior Software Engineer', 'Technology', 'Dhaka', ARRAY['React', 'Node.js', 'PostgreSQL'], 'Modern job posting description...');
