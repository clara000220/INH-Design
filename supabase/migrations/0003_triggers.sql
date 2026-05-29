-- INH Project Management — integrity triggers
-- Defence-in-depth on top of RLS: these hold even against a misconfigured
-- policy or a privileged service role used carelessly.

-- ---------------------------------------------------------------------------
-- 1. Append-only audit_log. Block UPDATE and DELETE for everyone.
--    (RLS simply has no update/delete policy; this trigger makes it impossible
--     even for the table owner / service role.)
-- ---------------------------------------------------------------------------
create or replace function public.audit_log_immutable()
  returns trigger
  language plpgsql
as $$
begin
  raise exception 'audit_log is append-only; % is not permitted', tg_op;
end;
$$;

create trigger audit_log_no_update
  before update on public.audit_log
  for each row execute function public.audit_log_immutable();

create trigger audit_log_no_delete
  before delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- ---------------------------------------------------------------------------
-- 2. Prevent privilege escalation. Only the owner may change a profile's role.
--    A user updating their own profile (allowed by profiles_update_self) must
--    not be able to flip their own role to 'owner'/'admin'.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_role()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.role is distinct from old.role and not public.is_owner() then
    raise exception 'only an owner may change a user role';
  end if;
  return new;
end;
$$;

create trigger profiles_role_guard
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- ---------------------------------------------------------------------------
-- 3. Auto-write an audit row whenever a payment is released or put on hold,
--    capturing actor + amount. Insert path bypasses RLS via SECURITY DEFINER
--    so the record is always written, but actor identity comes from auth.uid().
-- ---------------------------------------------------------------------------
create or replace function public.log_payment_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_actor text;
  v_verb  text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select coalesce(p.full_name, 'Unknown') || ' (' || coalesce(p.role::text, '?') || ')'
    into v_actor
  from public.profiles p where p.id = auth.uid();

  v_verb := case new.status
              when 'released' then 'Released'
              when 'hold'     then 'Put on hold'
              else 'Updated payment to ' || new.status::text
            end;

  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, amount)
  values (
    auth.uid(),
    coalesce(v_actor, 'System'),
    v_verb || ' — ' || new.contractor,
    'payment',
    new.id::text,
    new.amount
  );

  if new.status = 'released' and new.released_at is null then
    new.released_at := now();
    new.released_by := auth.uid();
  end if;

  return new;
end;
$$;

create trigger payments_audit
  before update on public.payments
  for each row execute function public.log_payment_change();

-- ---------------------------------------------------------------------------
-- 4. Provision a profile automatically when a new auth user is created.
--    Role defaults to 'homeowner'; an owner promotes from the Users screen.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, contact, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'homeowner'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
