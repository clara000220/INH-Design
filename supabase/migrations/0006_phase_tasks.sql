-- 0006 — sub-tasks under a project phase.
-- Paste this whole file into the Supabase SQL editor and run it. Idempotent.

create table if not exists public.phase_tasks (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null references public.phases (id)   on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists phase_tasks_phase_idx   on public.phase_tasks (phase_id);
create index if not exists phase_tasks_project_idx on public.phase_tasks (project_id);

alter table public.phase_tasks enable row level security;

drop policy if exists phase_tasks_select on public.phase_tasks;
drop policy if exists phase_tasks_write  on public.phase_tasks;

-- Members can read; only owner/admin-on-the-project can write (same as phases).
create policy phase_tasks_select on public.phase_tasks
  for select using (public.is_project_member(project_id));
create policy phase_tasks_write on public.phase_tasks
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));
