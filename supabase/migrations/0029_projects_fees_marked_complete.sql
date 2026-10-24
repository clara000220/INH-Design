-- 0029 — owner can manually flag a project's fees "complete" even if the
-- derived pending > 0 (e.g. a tiny retention that stays open indefinitely).
-- Fees screen displays the project as Complete when either
--   fees_marked_complete_at is not null, OR
--   committed > 0 AND pending = 0 (derived).

alter table public.projects add column if not exists fees_marked_complete_at timestamptz;
alter table public.projects add column if not exists fees_marked_complete_by uuid references public.profiles (id);
