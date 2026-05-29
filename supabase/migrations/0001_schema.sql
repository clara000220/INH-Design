-- INH Project Management — core schema
-- Roles: owner (INH boss), admin (project manager), homeowner (client).
-- Financial "Fees Release" data (money OUT to contractors) lives in `payments`
-- and is gated to owner-only by RLS in 0002_rls.sql.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role     as enum ('owner', 'admin', 'homeowner');
create type project_status as enum ('ontrack', 'pending', 'overdue');
create type phase_status   as enum ('completed', 'progress', 'upcoming');
create type doc_kind       as enum ('invoice', 'plan', 'doc');
create type payment_status as enum ('pending', 'released', 'overdue', 'hold');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users, holds the role (server-side source of truth)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  contact    text,                       -- email/phone as displayed; not an auth secret
  initials   text,
  role       user_role not null default 'homeowner',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- projects — general (non-financial) project info, visible to assigned members
-- ---------------------------------------------------------------------------
create table public.projects (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  code          text not null unique,
  address       text,
  type          text,
  progress      smallint not null default 0 check (progress between 0 and 100),
  status        project_status not null default 'pending',
  est_handover  date,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- project_members — which admins/homeowners are assigned to which project.
-- Owner is implicitly on every project (handled in RLS helpers, not rows).
-- ---------------------------------------------------------------------------
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);

create index project_members_user_idx on public.project_members (user_id);

-- ---------------------------------------------------------------------------
-- phases — project progress accordion
-- ---------------------------------------------------------------------------
create table public.phases (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,
  status     phase_status not null default 'upcoming',
  pct        smallint not null default 0 check (pct between 0 and 100),
  start_date date,
  end_date   date,
  sort_order smallint not null default 0
);

create index phases_project_idx on public.phases (project_id);

-- ---------------------------------------------------------------------------
-- schedule_items — "This week" timeline
-- ---------------------------------------------------------------------------
create table public.schedule_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null,
  scheduled_date date not null,
  state          text not null default 'upcoming'   -- today | upcoming | done
);

create index schedule_items_project_idx on public.schedule_items (project_id);

-- ---------------------------------------------------------------------------
-- updates + update_photos — Updates feed. Photo bytes live in Storage; we keep
-- the object path only (no public URLs persisted).
-- ---------------------------------------------------------------------------
create table public.updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  room        text not null,
  captured_on date not null default current_date,
  is_new      boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

create index updates_project_idx on public.updates (project_id);

create table public.update_photos (
  id           uuid primary key default gen_random_uuid(),
  update_id    uuid not null references public.updates (id) on delete cascade,
  storage_path text not null,            -- e.g. updates/<project_id>/<update_id>/<file>
  sort_order   smallint not null default 0
);

create index update_photos_update_idx on public.update_photos (update_id);

-- ---------------------------------------------------------------------------
-- documents — client-facing files (invoices=money IN, plans, docs).
-- These are visible to all assigned members. Distinct from `payments`.
-- ---------------------------------------------------------------------------
create table public.documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  name         text not null,
  kind         doc_kind not null default 'doc',
  file_size    bigint,
  storage_path text,                     -- null while not yet ready
  ready        boolean not null default false,
  issued_on    date,
  created_at   timestamptz not null default now()
);

create index documents_project_idx on public.documents (project_id);

-- ---------------------------------------------------------------------------
-- payments — FEES RELEASE / money OUT to contractors. OWNER-ONLY (RLS).
-- PDPA: no bank account or ID numbers stored — `method` is a free-text label
-- only (e.g. "DuitNow · ref #44192"), never raw account data.
-- ---------------------------------------------------------------------------
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  contractor  text not null,
  stage       text,
  amount      numeric(12,2) not null check (amount >= 0),
  due_date    date,
  status      payment_status not null default 'pending',
  method      text,                      -- display label only, NOT account details
  released_at timestamptz,
  released_by uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);

create index payments_project_idx on public.payments (project_id);

-- ---------------------------------------------------------------------------
-- audit_log — append-only record of financial + role-change actions (spec §7A).
-- Immutability (no UPDATE/DELETE) is enforced by trigger in 0003.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id),
  actor_label text not null,             -- snapshot of "Name (Role)" at action time
  action      text not null,
  entity_type text,                      -- 'payment' | 'profile' | ...
  entity_id   text,
  amount      numeric(12,2),
  created_at  timestamptz not null default now()
);

create index audit_log_created_idx on public.audit_log (created_at desc);
