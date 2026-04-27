-- ========================================
-- Add Columns for Recruiter Verification
-- Run this in Supabase SQL Editor
-- ========================================

-- Add company_name and id_card_url to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS id_card_url TEXT;

-- Storage Policies for 'id_cards' bucket (Run this ONLY AFTER creating the bucket manually)
-- These allow anyone to upload but only authenticated users to read.
CREATE POLICY "Anyone can upload ID cards" 
ON storage.objects FOR INSERT 
TO public
WITH CHECK ( bucket_id = 'id_cards' );

CREATE POLICY "Authenticated users can read ID cards" 
ON storage.objects FOR SELECT 
TO authenticated 
USING ( bucket_id = 'id_cards' );
