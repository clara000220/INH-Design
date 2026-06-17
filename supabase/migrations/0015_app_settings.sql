-- 0015 — app settings (single row). Holds the owner-editable default project
-- item template used by the "Add project" picker.
create table if not exists public.app_settings (
  id               int primary key default 1,
  project_template jsonb not null default '[]'::jsonb,
  updated_at       timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_select on public.app_settings;
drop policy if exists app_settings_write  on public.app_settings;

-- Any signed-in user can read the template (the Add-project picker needs it).
create policy app_settings_select on public.app_settings
  for select using (auth.uid() is not null);
-- Only the owner can change it.
create policy app_settings_write on public.app_settings
  for all using (public.is_owner()) with check (public.is_owner());
