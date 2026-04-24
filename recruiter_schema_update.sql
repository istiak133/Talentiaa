-- ==========================================
-- Talentiaa Recruiter Profiles Update
-- ==========================================

-- 1. Create the recruiter_profiles table for company data
create table if not exists public.recruiter_profiles (
  recruiter_id uuid primary key references public.users(id) on delete cascade,
  company_name text not null,
  company_role text not null,
  department text not null,
  experience_years numeric(4,1) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Enable RLS
alter table public.recruiter_profiles enable row level security;

-- 3. Policy: User can read/write their own profile
create policy recruiter_profiles_select on public.recruiter_profiles
  for select to authenticated
  using (recruiter_id = auth.uid());

create policy recruiter_profiles_insert on public.recruiter_profiles
  for insert to authenticated
  with check (recruiter_id = auth.uid());

create policy recruiter_profiles_update on public.recruiter_profiles
  for update to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

-- 4. Update the accept_recruiter_invite RPC to ENFORCE EMAIL MATCHING
create or replace function public.accept_recruiter_invite(token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_id uuid;
  v_invited_email citext;
  v_expires_at timestamptz;
  v_status invite_status;
  v_current_email citext;
begin
  -- Find the invite
  select id, invited_email, expires_at, status
    into v_invite_id, v_invited_email, v_expires_at, v_status
  from public.recruiter_invites
  where token_hash = token;

  -- Validation Checks
  if not found then
    raise exception 'Invalid invitation token';
  end if;
  
  if v_status != 'pending' then
    raise exception 'Invitation has already been used or revoked';
  end if;

  if v_expires_at < now() then
    raise exception 'Invitation has expired';
  end if;

  -- Get current user's email to ensure it matches the invited email
  select email into v_current_email from auth.users where id = auth.uid();
  
  if lower(v_current_email) != lower(v_invited_email) then
    raise exception 'You must sign up using the exact email address the invitation was sent to.';
  end if;

  -- Change the current user's role to recruiter
  update public.users
  set role = 'recruiter', updated_at = now()
  where id = auth.uid();

  -- Mark invitation as accepted
  update public.recruiter_invites
  set status = 'accepted', used_at = now(), accepted_user_id = auth.uid(), updated_at = now()
  where id = v_invite_id;

  return true;
end;
$$;

-- Grant execution
revoke all on function public.accept_recruiter_invite(text) from public;
grant execute on function public.accept_recruiter_invite(text) to authenticated;
