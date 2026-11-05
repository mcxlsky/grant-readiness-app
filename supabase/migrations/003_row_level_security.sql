-- ============================================================
-- Rev & Ready: lock the database to signed-in consultants
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- Requires 002_consultants.sql. Deploy the matching app code first:
-- older code queries as anon and would lose access to its data.
-- See docs/consultant-auth.md.
-- ============================================================

begin;

-- Mirrors checkConsultant in src/lib/auth/consultant.ts. It reads auth.users
-- rather than trusting the token's email, so an unconfirmed address or a deleted
-- user doesn't pass on an old token. Security definer because API roles can't
-- read auth.users. It only ever answers for the caller.
create function public.is_consultant()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    join public.consultants c on c.email = lower(u.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;

revoke all on function public.is_consultant() from public, anon;
grant execute on function public.is_consultant() to authenticated;

-- Close everything first, including anything not named below. RLS doesn't
-- cover TRUNCATE, and views skip it, so the grants have to go as well.
revoke all on all tables in schema public from anon, authenticated;

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t);
  end loop;

  -- Tables the dashboard edits. A project may predate some of them.
  foreach t in array array['organizations', 'grant_engagements', 'applications'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
      execute format(
        'create policy "Consultants have full access" on public.%I for all to authenticated
           using ((select public.is_consultant()))
           with check ((select public.is_consultant()))',
        t
      );
    end if;
  end loop;

  -- The grant catalog. The app only reads it, so edits stay in the SQL Editor.
  foreach t in array array['funders', 'grant_opportunities'] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select on public.%I to authenticated', t);
      execute format(
        'create policy "Consultants can read" on public.%I for select to authenticated
           using ((select public.is_consultant()))',
        t
      );
    end if;
  end loop;
end;
$$;

-- The revoke above also removed the allowlist check's access. Restore it.
grant select on public.consultants to authenticated;

-- Supabase gives API roles full access to new tables by default. Make new
-- tables opt in, as this migration and 002 do.
alter default privileges in schema public revoke all on tables from anon, authenticated;

commit;
