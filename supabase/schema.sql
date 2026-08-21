-- Ready Set Grants — Supabase schema + seed data
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- ══════════════════════════════════════════════════
-- Tables
-- ══════════════════════════════════════════════════

create table if not exists organizations (
  ein         bigint primary key,
  strein      text not null,
  name        text not null,
  city        text default '',
  state       text default '',
  ntee_code   text default '',
  stage       text default 'intake' check (stage in ('intake','assessed','fixing','ready')),
  added_at    timestamptz default now(),
  analyzed_at timestamptz,
  analysis_data jsonb  -- readiness scores, checks, action items, site scan, grant matches
);

create table if not exists applications (
  id               text primary key,
  status           text default 'new' check (status in ('new','reviewing','approved','declined','info_needed')),
  submitted_at     timestamptz default now(),
  updated_at       timestamptz default now(),
  last_viewed_at   timestamptz,
  notes            text default '',

  -- org info
  org_name         text not null,
  ein              text not null,
  website          text default '',
  mission_statement text default '',
  annual_budget    text default '',

  -- contact
  contact_name     text default '',
  contact_email    text default '',
  contact_phone    text default '',
  contact_title    text default '',

  -- project
  project_title       text default '',
  project_description text default '',
  amount_requested    text default '',
  project_timeline    text default '',
  target_population   text default '',
  program_areas       text default '',

  -- referral
  referral_source  text default ''
);

create table if not exists grant_database (
  id          text primary key,
  funder      text not null,
  program     text not null,
  focus       text[] default '{}',
  description text default '',
  amount_min  integer default 0,
  amount_max  integer default 0,
  deadline    text default '',
  url         text default '',
  source      text default '',
  eligibility text[] default '{}',
  type        text default 'Foundation' check (type in ('Federal','Foundation','Corporate','State'))
);

-- ══════════════════════════════════════════════════
-- Seed: Organizations
-- ══════════════════════════════════════════════════

insert into organizations (ein, strein, name, city, state, ntee_code, stage, added_at, analyzed_at, analysis_data) values
(
  131760110, '13-1760110', 'Teach For America', 'New York', 'NY', 'B400', 'assessed',
  now() - interval '14 days', now() - interval '13 days',
  '{
    "org": {"ein":131760110,"name":"Teach For America","city":"New York","state":"NY","ntee_code":"B400","ruling_date":"199312"},
    "readiness": {
      "overall":86,"tier":"Grant-Ready",
      "financial":{"score":90,"checks":[["Revenue over $250K",true,25],["Positive net assets",true,20],["Revenue growth trend",true,15],["Diversified revenue streams",true,15],["Reasonable overhead ratio",true,10],["Operating reserves available",true,15]]},
      "compliance":{"score":85,"checks":[["Filed 990 in last 2 years",true,30],["No late filings",true,20],["Ruling date > 3 years ago",true,20],["NTEE code assigned",true,10],["Consistent EIN history",true,10],["Board members listed",false,10]]},
      "digital":{"score":82,"checks":[["Website is reachable",true,15],["Has SSL certificate",true,10],["Mission statement visible",true,15],["Donation page present",true,15],["Annual report available",true,10],["Board page exists",true,10],["Contact info visible",true,10],["Social media links",true,5],["Copyright year current",false,5],["Word count adequate (>500)",true,5]]},
      "gaps":["Board members not listed in filing"],
      "weights":{"financial":0.35,"compliance":0.25,"digital":0.4}
    },
    "grantMatches": [
      {"name":"Bill & Melinda Gates Foundation","focus":"Education","url":"https://www.gatesfoundation.org","type":"Private Foundation","avg_grant":500000,"grant_range":[100000,2000000],"deadline":"Rolling","match_pct":92,"fits":["Education focus","National reach","Track record"],"blockers":[],"eligible":true,"requires":["501c3","Audited financials"]},
      {"name":"Walton Family Foundation","focus":"K-12 Education Reform","url":"https://www.waltonfamilyfoundation.org","type":"Private Foundation","avg_grant":350000,"grant_range":[50000,1000000],"deadline":"March 15","match_pct":85,"fits":["K-12 education","Policy alignment"],"blockers":[],"eligible":true,"requires":["501c3"]},
      {"name":"Carnegie Corporation of New York","focus":"Education & Equity","url":"https://www.carnegie.org","type":"Private Foundation","avg_grant":250000,"grant_range":[50000,750000],"deadline":"September 1","match_pct":78,"fits":["Education equity","Teacher pipeline"],"blockers":["Competitive cycle"],"eligible":true,"requires":["501c3","Evaluation plan"]}
    ],
    "actionItems": [
      {"action":"Add board member listing to 990 filing","unlocks":1,"category":"compliance","priority":"medium"},
      {"action":"Update website copyright year","unlocks":0,"category":"digital","priority":"low"},
      {"action":"Publish annual impact report on website","unlocks":2,"category":"digital","priority":"high"}
    ],
    "siteScan": {"url":"https://www.teachforamerica.org","reachable":true,"error":null,"title":"Teach For America","meta_description":"Teach For America works to enlist, develop, and mobilize as many as possible of our nation''s most promising future leaders.","signals":{"ssl":true,"mission":true,"donate":true,"annual_report":true,"board":true,"contact":true,"social":true},"footer_year":2025,"word_count":2400,"pages_checked":["/","/about","/donate"],"low_content_warning":false},
    "websiteUrl": "https://www.teachforamerica.org"
  }'::jsonb
),
(
  363722735, '36-3722735', 'Chicago Youth Programs', 'Chicago', 'IL', 'O20', 'fixing',
  now() - interval '10 days', now() - interval '9 days',
  '{
    "org": {"ein":363722735,"name":"Chicago Youth Programs","city":"Chicago","state":"IL","ntee_code":"O20","ruling_date":"200805"},
    "readiness": {
      "overall":58,"tier":"Needs Work",
      "financial":{"score":55,"checks":[["Revenue over $250K",true,25],["Positive net assets",true,20],["Revenue growth trend",false,15],["Diversified revenue streams",false,15],["Reasonable overhead ratio",true,10],["Operating reserves available",false,15]]},
      "compliance":{"score":70,"checks":[["Filed 990 in last 2 years",true,30],["No late filings",false,20],["Ruling date > 3 years ago",true,20],["NTEE code assigned",true,10],["Consistent EIN history",true,10],["Board members listed",true,10]]},
      "digital":{"score":45,"checks":[["Website is reachable",true,15],["Has SSL certificate",false,10],["Mission statement visible",true,15],["Donation page present",false,15],["Annual report available",false,10],["Board page exists",false,10],["Contact info visible",true,10],["Social media links",false,5],["Copyright year current",false,5],["Word count adequate (>500)",true,5]]},
      "gaps":["Revenue declining","No SSL certificate","Missing donation page","Late filing history"],
      "weights":{"financial":0.35,"compliance":0.25,"digital":0.4}
    },
    "grantMatches": [
      {"name":"MacArthur Foundation","focus":"Community Development","url":"https://www.macfound.org","type":"Private Foundation","avg_grant":200000,"grant_range":[25000,500000],"deadline":"Rolling","match_pct":65,"fits":["Chicago-based","Youth focus"],"blockers":["Late filing","No SSL"],"eligible":false,"requires":["501c3","Clean filing history"]},
      {"name":"Chicago Community Trust","focus":"Youth Development","url":"https://www.cct.org","type":"Community Foundation","avg_grant":75000,"grant_range":[10000,200000],"deadline":"June 1","match_pct":72,"fits":["Local org","Youth services"],"blockers":["Missing online donation page"],"eligible":true,"requires":["501c3","Chicago-based"]}
    ],
    "actionItems": [
      {"action":"Install SSL certificate on website","unlocks":2,"category":"digital","priority":"high"},
      {"action":"Add online donation page","unlocks":3,"category":"digital","priority":"high"},
      {"action":"File 990 on time this cycle","unlocks":1,"category":"compliance","priority":"high"},
      {"action":"Diversify revenue beyond program fees","unlocks":1,"category":"financial","priority":"medium"},
      {"action":"Build operating reserve fund","unlocks":0,"category":"financial","priority":"medium"},
      {"action":"Add board page to website","unlocks":1,"category":"digital","priority":"medium"},
      {"action":"Link social media accounts","unlocks":0,"category":"digital","priority":"low"}
    ],
    "siteScan": {"url":"https://chicagoyouthprograms.org","reachable":true,"error":null,"title":"Chicago Youth Programs","meta_description":null,"signals":{"ssl":false,"mission":true,"donate":false,"annual_report":false,"board":false,"contact":true,"social":false},"footer_year":2022,"word_count":650,"pages_checked":["/","/about"],"low_content_warning":false},
    "websiteUrl": "https://chicagoyouthprograms.org"
  }'::jsonb
),
(
  582060131, '58-2060131', 'Habitat for Humanity', 'Atlanta', 'GA', 'L210', 'ready',
  now() - interval '21 days', now() - interval '20 days',
  '{
    "org": {"ein":582060131,"name":"Habitat for Humanity","city":"Atlanta","state":"GA","ntee_code":"L210","ruling_date":"197610"},
    "readiness": {
      "overall":94,"tier":"Grant-Ready",
      "financial":{"score":95,"checks":[["Revenue over $250K",true,25],["Positive net assets",true,20],["Revenue growth trend",true,15],["Diversified revenue streams",true,15],["Reasonable overhead ratio",true,10],["Operating reserves available",true,15]]},
      "compliance":{"score":95,"checks":[["Filed 990 in last 2 years",true,30],["No late filings",true,20],["Ruling date > 3 years ago",true,20],["NTEE code assigned",true,10],["Consistent EIN history",true,10],["Board members listed",true,10]]},
      "digital":{"score":92,"checks":[["Website is reachable",true,15],["Has SSL certificate",true,10],["Mission statement visible",true,15],["Donation page present",true,15],["Annual report available",true,10],["Board page exists",true,10],["Contact info visible",true,10],["Social media links",true,5],["Copyright year current",true,5],["Word count adequate (>500)",true,5]]},
      "gaps":[],
      "weights":{"financial":0.35,"compliance":0.25,"digital":0.4}
    },
    "grantMatches": [
      {"name":"Ford Foundation","focus":"Housing & Community Development","url":"https://www.fordfoundation.org","type":"Private Foundation","avg_grant":400000,"grant_range":[50000,1500000],"deadline":"Rolling","match_pct":95,"fits":["Housing focus","Global reach","Strong financials"],"blockers":[],"eligible":true,"requires":["501c3"]},
      {"name":"JPMorgan Chase Foundation","focus":"Affordable Housing","url":"https://www.jpmorganchase.com/impact","type":"Corporate Foundation","avg_grant":250000,"grant_range":[25000,1000000],"deadline":"April 30","match_pct":88,"fits":["Housing mission","National scale"],"blockers":[],"eligible":true,"requires":["501c3","Audited financials"]}
    ],
    "actionItems": [],
    "siteScan": {"url":"https://www.habitat.org","reachable":true,"error":null,"title":"Habitat for Humanity","meta_description":"Habitat for Humanity is a global nonprofit housing organization.","signals":{"ssl":true,"mission":true,"donate":true,"annual_report":true,"board":true,"contact":true,"social":true},"footer_year":2026,"word_count":4200,"pages_checked":["/","/about","/donate","/volunteer"],"low_content_warning":false},
    "websiteUrl": "https://www.habitat.org"
  }'::jsonb
),
(953211478, '95-3211478', 'Green Spaces LA', 'Los Angeles', 'CA', 'C340', 'intake', now() - interval '2 days', null, null),
(270618426, '27-0618426', 'Rural Health Initiative', 'Helena', 'MT', 'E320', 'intake', now() - interval '1 day', null, null)
on conflict (ein) do nothing;

-- ══════════════════════════════════════════════════
-- Seed: Applications
-- ══════════════════════════════════════════════════

insert into applications (id, status, submitted_at, updated_at, notes, org_name, ein, website, mission_statement, annual_budget, contact_name, contact_email, contact_phone, contact_title, project_title, project_description, amount_requested, project_timeline, target_population, program_areas, referral_source) values
('app_seed_1', 'new', now() - interval '3 hours', now() - interval '3 hours', '', 'Community Builders Alliance', '45-1234567', 'https://communitybuilders.org', 'We empower underserved communities through education, workforce training, and neighborhood revitalization programs.', '$500,000 – $1,000,000', 'Maria Santos', 'maria@communitybuilders.org', '(312) 555-0199', 'Executive Director', 'Neighborhood Youth Leadership Academy', 'A 12-month after-school program providing leadership training, mentorship, and college prep workshops for 200 youth ages 14-19 in underserved neighborhoods.', '$75,000', '12 months starting March 2027', 'Low-income youth ages 14-19 in Chicago''s South Side', 'Education, Workforce Development, Housing', 'Referral from another organization'),
('app_seed_2', 'reviewing', now() - interval '3 days', now() - interval '1 day', 'Strong application. Mission aligns well with several funders. Need to verify 990 filing status.', 'Appalachian Arts Collective', '62-8834219', 'https://appalachianarts.org', 'Preserving and promoting traditional Appalachian arts, music, and craft traditions while creating economic opportunities for rural artists.', '$100,000 – $500,000', 'James Whitaker', 'james@appalachianarts.org', '(304) 555-0742', 'Program Director', 'Heritage Artisan Marketplace & Workshop Series', 'Development of an online marketplace and quarterly workshop series connecting 50+ Appalachian artisans with national buyers.', '$120,000', '18 months starting January 2027', 'Rural artisans in West Virginia, Kentucky, and Virginia', 'Arts & Culture, Economic Development, Rural Communities', 'Conference or event'),
('app_seed_3', 'new', now() - interval '8 hours', now() - interval '8 hours', '', 'Pacific Northwest Food Bank Network', '91-0034521', 'https://pnwfoodbanks.org', 'Coordinating food rescue and distribution across 40+ food banks in Washington and Oregon to eliminate hunger.', '$1,000,000 – $5,000,000', 'Lisa Chen', 'lchen@pnwfoodbanks.org', '(206) 555-0388', 'Chief Development Officer', 'Cold Chain Infrastructure Upgrade', 'Upgrade refrigeration and cold storage capacity across 15 rural food bank locations to reduce food waste by 40%.', '$250,000', '24 months starting June 2027', 'Food-insecure families in rural Washington and Oregon', 'Food Security, Infrastructure, Public Health', 'Web search'),
('app_seed_4', 'approved', now() - interval '12 days', now() - interval '5 days', 'Approved for full consulting engagement. Strong digital presence, clean financials.', 'Digital Equity Now', '84-3291054', 'https://digitalequitynow.org', 'Closing the digital divide by providing free internet access, devices, and digital literacy training.', '$500,000 – $1,000,000', 'Andre Williams', 'andre@digitalequitynow.org', '(415) 555-0921', 'Founder & CEO', 'Connected Communities Initiative', 'Establishing 20 community technology centers in underserved urban neighborhoods.', '$180,000', '12 months starting September 2027', 'Low-income urban residents without reliable internet access', 'Technology, Education, Community Development', 'Social media'),
('app_seed_5', 'info_needed', now() - interval '7 days', now() - interval '2 days', 'Requested audited financials and board roster. Waiting on response.', 'Sunrise Senior Services', '73-5521890', 'https://sunriseseniors.org', 'Providing in-home care, meal delivery, and social engagement programs for isolated seniors in rural Oklahoma.', 'Under $100,000', 'Patricia Hernandez', 'phernandez@sunriseseniors.org', '(918) 555-0614', 'Board President', 'Meals & Companionship Home Visit Program', 'Expanding our volunteer-driven home visit program to deliver 3 meals per week to 150 homebound seniors.', '$35,000', '12 months starting April 2027', 'Homebound seniors 65+ in rural eastern Oklahoma', 'Elder Care, Nutrition, Social Services', 'Newsletter / email'),
('app_seed_6', 'approved', now() - interval '30 days', now() - interval '20 days', 'Strong national org. Accepted into readiness program. Consultant assigned.', 'Teach For America', '13-1760110', 'https://www.teachforamerica.org', 'Enlisting, developing, and mobilizing future leaders to grow the movement for educational equity and excellence.', 'Over $5,000,000', 'Sarah Mitchell', 'sarah.mitchell@teachforamerica.org', '(212) 555-0147', 'Director of Development', 'Rural Teacher Pipeline Expansion', 'Expanding corps member recruitment and placement in 10 underserved rural districts across the Southeast.', '$500,000', '24 months starting August 2027', 'K-12 students in underserved rural school districts', 'Education, Workforce Development, Rural Communities', 'Referral from another organization')
on conflict (id) do nothing;

-- ══════════════════════════════════════════════════
-- Seed: Grant Database
-- ══════════════════════════════════════════════════

insert into grant_database (id, funder, program, focus, description, amount_min, amount_max, deadline, url, source, eligibility, type) values
('gl_1',  'Bill & Melinda Gates Foundation', 'K-12 Education Innovation', '{"Education","K-12","Equity"}', 'Supports innovative approaches to improving educational outcomes for underserved students in K-12 settings.', 100000, 2000000, 'Rolling', 'https://www.gatesfoundation.org', 'Foundation Directory Online', '{"501(c)(3)","Education focus"}', 'Foundation'),
('gl_2',  'Robert Wood Johnson Foundation', 'Healthy Communities', '{"Health","Community Development","Equity"}', 'Building a culture of health by addressing social determinants and community-level health barriers.', 50000, 500000, 'March 1', 'https://www.rwjf.org', 'Foundation Directory Online', '{"501(c)(3)","Health focus"}', 'Foundation'),
('gl_3',  'U.S. Dept. of Education', 'Title IV-A Student Support Grants', '{"Education","Student Support","Safety"}', 'Formula grants to improve student academic achievement by providing well-rounded educational opportunities, safe schools, and technology access.', 25000, 1000000, 'June 30', 'https://www.grants.gov', 'Grants.gov', '{"501(c)(3)","LEA or partner","Education focus"}', 'Federal'),
('gl_4',  'Ford Foundation', 'Civic Engagement & Government', '{"Civic Engagement","Democracy","Justice"}', 'Strengthening democratic values and institutions through community organizing, policy advocacy, and civic participation.', 50000, 500000, 'Rolling', 'https://www.fordfoundation.org', 'Foundation Directory Online', '{"501(c)(3)"}', 'Foundation'),
('gl_5',  'USDA NIFA', 'Community Food Projects Competitive Grants', '{"Food Security","Agriculture","Community Development"}', 'Supports community-based food and agriculture projects that fight food insecurity through local solutions.', 10000, 400000, 'September 15', 'https://www.grants.gov', 'Grants.gov', '{"501(c)(3)","Food security focus"}', 'Federal'),
('gl_6',  'Kresge Foundation', 'Arts & Culture', '{"Arts","Culture","Community Development"}', 'Supporting arts organizations that serve as anchors in their communities, with emphasis on equitable access.', 50000, 750000, 'February 15', 'https://kresge.org', 'Foundation Directory Online', '{"501(c)(3)","Arts & culture focus"}', 'Foundation'),
('gl_7',  'HHS Administration for Community Living', 'Older Americans Act Title III', '{"Elder Care","Nutrition","Social Services"}', 'Supports nutrition services, caregiver support, and community-based aging services for older adults.', 25000, 500000, 'April 1', 'https://www.grants.gov', 'Grants.gov', '{"501(c)(3)","Aging services"}', 'Federal'),
('gl_8',  'Walton Family Foundation', 'K-12 Education Reform', '{"Education","K-12","Charter Schools"}', 'Advancing K-12 education through school choice, talent pipelines, and personalized learning initiatives.', 50000, 1000000, 'March 15', 'https://www.waltonfamilyfoundation.org', 'Foundation Directory Online', '{"501(c)(3)","Education reform"}', 'Foundation'),
('gl_9',  'Google.org', 'Digital Inclusion Grants', '{"Technology","Digital Equity","Education"}', 'Closing the digital divide through device access, broadband connectivity, and digital skills training.', 50000, 500000, 'October 1', 'https://www.google.org', 'Corporate Giving Database', '{"501(c)(3)","Digital equity focus"}', 'Corporate'),
('gl_10', 'Carnegie Corporation of New York', 'Education & Equity', '{"Education","Equity","Teacher Development"}', 'Investing in education systems that prepare all students for civic participation and economic opportunity.', 50000, 750000, 'September 1', 'https://www.carnegie.org', 'Foundation Directory Online', '{"501(c)(3)","Education focus"}', 'Foundation'),
('gl_11', 'National Endowment for the Arts', 'Grants for Arts Projects', '{"Arts","Culture","Community Engagement"}', 'Supports artistically excellent projects that celebrate creativity and cultural heritage in communities.', 10000, 100000, 'July 13', 'https://www.arts.gov', 'Grants.gov', '{"501(c)(3)","Arts organization"}', 'Federal'),
('gl_12', 'W.K. Kellogg Foundation', 'Thriving Children', '{"Children","Health","Education","Racial Equity"}', 'Creating conditions for vulnerable children to thrive through equitable community systems and family economic security.', 100000, 1500000, 'Rolling', 'https://www.wkkf.org', 'Foundation Directory Online', '{"501(c)(3)","Child-serving"}', 'Foundation'),
('gl_13', 'EPA', 'Environmental Justice Collaborative Grants', '{"Environment","Environmental Justice","Health"}', 'Builds capacity of communities disproportionately affected by environmental harms to address local environmental and public health issues.', 50000, 300000, 'November 1', 'https://www.grants.gov', 'Grants.gov', '{"501(c)(3)","Environmental justice"}', 'Federal'),
('gl_14', 'Bank of America Foundation', 'Neighborhood Builders', '{"Community Development","Economic Mobility","Housing"}', 'Recognizes nonprofit leaders who are working to advance economic mobility in their communities.', 200000, 200000, 'Nomination-based', 'https://about.bankofamerica.com', 'Corporate Giving Database', '{"501(c)(3)","Community development"}', 'Corporate'),
('gl_15', 'MacArthur Foundation', 'Community Safety & Justice', '{"Criminal Justice","Safety","Community Development"}', 'Reducing over-incarceration through place-based strategies and community-driven safety solutions.', 100000, 1000000, 'Rolling', 'https://www.macfound.org', 'Foundation Directory Online', '{"501(c)(3)","Justice reform"}', 'Foundation')
on conflict (id) do nothing;
