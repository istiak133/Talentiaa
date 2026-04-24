
do $$
begin
  if exists (
    select 1
    from public.users u
    left join auth.users au on au.id = u.id
    where au.id is null
  ) then
    raise notice 'Skipped users_auth_users_fk — orphan rows exist in public.users.';
  elsif not exists (
    select 1
    from pg_constraint
    where conname = 'users_auth_users_fk'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_auth_users_fk
      foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 2) Helper: get current user's role for RLS policies
-- ─────────────────────────────────────────────

create or replace function public.current_user_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- ─────────────────────────────────────────────
-- 3) Trigger: create public.users row on auth signup
-- ─────────────────────────────────────────────

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  provider_name text;
begin
  provider_name := case
    when coalesce(new.raw_app_meta_data->>'provider', '') = 'google' then 'google'
    else 'supabase'
  end;

  insert into public.users (
    id,
    role,
    full_name,
    email,
    email_verified,
    account_status,
    oauth_provider,
    oauth_subject,
    created_at,
    updated_at
  )
  values (
    new.id,
    'candidate'::user_role,
    coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    (new.email_confirmed_at is not null),
    case
      when new.email_confirmed_at is null then 'pending'::account_status
      else 'active'::account_status
    end,
    provider_name,
    new.id::text,
    now(),
    now()
  )
  on conflict (id) do update
    set email          = excluded.email,
        email_verified = excluded.email_verified,
        oauth_provider = excluded.oauth_provider,
        updated_at     = now();

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_on_auth_user_created'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger trg_on_auth_user_created
    after insert on auth.users
    for each row
    execute function public.handle_auth_user_created();
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 4) Trigger: sync public.users when auth user updates
-- ─────────────────────────────────────────────

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email          = new.email,
      email_verified = (new.email_confirmed_at is not null),
      account_status = case
        when account_status = 'pending' and new.email_confirmed_at is not null
          then 'active'::account_status
        else account_status
      end,
      updated_at = now()
  where id = new.id;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_on_auth_user_updated'
      and tgrelid = 'auth.users'::regclass
  ) then
    create trigger trg_on_auth_user_updated
    after update of email, email_confirmed_at on auth.users
    for each row
    execute function public.handle_auth_user_updated();
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 5) Backfill: sync any auth users created before trigger existed
-- ─────────────────────────────────────────────

insert into public.users (
  id, role, full_name, email, email_verified, account_status,
  oauth_provider, oauth_subject, created_at, updated_at
)
select
  au.id,
  'candidate'::user_role,
  coalesce(nullif(au.raw_user_meta_data->>'full_name', ''), split_part(au.email, '@', 1)),
  au.email,
  (au.email_confirmed_at is not null),
  case
    when au.email_confirmed_at is null then 'pending'::account_status
    else 'active'::account_status
  end,
  case
    when coalesce(au.raw_app_meta_data->>'provider', '') = 'google' then 'google'
    else 'supabase'
  end,
  au.id::text,
  now(),
  now()
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null;

-- ─────────────────────────────────────────────
-- 6) Security Guard: block non-admin from changing role/status
-- ─────────────────────────────────────────────

create or replace function public.block_non_admin_profile_privilege_changes()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and public.current_user_role() <> 'admin' then
    if old.role is distinct from new.role then
      raise exception 'Only admin can change role';
    end if;

    if old.account_status is distinct from new.account_status then
      raise exception 'Only admin can change account status';
    end if;
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'trg_users_block_privilege_changes'
      and tgrelid = 'public.users'::regclass
  ) then
    create trigger trg_users_block_privilege_changes
    before update on public.users
    for each row
    execute function public.block_non_admin_profile_privilege_changes();
  end if;
end $$;

-- ─────────────────────────────────────────────
-- 7) Admin helper: assign role after signup
-- ─────────────────────────────────────────────

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role user_role,
  p_account_status account_status default 'active'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Only admin can assign roles';
  end if;

  update public.users
  set role           = p_role,
      account_status = p_account_status,
      updated_at     = now()
  where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, user_role, account_status) from public;
grant execute on function public.admin_set_user_role(uuid, user_role, account_status) to authenticated;

-- =============================================================
-- 8) ROW LEVEL SECURITY — ALL TABLES
-- =============================================================

-- ─────────────────────────── users ───────────────────────────
alter table public.users enable row level security;

drop policy if exists users_select on public.users;
create policy users_select on public.users
  for select to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists users_update on public.users;
create policy users_update on public.users
  for update to authenticated
  using (
    id = auth.uid()
    or public.current_user_role() = 'admin'
  )
  with check (
    id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists users_delete on public.users;
create policy users_delete on public.users
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ─────────────────────── recruiter_invites ───────────────────
alter table public.recruiter_invites enable row level security;

drop policy if exists recruiter_invites_select on public.recruiter_invites;
create policy recruiter_invites_select on public.recruiter_invites
  for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or accepted_user_id = auth.uid()
  );

drop policy if exists recruiter_invites_insert on public.recruiter_invites;
create policy recruiter_invites_insert on public.recruiter_invites
  for insert to authenticated
  with check (public.current_user_role() = 'admin');

drop policy if exists recruiter_invites_update on public.recruiter_invites;
create policy recruiter_invites_update on public.recruiter_invites
  for update to authenticated
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

drop policy if exists recruiter_invites_delete on public.recruiter_invites;
create policy recruiter_invites_delete on public.recruiter_invites
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ──────────────────────────── jobs ───────────────────────────
alter table public.jobs enable row level security;

-- Authenticated: recruiter sees own, admin sees all, candidates see published
drop policy if exists jobs_select on public.jobs;
create policy jobs_select on public.jobs
  for select to authenticated
  using (
    recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
    or (status = 'published' and application_deadline >= current_date)
  );

-- Anonymous visitors can browse published jobs (public job board)
drop policy if exists jobs_select_anon on public.jobs;
create policy jobs_select_anon on public.jobs
  for select to anon
  using (status = 'published' and application_deadline >= current_date);

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs
  for insert to authenticated
  with check (
    recruiter_id = auth.uid()
    and public.current_user_role() in ('recruiter', 'admin')
  );

drop policy if exists jobs_update on public.jobs;
create policy jobs_update on public.jobs
  for update to authenticated
  using (
    recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
  )
  with check (
    recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists jobs_delete on public.jobs;
create policy jobs_delete on public.jobs
  for delete to authenticated
  using (
    recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─────────────────── candidate_profiles ─────────────────────
alter table public.candidate_profiles enable row level security;

drop policy if exists candidate_profiles_select on public.candidate_profiles;
create policy candidate_profiles_select on public.candidate_profiles
  for select to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() in ('recruiter', 'admin')
  );

drop policy if exists candidate_profiles_insert on public.candidate_profiles;
create policy candidate_profiles_insert on public.candidate_profiles
  for insert to authenticated
  with check (
    candidate_id = auth.uid()
    and public.current_user_role() = 'candidate'
  );

drop policy if exists candidate_profiles_update on public.candidate_profiles;
create policy candidate_profiles_update on public.candidate_profiles
  for update to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  )
  with check (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists candidate_profiles_delete on public.candidate_profiles;
create policy candidate_profiles_delete on public.candidate_profiles
  for delete to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ──────────────────────── resumes ───────────────────────────
alter table public.resumes enable row level security;

drop policy if exists resumes_select on public.resumes;
create policy resumes_select on public.resumes
  for select to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists resumes_insert on public.resumes;
create policy resumes_insert on public.resumes
  for insert to authenticated
  with check (
    candidate_id = auth.uid()
    and public.current_user_role() = 'candidate'
  );

drop policy if exists resumes_update on public.resumes;
create policy resumes_update on public.resumes
  for update to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists resumes_delete on public.resumes;
create policy resumes_delete on public.resumes
  for delete to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─────────────────── parsing_jobs ───────────────────────────
-- NOTE: INSERT/UPDATE done via service role (backend). Only SELECT for users.
alter table public.parsing_jobs enable row level security;

drop policy if exists parsing_jobs_select on public.parsing_jobs;
create policy parsing_jobs_select on public.parsing_jobs
  for select to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─────────────────── applications ───────────────────────────
alter table public.applications enable row level security;

drop policy if exists applications_select on public.applications;
create policy applications_select on public.applications
  for select to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.jobs
      where jobs.id = applications.job_id
        and jobs.recruiter_id = auth.uid()
    )
  );

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications
  for insert to authenticated
  with check (
    candidate_id = auth.uid()
    and public.current_user_role() = 'candidate'
    and exists (
      select 1 from public.jobs
      where jobs.id = job_id
        and jobs.status = 'published'
        and jobs.application_deadline >= current_date
    )
  );

-- Recruiter can update their job's applications; candidate can withdraw own
drop policy if exists applications_update on public.applications;
create policy applications_update on public.applications
  for update to authenticated
  using (
    candidate_id = auth.uid()
    or public.current_user_role() = 'admin'
    or exists (
      select 1 from public.jobs
      where jobs.id = applications.job_id
        and jobs.recruiter_id = auth.uid()
    )
  );

drop policy if exists applications_delete on public.applications;
create policy applications_delete on public.applications
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ──────────── application_stage_history ─────────────────────
-- READ-only for users; INSERT done via trigger (SECURITY DEFINER)
alter table public.application_stage_history enable row level security;

drop policy if exists stage_history_select on public.application_stage_history;
create policy stage_history_select on public.application_stage_history
  for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.applications a
      where a.id = application_stage_history.application_id
        and (
          a.candidate_id = auth.uid()
          or exists (
            select 1 from public.jobs j
            where j.id = a.job_id and j.recruiter_id = auth.uid()
          )
        )
    )
  );

-- ──────────────── application_notes ─────────────────────────
alter table public.application_notes enable row level security;

drop policy if exists application_notes_select on public.application_notes;
create policy application_notes_select on public.application_notes
  for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = application_notes.application_id
        and j.recruiter_id = auth.uid()
    )
  );

drop policy if exists application_notes_insert on public.application_notes;
create policy application_notes_insert on public.application_notes
  for insert to authenticated
  with check (
    recruiter_id = auth.uid()
    and (
      public.current_user_role() in ('recruiter', 'admin')
    )
  );

drop policy if exists application_notes_update on public.application_notes;
create policy application_notes_update on public.application_notes
  for update to authenticated
  using (
    recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

drop policy if exists application_notes_delete on public.application_notes;
create policy application_notes_delete on public.application_notes
  for delete to authenticated
  using (
    recruiter_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ─────────────────── saved_filters ──────────────────────────
alter table public.saved_filters enable row level security;

drop policy if exists saved_filters_all on public.saved_filters;
create policy saved_filters_all on public.saved_filters
  for all to authenticated
  using (recruiter_id = auth.uid())
  with check (recruiter_id = auth.uid());

-- ─────────────────── notifications ──────────────────────────
-- INSERT done via service role / trigger. Users can only read/update own.
alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete to authenticated
  using (
    user_id = auth.uid()
    or public.current_user_role() = 'admin'
  );

-- ──────────── notification_preferences ─────────────────────
alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_all on public.notification_preferences;
create policy notification_preferences_all on public.notification_preferences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ──────────────── email_templates ───────────────────────────
alter table public.email_templates enable row level security;

drop policy if exists email_templates_select on public.email_templates;
create policy email_templates_select on public.email_templates
  for select to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists email_templates_insert on public.email_templates;
create policy email_templates_insert on public.email_templates
  for insert to authenticated
  with check (public.current_user_role() = 'admin');

drop policy if exists email_templates_update on public.email_templates;
create policy email_templates_update on public.email_templates
  for update to authenticated
  using (public.current_user_role() = 'admin');

drop policy if exists email_templates_delete on public.email_templates;
create policy email_templates_delete on public.email_templates
  for delete to authenticated
  using (public.current_user_role() = 'admin');

-- ──────────────── activity_logs ─────────────────────────────
-- INSERT via service role / triggers. Admin reads.
alter table public.activity_logs enable row level security;

drop policy if exists activity_logs_select on public.activity_logs;
create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (public.current_user_role() = 'admin');

-- ──────────────── analytics_events ─────────────────────────
-- INSERT via service role / triggers. Admin + recruiter reads.
alter table public.analytics_events enable row level security;

drop policy if exists analytics_events_select on public.analytics_events;
create policy analytics_events_select on public.analytics_events
  for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'recruiter'
      and job_id is not null
      and exists (
        select 1 from public.jobs
        where jobs.id = analytics_events.job_id
          and jobs.recruiter_id = auth.uid()
      )
    )
  );

-- ──────────────── analytics_snapshots ───────────────────────
-- INSERT via service role. Admin reads all, recruiter reads own scope.
alter table public.analytics_snapshots enable row level security;

drop policy if exists analytics_snapshots_select on public.analytics_snapshots;
create policy analytics_snapshots_select on public.analytics_snapshots
  for select to authenticated
  using (
    public.current_user_role() = 'admin'
    or (
      public.current_user_role() = 'recruiter'
      and scope_type = 'recruiter'
      and scope_id = auth.uid()
    )
  );
