-- ─────────────────────────────────────────────────────────────
-- Talentiaa - Update RPC for Recruiter Invitations
-- ─────────────────────────────────────────────────────────────

-- 1. Create a secure RPC function to process the invite token
-- This function runs as SECURITY DEFINER so that an unprivileged user (or standard authenticated user) 
-- can verify their token and elevate their role to recruiter.

create or replace function public.accept_recruiter_invite(token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_id uuid;
  v_expires_at timestamptz;
  v_status invite_status;
begin
  -- Find the invite
  select id, expires_at, status
    into v_invite_id, v_expires_at, v_status
  from public.recruiter_invites
  where token_hash = token;

  -- Validation
  if not found then
    raise exception 'Invalid invitation token';
  end if;
  
  if v_status != 'pending' then
    raise exception 'Invitation has already been used or revoked';
  end if;

  if v_expires_at < now() then
    raise exception 'Invitation has expired';
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

-- Allow authenticated users to call this function
revoke all on function public.accept_recruiter_invite(text) from public;
grant execute on function public.accept_recruiter_invite(text) to authenticated;
