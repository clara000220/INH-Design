-- 0028 — fix the admin-edit guard so admins CAN add new stages.
--
-- 0025 blocked ANY change to payment.amount for non-owners. That's wrong
-- in practice because the top-level amount is derived from items[] on
-- the client — appending a new stage always changes the derived total,
-- so admins hit "Admins cannot change a payment amount" on exactly the
-- action they were supposed to be allowed to do.
--
-- New rule: admin may change the top-level amount, but only to a value
-- that equals the current sum of items[] after the write. Combined with
-- the existing lock on existing stage amounts/titles/removal, this means
-- the amount can only grow by the sum of newly-appended stages — admin
-- can't invent money by writing a bogus top-level number.

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
  items_sum numeric;
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
  if NEW.amount is distinct from OLD.amount then
    select coalesce(sum( ((v->>'amount')::numeric) ), 0)
      into items_sum
      from jsonb_array_elements(new_items) v;
    if abs(coalesce(items_sum, 0) - coalesce(NEW.amount, 0)) > 0.01 then
      raise exception 'Payment amount must equal the sum of its stages — ask the owner to adjust';
    end if;
  end if;
  return NEW;
end;
$$;
