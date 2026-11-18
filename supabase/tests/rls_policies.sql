-- ============================================================
-- Row level security test for 003_row_level_security.sql and 004_firms.sql.
-- After 004, access comes from firm_members, not the consultants table.
-- Run with psql against a fresh LOCAL Supabase stack (`supabase start`) that has
-- the migrations applied and no other rows in the app tables. Everything runs in one transaction and rolls back.
-- Fails with an error, naming each mismatch, if any access rule is wrong.
-- ============================================================

\set ON_ERROR_STOP on

begin;

insert into auth.users (id, aud, role, email, email_confirmed_at) values
  ('00000000-0000-4000-a000-000000000001', 'authenticated', 'authenticated', 'consultant@example.com', now()),
  ('00000000-0000-4000-a000-000000000002', 'authenticated', 'authenticated', 'stranger@example.com', now()),
  ('00000000-0000-4000-a000-000000000003', 'authenticated', 'authenticated', 'unconfirmed@example.com', null),
  ('00000000-0000-4000-a000-000000000004', 'authenticated', 'authenticated', null, null);

insert into consultants (email, name) values
  ('consultant@example.com', 'Test Consultant'),
  ('unconfirmed@example.com', 'Unconfirmed Consultant'),
  ('other@example.com', 'Other Consultant');

-- Members, not admins: deleting a firm's last admin is blocked, and this test removes one below.
-- The unconfirmed user is a member too, to show that membership alone isn't enough.
insert into firms (id, name, slug) values
  ('00000000-0000-4000-9000-000000000001', 'RLS Test Firm', 'rls-test-firm');
insert into firm_members (firm_id, user_id, email, name, role) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-a000-000000000001', 'consultant@example.com', 'Test Consultant', 'consultant'),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-a000-000000000003', 'unconfirmed@example.com', 'Unconfirmed Consultant', 'consultant');

insert into organizations (id, ein, strein, name) values
  ('00000000-0000-4000-b000-000000000001', 999999991, '99-9999991', 'RLS Test Org');
insert into grant_engagements (id, org_id) values
  ('00000000-0000-4000-c000-000000000001', '00000000-0000-4000-b000-000000000001');
insert into applications (id, org_name, ein, contact_name, contact_email, project_title) values
  ('00000000-0000-4000-d000-000000000001', 'RLS Test Org', '999999991', 'A', 'a@example.com', 'P');
insert into funders (id, name) values
  ('00000000-0000-4000-e000-000000000001', 'RLS Test Funder');
insert into grant_opportunities (id, funder_id, program) values
  ('00000000-0000-4000-f000-000000000001', '00000000-0000-4000-e000-000000000001', 'RLS Test Program');

create temp table results (who text, stmt text, expected text, actual text) on commit drop;

-- Runs one statement as a caller and undoes it. Returns "ok:<rows>" or "denied".
create function pg_temp.attempt(api_role text, claims jsonb, stmt text) returns text
language plpgsql as $$
declare
  affected bigint;
  detail text;
begin
  begin
    perform set_config('request.jwt.claims', coalesce(claims::text, ''), true);
    perform set_config('role', api_role, true);
    execute stmt;
    get diagnostics affected = row_count;
    raise exception 'undo' using errcode = 'RR001', detail = affected::text;
  exception
    when insufficient_privilege then
      return 'denied';
    when sqlstate 'RR001' then
      get stacked diagnostics detail = pg_exception_detail;
      return 'ok:' || detail;
  end;
end;
$$;

create function pg_temp.expect(who text, stmt text, expected text) returns void
language plpgsql as $$
declare
  api_role text := case when who in ('anon', 'service_role') then who else 'authenticated' end;
  claims jsonb := case who
    when 'anon' then '{"role":"anon"}'
    when 'service_role' then '{"role":"service_role"}'
    when 'consultant' then '{"role":"authenticated","sub":"00000000-0000-4000-a000-000000000001","email":"consultant@example.com"}'
    when 'stranger' then '{"role":"authenticated","sub":"00000000-0000-4000-a000-000000000002","email":"stranger@example.com"}'
    when 'unconfirmed' then '{"role":"authenticated","sub":"00000000-0000-4000-a000-000000000003","email":"unconfirmed@example.com"}'
    when 'no_email' then '{"role":"authenticated","sub":"00000000-0000-4000-a000-000000000004","is_anonymous":true}'
    -- Stale token: right email, but the auth user no longer exists.
    when 'deleted_user' then '{"role":"authenticated","sub":"00000000-0000-4000-a000-0000000000ff","email":"consultant@example.com"}'
    -- A stranger's real user id with a consultant's email in the claim.
    when 'mismatched' then '{"role":"authenticated","sub":"00000000-0000-4000-a000-000000000002","email":"consultant@example.com"}'
  end;
begin
  insert into results values (who, stmt, expected, pg_temp.attempt(api_role, claims, stmt));
end;
$$;

-- Every statement against the five app tables, for each kind of caller.
create function pg_temp.table_rules(who text, can_read boolean, can_write_org_data boolean) returns void
language plpgsql as $$
declare
  org_id constant text := '''00000000-0000-4000-b000-000000000001''';
begin
  -- Reads: an API role with a grant sees 0 rows; one without gets denied.
  perform pg_temp.expect(who, 'select * from organizations', case when can_read then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, 'select * from grant_engagements', case when can_read then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, 'select * from applications', case when can_read then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, $s$select * from funders where name = 'RLS Test Funder'$s$, case when can_read then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, $s$select * from grant_opportunities where program = 'RLS Test Program'$s$, case when can_read then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);

  -- Inserts: blocked outright unless the caller can write.
  perform pg_temp.expect(who, $s$insert into organizations (ein, strein, name) values (999999992, 'x', 'x')$s$, case when can_write_org_data then 'ok:1' else 'denied' end);
  perform pg_temp.expect(who, format($s$insert into grant_engagements (org_id) values (%s)$s$, org_id), case when can_write_org_data then 'ok:1' else 'denied' end);
  perform pg_temp.expect(who, $s$insert into applications (org_name, ein, contact_name, contact_email, project_title) values ('x','x','x','x','x')$s$, case when can_write_org_data then 'ok:1' else 'denied' end);

  -- Updates and deletes: anon has no grant; other callers match no rows.
  perform pg_temp.expect(who, $s$update organizations set name = 'hacked'$s$, case when can_write_org_data then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, $s$update applications set notes = 'hacked'$s$, case when can_write_org_data then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, 'delete from grant_engagements', case when can_write_org_data then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);
  perform pg_temp.expect(who, 'delete from applications', case when can_write_org_data then 'ok:1' when who = 'anon' then 'denied' else 'ok:0' end);

  -- The catalog is read-only through the API, even for consultants.
  perform pg_temp.expect(who, $s$insert into funders (name) values ('x')$s$, 'denied');
  perform pg_temp.expect(who, $s$update funders set url = 'x'$s$, 'denied');
  perform pg_temp.expect(who, 'delete from grant_opportunities', 'denied');

  -- RLS doesn't cover TRUNCATE, so these rely on the grants being gone.
  perform pg_temp.expect(who, 'truncate organizations cascade', 'denied');
  perform pg_temp.expect(who, 'truncate applications', 'denied');

  -- Nobody can edit the allowlist through the API, so nobody can add themselves.
  perform pg_temp.expect(who, $s$insert into consultants (email, name) values ('me@example.com', 'me')$s$, 'denied');
  perform pg_temp.expect(who, $s$update consultants set email = 'me@example.com'$s$, 'denied');
  perform pg_temp.expect(who, 'delete from consultants', 'denied');
end;
$$;

select pg_temp.table_rules('anon', false, false);
select pg_temp.table_rules('stranger', false, false);
select pg_temp.table_rules('no_email', false, false);
select pg_temp.table_rules('unconfirmed', false, false);
select pg_temp.table_rules('deleted_user', false, false);
select pg_temp.table_rules('mismatched', false, false);
select pg_temp.table_rules('consultant', true, true);

-- The allowlist itself: own row only, and never for anon.
select pg_temp.expect('anon', 'select * from consultants', 'denied');
select pg_temp.expect('stranger', 'select * from consultants', 'ok:0');
select pg_temp.expect('consultant', 'select * from consultants', 'ok:1');

-- Firms: closed to anon and outsiders, visible to members, managed only by admins.
-- Permission rules for admins themselves are tested in more depth elsewhere; these
-- check the boundary from the outside and from an ordinary member.
select pg_temp.expect('anon', 'select * from firms', 'denied');
select pg_temp.expect('anon', 'select * from firm_members', 'denied');
select pg_temp.expect('anon', 'select * from firm_invitations', 'denied');
select pg_temp.expect('stranger', 'select * from firm_members', 'ok:0');
select pg_temp.expect('stranger', 'select * from firms', 'ok:0');
select pg_temp.expect('consultant', 'select * from firms', 'ok:1');
select pg_temp.expect('consultant', 'select * from firm_members', 'ok:2');
select pg_temp.expect('consultant', 'select * from firm_invitations', 'ok:0');
select pg_temp.expect('consultant', $s$update firm_members set role = 'admin'$s$, 'ok:0');
select pg_temp.expect('consultant', 'delete from firm_members', 'ok:0');
select pg_temp.expect('consultant', $s$insert into firm_invitations (firm_id, email, name, role)
  values ('00000000-0000-4000-9000-000000000001', 'new@example.com', 'New', 'admin')$s$, 'denied');
select pg_temp.expect('stranger', $s$insert into firm_members (firm_id, user_id, email, name, role)
  values ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-a000-000000000002', 'stranger@example.com', 'Me', 'admin')$s$, 'denied');
select pg_temp.expect('stranger', 'select public.accept_firm_invitation()', 'ok:1');
select pg_temp.expect('stranger', 'select 1 where public.is_firm_member(''00000000-0000-4000-9000-000000000001'')', 'ok:0');
select pg_temp.expect('service_role', 'select * from firm_members', 'ok:2');

-- is_consultant() can't be called by anon, and only answers for the caller.
select pg_temp.expect('anon', 'select public.is_consultant()', 'denied');
select pg_temp.expect('stranger', 'select 1 where public.is_consultant()', 'ok:0');
select pg_temp.expect('mismatched', 'select 1 where public.is_consultant()', 'ok:0');
select pg_temp.expect('unconfirmed', 'select 1 where public.is_consultant()', 'ok:0');
select pg_temp.expect('deleted_user', 'select 1 where public.is_consultant()', 'ok:0');
select pg_temp.expect('consultant', 'select 1 where public.is_consultant()', 'ok:1');

-- The service role keeps working, for scripts and the SQL Editor's equivalent.
select pg_temp.expect('service_role', 'select * from organizations', 'ok:1');
select pg_temp.expect('service_role', 'select * from consultants', 'ok:3');

-- Tables created after the migration start closed too.
create table public.rls_test_future (id int primary key);
select pg_temp.expect('anon', 'select * from rls_test_future', 'denied');
select pg_temp.expect('stranger', 'select * from rls_test_future', 'denied');

-- Removing someone from their firm takes effect at once, even with a valid token.
delete from firm_members where user_id = '00000000-0000-4000-a000-000000000001';
select pg_temp.expect('consultant', 'select * from organizations', 'ok:0');
select pg_temp.expect('consultant', $s$insert into organizations (ein, strein, name) values (999999993, 'x', 'x')$s$, 'denied');

-- Every table in public must have RLS on, apart from the one made just above.
insert into results
  select 'catalog', 'rls on ' || c.relname, 'on', case when c.relrowsecurity then 'on' else 'off' end
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relname <> 'rls_test_future';

-- Report.
select count(*) as checks, count(*) filter (where expected = actual) as passed from results;
select who, stmt, expected, actual from results where expected <> actual order by who, stmt;

do $$
declare
  failed int;
begin
  select count(*) into failed from results where expected <> actual;
  if failed > 0 then
    raise exception '% RLS checks failed', failed;
  end if;
  raise notice 'All RLS checks passed';
end;
$$;

rollback;
