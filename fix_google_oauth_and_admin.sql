-- =============================================================
-- Fix Google OAuth & Create Admin Account
-- Run this in Supabase SQL Editor
-- =============================================================

-- 1. Create function to handle new user signup (works for both email & OAuth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, role, full_name, email, email_verified, account_status, oauth_provider, oauth_subject, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'requested_role', 'candidate'),
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    true, -- OAuth users are email-verified by Google
    case 
      when coalesce(new.raw_user_meta_data->>'requested_role', 'candidate') = 'recruiter' then 'pending'
      else 'active'
    end,
    case when new.email like '%@google.com' then 'google' else 'supabase' end,
    new.id,
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    updated_at = now();
  
  return new;
end;
$$;

-- 2. Create trigger to call the function when a new auth user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 3. Create your admin account (CHANGE THESE VALUES)
-- First, check if admin already exists
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change,
  email_change_token_new,
  email_change_confirm_status
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@talentiaa.com', -- CHANGE THIS to your admin email
  crypt('Admin@123456', gen_salt('bf')), -- CHANGE THIS to your admin password
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin","requested_role":"admin"}',
  now(),
  now(),
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  0
where not exists (
  select 1 from auth.users where email = 'admin@talentiaa.com' -- CHANGE THIS
);

-- 4. Insert admin profile into public.users
insert into public.users (id, role, full_name, email, email_verified, account_status, oauth_provider)
select 
  id,
  'admin',
  coalesce(raw_user_meta_data->>'full_name', 'Admin'),
  email,
  true,
  'active',
  'supabase'
from auth.users
where email = 'admin@talentiaa.com' -- CHANGE THIS
on conflict (id) do nothing;

-- 5. Enable Google OAuth provider in Supabase
-- NOTE: You must also configure this in Supabase Dashboard:
-- Authentication → Providers → Google → Enable
-- Add your Google Client ID and Client Secret
-- Add authorized redirect URL: https://dchbtmcitcqdfifoibpb.supabase.co/auth/v1/callback

-- 6. Verify setup
select 'Admin account created successfully!' as status;
select id, email, role, account_status from public.users where role = 'admin';
