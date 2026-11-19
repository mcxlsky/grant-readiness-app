-- ============================================================
-- Rev & Ready: each firm gets its own grant catalog
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- Requires 004_firms.sql. Existing funders and opportunities, the
-- sample catalog, move into the first firm.
-- See docs/consultant-auth.md.
-- ============================================================

begin;

do $$
begin
  if to_regclass('public.firm_members') is null then
    raise exception 'Run 004_firms.sql before this migration.';
  end if;
end;
$$;

-- ── Funders: owned by a firm, with the fields a firm's own list carries ──

alter table public.funders add column firm_id uuid references public.firms(id) on delete cascade;
update public.funders set firm_id = (select id from public.firms order by created_at limit 1) where firm_id is null;
alter table public.funders alter column firm_id set not null;

alter table public.funders drop constraint if exists funders_name_key;
alter table public.funders drop constraint if exists funders_type_check;
alter table public.funders add constraint funders_type_check check (type in (
  'Foundation', 'Community Foundation', 'Corporate', 'Federal', 'State', 'Government', 'Prize', 'Network', 'Other'
));

alter table public.funders
  -- How the importer recognises the same funder written differently, like "W. O'Neil" and "The W O'Neil Foundation".
  add column name_key text,
  add column ein bigint,
  add column focus_areas text[] not null default '{}',
  add column service_areas text[] not null default '{}',
  -- open, rolling, upcoming, invitation_only, closed, or unclear when nobody has checked.
  add column availability text not null default 'unclear'
    check (availability in ('open', 'rolling', 'upcoming', 'invitation_only', 'closed', 'unclear')),
  add column how_to_apply text not null default '',
  -- Relationship notes and contacts. Only the firm can read them.
  add column contact text not null default '',
  add column notes text not null default '',
  add column source text not null default '',
  add column updated_at timestamptz not null default now();

update public.funders
set name_key = trim(regexp_replace(lower(name), '[^a-z0-9]+', ' ', 'g')), source = 'sample'
where name_key is null;
alter table public.funders alter column name_key set not null;

create unique index funders_firm_name_key on public.funders (firm_id, name_key);
create index funders_firm on public.funders (firm_id);
-- Lets an opportunity insist its funder belongs to the same firm.
alter table public.funders add constraint funders_id_firm unique (id, firm_id);

create trigger trg_funders_updated
  before update on public.funders for each row execute function update_updated_at();

-- ── Opportunities: same firm as their funder ──

alter table public.grant_opportunities add column firm_id uuid;
update public.grant_opportunities o set firm_id = f.firm_id from public.funders f where f.id = o.funder_id;
alter table public.grant_opportunities alter column firm_id set not null;
-- Replaces the one-column link from 001. Keeping both would give the API two ways to
-- join opportunities to funders, and it refuses joins like funder:funders(name) then.
alter table public.grant_opportunities drop constraint if exists grant_opportunities_funder_id_fkey;
alter table public.grant_opportunities
  add constraint grant_opportunities_funder_same_firm
  foreign key (funder_id, firm_id) references public.funders (id, firm_id) on delete cascade;

alter table public.grant_opportunities drop constraint if exists grant_opportunities_type_check;
alter table public.grant_opportunities add constraint grant_opportunities_type_check check (type in (
  'Foundation', 'Community Foundation', 'Corporate', 'Federal', 'State', 'Government', 'Prize', 'Network', 'Other'
));

alter table public.grant_opportunities
  add column program_key text,
  -- The next deadline we expect. Estimated when it comes from past dates, not the funder's site.
  add column next_deadline date,
  add column deadline_estimated boolean not null default false;

update public.grant_opportunities
set program_key = trim(regexp_replace(lower(program), '[^a-z0-9]+', ' ', 'g'))
where program_key is null;
alter table public.grant_opportunities alter column program_key set not null;

create unique index grant_opportunities_funder_program on public.grant_opportunities (funder_id, program_key);
create index grant_opportunities_firm on public.grant_opportunities (firm_id);

create trigger trg_grant_opportunities_updated
  before update on public.grant_opportunities for each row execute function update_updated_at();

-- ── Access: members read their firm's catalog, admins change it ──

drop policy if exists "Consultants can read" on public.funders;
drop policy if exists "Consultants can read" on public.grant_opportunities;

grant select, insert, update, delete on public.funders, public.grant_opportunities to authenticated;

create policy "Members can read their firm's funders" on public.funders
  for select to authenticated
  using ((select public.is_consultant()) and (select public.is_firm_member(firm_id)));
create policy "Admins can add funders" on public.funders
  for insert to authenticated
  with check ((select public.is_firm_admin(firm_id)));
create policy "Admins can edit funders" on public.funders
  for update to authenticated
  using ((select public.is_firm_admin(firm_id)))
  with check ((select public.is_firm_admin(firm_id)));
create policy "Admins can delete funders" on public.funders
  for delete to authenticated
  using ((select public.is_firm_admin(firm_id)));

create policy "Members can read their firm's opportunities" on public.grant_opportunities
  for select to authenticated
  using ((select public.is_consultant()) and (select public.is_firm_member(firm_id)));
create policy "Admins can add opportunities" on public.grant_opportunities
  for insert to authenticated
  with check ((select public.is_firm_admin(firm_id)));
create policy "Admins can edit opportunities" on public.grant_opportunities
  for update to authenticated
  using ((select public.is_firm_admin(firm_id)))
  with check ((select public.is_firm_admin(firm_id)));
create policy "Admins can delete opportunities" on public.grant_opportunities
  for delete to authenticated
  using ((select public.is_firm_admin(firm_id)));

-- ── Import: one call, all or nothing ──
-- Security invoker, so the policies above apply to every write. Re-importing
-- updates funders and programs it recognises and adds the rest; it never deletes.
-- Empty values in the file leave what's already stored alone.

create function public.import_catalog(target_firm uuid, catalog jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  funder jsonb;
  program jsonb;
  funder_row_id uuid;
  was_insert boolean;
  funders_added int := 0;
  funders_updated int := 0;
  programs_added int := 0;
  programs_updated int := 0;
begin
  if not public.is_firm_admin(target_firm) then
    raise exception 'not_admin' using errcode = '42501';
  end if;
  if jsonb_typeof(catalog) <> 'array' or jsonb_array_length(catalog) > 2000 then
    raise exception 'invalid_catalog' using errcode = '22023';
  end if;

  for funder in select * from jsonb_array_elements(catalog) loop
    insert into public.funders as f (
      firm_id, name, name_key, type, url, ein, focus_areas, service_areas,
      availability, how_to_apply, contact, notes, source
    ) values (
      target_firm,
      funder ->> 'name',
      funder ->> 'name_key',
      coalesce(funder ->> 'type', 'Other'),
      nullif(funder ->> 'url', ''),
      (funder ->> 'ein')::bigint,
      coalesce(array(select jsonb_array_elements_text(funder -> 'focus_areas')), '{}'),
      coalesce(array(select jsonb_array_elements_text(funder -> 'service_areas')), '{}'),
      coalesce(funder ->> 'availability', 'unclear'),
      coalesce(funder ->> 'how_to_apply', ''),
      coalesce(funder ->> 'contact', ''),
      coalesce(funder ->> 'notes', ''),
      coalesce(funder ->> 'source', 'import')
    )
    on conflict (firm_id, name_key) do update set
      name = excluded.name,
      type = excluded.type,
      url = coalesce(excluded.url, f.url),
      ein = coalesce(excluded.ein, f.ein),
      focus_areas = case when cardinality(excluded.focus_areas) > 0 then excluded.focus_areas else f.focus_areas end,
      service_areas = case when cardinality(excluded.service_areas) > 0 then excluded.service_areas else f.service_areas end,
      availability = case when excluded.availability <> 'unclear' then excluded.availability else f.availability end,
      how_to_apply = coalesce(nullif(excluded.how_to_apply, ''), f.how_to_apply),
      contact = coalesce(nullif(excluded.contact, ''), f.contact),
      notes = coalesce(nullif(excluded.notes, ''), f.notes),
      source = excluded.source
    returning f.id, (xmax = 0) into funder_row_id, was_insert;

    if was_insert then funders_added := funders_added + 1; else funders_updated := funders_updated + 1; end if;

    for program in select * from jsonb_array_elements(coalesce(funder -> 'programs', '[]')) loop
      insert into public.grant_opportunities as o (
        firm_id, funder_id, program, program_key, description, focus, amount_min, amount_max,
        deadline, next_deadline, deadline_estimated, url, source, type
      ) values (
        target_firm,
        funder_row_id,
        program ->> 'program',
        program ->> 'program_key',
        coalesce(program ->> 'description', ''),
        coalesce(array(select jsonb_array_elements_text(program -> 'focus')), '{}'),
        coalesce((program ->> 'amount_min')::int, 0),
        coalesce((program ->> 'amount_max')::int, 0),
        coalesce(nullif(program ->> 'deadline', ''), 'Unknown'),
        (program ->> 'next_deadline')::date,
        coalesce((program ->> 'deadline_estimated')::boolean, false),
        nullif(program ->> 'url', ''),
        coalesce(program ->> 'source', 'import'),
        coalesce(funder ->> 'type', 'Other')
      )
      on conflict (funder_id, program_key) do update set
        program = excluded.program,
        description = coalesce(nullif(excluded.description, ''), o.description),
        focus = case when cardinality(excluded.focus) > 0 then excluded.focus else o.focus end,
        amount_min = case when excluded.amount_max > 0 then excluded.amount_min else o.amount_min end,
        amount_max = case when excluded.amount_max > 0 then excluded.amount_max else o.amount_max end,
        deadline = case when excluded.deadline <> 'Unknown' then excluded.deadline else o.deadline end,
        next_deadline = coalesce(excluded.next_deadline, o.next_deadline),
        deadline_estimated = case when excluded.next_deadline is not null then excluded.deadline_estimated else o.deadline_estimated end,
        url = coalesce(excluded.url, o.url),
        source = excluded.source,
        type = excluded.type,
        active = true
      returning (xmax = 0) into was_insert;

      if was_insert then programs_added := programs_added + 1; else programs_updated := programs_updated + 1; end if;
    end loop;
  end loop;

  return jsonb_build_object(
    'funders_added', funders_added, 'funders_updated', funders_updated,
    'programs_added', programs_added, 'programs_updated', programs_updated
  );
end;
$$;

revoke all on function public.import_catalog(uuid, jsonb) from public, anon;
grant execute on function public.import_catalog(uuid, jsonb) to authenticated;

commit;
