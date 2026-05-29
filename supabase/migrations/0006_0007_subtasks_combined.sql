-- Combined 0006 + 0007 — run this ONE block in the Supabase SQL editor.
-- Creates the sub-task table first, then adds the remark + photo-link columns,
-- so it works even on a database that never ran 0006. Fully idempotent.

-- 0006 — sub-tasks under a project phase
create table if not exists public.phase_tasks (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null references public.phases (id)   on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null,
  note       text,
  done       boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists phase_tasks_phase_idx   on public.phase_tasks (phase_id);
create index if not exists phase_tasks_project_idx on public.phase_tasks (project_id);

alter table public.phase_tasks enable row level security;
drop policy if exists phase_tasks_select on public.phase_tasks;
drop policy if exists phase_tasks_write  on public.phase_tasks;
create policy phase_tasks_select on public.phase_tasks
  for select using (public.is_project_member(project_id));
create policy phase_tasks_write on public.phase_tasks
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- 0007 — remark + per-sub-task photos
alter table public.phase_tasks add column if not exists note text;
alter table public.updates add column if not exists task_id uuid
  references public.phase_tasks (id) on delete set null;
create index if not exists updates_task_idx on public.updates (task_id);
