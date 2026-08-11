-- 0023 — two changes, kept together because both touch the projects/docs surface.
--
-- 1) Documents can now be tagged with the client-status stage they belong to
--    (measure / quotation / contract / deposit / null for "any stage"), so
--    the Client Status card can list documents grouped by stage.
--
-- 2) Admins get a scoped view of the projects list — they only see projects
--    they created OR are assigned to. Owner still sees everything.

-- ---------- documents.stage ----------
alter table public.documents add column if not exists stage text;
create index if not exists documents_project_stage_idx on public.documents (project_id, stage);

-- ---------- projects: admin sees only projects they created or are on ----------
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
  for select using (
    public.is_owner()
    or (
      public.current_role() = 'admin' and (
        created_by = auth.uid()
        or exists (
          select 1 from public.project_members m
          where m.project_id = id and m.user_id = auth.uid()
        )
      )
    )
    or (
      public.current_role() = 'homeowner' and exists (
        select 1 from public.project_members m
        where m.project_id = id and m.user_id = auth.uid()
      )
    )
  );

-- Insert already allowed for staff (owner + admin) — no change needed.
