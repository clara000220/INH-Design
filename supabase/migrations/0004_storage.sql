-- INH Project Management — Storage buckets + access policies
-- Two private buckets hold the binary files; the DB tables (update_photos,
-- documents) keep only the object path. Access mirrors the table RLS:
--   read  -> any assigned member of the project
--   write -> owner, or admin assigned to that project
--
-- Object path convention (the first path segment is the project_id):
--   update-photos/<project_id>/<update_id>/<file>
--   documents/<project_id>/<file>

-- ---------------------------------------------------------------------------
-- Buckets (private — never public; access always goes through signed URLs)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('update-photos', 'update-photos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper: pull the project_id out of an object's path (first segment).
-- Returns null if the segment is not a uuid, so policies fail closed.
-- ---------------------------------------------------------------------------
create or replace function public.storage_project_id(object_name text)
  returns uuid
  language plpgsql
  immutable
  set search_path = public
as $$
declare
  seg text := split_part(object_name, '/', 1);
begin
  return seg::uuid;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Policies on storage.objects, scoped per bucket. RLS on storage.objects is
-- already enabled by Supabase; we just add INH's rules.
-- ---------------------------------------------------------------------------
drop policy if exists inh_update_photos_read  on storage.objects;
drop policy if exists inh_update_photos_write on storage.objects;
drop policy if exists inh_documents_read       on storage.objects;
drop policy if exists inh_documents_write      on storage.objects;

create policy inh_update_photos_read on storage.objects
  for select using (
    bucket_id = 'update-photos'
    and public.is_project_member(public.storage_project_id(name))
  );

create policy inh_update_photos_write on storage.objects
  for all using (
    bucket_id = 'update-photos'
    and public.can_edit_project(public.storage_project_id(name))
  ) with check (
    bucket_id = 'update-photos'
    and public.can_edit_project(public.storage_project_id(name))
  );

create policy inh_documents_read on storage.objects
  for select using (
    bucket_id = 'documents'
    and public.is_project_member(public.storage_project_id(name))
  );

create policy inh_documents_write on storage.objects
  for all using (
    bucket_id = 'documents'
    and public.can_edit_project(public.storage_project_id(name))
  ) with check (
    bucket_id = 'documents'
    and public.can_edit_project(public.storage_project_id(name))
  );
