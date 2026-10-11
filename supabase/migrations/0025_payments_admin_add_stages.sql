-- 0025 — admins can add new stages to a contractor payment but can't touch
-- the money. Opens the payments_update policy to all staff, then a trigger
-- enforces the exact rules below for non-owner callers.
--
-- Admin CAN:
--   • add new stages to items[]
--   • change due_date / method
--   • move an existing stage between pending ↔ hold
--   • move the whole payment status back to pending
--
-- Admin CANNOT:
--   • change contractor name
--   • change the top-level amount
--   • change the amount or title of a stage already in items[]
--   • remove a stage that was already in items[]
--   • mark anything released / overdue (release is owner-only)
--   • touch approved_at / approved_by (owner approval lock)

drop policy if exists payments_update on public.payments;
create policy payments_update on public.payments
  for update using (public.is_staff()) with check (public.is_staff());

create or replace function public.guard_payment_admin_edits()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  caller_role text;
  old_items jsonb;
  new_items jsonb;
  i int;
  old_item jsonb;
  new_item jsonb;
begin
  select role::text into caller_role from public.profiles where id = auth.uid();
  if caller_role = 'owner' then
    return NEW;
  end if;
  if NEW.contractor is distinct from OLD.contractor then
    raise exception 'Admins cannot change the contractor on an existing payment';
  end if;
  if NEW.amount is distinct from OLD.amount then
    raise exception 'Admins cannot change a payment amount — ask the owner';
  end if;
  if NEW.status is distinct from OLD.status and NEW.status <> 'pending' then
    raise exception 'Admins can only set status to pending — release / hold / overdue is owner-only';
  end if;
  if NEW.approved_at is distinct from OLD.approved_at or NEW.approved_by is distinct from OLD.approved_by then
    NEW.approved_at := OLD.approved_at;
    NEW.approved_by := OLD.approved_by;
  end if;
  old_items := coalesce(OLD.items, '[]'::jsonb);
  new_items := coalesce(NEW.items, '[]'::jsonb);
  if jsonb_array_length(new_items) < jsonb_array_length(old_items) then
    raise exception 'Admins cannot remove an existing stage — ask the owner';
  end if;
  for i in 0 .. jsonb_array_length(old_items) - 1 loop
    old_item := old_items -> i;
    new_item := new_items -> i;
    if (old_item ->> 'amount') is distinct from (new_item ->> 'amount') then
      raise exception 'Admins cannot change the amount of an existing stage — ask the owner';
    end if;
    if (old_item ->> 'title') is distinct from (new_item ->> 'title') then
      raise exception 'Admins cannot rename an existing stage — ask the owner';
    end if;
    if (old_item ->> 'status') is distinct from (new_item ->> 'status')
       and (new_item ->> 'status') not in ('pending','hold') then
      raise exception 'Admins can only move a stage to pending or hold';
    end if;
  end loop;
  return NEW;
end;
$$;

drop trigger if exists guard_payment_admin_edits on public.payments;
create trigger guard_payment_admin_edits
  before update on public.payments
  for each row execute function public.guard_payment_admin_edits();
