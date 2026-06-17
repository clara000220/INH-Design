-- 0016 — optional line-item breakdown for a contractor payment, stored as a
-- JSON array of { title, amount }.
alter table public.payments add column if not exists items jsonb not null default '[]'::jsonb;
