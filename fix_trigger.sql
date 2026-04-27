-- Run this in Supabase SQL Editor
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS id_card_url TEXT,
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

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
EXCEPTION WHEN OTHERS THEN
  -- Fallback if the above insert fails (e.g. missing columns) so the user still gets created
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'candidate');
  RETURN new;
END;
$$;
