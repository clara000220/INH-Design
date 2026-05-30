-- 0009 — optional date for a phase item, so dated items can surface on the
-- weekly schedule alongside schedule_items. Idempotent.
alter table public.phase_tasks add column if not exists due_date date;
create index if not exists phase_tasks_due_idx on public.phase_tasks (due_date);
