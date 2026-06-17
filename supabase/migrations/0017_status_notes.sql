-- 0017 — notes & feedback thread on a project's client status. Anyone on the
-- project (homeowner included) can post; staff and the client all see it, so
-- client feedback is visible even if the stage hasn't been updated in-system.
create table if not exists public.status_notes (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id  uuid references public.profiles (id) default auth.uid(),
  body       text not null,
  created_at timestamptz not null default now()
);
create index if not exists status_notes_project_idx on public.status_notes (project_id);

alter table public.status_notes enable row level security;

drop policy if exists status_notes_select on public.status_notes;
drop policy if exists status_notes_insert on public.status_notes;
drop policy if exists status_notes_delete on public.status_notes;

-- Project members (staff + the assigned homeowner) can read and post.
create policy status_notes_select on public.status_notes
  for select using (public.is_project_member(project_id));
create policy status_notes_insert on public.status_notes
  for insert with check (public.is_project_member(project_id));
-- Only the owner can delete a note.
create policy status_notes_delete on public.status_notes
  for delete using (public.is_owner());
