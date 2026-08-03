-- 0022 — Owner approval lock on contractor payments.
-- Once the owner approves a payment, the amount is frozen for everyone
-- except another owner. Admins can still touch status/method/due_date,
-- but changing the amount raises an exception that surfaces in the UI as
-- "Amount is locked — ask the owner to change it".

alter table public.payments add column if not exists approved_at timestamptz;
alter table public.payments add column if not exists approved_by uuid references public.profiles (id);

create or replace function public.guard_payment_amount_lock()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  caller_role text;
begin
  -- Only care about amount changes on already-approved rows.
  if OLD.approved_at is not null and NEW.amount is distinct from OLD.amount then
    select role into caller_role from public.profiles where id = auth.uid();
    if caller_role is distinct from 'owner' then
      raise exception 'Amount is locked by owner approval — ask an owner to change it';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists guard_payment_amount_lock on public.payments;
create trigger guard_payment_amount_lock
  before update on public.payments
  for each row execute function public.guard_payment_amount_lock();

-- Only owners can set / clear the approval fields directly. The trigger below
-- makes admin-driven writes leave approved_at / approved_by untouched.
create or replace function public.guard_payment_approval_fields()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  caller_role text;
begin
  if (NEW.approved_at is distinct from OLD.approved_at
      or NEW.approved_by is distinct from OLD.approved_by) then
    select role into caller_role from public.profiles where id = auth.uid();
    if caller_role is distinct from 'owner' then
      -- Silently ignore any attempt by non-owners to touch these columns.
      NEW.approved_at := OLD.approved_at;
      NEW.approved_by := OLD.approved_by;
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists guard_payment_approval_fields on public.payments;
create trigger guard_payment_approval_fields
  before update on public.payments
  for each row execute function public.guard_payment_approval_fields();
