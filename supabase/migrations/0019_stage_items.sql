-- 0019 — per-stage sub-item checklists for the client status, stored as a JSON
-- map { measure: [{id,title,done}], quotation: [...], ... }.
alter table public.projects add column if not exists stage_items jsonb not null default '{}'::jsonb;
