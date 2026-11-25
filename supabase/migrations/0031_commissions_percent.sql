-- 0031 — commission can be entered as a percentage of a base amount.
-- `amount` stays the source of truth (RM paid); percent + base_amount just
-- record how it was worked out, e.g. 5% of RM30,000 = RM1,500.
alter table public.commissions add column if not exists percent numeric(6,3) check (percent is null or (percent > 0 and percent <= 100));
alter table public.commissions add column if not exists base_amount numeric(12,2) check (base_amount is null or base_amount > 0);
