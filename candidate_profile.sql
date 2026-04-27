-- ========================================
-- Candidate Profile Schema Update
-- Run this in Supabase SQL Editor
-- ========================================

-- Add candidate biodata columns to the users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS university TEXT,
ADD COLUMN IF NOT EXISTS major TEXT,
ADD COLUMN IF NOT EXISTS cgpa NUMERIC,
ADD COLUMN IF NOT EXISTS hometown TEXT,
ADD COLUMN IF NOT EXISTS study_program TEXT,
ADD COLUMN IF NOT EXISTS profile_pic_url TEXT;

-- Enable storage policies for avatars bucket
-- Note: Create the 'avatars' bucket manually in Supabase Dashboard first!
CREATE POLICY "Anyone can upload avatars" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK ( bucket_id = 'avatars' );

CREATE POLICY "Anyone can view avatars" 
ON storage.objects FOR SELECT 
TO public 
USING ( bucket_id = 'avatars' );

CREATE POLICY "Users can update their own avatar" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'avatars' AND auth.uid() = owner );
