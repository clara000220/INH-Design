-- =====================================================================
-- INH Project Management — ONE-PASTE BACKEND SETUP
-- =====================================================================
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is idempotent: safe to run on a fresh project AND safe to re-run
-- (guards on types/tables/policies/triggers, on-conflict on seed rows).
--
-- It bundles, in order:
--   1. Schema (enums, tables, indexes)
--   2. RLS helper functions + policies (the real RBAC enforcement)
--   3. Integrity triggers (append-only audit, role guard, auto-provision)
--   4. Storage buckets + policies
--   5. Demo seed data
--   6. Owner promotion for the first account
--
-- Roles: owner (INH boss) · admin (project manager) · homeowner (client).
-- Fees Release (money OUT to contractors) lives in `payments` and is
-- OWNER-ONLY, enforced server-side by RLS — never by hiding the tab.
-- PDPA: no bank/ID numbers are ever stored; `method` is a display label only.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. SCHEMA
-- ---------------------------------------------------------------------
do $$ begin create type user_role      as enum ('owner','admin','homeowner');      exception when duplicate_object then null; end $$;
do $$ begin create type project_status as enum ('ontrack','pending','overdue');     exception when duplicate_object then null; end $$;
do $$ begin create type phase_status   as enum ('completed','progress','upcoming'); exception when duplicate_object then null; end $$;
do $$ begin create type doc_kind       as enum ('invoice','plan','doc');            exception when duplicate_object then null; end $$;
do $$ begin create type payment_status as enum ('pending','released','overdue','hold'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  full_name  text not null,
  contact    text,
  initials   text,
  role       user_role not null default 'homeowner',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  code         text not null unique,
  address      text,
  type         text,
  progress     smallint not null default 0 check (progress between 0 and 100),
  status       project_status not null default 'pending',
  est_handover date,
  created_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  added_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_members_user_idx on public.project_members (user_id);

create table if not exists public.phases (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name       text not null,
  status     phase_status not null default 'upcoming',
  pct        smallint not null default 0 check (pct between 0 and 100),
  start_date date,
  end_date   date,
  sort_order smallint not null default 0
);
create index if not exists phases_project_idx on public.phases (project_id);

create table if not exists public.phase_tasks (
  id         uuid primary key default gen_random_uuid(),
  phase_id   uuid not null references public.phases (id)   on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists phase_tasks_phase_idx   on public.phase_tasks (phase_id);
create index if not exists phase_tasks_project_idx on public.phase_tasks (project_id);

create table if not exists public.schedule_items (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects (id) on delete cascade,
  title          text not null,
  scheduled_date date not null,
  state          text not null default 'upcoming'
);
create index if not exists schedule_items_project_idx on public.schedule_items (project_id);

create table if not exists public.updates (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  room        text not null,
  captured_on date not null default current_date,
  is_new      boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists updates_project_idx on public.updates (project_id);

create table if not exists public.update_photos (
  id           uuid primary key default gen_random_uuid(),
  update_id    uuid not null references public.updates (id) on delete cascade,
  storage_path text not null,
  sort_order   smallint not null default 0
);
create index if not exists update_photos_update_idx on public.update_photos (update_id);

create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects (id) on delete cascade,
  name         text not null,
  kind         doc_kind not null default 'doc',
  file_size    bigint,
  storage_path text,
  ready        boolean not null default false,
  issued_on    date,
  created_at   timestamptz not null default now()
);
create index if not exists documents_project_idx on public.documents (project_id);

create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  contractor  text not null,
  stage       text,
  amount      numeric(12,2) not null check (amount >= 0),
  due_date    date,
  status      payment_status not null default 'pending',
  method      text,
  released_at timestamptz,
  released_by uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index if not exists payments_project_idx on public.payments (project_id);

create table if not exists public.audit_log (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id),
  actor_label text not null,
  action      text not null,
  entity_type text,
  entity_id   text,
  amount      numeric(12,2),
  created_at  timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------
-- 2. RLS HELPERS + POLICIES
-- ---------------------------------------------------------------------
create or replace function public.current_role()
  returns user_role language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.is_owner()
  returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() = 'owner', false); $$;

create or replace function public.is_staff()
  returns boolean language sql stable security definer set search_path = public
as $$ select coalesce(public.current_role() in ('owner','admin'), false); $$;

create or replace function public.is_project_member(pid uuid)
  returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_owner()
      or exists (select 1 from public.project_members m
                 where m.project_id = pid and m.user_id = auth.uid());
$$;

create or replace function public.can_edit_project(pid uuid)
  returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_owner()
      or (public.current_role() = 'admin'
          and exists (select 1 from public.project_members m
                      where m.project_id = pid and m.user_id = auth.uid()));
$$;

alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_members enable row level security;
alter table public.phases          enable row level security;
alter table public.phase_tasks     enable row level security;
alter table public.schedule_items  enable row level security;
alter table public.updates         enable row level security;
alter table public.update_photos   enable row level security;
alter table public.documents       enable row level security;
alter table public.payments        enable row level security;
alter table public.audit_log       enable row level security;

drop policy if exists profiles_select        on public.profiles;
drop policy if exists profiles_update_self    on public.profiles;
drop policy if exists profiles_owner_all       on public.profiles;
drop policy if exists projects_select          on public.projects;
drop policy if exists projects_insert          on public.projects;
drop policy if exists projects_update          on public.projects;
drop policy if exists projects_delete          on public.projects;
drop policy if exists project_members_select   on public.project_members;
drop policy if exists project_members_owner_write on public.project_members;
drop policy if exists phases_select            on public.phases;
drop policy if exists phases_write             on public.phases;
drop policy if exists phase_tasks_select       on public.phase_tasks;
drop policy if exists phase_tasks_write        on public.phase_tasks;
drop policy if exists schedule_select          on public.schedule_items;
drop policy if exists schedule_write           on public.schedule_items;
drop policy if exists updates_select           on public.updates;
drop policy if exists updates_write            on public.updates;
drop policy if exists update_photos_select     on public.update_photos;
drop policy if exists update_photos_write      on public.update_photos;
drop policy if exists documents_select         on public.documents;
drop policy if exists documents_write          on public.documents;
drop policy if exists payments_owner_only      on public.payments;
drop policy if exists audit_select_owner       on public.audit_log;
drop policy if exists audit_insert             on public.audit_log;

create policy profiles_select on public.profiles
  for select using (
    id = auth.uid() or public.is_owner()
    or exists (select 1 from public.project_members me
               join public.project_members them on them.project_id = me.project_id
               where me.user_id = auth.uid() and them.user_id = profiles.id));
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_owner_all on public.profiles
  for all using (public.is_owner()) with check (public.is_owner());

create policy projects_select on public.projects for select using (public.is_project_member(id));
create policy projects_insert on public.projects for insert with check (public.is_staff());
create policy projects_update on public.projects for update using (public.can_edit_project(id)) with check (public.can_edit_project(id));
create policy projects_delete on public.projects for delete using (public.is_owner());

create policy project_members_select on public.project_members for select using (public.is_project_member(project_id));
create policy project_members_owner_write on public.project_members for all using (public.is_owner()) with check (public.is_owner());

create policy phases_select on public.phases for select using (public.is_project_member(project_id));
create policy phases_write  on public.phases for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy phase_tasks_select on public.phase_tasks for select using (public.is_project_member(project_id));
create policy phase_tasks_write  on public.phase_tasks for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy schedule_select on public.schedule_items for select using (public.is_project_member(project_id));
create policy schedule_write  on public.schedule_items for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy updates_select on public.updates for select using (public.is_project_member(project_id));
create policy updates_write  on public.updates for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

create policy update_photos_select on public.update_photos for select using (
  exists (select 1 from public.updates u where u.id = update_photos.update_id and public.is_project_member(u.project_id)));
create policy update_photos_write on public.update_photos for all using (
  exists (select 1 from public.updates u where u.id = update_photos.update_id and public.can_edit_project(u.project_id)))
  with check (
  exists (select 1 from public.updates u where u.id = update_photos.update_id and public.can_edit_project(u.project_id)));

create policy documents_select on public.documents for select using (public.is_project_member(project_id));
create policy documents_write  on public.documents for all using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id));

-- FEES RELEASE: owner only, every operation including SELECT.
create policy payments_owner_only on public.payments for all using (public.is_owner()) with check (public.is_owner());

create policy audit_select_owner on public.audit_log for select using (public.is_owner());
create policy audit_insert on public.audit_log for insert with check (auth.uid() is not null and actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3. TRIGGERS
-- ---------------------------------------------------------------------
create or replace function public.audit_log_immutable()
  returns trigger language plpgsql
as $$ begin raise exception 'audit_log is append-only; % is not permitted', tg_op; end; $$;

drop trigger if exists audit_log_no_update on public.audit_log;
drop trigger if exists audit_log_no_delete on public.audit_log;
create trigger audit_log_no_update before update on public.audit_log for each row execute function public.audit_log_immutable();
create trigger audit_log_no_delete before delete on public.audit_log for each row execute function public.audit_log_immutable();

create or replace function public.guard_profile_role()
  returns trigger language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() is null in a trusted server context (SQL Editor / service role),
  -- used to bootstrap the first owner. A logged-in user must be an owner to
  -- change any role (prevents self-escalation).
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not public.is_owner() then
    raise exception 'only an owner may change a user role';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update on public.profiles for each row execute function public.guard_profile_role();

create or replace function public.log_payment_change()
  returns trigger language plpgsql security definer set search_path = public
as $$
declare v_actor text; v_verb text;
begin
  if new.status is not distinct from old.status then return new; end if;
  select coalesce(p.full_name,'Unknown') || ' (' || coalesce(p.role::text,'?') || ')'
    into v_actor from public.profiles p where p.id = auth.uid();
  v_verb := case new.status
              when 'released' then 'Released'
              when 'hold'     then 'Put on hold'
              else 'Updated payment to ' || new.status::text end;
  insert into public.audit_log (actor_id, actor_label, action, entity_type, entity_id, amount)
  values (auth.uid(), coalesce(v_actor,'System'), v_verb || ' — ' || new.contractor, 'payment', new.id::text, new.amount);
  if new.status = 'released' and new.released_at is null then
    new.released_at := now(); new.released_by := auth.uid();
  end if;
  return new;
end; $$;

drop trigger if exists payments_audit on public.payments;
create trigger payments_audit before update on public.payments for each row execute function public.log_payment_change();

create or replace function public.handle_new_user()
  returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, contact, role)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email,'@',1)),
          new.email, 'homeowner')
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 4. STORAGE (private buckets + policies keyed to project membership)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('update-photos','update-photos',false) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('documents','documents',false)         on conflict (id) do nothing;

create or replace function public.storage_project_id(object_name text)
  returns uuid language plpgsql immutable set search_path = public
as $$
declare seg text := split_part(object_name,'/',1);
begin return seg::uuid; exception when others then return null; end; $$;

drop policy if exists inh_update_photos_read  on storage.objects;
drop policy if exists inh_update_photos_write on storage.objects;
drop policy if exists inh_documents_read       on storage.objects;
drop policy if exists inh_documents_write      on storage.objects;

create policy inh_update_photos_read on storage.objects for select using (
  bucket_id = 'update-photos' and public.is_project_member(public.storage_project_id(name)));
create policy inh_update_photos_write on storage.objects for all using (
  bucket_id = 'update-photos' and public.can_edit_project(public.storage_project_id(name)))
  with check (bucket_id = 'update-photos' and public.can_edit_project(public.storage_project_id(name)));
create policy inh_documents_read on storage.objects for select using (
  bucket_id = 'documents' and public.is_project_member(public.storage_project_id(name)));
create policy inh_documents_write on storage.objects for all using (
  bucket_id = 'documents' and public.can_edit_project(public.storage_project_id(name)))
  with check (bucket_id = 'documents' and public.can_edit_project(public.storage_project_id(name)));

-- ---------------------------------------------------------------------
-- 5. SEED DATA (demo content so the app is populated)
-- ---------------------------------------------------------------------
insert into public.projects (id, name, code, address, type, progress, status, est_handover) values
  ('11111111-1111-1111-1111-111111111111','Lot 23, Bukit Indah','P-2026-023','23 Jalan Indah 3/2, Bukit Indah, 81200 JB','Full home renovation',68,'ontrack','2026-06-20'),
  ('22222222-2222-2222-2222-222222222222','12 Jalan Setia','P-2026-031','12 Jln Setia Tropika 1, 81100 JB','Kitchen & living',34,'pending','2026-08-15'),
  ('33333333-3333-3333-3333-333333333333','Penthouse, Tower B','P-2026-018','Sky Habitat Tower B, #28-03','Bathroom & flooring',92,'overdue','2026-05-30')
on conflict (id) do nothing;

insert into public.phases (id, project_id, name, status, pct, start_date, end_date, sort_order) values
  ('a0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Demolition & hacking','completed',100,'2026-03-03','2026-03-09',1),
  ('a0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Wiring & plumbing','completed',100,'2026-03-10','2026-03-24',2),
  ('a0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Carpentry & built-ins','progress',60,'2026-03-25','2026-05-18',3),
  ('a0000001-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Tiling & flooring','progress',30,'2026-05-05','2026-05-28',4),
  ('a0000001-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Painting & finishing','upcoming',0,'2026-06-01','2026-06-14',5),
  ('a0000001-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Handover & cleaning','upcoming',0,'2026-06-16','2026-06-20',6)
on conflict (id) do nothing;

insert into public.schedule_items (id, project_id, title, scheduled_date, state) values
  ('b0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Kitchen cabinet carcass install','2026-05-12','today'),
  ('b0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Living room feature wall tiling','2026-05-14','upcoming'),
  ('b0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Electrical second fix','2026-05-16','upcoming')
on conflict (id) do nothing;

insert into public.updates (id, project_id, room, captured_on, is_new) values
  ('c0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Kitchen','2026-05-12',true),
  ('c0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Living room','2026-05-12',true),
  ('c0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Master bath','2026-05-08',false),
  ('c0000001-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Hallway','2026-05-08',false),
  ('c0000001-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Bedroom 2','2026-05-02',false),
  ('c0000001-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Exterior','2026-05-02',false)
on conflict (id) do nothing;

insert into public.documents (id, project_id, name, kind, file_size, ready, issued_on) values
  ('d0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Milestone 2 Invoice','invoice',2516582,true,'2026-05-12'),
  ('d0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','Renovation Contract','doc',5347737,true,'2026-02-28'),
  ('d0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Approved Floor Plan','plan',9122611,true,'2026-03-02'),
  ('d0000001-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Material Selection Sheet','doc',1258291,true,'2026-03-15'),
  ('d0000001-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Final Inspection Report','doc',null,false,null)
on conflict (id) do nothing;

insert into public.payments (id, project_id, contractor, stage, amount, due_date, status, method) values
  ('e0000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111','Ah Seng Tiling','Tiling & flooring',14200,'2026-05-18','pending','Bank transfer'),
  ('e0000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111','KL Electrical Works','Wiring & plumbing',22800,'2026-05-12','released','DuitNow · ref #44192'),
  ('e0000001-0000-0000-0000-000000000003','11111111-1111-1111-1111-111111111111','Mutiara Carpentry','Carpentry & built-ins',38500,'2026-05-30','pending','Bank transfer'),
  ('e0000001-0000-0000-0000-000000000004','11111111-1111-1111-1111-111111111111','Lim Plumbing Sdn Bhd','Wiring & plumbing',9600,'2026-03-24','released','DuitNow · ref #41003'),
  ('e0000001-0000-0000-0000-000000000005','11111111-1111-1111-1111-111111111111','Hng Demolition','Demolition & hacking',7400,'2026-05-05','overdue','Bank transfer'),
  ('e0000001-0000-0000-0000-000000000006','11111111-1111-1111-1111-111111111111','Cosmo Painting','Painting & finishing',11000,null,'hold','—')
on conflict (id) do nothing;

update public.payments set released_at = '2026-05-12T14:02:00+08'::timestamptz where id = 'e0000001-0000-0000-0000-000000000002' and released_at is null;
update public.payments set released_at = '2026-03-24T16:20:00+08'::timestamptz where id = 'e0000001-0000-0000-0000-000000000004' and released_at is null;

-- ---------------------------------------------------------------------
-- 6. OWNER PROMOTION
-- The first real account is provisioned as 'homeowner' by the trigger.
-- Promote it to 'owner'. Edit the email below if you use a different one.
-- ---------------------------------------------------------------------
update public.profiles p
   set role = 'owner', full_name = coalesce(nullif(p.full_name,''), 'Clara')
  from auth.users u
 where u.id = p.id and u.email = 'clara@claraexcel.com';

-- Quick verification (uncomment to inspect):
-- select id, contact, role from public.profiles;
-- select code, name, status, progress from public.projects order by code;
