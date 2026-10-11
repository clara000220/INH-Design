-- 0027 — the admin who created a project is treated as a project editor
-- for that project (just like a project_members row would), so they can
-- seed phases/items/documents/payments right after creating it.
--
-- Without this, "Add 15 phases" after creating the project raises
-- "new row violates row-level security policy for table \"phases\""
-- because can_edit_project(project_id) only recognised members +
-- the owner, not the admin who just created the row.

create or replace function public.can_edit_project(pid uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select public.is_owner()
      or (public.current_role() = 'admin'
          and (
            exists (
              select 1 from public.project_members m
              where m.project_id = pid and m.user_id = auth.uid()
            )
            or exists (
              select 1 from public.projects p
              where p.id = pid and p.created_by = auth.uid()
            )
          ));
$$;
