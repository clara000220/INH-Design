-- 0024 — remember when a phase was marked complete so the printable report
-- can show "Completed on 2 Oct 2026" next to each done phase.
alter table public.phases add column if not exists completed_at timestamptz;
