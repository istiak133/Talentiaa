-- =============================================================
-- Talentiaa Platform — Core Database Schema
-- Run this FIRST, then run supabase_auth_bootstrap.sql
-- =============================================================

-- ─────────────────────────────────────────────
-- 1) Extensions
-- ─────────────────────────────────────────────
create extension if not exists pgcrypto;
create extension if not exists citext;

-- ─────────────────────────────────────────────
-- 2) Enum Types
-- ─────────────────────────────────────────────
do $$ begin
  create type user_role as enum ('admin', 'recruiter', 'candidate');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('pending', 'active', 'suspended', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type invite_status as enum ('pending', 'accepted', 'expired', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_status as enum ('draft', 'published', 'paused', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type job_type as enum ('full_time', 'part_time', 'contract', 'internship');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workplace_type as enum ('onsite', 'hybrid', 'remote');
exception when duplicate_object then null; end $$;

do $$ begin
  create type experience_level as enum ('junior', 'mid', 'senior', 'lead');
exception when duplicate_object then null; end $$;

do $$ begin
  create type parsing_status as enum ('pending', 'processing', 'done', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_stage as enum ('review', 'interview', 'offer', 'hired', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type application_status as enum ('active', 'hired', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_channel as enum ('in_app', 'email');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_delivery_status as enum ('queued', 'sent', 'failed', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type email_template_type as enum ('transactional', 'optional');
exception when duplicate_object then null; end $$;

do $$ begin
  create type analytics_event_type as enum (
    'job.published',
    'application.created',
    'application.stage_changed',
    'candidate.hired',
    'candidate.rejected'
  );
exception when duplicate_object then null; end $$;

-- ─────────────────────────────────────────────
-- 3) Helper Functions
-- ─────────────────────────────────────────────

-- Auto-update updated_at on every UPDATE (used by most tables)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Application stage transition validation + status alignment + version bump
create or replace function public.before_update_applications()
returns trigger
language plpgsql
as $$
begin
  -- Block all changes to withdrawn applications
  if old.status = 'withdrawn' then
    raise exception 'Cannot modify a withdrawn application';
  end if;

  -- Allow withdrawal from any non-terminal status
  if new.status = 'withdrawn' and old.status not in ('hired', 'rejected') then
    new.version = old.version + 1;
    new.updated_at = now();
    return new;
  end if;

  -- Stage transition validation (review → interview → offer → hired; rejected from any)
  if old.current_stage is distinct from new.current_stage then
    if old.current_stage = 'review' and new.current_stage not in ('interview', 'rejected') then
      raise exception 'Invalid stage transition: % -> %', old.current_stage, new.current_stage;
    elsif old.current_stage = 'interview' and new.current_stage not in ('offer', 'rejected') then
      raise exception 'Invalid stage transition: % -> %', old.current_stage, new.current_stage;
    elsif old.current_stage = 'offer' and new.current_stage not in ('hired', 'rejected') then
      raise exception 'Invalid stage transition: % -> %', old.current_stage, new.current_stage;
    elsif old.current_stage in ('hired', 'rejected') then
      raise exception 'Cannot move stage from final state: %', old.current_stage;
    end if;
  end if;

  -- Keep application status aligned with stage
  if new.current_stage = 'hired' then
    new.status := 'hired';
  elsif new.current_stage = 'rejected' then
    new.status := 'rejected';
  elsif new.status in ('hired', 'rejected') and new.current_stage not in ('hired', 'rejected') then
    new.status := 'active';
  end if;

  -- Optimistic concurrency version bump
  new.version = old.version + 1;
  new.updated_at = now();

  return new;
end;
$$;

-- Audit log: record who moved an application between stages
create or replace function public.log_application_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.current_stage is distinct from new.current_stage then
    insert into public.application_stage_history (
      application_id, from_stage, to_stage, moved_by, created_at
    )
    values (
      new.id, old.current_stage, new.current_stage, auth.uid(), now()
    );
  end if;
  return new;
end;
$$;

-- Validates that recruiter_id references a user with recruiter or admin role
create or replace function public.enforce_recruiter_role()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.users
    where id = new.recruiter_id
      and role in ('recruiter', 'admin')
  ) then
    raise exception 'recruiter_id must reference a user with recruiter or admin role';
  end if;
  return new;
end;
$$;

-- Validates that parsing_jobs.candidate_id matches the resume owner
create or replace function public.validate_parsing_job_candidate()
returns trigger
language plpgsql
as $$
declare
  resume_owner uuid;
begin
  select candidate_id into resume_owner
  from public.resumes
  where id = new.resume_id;

  if resume_owner is null then
    raise exception 'Resume not found: %', new.resume_id;
  end if;

  if new.candidate_id != resume_owner then
    raise exception 'parsing_jobs.candidate_id (%) does not match resume owner (%)',
      new.candidate_id, resume_owner;
  end if;

  return new;
end;
$$;

-- Validates job status transitions (deadline check on publish, auto-set timestamps)
create or replace function public.validate_job_status_change()
returns trigger
language plpgsql
as $$
begin
  -- When publishing: deadline must be in the future
  if new.status = 'published' then
    if tg_op = 'INSERT' or old.status is distinct from 'published' then
      if new.application_deadline < current_date then
        raise exception 'Cannot publish a job with a past application deadline';
      end if;
      new.published_at := coalesce(new.published_at, now());
    end if;
  end if;

  -- When closing: record closed_at
  if new.status = 'closed' then
    if tg_op = 'INSERT' or old.status is distinct from 'closed' then
      new.closed_at := coalesce(new.closed_at, now());
    end if;
  end if;

  return new;
end;
$$;

-- ─────────────────────────────────────────────
-- 4) Core Tables
-- ─────────────────────────────────────────────

-- Users: central identity table, synced with auth.users via trigger
-- NOTE: password_hash removed — Supabase Auth manages passwords in auth.users
create table if not exists public.users (
  id              uuid primary key default gen_random_uuid(),
  role            user_role not null default 'candidate',
  full_name       text not null,
  email           citext not null unique,
  email_verified  boolean not null default false,
  account_status  account_status not null default 'pending',
  oauth_provider  text not null default 'supabase',
  oauth_subject   text unique,
  avatar_url      text,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint users_oauth_provider_chk
    check (oauth_provider in ('google', 'supabase'))
);

-- Recruiter invitations (admin invites → recruiter accepts)
create table if not exists public.recruiter_invites (
  id              uuid primary key default gen_random_uuid(),
  invited_email   citext not null,
  invited_by      uuid references public.users(id) on delete set null,
  token_hash      text not null unique,
  expires_at      timestamptz not null,
  status          invite_status not null default 'pending',
  used_at         timestamptz,
  accepted_user_id uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Job postings
create table if not exists public.jobs (
  id                   uuid primary key default gen_random_uuid(),
  recruiter_id         uuid not null references public.users(id) on delete restrict,
  title                text not null,
  department           text,
  job_type             job_type not null,
  workplace_type       workplace_type not null,
  location             text not null,
  salary_min           numeric(12,2),
  salary_max           numeric(12,2),
  salary_currency      text not null default 'BDT',
  salary_visible       boolean not null default true,
  experience_level     experience_level not null,
  required_skills      text[] not null default '{}',
  description          text not null,
  application_deadline date not null,
  hiring_count         integer not null default 1 check (hiring_count > 0),
  threshold_score      numeric(5,2) not null default 70
    check (threshold_score >= 0 and threshold_score <= 100),
  scoring_config       jsonb not null default
    '{"skillsWeight":50,"experienceWeight":35,"educationWeight":15}'::jsonb,
  scoring_version      integer not null default 1,
  status               job_status not null default 'draft',
  published_at         timestamptz,
  closed_at            timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  -- Salary range validation
  constraint jobs_salary_chk
    check (salary_min is null or salary_max is null or salary_min <= salary_max),
  -- Scoring config: must be object with required keys summing to 100
  constraint jobs_scoring_config_valid_chk check (
    jsonb_typeof(scoring_config) = 'object'
    and scoring_config ? 'skillsWeight'
    and scoring_config ? 'experienceWeight'
    and scoring_config ? 'educationWeight'
    and (scoring_config->>'skillsWeight')::numeric >= 0
    and (scoring_config->>'experienceWeight')::numeric >= 0
    and (scoring_config->>'educationWeight')::numeric >= 0
    and (scoring_config->>'skillsWeight')::numeric
      + (scoring_config->>'experienceWeight')::numeric
      + (scoring_config->>'educationWeight')::numeric = 100
  )
);

-- Candidate extended profiles
create table if not exists public.candidate_profiles (
  id                         uuid primary key default gen_random_uuid(),
  candidate_id               uuid not null unique references public.users(id) on delete cascade,
  headline                   text,
  skills                     text[] not null default '{}',
  total_experience_years     numeric(4,1) not null default 0,
  current_location           text,
  education                  jsonb not null default '[]'::jsonb,
  certifications             jsonb not null default '[]'::jsonb,
  linkedin_url               text,
  portfolio_url              text,
  github_url                 text,
  profile_completion_percent integer not null default 0
    check (profile_completion_percent >= 0 and profile_completion_percent <= 100),
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now(),
  -- Ensure JSONB columns stay as arrays (prevent corruption)
  constraint education_is_array     check (jsonb_typeof(education) = 'array'),
  constraint certifications_is_array check (jsonb_typeof(certifications) = 'array')
);

-- Uploaded resumes
create table if not exists public.resumes (
  id              uuid primary key default gen_random_uuid(),
  candidate_id    uuid not null references public.users(id) on delete cascade,
  file_url        text not null,
  file_name       text not null,
  file_type       text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  file_hash       text,
  is_active       boolean not null default true,
  parsing_status  parsing_status not null default 'pending',
  parse_result    jsonb not null default '{}'::jsonb,
  parser_version  text,
  uploaded_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Resume parsing queue
create table if not exists public.parsing_jobs (
  id               uuid primary key default gen_random_uuid(),
  resume_id        uuid not null references public.resumes(id) on delete cascade,
  candidate_id     uuid not null references public.users(id) on delete cascade,
  provider         text,
  status           parsing_status not null default 'pending',
  attempts         integer not null default 0 check (attempts >= 0),
  last_error       text,
  confidence_score numeric(5,2) check (confidence_score >= 0 and confidence_score <= 100),
  started_at       timestamptz,
  finished_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Job applications (the heart of the ATS)
create table if not exists public.applications (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid not null references public.jobs(id) on delete cascade,
  candidate_id       uuid not null references public.users(id) on delete cascade,
  -- ON DELETE RESTRICT: cannot delete a resume that is linked to an application.
  -- Use is_active = false on resume for soft-delete instead.
  resume_id          uuid references public.resumes(id) on delete restrict,
  -- Blind hiring alias: 12 hex chars ≈ 281 trillion combinations (collision-safe)
  candidate_alias    text not null unique default
    ('CAN-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  current_stage      application_stage not null default 'review',
  status             application_status not null default 'active',
  hidden_pool        boolean not null default false,
  threshold_at_apply numeric(5,2) default 70
    check (threshold_at_apply >= 0 and threshold_at_apply <= 100),
  score_overall      numeric(5,2)
    check (score_overall >= 0 and score_overall <= 100),
  score_breakdown    jsonb not null default '{}'::jsonb,
  score_version      integer not null default 1,
  version            integer not null default 1,
  applied_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- One application per candidate per job
  constraint applications_unique_job_candidate unique (job_id, candidate_id)
);

-- Stage transition audit trail
create table if not exists public.application_stage_history (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  from_stage      application_stage,
  to_stage        application_stage not null,
  moved_by        uuid references public.users(id) on delete set null,
  move_note       text,
  created_at      timestamptz not null default now()
);

-- Recruiter notes on applications
create table if not exists public.application_notes (
  id              uuid primary key default gen_random_uuid(),
  application_id  uuid not null references public.applications(id) on delete cascade,
  recruiter_id    uuid not null references public.users(id) on delete cascade,
  note            text not null,
  created_at      timestamptz not null default now()
);

-- Saved search/filter presets for recruiters
create table if not exists public.saved_filters (
  id              uuid primary key default gen_random_uuid(),
  recruiter_id    uuid not null references public.users(id) on delete cascade,
  name            text not null,
  filter_payload  jsonb not null default '{}'::jsonb,
  is_default      boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint saved_filters_unique_name_per_recruiter unique (recruiter_id, name)
);

-- Notifications
-- NOTE: event_type is text (not enum) for flexibility — follow convention: "entity.action"
create table if not exists public.notifications (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.users(id) on delete cascade,
  channel                 notification_channel not null,
  event_type              text not null,
  title                   text not null,
  message                 text not null,
  payload                 jsonb not null default '{}'::jsonb,
  delivery_status         notification_delivery_status not null default 'queued',
  is_read                 boolean not null default false,
  read_at                 timestamptz,
  related_application_id  uuid references public.applications(id) on delete set null,
  sent_at                 timestamptz,
  failed_at               timestamptz,
  created_at              timestamptz not null default now()
);

-- Per-user notification settings
create table if not exists public.notification_preferences (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references public.users(id) on delete cascade,
  status_email_opt_in     boolean not null default true,
  high_score_alert_opt_in boolean not null default true,
  daily_digest_opt_in     boolean not null default false,
  marketing_opt_in        boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Email templates (admin-managed)
create table if not exists public.email_templates (
  id              uuid primary key default gen_random_uuid(),
  template_key    text not null,
  template_type   email_template_type not null,
  subject         text not null,
  html_body       text not null,
  is_active       boolean not null default true,
  version         integer not null default 1,
  updated_by      uuid references public.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint email_templates_unique_key_version unique (template_key, version)
);

-- Audit log for admin/security review
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.users(id) on delete set null,
  action_type text not null,
  entity_type text not null,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

-- Analytics raw events
create table if not exists public.analytics_events (
  id              uuid primary key default gen_random_uuid(),
  event_type      analytics_event_type not null,
  actor_id        uuid references public.users(id) on delete set null,
  job_id          uuid references public.jobs(id) on delete set null,
  application_id  uuid references public.applications(id) on delete set null,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

-- Pre-aggregated analytics snapshots
create table if not exists public.analytics_snapshots (
  id              uuid primary key default gen_random_uuid(),
  snapshot_type   text not null,
  scope_type      text not null,          -- 'job', 'recruiter', 'platform', etc.
  scope_id        uuid,                   -- FK depends on scope_type (polymorphic)
  date_from       date not null,
  date_to         date not null,
  snapshot_data   jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  -- Prevent invalid date ranges
  constraint analytics_snapshots_date_range_chk check (date_from <= date_to)
);

-- ─────────────────────────────────────────────
-- 5) Indexes
-- ─────────────────────────────────────────────

-- users
create index if not exists idx_users_role_status      on public.users(role, account_status);
create index if not exists idx_users_created_at       on public.users(created_at desc);

-- recruiter_invites
create index if not exists idx_recruiter_invites_email_status on public.recruiter_invites(invited_email, status);
create unique index if not exists idx_recruiter_invites_one_pending_email
  on public.recruiter_invites(invited_email) where status = 'pending';

-- jobs
create index if not exists idx_jobs_recruiter_status      on public.jobs(recruiter_id, status);
create index if not exists idx_jobs_status_published_at   on public.jobs(status, published_at desc);
create index if not exists idx_jobs_required_skills_gin   on public.jobs using gin(required_skills);

-- candidate_profiles
create index if not exists idx_candidate_profiles_candidate  on public.candidate_profiles(candidate_id);
create index if not exists idx_candidate_profiles_skills_gin on public.candidate_profiles using gin(skills);

-- resumes
create index if not exists idx_resumes_candidate_uploaded_at on public.resumes(candidate_id, uploaded_at desc);
create unique index if not exists idx_resumes_candidate_hash_unique
  on public.resumes(candidate_id, file_hash) where file_hash is not null;

-- parsing_jobs
create index if not exists idx_parsing_jobs_resume_status     on public.parsing_jobs(resume_id, status);
create index if not exists idx_parsing_jobs_candidate_created on public.parsing_jobs(candidate_id, created_at desc);

-- applications
create index if not exists idx_applications_job_stage_score       on public.applications(job_id, current_stage, score_overall desc);
create index if not exists idx_applications_candidate_applied_at  on public.applications(candidate_id, applied_at desc);
create index if not exists idx_applications_hidden_pool           on public.applications(hidden_pool);

-- application_stage_history
create index if not exists idx_stage_history_app_created on public.application_stage_history(application_id, created_at desc);

-- application_notes
create index if not exists idx_application_notes_app_created on public.application_notes(application_id, created_at desc);

-- saved_filters
create index if not exists idx_saved_filters_recruiter on public.saved_filters(recruiter_id);

-- notifications
create index if not exists idx_notifications_user_read_created   on public.notifications(user_id, is_read, created_at desc);
create index if not exists idx_notifications_delivery_status     on public.notifications(delivery_status, created_at desc);

-- activity_logs
create index if not exists idx_activity_logs_actor_created   on public.activity_logs(actor_id, created_at desc);
create index if not exists idx_activity_logs_entity          on public.activity_logs(entity_type, entity_id);
create index if not exists idx_activity_logs_action_created  on public.activity_logs(action_type, created_at desc);

-- analytics_events
create index if not exists idx_analytics_events_type_created        on public.analytics_events(event_type, created_at desc);
create index if not exists idx_analytics_events_job_created          on public.analytics_events(job_id, created_at desc);
create index if not exists idx_analytics_events_application_created  on public.analytics_events(application_id, created_at desc);

-- analytics_snapshots
create index if not exists idx_analytics_snapshots_type_scope_date
  on public.analytics_snapshots(snapshot_type, scope_id, date_to desc);

-- ─────────────────────────────────────────────
-- 6) Triggers: updated_at auto-management
--    Uses CREATE OR REPLACE (PG14+) — no destructive DROP needed
-- ─────────────────────────────────────────────

create or replace trigger trg_users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace trigger trg_recruiter_invites_set_updated_at
  before update on public.recruiter_invites
  for each row execute function public.set_updated_at();

create or replace trigger trg_jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

create or replace trigger trg_candidate_profiles_set_updated_at
  before update on public.candidate_profiles
  for each row execute function public.set_updated_at();

create or replace trigger trg_resumes_set_updated_at
  before update on public.resumes
  for each row execute function public.set_updated_at();

create or replace trigger trg_parsing_jobs_set_updated_at
  before update on public.parsing_jobs
  for each row execute function public.set_updated_at();

create or replace trigger trg_saved_filters_set_updated_at
  before update on public.saved_filters
  for each row execute function public.set_updated_at();

create or replace trigger trg_notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create or replace trigger trg_email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────
-- 7) Triggers: Business Logic & Integrity
-- ─────────────────────────────────────────────

-- Application stage transitions + status alignment
create or replace trigger trg_applications_before_update
  before update on public.applications
  for each row execute function public.before_update_applications();

-- Application stage change audit log (captures who via auth.uid())
create or replace trigger trg_applications_log_stage_change
  after update on public.applications
  for each row execute function public.log_application_stage_change();

-- Job status transitions (publish deadline check, auto-set timestamps)
create or replace trigger trg_jobs_validate_status_change
  before insert or update of status on public.jobs
  for each row execute function public.validate_job_status_change();

-- Role enforcement: only recruiters/admins can own jobs
create or replace trigger trg_jobs_enforce_recruiter_role
  before insert or update of recruiter_id on public.jobs
  for each row execute function public.enforce_recruiter_role();

-- Role enforcement: only recruiters/admins can write application notes
create or replace trigger trg_application_notes_enforce_recruiter_role
  before insert or update of recruiter_id on public.application_notes
  for each row execute function public.enforce_recruiter_role();

-- Role enforcement: only recruiters/admins can have saved filters
create or replace trigger trg_saved_filters_enforce_recruiter_role
  before insert or update of recruiter_id on public.saved_filters
  for each row execute function public.enforce_recruiter_role();

-- Cross-table integrity: parsing_job.candidate_id must match resume owner
create or replace trigger trg_parsing_jobs_validate_candidate
  before insert or update of resume_id, candidate_id on public.parsing_jobs
  for each row execute function public.validate_parsing_job_candidate();

-- ─────────────────────────────────────────────
-- 8) Enable RLS on ALL tables (policies added in bootstrap)
-- ─────────────────────────────────────────────

alter table public.users                    enable row level security;
alter table public.recruiter_invites        enable row level security;
alter table public.jobs                     enable row level security;
alter table public.candidate_profiles       enable row level security;
alter table public.resumes                  enable row level security;
alter table public.parsing_jobs             enable row level security;
alter table public.applications             enable row level security;
alter table public.application_stage_history enable row level security;
alter table public.application_notes        enable row level security;
alter table public.saved_filters            enable row level security;
alter table public.notifications            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_templates          enable row level security;
alter table public.activity_logs            enable row level security;
alter table public.analytics_events         enable row level security;
alter table public.analytics_snapshots      enable row level security;

