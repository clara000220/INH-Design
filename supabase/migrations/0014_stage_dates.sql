-- 0014 — record when each client-status stage was ticked. Stored as a JSON map
-- { measure: <iso>, quotation: <iso>, ... }. (projects.created_at already exists.)
alter table public.projects add column if not exists stage_dates jsonb not null default '{}'::jsonb;
