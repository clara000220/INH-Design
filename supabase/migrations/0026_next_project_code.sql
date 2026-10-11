-- 0026 — allocate the next project code via a security-definer RPC so admins
-- (whose RLS only lets them see the projects they created or are on) get
-- the real next free number, not a duplicate of a code they can't see.

create or replace function public.next_project_code()
  returns text
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  caller_role text;
  yr text;
  prefix text;
  next_n int;
begin
  select role::text into caller_role from public.profiles where id = auth.uid();
  if caller_role not in ('owner', 'admin') then
    raise exception 'Only staff can allocate project codes';
  end if;
  yr := to_char(now(), 'YYYY');
  prefix := 'P-' || yr || '-';
  select coalesce(max(
    nullif(regexp_replace(code, '^P-' || yr || '-', ''), '')::int
  ), 0) + 1
    into next_n
    from public.projects
    where code like prefix || '%';
  return prefix || lpad(next_n::text, 3, '0');
end;
$$;

revoke all on function public.next_project_code() from public;
grant execute on function public.next_project_code() to authenticated;
