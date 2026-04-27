-- ========================================
-- Update user trigger for Recruiter Pending Status
-- Run this in Supabase SQL Editor
-- ========================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  requested_role text;
  final_status text;
BEGIN
  requested_role := new.raw_user_meta_data->>'requested_role';
  
  IF requested_role = 'recruiter' THEN
    final_status := 'pending';
  ELSE
    final_status := 'active';
  END IF;

  INSERT INTO public.users (
    id, 
    email, 
    full_name, 
    role, 
    account_status,
    company_name,
    id_card_url
  )
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    COALESCE(requested_role, 'candidate'),
    final_status,
    new.raw_user_meta_data->>'company_name',
    new.raw_user_meta_data->>'id_card_url'
  );
  
  RETURN new;
END;
$$;
