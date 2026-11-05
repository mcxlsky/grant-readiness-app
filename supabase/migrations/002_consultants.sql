-- ============================================================
-- Rev & Ready: consultant allowlist
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- Adding or removing a consultant: see docs/consultant-auth.md
-- ============================================================

create table consultants (
  email      text primary key check (email = lower(email)),
  name       text not null,
  created_at timestamptz not null default now()
);

-- A signed-in user can see only their own row, which is how the app checks
-- access. Nobody can change this table through the API, so the list can only
-- be edited from the SQL Editor or with the service role.
alter table consultants enable row level security;

revoke all on consultants from anon, authenticated;
grant select on consultants to authenticated;

create policy "Consultants can read their own row"
  on consultants for select
  to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
