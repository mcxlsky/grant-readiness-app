-- ============================================================
-- Ready Set Grants — Lifecycle Foundation Schema
-- Run this in the Supabase SQL Editor (supabase.com/dashboard)
-- ============================================================

-- ── Organizations ────────────────────────────────────────────
-- Replaces the localStorage PortfolioOrg.
-- analysis_data stays as JSONB for now (readiness engine output).

create table if not exists organizations (
  id          uuid primary key default gen_random_uuid(),
  ein         bigint not null unique,
  strein      text not null,
  name        text not null,
  city        text not null default '',
  state       text not null default '',
  ntee_code   text not null default '',
  stage       text not null default 'intake'
              check (stage in ('intake','assessed','fixing','ready')),
  added_at    timestamptz not null default now(),
  analyzed_at timestamptz,
  analysis_data jsonb,            -- full AnalysisData blob
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_organizations_ein on organizations (ein);
create index idx_organizations_stage on organizations (stage);


-- ── Funders ──────────────────────────────────────────────────
-- Normalized funder identity. A grant opportunity belongs to a funder.

create table if not exists funders (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  url         text,
  type        text not null default 'Foundation'
              check (type in ('Federal','Foundation','Corporate','State','Community Foundation')),
  created_at  timestamptz not null default now()
);


-- ── Grant Opportunities ──────────────────────────────────────
-- Replaces the static GRANT_DATABASE array.

create table if not exists grant_opportunities (
  id          uuid primary key default gen_random_uuid(),
  funder_id   uuid not null references funders(id) on delete cascade,
  program     text not null,
  description text not null default '',
  focus       text[] not null default '{}',
  amount_min  integer not null default 0,
  amount_max  integer not null default 0,
  deadline    text not null default 'Rolling',
  url         text,
  source      text not null default '',
  eligibility text[] not null default '{}',
  type        text not null default 'Foundation'
              check (type in ('Federal','Foundation','Corporate','State')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_opportunities_funder on grant_opportunities (funder_id);
create index idx_opportunities_type on grant_opportunities (type);
create index idx_opportunities_active on grant_opportunities (active) where active = true;


-- ── Grant Engagements ────────────────────────────────────────
-- The lifecycle spine: tracks one org pursuing one opportunity.

create table if not exists grant_engagements (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references organizations(id) on delete cascade,
  opportunity_id  uuid references grant_opportunities(id) on delete set null,
  funder_name     text not null default '',         -- denormalized for display
  opportunity_name text not null default '',        -- denormalized for display

  -- Lifecycle stage
  stage           text not null default 'prospect'
                  check (stage in (
                    'prospect',     -- just tracking
                    'researching',  -- gathering requirements
                    'writing',      -- drafting LOI/proposal
                    'submitted',    -- application sent
                    'awarded',      -- grant won (Phase 3)
                    'reporting',    -- post-award management (Phase 3)
                    'closed'        -- completed or withdrawn
                  )),

  -- Outcome (set when resolved)
  outcome         text default 'pending'
                  check (outcome in ('pending','approved','declined','withdrawn')),

  -- Financial
  amount_requested numeric(12,2),
  amount_awarded   numeric(12,2),

  -- Dates
  deadline        text,
  submitted_at    timestamptz,
  awarded_at      timestamptz,
  closed_at       timestamptz,

  -- Match quality (from readiness engine)
  match_pct       integer default 0,
  fits            text[] not null default '{}',
  blockers        text[] not null default '{}',

  notes           text not null default '',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_engagements_org on grant_engagements (org_id);
create index idx_engagements_stage on grant_engagements (stage);
create index idx_engagements_opportunity on grant_engagements (opportunity_id);
create index idx_engagements_outcome on grant_engagements (outcome);


-- ── Applications ─────────────────────────────────────────────
-- Replaces the localStorage GrantApplication.

create table if not exists applications (
  id              uuid primary key default gen_random_uuid(),
  status          text not null default 'new'
                  check (status in ('new','reviewing','approved','declined','info_needed')),
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  last_viewed_at  timestamptz,
  notes           text not null default '',

  -- Org info
  org_name        text not null,
  ein             text not null,
  website         text not null default '',
  mission_statement text not null default '',
  annual_budget   text not null default '',
  program_areas   text not null default '',

  -- Org info (expanded)
  support_types   text[] default '{}',
  nonprofit_status text,
  year_founded    text,
  number_served   text,
  geographic_area text,

  -- Contact
  contact_name    text not null,
  contact_email   text not null,
  contact_phone   text not null default '',
  contact_title   text not null default '',

  -- Project
  project_title   text not null,
  project_description text not null default '',
  amount_requested text not null default '',
  project_timeline text not null default '',
  target_population text not null default '',
  expected_outcomes text,

  -- Specific grant (optional)
  grant_funder_name text,
  grant_name      text,
  grant_deadline  text,
  grant_funding_amount text,
  grant_url       text,

  -- How they found us
  referral_source text not null default '',

  created_at      timestamptz not null default now()
);

create index idx_applications_status on applications (status);
create index idx_applications_ein on applications (ein);


-- ── Seed: Funders ────────────────────────────────────────────

insert into funders (id, name, url, type) values
  ('00000000-0000-0000-0000-000000000001', 'Bill & Melinda Gates Foundation', 'https://www.gatesfoundation.org', 'Foundation'),
  ('00000000-0000-0000-0000-000000000002', 'Robert Wood Johnson Foundation', 'https://www.rwjf.org', 'Foundation'),
  ('00000000-0000-0000-0000-000000000003', 'U.S. Dept. of Education', 'https://www.grants.gov', 'Federal'),
  ('00000000-0000-0000-0000-000000000004', 'Ford Foundation', 'https://www.fordfoundation.org', 'Foundation'),
  ('00000000-0000-0000-0000-000000000005', 'USDA NIFA', 'https://www.grants.gov', 'Federal'),
  ('00000000-0000-0000-0000-000000000006', 'Kresge Foundation', 'https://kresge.org', 'Foundation'),
  ('00000000-0000-0000-0000-000000000007', 'HHS Administration for Community Living', 'https://www.grants.gov', 'Federal'),
  ('00000000-0000-0000-0000-000000000008', 'Walton Family Foundation', 'https://www.waltonfamilyfoundation.org', 'Foundation'),
  ('00000000-0000-0000-0000-000000000009', 'Google.org', 'https://www.google.org', 'Corporate'),
  ('00000000-0000-0000-0000-00000000000a', 'Carnegie Corporation of New York', 'https://www.carnegie.org', 'Foundation'),
  ('00000000-0000-0000-0000-00000000000b', 'National Endowment for the Arts', 'https://www.arts.gov', 'Federal'),
  ('00000000-0000-0000-0000-00000000000c', 'W.K. Kellogg Foundation', 'https://www.wkkf.org', 'Foundation'),
  ('00000000-0000-0000-0000-00000000000d', 'EPA', 'https://www.grants.gov', 'Federal'),
  ('00000000-0000-0000-0000-00000000000e', 'Bank of America Foundation', 'https://about.bankofamerica.com', 'Corporate'),
  ('00000000-0000-0000-0000-00000000000f', 'MacArthur Foundation', 'https://www.macfound.org', 'Foundation')
on conflict (name) do nothing;


-- ── Seed: Grant Opportunities ────────────────────────────────

insert into grant_opportunities (id, funder_id, program, description, focus, amount_min, amount_max, deadline, url, source, eligibility, type) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'K-12 Education Innovation',
   'Supports innovative approaches to improving educational outcomes for underserved students in K-12 settings.',
   '{"Education","K-12","Equity"}', 100000, 2000000, 'Rolling',
   'https://www.gatesfoundation.org', 'Foundation Directory Online',
   '{"501(c)(3)","Education focus"}', 'Foundation'),

  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002',
   'Healthy Communities',
   'Building a culture of health by addressing social determinants and community-level health barriers.',
   '{"Health","Community Development","Equity"}', 50000, 500000, 'March 1',
   'https://www.rwjf.org', 'Foundation Directory Online',
   '{"501(c)(3)","Health focus"}', 'Foundation'),

  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000003',
   'Title IV-A Student Support Grants',
   'Formula grants to improve student academic achievement by providing well-rounded educational opportunities, safe schools, and technology access.',
   '{"Education","Student Support","Safety"}', 25000, 1000000, 'June 30',
   'https://www.grants.gov', 'Grants.gov',
   '{"501(c)(3)","LEA or partner","Education focus"}', 'Federal'),

  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000004',
   'Civic Engagement & Government',
   'Strengthening democratic values and institutions through community organizing, policy advocacy, and civic participation.',
   '{"Civic Engagement","Democracy","Justice"}', 50000, 500000, 'Rolling',
   'https://www.fordfoundation.org', 'Foundation Directory Online',
   '{"501(c)(3)"}', 'Foundation'),

  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005',
   'Community Food Projects Competitive Grants',
   'Supports community-based food and agriculture projects that fight food insecurity through local solutions.',
   '{"Food Security","Agriculture","Community Development"}', 10000, 400000, 'September 15',
   'https://www.grants.gov', 'Grants.gov',
   '{"501(c)(3)","Food security focus"}', 'Federal'),

  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000006',
   'Arts & Culture',
   'Supporting arts organizations that serve as anchors in their communities, with emphasis on equitable access.',
   '{"Arts","Culture","Community Development"}', 50000, 750000, 'February 15',
   'https://kresge.org', 'Foundation Directory Online',
   '{"501(c)(3)","Arts & culture focus"}', 'Foundation'),

  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000007',
   'Older Americans Act Title III',
   'Supports nutrition services, caregiver support, and community-based aging services for older adults.',
   '{"Elder Care","Nutrition","Social Services"}', 25000, 500000, 'April 1',
   'https://www.grants.gov', 'Grants.gov',
   '{"501(c)(3)","Aging services"}', 'Federal'),

  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000008',
   'K-12 Education Reform',
   'Advancing K-12 education through school choice, talent pipelines, and personalized learning initiatives.',
   '{"Education","K-12","Charter Schools"}', 50000, 1000000, 'March 15',
   'https://www.waltonfamilyfoundation.org', 'Foundation Directory Online',
   '{"501(c)(3)","Education reform"}', 'Foundation'),

  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000009',
   'Digital Inclusion Grants',
   'Closing the digital divide through device access, broadband connectivity, and digital skills training.',
   '{"Technology","Digital Equity","Education"}', 50000, 500000, 'October 1',
   'https://www.google.org', 'Corporate Giving Database',
   '{"501(c)(3)","Digital equity focus"}', 'Corporate'),

  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a',
   'Education & Equity',
   'Investing in education systems that prepare all students for civic participation and economic opportunity.',
   '{"Education","Equity","Teacher Development"}', 50000, 750000, 'September 1',
   'https://www.carnegie.org', 'Foundation Directory Online',
   '{"501(c)(3)","Education focus"}', 'Foundation'),

  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b',
   'Grants for Arts Projects',
   'Supports artistically excellent projects that celebrate creativity and cultural heritage in communities.',
   '{"Arts","Culture","Community Engagement"}', 10000, 100000, 'July 13',
   'https://www.arts.gov', 'Grants.gov',
   '{"501(c)(3)","Arts organization"}', 'Federal'),

  ('10000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000c',
   'Thriving Children',
   'Creating conditions for vulnerable children to thrive through equitable community systems and family economic security.',
   '{"Children","Health","Education","Racial Equity"}', 100000, 1500000, 'Rolling',
   'https://www.wkkf.org', 'Foundation Directory Online',
   '{"501(c)(3)","Child-serving"}', 'Foundation'),

  ('10000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000d',
   'Environmental Justice Collaborative Grants',
   'Builds capacity of communities disproportionately affected by environmental harms to address local environmental and public health issues.',
   '{"Environment","Environmental Justice","Health"}', 50000, 300000, 'November 1',
   'https://www.grants.gov', 'Grants.gov',
   '{"501(c)(3)","Environmental justice"}', 'Federal'),

  ('10000000-0000-0000-0000-00000000000e', '00000000-0000-0000-0000-00000000000e',
   'Neighborhood Builders',
   'Recognizes nonprofit leaders who are working to advance economic mobility in their communities.',
   '{"Community Development","Economic Mobility","Housing"}', 200000, 200000, 'Nomination-based',
   'https://about.bankofamerica.com', 'Corporate Giving Database',
   '{"501(c)(3)","Community development"}', 'Corporate'),

  ('10000000-0000-0000-0000-00000000000f', '00000000-0000-0000-0000-00000000000f',
   'Community Safety & Justice',
   'Reducing over-incarceration through place-based strategies and community-driven safety solutions.',
   '{"Criminal Justice","Safety","Community Development"}', 100000, 1000000, 'Rolling',
   'https://www.macfound.org', 'Foundation Directory Online',
   '{"501(c)(3)","Justice reform"}', 'Foundation')
on conflict do nothing;


-- ── Updated-at trigger ───────────────────────────────────────

create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_organizations_updated
  before update on organizations for each row execute function update_updated_at();

create trigger trg_opportunities_updated
  before update on grant_opportunities for each row execute function update_updated_at();

create trigger trg_engagements_updated
  before update on grant_engagements for each row execute function update_updated_at();

create trigger trg_applications_updated
  before update on applications for each row execute function update_updated_at();
