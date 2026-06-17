-- 0012 — owner-only "delete user". Removes the auth.users row, which cascades
-- the profile, project memberships and stored credentials (all FK on delete
-- cascade). SECURITY DEFINER so it can touch auth.users; guarded so only an
-- owner can call it and nobody can delete themselves.
create or replace function public.delete_user(target uuid)
  returns void
  language plpgsql
  security definer
  set search_path = public, auth
as $$
begin
  if not public.is_owner() then
    raise exception 'Only an owner can delete users.';
  end if;
  if target = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;
  delete from auth.users where id = target;
end;
$$;

grant execute on function public.delete_user(uuid) to authenticated;
