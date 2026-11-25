-- 0030 — Staff commissions.
-- Staff (admin or owner) write down a commission claim by hand; the owner
-- decides "released" or "not released". Rules enforced server-side:
--   * staff see only their own claims; the owner sees everyone's
--   * staff can add / edit / delete their own claim only while it's pending
--   * only the owner can change status (release / not release / reopen)
-- No bank details are stored — just a title, amount and optional note.

create table if not exists public.commissions (
  id             uuid primary key default gen_random_uuid(),
  staff_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  project_id     uuid references public.projects (id) on delete set null,
  title          text not null,
  amount         numeric(12,2) not null check (amount > 0),
  note           text,
  status         text not null default 'pending'
                 check (status in ('pending', 'released', 'not_released')),
  decided_by     uuid references public.profiles (id),
  decided_at     timestamptz,
  decision_note  text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists commissions_staff_idx   on public.commissions (staff_id);
create index if not exists commissions_project_idx on public.commissions (project_id);

alter table public.commissions enable row level security;

drop policy if exists commissions_select on public.commissions;
create policy commissions_select on public.commissions for select
  using (is_owner() or staff_id = auth.uid());

drop policy if exists commissions_insert on public.commissions;
create policy commissions_insert on public.commissions for insert
  with check (
    is_owner()
    or (is_staff() and staff_id = auth.uid() and status = 'pending')
  );

drop policy if exists commissions_update on public.commissions;
create policy commissions_update on public.commissions for update
  using (is_owner() or (staff_id = auth.uid() and status = 'pending'))
  with check (is_owner() or (staff_id = auth.uid() and status = 'pending'));

drop policy if exists commissions_delete on public.commissions;
create policy commissions_delete on public.commissions for delete
  using (is_owner() or (staff_id = auth.uid() and status = 'pending'));

-- Guard: non-owners can never touch the decision fields or reassign a claim.
-- Owner status changes stamp who decided and when.
create or replace function public.commissions_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if not is_owner() then
      new.status := 'pending'; new.decided_by := null; new.decided_at := null; new.decision_note := null;
      new.staff_id := auth.uid();
    elsif new.status <> 'pending' then
      new.decided_by := auth.uid(); new.decided_at := now();
    end if;
    return new;
  end if;
  new.updated_at := now();
  if not is_owner() then
    new.status        := old.status;
    new.decided_by    := old.decided_by;
    new.decided_at    := old.decided_at;
    new.decision_note := old.decision_note;
    new.staff_id      := old.staff_id;
  elsif new.status is distinct from old.status then
    if new.status = 'pending' then
      new.decided_by := null;
      new.decided_at := null;
    else
      new.decided_by := auth.uid();
      new.decided_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists commissions_guard on public.commissions;
create trigger commissions_guard before insert or update on public.commissions
  for each row execute function public.commissions_guard();
