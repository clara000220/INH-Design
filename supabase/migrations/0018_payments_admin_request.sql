-- 0018 — admins can VIEW fees and REQUEST payments (status 'pending'); only the
-- OWNER can release / hold / edit / delete. Money OUT stays owner-controlled.
drop policy if exists payments_owner_only on public.payments;
drop policy if exists payments_select on public.payments;
drop policy if exists payments_insert on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;

-- Staff (owner + admin) can see payments. Homeowners cannot.
create policy payments_select on public.payments
  for select using (public.is_staff());

-- Owner can add any payment; an admin may only add a pending request.
create policy payments_insert on public.payments
  for insert with check (public.is_owner() or (public.is_staff() and status = 'pending'));

-- Only the owner can change a payment (release / hold / edit).
create policy payments_update on public.payments
  for update using (public.is_owner()) with check (public.is_owner());

-- Only the owner can delete a payment.
create policy payments_delete on public.payments
  for delete using (public.is_owner());
