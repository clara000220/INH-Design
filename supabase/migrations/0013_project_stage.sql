-- 0013 — high-level client status stage for a project, distinct from the
-- per-item phase progress. Values: measure | quotation | contract | deposit.
alter table public.projects add column if not exists stage text;
