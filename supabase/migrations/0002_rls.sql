-- INH Project Management — Row-Level Security
-- This file is the real RBAC enforcement. The React UI hiding a tab is cosmetic;
-- these policies are what actually stop an Admin's token from reading Fees data.

-- ---------------------------------------------------------------------------
-- Helper functions. SECURITY DEFINER so they read `profiles`/`project_members`
-- without triggering those tables' own RLS (prevents infinite recursion).
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
  returns user_role
  language sql
  stable
  security definer
  set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_owner()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(public.current_role() = 'owner', false);
$$;

create or replace function public.is_staff()
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select coalesce(public.current_role() in ('owner', 'admin'), false);
$$;

-- True if the caller is the owner, or is explicitly assigned to the project.
create or replace function public.is_project_member(pid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.is_owner()
      or exists (
        select 1 from public.project_members m
        where m.project_id = pid and m.user_id = auth.uid()
      );
$$;

-- True if the caller is the owner, or an admin assigned to the project
-- (i.e. allowed to WRITE project content). Homeowners are read-only.
create or replace function public.can_edit_project(pid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.is_owner()
      or (
        public.current_role() = 'admin'
        and exists (
          select 1 from public.project_members m
          where m.project_id = pid and m.user_id = auth.uid()
        )
      );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. Default-deny: with no matching policy, access is denied.
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.phases          enable row level security;
alter table public.schedule_items  enable row level security;
alter table public.updates         enable row level security;
alter table public.update_photos   enable row level security;
alter table public.documents       enable row level security;
alter table public.payments        enable row level security;
alter table public.audit_log       enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
--  - read: yourself; owner reads all; staff/clients read profiles they share a project with
--  - update: yourself (role column locked by trigger in 0003); owner updates anyone
--  - insert/delete: owner only (provisioning users)
-- ---------------------------------------------------------------------------
create policy profiles_select on public.profiles
  for select using (
    id = auth.uid()
    or public.is_owner()
    or exists (
      select 1
      from public.project_members me
      join public.project_members them on them.project_id = me.project_id
      where me.user_id = auth.uid() and them.user_id = profiles.id
    )
  );

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_owner_all on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create policy projects_select on public.projects
  for select using (public.is_project_member(id));

create policy projects_insert on public.projects
  for insert with check (public.is_staff());

create policy projects_update on public.projects
  for update using (public.can_edit_project(id)) with check (public.can_edit_project(id));

create policy projects_delete on public.projects
  for delete using (public.is_owner());

-- ---------------------------------------------------------------------------
-- project_members — owner manages assignments
-- ---------------------------------------------------------------------------
create policy project_members_select on public.project_members
  for select using (public.is_project_member(project_id));

create policy project_members_owner_write on public.project_members
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- Child content (phases, schedule, updates, photos, documents):
--   read  -> any assigned member of the parent project
--   write -> owner, or admin assigned to that project
-- ---------------------------------------------------------------------------
create policy phases_select on public.phases
  for select using (public.is_project_member(project_id));
create policy phases_write on public.phases
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy schedule_select on public.schedule_items
  for select using (public.is_project_member(project_id));
create policy schedule_write on public.schedule_items
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

create policy updates_select on public.updates
  for select using (public.is_project_member(project_id));
create policy updates_write on public.updates
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- update_photos has no project_id; resolve through its parent update.
create policy update_photos_select on public.update_photos
  for select using (
    exists (
      select 1 from public.updates u
      where u.id = update_photos.update_id
        and public.is_project_member(u.project_id)
    )
  );
create policy update_photos_write on public.update_photos
  for all using (
    exists (
      select 1 from public.updates u
      where u.id = update_photos.update_id
        and public.can_edit_project(u.project_id)
    )
  ) with check (
    exists (
      select 1 from public.updates u
      where u.id = update_photos.update_id
        and public.can_edit_project(u.project_id)
    )
  );

create policy documents_select on public.documents
  for select using (public.is_project_member(project_id));
create policy documents_write on public.documents
  for all using (public.can_edit_project(project_id))
  with check (public.can_edit_project(project_id));

-- ---------------------------------------------------------------------------
-- payments — FEES RELEASE. Owner only, for every operation including SELECT.
-- An admin or homeowner token gets zero rows and cannot write. This is the
-- server-side gate the spec requires (§3.1, §5.3): never rely on hiding the tab.
-- ---------------------------------------------------------------------------
create policy payments_owner_only on public.payments
  for all using (public.is_owner()) with check (public.is_owner());

-- ---------------------------------------------------------------------------
-- audit_log
--  - select: owner only
--  - insert: any authenticated actor may append a record of their own action
--  - update/delete: nobody (append-only; also enforced by trigger in 0003)
-- ---------------------------------------------------------------------------
create policy audit_select_owner on public.audit_log
  for select using (public.is_owner());

create policy audit_insert on public.audit_log
  for insert with check (auth.uid() is not null and actor_id = auth.uid());
