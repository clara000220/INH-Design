-- 0020 — client-side money: the quotation price and a list of payments received
-- from the client (distinct from contractor fees). Staff edit; homeowner reads.
alter table public.projects add column if not exists quotation numeric;
alter table public.projects add column if not exists received_payments jsonb not null default '[]'::jsonb;
