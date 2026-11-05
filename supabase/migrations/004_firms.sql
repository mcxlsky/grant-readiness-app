-- ============================================================
-- Rev & Ready: consulting firms, their members, and invitations
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- Requires 003_row_level_security.sql. Run this before deploying the
-- matching app code, which reads firm_members instead of consultants.
-- See docs/consultant-auth.md.
-- ============================================================

begin;

do $$
begin
  if to_regprocedure('public.is_consultant()') is null then
    raise exception 'Run 003_row_level_security.sql before this migration.';
  end if;
end;
$$;

-- A consulting firm. Not to be confused with organizations, the client nonprofits.
create table public.firms (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  created_at timestamptz not null default now()
);

create table public.firm_members (
  firm_id    uuid not null references public.firms(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null check (email = lower(email)),
  name       text not null check (length(trim(name)) > 0),
  role       text not null check (role in ('admin', 'consultant')),
  created_at timestamptz not null default now(),
  primary key (firm_id, user_id)
);

-- One firm per person for now. Drop this index to allow several.
create unique index firm_members_one_firm on public.firm_members (user_id);
create index firm_members_email on public.firm_members (email);

create table public.firm_invitations (
  id          uuid primary key default gen_random_uuid(),
  firm_id     uuid not null references public.firms(id) on delete cascade,
  email       text not null check (email = lower(email)),
  name        text not null check (length(trim(name)) > 0),
  role        text not null check (role in ('admin', 'consultant')),
  invited_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz
);

-- One open invitation per person per firm.
create unique index firm_invitations_one_open on public.firm_invitations (firm_id, email)
  where accepted_at is null;
create index firm_invitations_email on public.firm_invitations (email) where accepted_at is null;

-- Security definer so these can read firm_members from inside its own policies
-- without recursing. Each only ever answers for the caller.
create function public.is_firm_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.firm_members
    where firm_id = target and user_id = auth.uid()
  );
$$;

create function public.is_firm_admin(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.firm_members
    where firm_id = target and user_id = auth.uid() and role = 'admin'
  );
$$;

-- Keeps the policies from 003 working: anyone in a firm counts as a consultant.
-- Mirrors checkConsultant in src/lib/auth/consultant.ts.
create or replace function public.is_consultant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.firm_members m on m.user_id = u.id
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

-- Turns the caller's open invitation into a membership. The address comes from
-- auth.users, not the token, so only a confirmed owner of the email can accept.
create function public.accept_firm_invitation()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text;
  invite public.firm_invitations%rowtype;
begin
  select lower(u.email) into caller_email
  from auth.users u
  where u.id = auth.uid() and u.email_confirmed_at is not null;

  if caller_email is null then
    return false;
  end if;

  if exists (select 1 from public.firm_members where user_id = auth.uid()) then
    return false;
  end if;

  select * into invite
  from public.firm_invitations
  where email = caller_email and accepted_at is null and expires_at > now()
  order by created_at desc
  limit 1
  for update;

  if not found then
    return false;
  end if;

  insert into public.firm_members (firm_id, user_id, email, name, role)
  values (invite.firm_id, auth.uid(), caller_email, invite.name, invite.role);

  update public.firm_invitations set accepted_at = now() where id = invite.id;
  return true;
end;
$$;

-- A firm always keeps an admin, or nobody could manage it from the UI.
create function public.keep_last_firm_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    -- Locking the firm makes two simultaneous removals take turns. No firm means
    -- this row is being cascaded away with it, which is fine.
    perform 1 from public.firms where id = old.firm_id for update;

    if found and not exists (
      select 1 from public.firm_members
      where firm_id = old.firm_id and role = 'admin' and user_id <> old.user_id
    ) then
      raise exception 'last_firm_admin' using errcode = 'P0001',
        hint = 'Make someone else an admin first.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger firm_members_keep_last_admin
  before update of role or delete on public.firm_members
  for each row execute function public.keep_last_firm_admin();

revoke all on function public.is_firm_member(uuid) from public, anon;
revoke all on function public.is_firm_admin(uuid) from public, anon;
revoke all on function public.accept_firm_invitation() from public, anon;
revoke all on function public.keep_last_firm_admin() from public, anon, authenticated;
grant execute on function public.is_firm_member(uuid) to authenticated;
grant execute on function public.is_firm_admin(uuid) to authenticated;
grant execute on function public.accept_firm_invitation() to authenticated;

alter table public.firms enable row level security;
alter table public.firm_members enable row level security;
alter table public.firm_invitations enable row level security;

revoke all on public.firms, public.firm_members, public.firm_invitations from anon, authenticated;

-- Column grants stop an admin moving a member between firms, editing someone's
-- email, or marking an invitation as accepted. service_role is only for checking
-- an address across firms and sending the invitation email.
grant select on public.firms to authenticated;
grant select, delete on public.firm_members to authenticated;
grant update (role) on public.firm_members to authenticated;
grant select, delete on public.firm_invitations to authenticated;
grant insert (firm_id, email, name, role) on public.firm_invitations to authenticated;
grant update (expires_at) on public.firm_invitations to authenticated;
grant select on public.firms, public.firm_members to service_role;

create policy "Members can see their firm" on public.firms
  for select to authenticated
  using ((select public.is_firm_member(id)));

create policy "Members can see their firm's team" on public.firm_members
  for select to authenticated
  using ((select public.is_firm_member(firm_id)));

create policy "Admins can change roles" on public.firm_members
  for update to authenticated
  using ((select public.is_firm_admin(firm_id)))
  with check ((select public.is_firm_admin(firm_id)));

create policy "Admins can remove members" on public.firm_members
  for delete to authenticated
  using ((select public.is_firm_admin(firm_id)));

create policy "Admins can see invitations" on public.firm_invitations
  for select to authenticated
  using ((select public.is_firm_admin(firm_id)));

create policy "Admins can invite" on public.firm_invitations
  for insert to authenticated
  with check ((select public.is_firm_admin(firm_id)));

create policy "Admins can extend open invitations" on public.firm_invitations
  for update to authenticated
  using ((select public.is_firm_admin(firm_id)) and accepted_at is null)
  with check ((select public.is_firm_admin(firm_id)));

create policy "Admins can cancel open invitations" on public.firm_invitations
  for delete to authenticated
  using ((select public.is_firm_admin(firm_id)) and accepted_at is null);

-- The first firm: today's team, all as admins. Anyone in consultants without a
-- confirmed Auth user is skipped, because a membership needs a real account.
with first_firm as (
  insert into public.firms (name, slug)
  values ('Rev & Ready', 'rev-and-ready')
  returning id
)
insert into public.firm_members (firm_id, user_id, email, name, role)
select f.id, u.id, c.email, c.name, 'admin'
from first_firm f
cross join public.consultants c
join auth.users u on lower(u.email) = c.email and u.email_confirmed_at is not null;

comment on table public.consultants is
  'Replaced by firm_members. Only old app code still reads this; safe to drop once the new code is live.';

commit;
