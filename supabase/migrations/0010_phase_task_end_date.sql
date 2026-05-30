-- 0010 — end date for a phase item. The existing due_date acts as the START
-- date (drives the weekly schedule); end_date is the completion date, auto-set
-- when the item is ticked complete. Idempotent.
alter table public.phase_tasks add column if not exists end_date date;
