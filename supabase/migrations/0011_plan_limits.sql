-- 0011 — plan limits: storage usage meter + internal-user (owner/admin) cap.

-- Total bytes stored across the app's buckets, for the 10 GB plan meter.
-- SECURITY DEFINER so it can read storage.objects; returns a single number.
create or replace function public.storage_usage_bytes()
  returns bigint
  language sql
  security definer
  set search_path = storage, public
as $$
  select coalesce(sum((metadata->>'size')::bigint), 0)::bigint
  from storage.objects
  where bucket_id in ('update-photos', 'documents');
$$;
grant execute on function public.storage_usage_bytes() to authenticated;

-- Cap internal users (owner/admin) at 20. Homeowners are unlimited.
create or replace function public.guard_internal_limit()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.role in ('owner', 'admin')
     and (tg_op = 'INSERT' or old.role is distinct from new.role) then
    if (select count(*) from public.profiles where role in ('owner', 'admin')) >= 20 then
      raise exception 'Internal user limit reached (max 20 owner/admin). Free a slot first.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_internal_limit on public.profiles;
create trigger profiles_internal_limit
  before insert or update on public.profiles
  for each row execute function public.guard_internal_limit();
