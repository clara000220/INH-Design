-- 0008 — owner-visible record of admin-set temporary passwords.
-- Stores the login + temporary password chosen when an owner/admin creates a
-- client account through the app, so the OWNER can look them up later.
--
-- Security tradeoff (accepted intentionally): this keeps the temp password in
-- readable form. RLS restricts it tightly — only an owner can SELECT it; staff
-- (owner/admin) may write it at creation time; only an owner may delete.
-- It is NOT the source of truth for auth (that's the hashed password in
-- auth.users) and can go stale if the user later changes their password.

create table if not exists public.account_credentials (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  login         text not null,
  temp_password text not null,
  created_by    uuid references public.profiles (id),
  created_at    timestamptz not null default now()
);

alter table public.account_credentials enable row level security;

drop policy if exists account_credentials_select on public.account_credentials;
drop policy if exists account_credentials_insert on public.account_credentials;
drop policy if exists account_credentials_update on public.account_credentials;
drop policy if exists account_credentials_delete on public.account_credentials;

-- Only the owner can read stored credentials.
create policy account_credentials_select on public.account_credentials
  for select using (public.is_owner());

-- Staff (owner/admin) may store a credential when they create an account.
create policy account_credentials_insert on public.account_credentials
  for insert with check (public.is_staff());
create policy account_credentials_update on public.account_credentials
  for update using (public.is_staff()) with check (public.is_staff());

-- Only the owner may delete a stored credential.
create policy account_credentials_delete on public.account_credentials
  for delete using (public.is_owner());
