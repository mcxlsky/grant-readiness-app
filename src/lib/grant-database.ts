/**
 * Simulated grant database — represents data that would come from
 * Grants.gov, Foundation Directory Online, Candid, etc.
 *
 * In production this would be a live API query.
 */

export interface GrantListing {
  id: string;
  funder: string;
  program: string;
  focus: string[];
  description: string;
  amount_range: [number, number];
  deadline: string;
  url: string;
  source: string;
  eligibility: string[];
  type: "Federal" | "Foundation" | "Corporate" | "State";
}

export const GRANT_DATABASE: GrantListing[] = [
  {
    id: "gl_1",
    funder: "Bill & Melinda Gates Foundation",
    program: "K-12 Education Innovation",
    focus: ["Education", "K-12", "Equity"],
    description: "Supports innovative approaches to improving educational outcomes for underserved students in K-12 settings.",
    amount_range: [100000, 2000000],
    deadline: "Rolling",
    url: "https://www.gatesfoundation.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Education focus"],
    type: "Foundation",
  },
  {
    id: "gl_2",
    funder: "Robert Wood Johnson Foundation",
    program: "Healthy Communities",
    focus: ["Health", "Community Development", "Equity"],
    description: "Building a culture of health by addressing social determinants and community-level health barriers.",
    amount_range: [50000, 500000],
    deadline: "March 1",
    url: "https://www.rwjf.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Health focus"],
    type: "Foundation",
  },
  {
    id: "gl_3",
    funder: "U.S. Dept. of Education",
    program: "Title IV-A Student Support Grants",
    focus: ["Education", "Student Support", "Safety"],
    description: "Formula grants to improve student academic achievement by providing well-rounded educational opportunities, safe schools, and technology access.",
    amount_range: [25000, 1000000],
    deadline: "June 30",
    url: "https://www.grants.gov",
    source: "Grants.gov",
    eligibility: ["501(c)(3)", "LEA or partner", "Education focus"],
    type: "Federal",
  },
  {
    id: "gl_4",
    funder: "Ford Foundation",
    program: "Civic Engagement & Government",
    focus: ["Civic Engagement", "Democracy", "Justice"],
    description: "Strengthening democratic values and institutions through community organizing, policy advocacy, and civic participation.",
    amount_range: [50000, 500000],
    deadline: "Rolling",
    url: "https://www.fordfoundation.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)"],
    type: "Foundation",
  },
  {
    id: "gl_5",
    funder: "USDA NIFA",
    program: "Community Food Projects Competitive Grants",
    focus: ["Food Security", "Agriculture", "Community Development"],
    description: "Supports community-based food and agriculture projects that fight food insecurity through local solutions.",
    amount_range: [10000, 400000],
    deadline: "September 15",
    url: "https://www.grants.gov",
    source: "Grants.gov",
    eligibility: ["501(c)(3)", "Food security focus"],
    type: "Federal",
  },
  {
    id: "gl_6",
    funder: "Kresge Foundation",
    program: "Arts & Culture",
    focus: ["Arts", "Culture", "Community Development"],
    description: "Supporting arts organizations that serve as anchors in their communities, with emphasis on equitable access.",
    amount_range: [50000, 750000],
    deadline: "February 15",
    url: "https://kresge.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Arts & culture focus"],
    type: "Foundation",
  },
  {
    id: "gl_7",
    funder: "HHS Administration for Community Living",
    program: "Older Americans Act Title III",
    focus: ["Elder Care", "Nutrition", "Social Services"],
    description: "Supports nutrition services, caregiver support, and community-based aging services for older adults.",
    amount_range: [25000, 500000],
    deadline: "April 1",
    url: "https://www.grants.gov",
    source: "Grants.gov",
    eligibility: ["501(c)(3)", "Aging services"],
    type: "Federal",
  },
  {
    id: "gl_8",
    funder: "Walton Family Foundation",
    program: "K-12 Education Reform",
    focus: ["Education", "K-12", "Charter Schools"],
    description: "Advancing K-12 education through school choice, talent pipelines, and personalized learning initiatives.",
    amount_range: [50000, 1000000],
    deadline: "March 15",
    url: "https://www.waltonfamilyfoundation.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Education reform"],
    type: "Foundation",
  },
  {
    id: "gl_9",
    funder: "Google.org",
    program: "Digital Inclusion Grants",
    focus: ["Technology", "Digital Equity", "Education"],
    description: "Closing the digital divide through device access, broadband connectivity, and digital skills training.",
    amount_range: [50000, 500000],
    deadline: "October 1",
    url: "https://www.google.org",
    source: "Corporate Giving Database",
    eligibility: ["501(c)(3)", "Digital equity focus"],
    type: "Corporate",
  },
  {
    id: "gl_10",
    funder: "Carnegie Corporation of New York",
    program: "Education & Equity",
    focus: ["Education", "Equity", "Teacher Development"],
    description: "Investing in education systems that prepare all students for civic participation and economic opportunity.",
    amount_range: [50000, 750000],
    deadline: "September 1",
    url: "https://www.carnegie.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Education focus"],
    type: "Foundation",
  },
  {
    id: "gl_11",
    funder: "National Endowment for the Arts",
    program: "Grants for Arts Projects",
    focus: ["Arts", "Culture", "Community Engagement"],
    description: "Supports artistically excellent projects that celebrate creativity and cultural heritage in communities.",
    amount_range: [10000, 100000],
    deadline: "July 13",
    url: "https://www.arts.gov",
    source: "Grants.gov",
    eligibility: ["501(c)(3)", "Arts organization"],
    type: "Federal",
  },
  {
    id: "gl_12",
    funder: "W.K. Kellogg Foundation",
    program: "Thriving Children",
    focus: ["Children", "Health", "Education", "Racial Equity"],
    description: "Creating conditions for vulnerable children to thrive through equitable community systems and family economic security.",
    amount_range: [100000, 1500000],
    deadline: "Rolling",
    url: "https://www.wkkf.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Child-serving"],
    type: "Foundation",
  },
  {
    id: "gl_13",
    funder: "EPA",
    program: "Environmental Justice Collaborative Grants",
    focus: ["Environment", "Environmental Justice", "Health"],
    description: "Builds capacity of communities disproportionately affected by environmental harms to address local environmental and public health issues.",
    amount_range: [50000, 300000],
    deadline: "November 1",
    url: "https://www.grants.gov",
    source: "Grants.gov",
    eligibility: ["501(c)(3)", "Environmental justice"],
    type: "Federal",
  },
  {
    id: "gl_14",
    funder: "Bank of America Foundation",
    program: "Neighborhood Builders",
    focus: ["Community Development", "Economic Mobility", "Housing"],
    description: "Recognizes nonprofit leaders who are working to advance economic mobility in their communities.",
    amount_range: [200000, 200000],
    deadline: "Nomination-based",
    url: "https://about.bankofamerica.com",
    source: "Corporate Giving Database",
    eligibility: ["501(c)(3)", "Community development"],
    type: "Corporate",
  },
  {
    id: "gl_15",
    funder: "MacArthur Foundation",
    program: "Community Safety & Justice",
    focus: ["Criminal Justice", "Safety", "Community Development"],
    description: "Reducing over-incarceration through place-based strategies and community-driven safety solutions.",
    amount_range: [100000, 1000000],
    deadline: "Rolling",
    url: "https://www.macfound.org",
    source: "Foundation Directory Online",
    eligibility: ["501(c)(3)", "Justice reform"],
    type: "Foundation",
  },
];

export function searchGrants(query: string): GrantListing[] {
  if (!query.trim()) return GRANT_DATABASE;
  const terms = query.toLowerCase().split(/\s+/);
  return GRANT_DATABASE.filter((g) => {
    const text = [
      g.funder,
      g.program,
      ...g.focus,
      g.description,
      g.type,
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((t) => text.includes(t));
  });
}
