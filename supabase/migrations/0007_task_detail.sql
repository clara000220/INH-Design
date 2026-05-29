-- 0007 — richer sub-tasks: a remark/note + the ability to attach photos to a
-- specific sub-task. Paste this whole file into the Supabase SQL editor. Idempotent.

-- A free-text remark on a sub-task.
alter table public.phase_tasks add column if not exists note text;

-- Let a progress update (and therefore its photos) belong to a sub-task, so a
-- sub-task's detail view can show just its own photos. Nullable: updates posted
-- from the Updates tab simply have no task.
alter table public.updates add column if not exists task_id uuid
  references public.phase_tasks (id) on delete set null;
create index if not exists updates_task_idx on public.updates (task_id);
