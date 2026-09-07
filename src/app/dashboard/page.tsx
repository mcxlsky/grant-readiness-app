"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { AppSidebar, MobileTabBar } from "@/components/app-sidebar";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { SearchModal } from "@/components/search-modal";
import { WelcomeView } from "@/components/welcome-view";
import { DashboardView } from "@/components/dashboard-view";
import { GrantsView } from "@/components/grants-view";
import { PipelineView } from "@/components/pipeline-view";
// PaywallModal lives in src/components/paywall-modal.tsx — used on the org-facing portal, not here
import {
  loadPortfolio,
  savePortfolio,
  addOrg,
  removeOrg,
  updateOrgAnalysis,
  updateOrgStage,
} from "@/lib/portfolio";
import { loadApplications, saveApplications, updateApplicationStatus } from "@/lib/applications";
import { SEED_PORTFOLIO, SEED_APPLICATIONS } from "@/lib/seed";
import { useTheme } from "@/lib/theme";
import { useEngagements } from "@/lib/hooks/use-engagements";
import { syncOrgsToSupabase, getEinToIdMap } from "@/lib/db/sync";
import { PIPELINE_STAGES } from "@/lib/db/types";
import { INBOX_STAGES, PIPELINE_ORG_STAGES } from "@/lib/types";
import type { PortfolioOrg, OrgSearchResult, Stage, PipelineStage, AnalysisData, GrantApplication } from "@/lib/types";
import type { DbOrganization, EngagementStage } from "@/lib/db/types";
import { cn } from "@/lib/utils";

export type View = "orgs" | "grants" | "pipeline";
export type InboxFilter = "all" | "ready" | "needs_work";

export default function Home() {
  const [adminName, setAdminName] = useState("Admin");
  const [portfolio, setPortfolio] = useState<PortfolioOrg[]>([]);
  const [applications, setApplications] = useState<GrantApplication[]>([]);
  const [activeEin, setActiveEin] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [view, setView] = useState<View>("orgs");
  const [assessingEins, setAssessingEins] = useState<Set<number>>(new Set());
  const [activeStage, setActiveStage] = useState<PipelineStage | null>(null);
  const [inboxFilter, setInboxFilter] = useState<InboxFilter>("ready");
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewedEins, setViewedEins] = useState<Set<number>>(() => {
    try {
      const raw = localStorage.getItem("rsg_viewed_eins");
      return raw ? new Set(JSON.parse(raw) as number[]) : new Set();
    } catch { return new Set(); }
  });

  // EIN → Supabase UUID mapping (populated after sync)
  const [einMap, setEinMap] = useState<Map<number, string>>(new Map());
  const syncedRef = useRef(false);

  // Pipeline engagements (Supabase)
  const {
    engagements,
    loading: engagementsLoading,
    refresh: refreshEngagements,
    moveStage,
    setNotes,
    removeEngagement,
  } = useEngagements({ stages: PIPELINE_STAGES });

  // Auto-assess: fire off /api/analyze for an unassessed org
  const autoAssess = useCallback(async (org: PortfolioOrg, website?: string) => {
    setAssessingEins((prev) => new Set(prev).add(org.ein));
    try {
      const url = `/api/analyze?ein=${org.ein}${website ? `&website=${encodeURIComponent(website)}` : ""}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data.error) {
        updateOrgAnalysis(org.ein, data);
        // Refresh portfolio state
        setPortfolio(loadPortfolio());
      }
    } catch {
      // Assessment failed silently — org stays unassessed, user can retry manually
    } finally {
      setAssessingEins((prev) => {
        const next = new Set(prev);
        next.delete(org.ein);
        return next;
      });
    }
  }, []);

  useEffect(() => {
    // Read admin name if set
    try {
      const admin = localStorage.getItem("rsg_admin");
      if (admin) {
        const parsed = JSON.parse(admin);
        if (parsed.name) setAdminName(parsed.name);
      }
    } catch { /* use default */ }

    let p = loadPortfolio();
    let a = loadApplications();
    if (p.length === 0 && !localStorage.getItem("rsg_seeded")) {
      p = SEED_PORTFOLIO;
      a = SEED_APPLICATIONS;
      savePortfolio(p);
      saveApplications(a);
      localStorage.setItem("rsg_seeded", "1");
    }

    // Auto-accept: process any new/pending applications → create orgs
    const newApps = a.filter((app) => app.status === "new" || app.status === "pending");
    for (const app of newApps) {
      const einNum = parseInt(app.ein.replace(/\D/g, ""), 10);
      if (!p.some((o) => o.ein === einNum)) {
        addOrg({
          ein: einNum,
          strein: app.ein,
          name: app.orgName,
          city: "",
          state: "",
          ntee_code: "",
        });
      }
      updateApplicationStatus(app.id, "approved");
    }

    // Re-read after auto-accept
    if (newApps.length > 0) {
      p = loadPortfolio();
      a = loadApplications();
    }

    setPortfolio(p);
    setApplications(a);

    // Auto-assess: fire off analysis for any unassessed orgs
    const unassessed = p.filter((o) => !o.analysisData);
    for (const org of unassessed) {
      // Find matching application to get website URL
      const app = a.find((ap) => parseInt(ap.ein.replace(/\D/g, ""), 10) === org.ein);
      autoAssess(org, app?.website);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync localStorage orgs → Supabase (once)
  useEffect(() => {
    if (portfolio.length === 0 || syncedRef.current) return;
    syncedRef.current = true;
    syncOrgsToSupabase(portfolio).then((map) => {
      setEinMap(new Map(map));
    });
  }, [portfolio]);

  const refresh = useCallback(() => {
    setPortfolio(loadPortfolio());
    setApplications(loadApplications());
  }, []);

  const activeOrg = activeEin ? portfolio.find((o) => o.ein === activeEin) || null : null;

  const handleAddOrg = (org: OrgSearchResult) => {
    addOrg(org);
    refresh();
    // Re-sync so new org gets a Supabase ID
    syncedRef.current = false;
    setActiveEin(org.ein);
    setView("orgs");
    // Auto-assess the newly added org
    const portfolioOrg: PortfolioOrg = {
      ein: org.ein,
      strein: org.strein,
      name: org.name,
      city: org.city,
      state: org.state,
      ntee_code: org.ntee_code,
      stage: "intake",
      addedAt: Date.now(),
      analysisData: null,
    };
    autoAssess(portfolioOrg);
  };

  const handleRemoveOrg = (ein: number) => {
    removeOrg(ein);
    if (activeEin === ein) setActiveEin(null);
    refresh();
  };

  const handleSelectOrg = (ein: number) => {
    setActiveEin(ein);
    // Don't change view — org detail renders on top of whatever view is active
    // Mark as viewed
    setViewedEins((prev) => {
      const next = new Set(prev).add(ein);
      try { localStorage.setItem("rsg_viewed_eins", JSON.stringify([...next])); } catch {}
      return next;
    });
    // Auto-assess if unassessed and not already running
    const org = portfolio.find((o) => o.ein === ein);
    if (org && !org.analysisData && !assessingEins.has(ein)) {
      const app = applications.find((a) => parseInt(a.ein.replace(/\D/g, ""), 10) === ein);
      autoAssess(org, app?.website);
    }
  };

  /** Called from Pipeline view — finds org by Supabase ID and navigates to it */
  const handleSelectOrgById = (orgId: string) => {
    // Reverse-lookup: find EIN from Supabase ID
    for (const [ein, id] of einMap) {
      if (id === orgId) {
        handleSelectOrg(ein);
        return;
      }
    }
    // Fallback: just switch to orgs view
    setView("orgs");
  };

  const handleAnalysisComplete = (ein: number, data: AnalysisData) => {
    updateOrgAnalysis(ein, data);
    refresh();
  };

  const handleStageChange = (ein: number, stage: Stage) => {
    updateOrgStage(ein, stage);
    refresh();
  };

  const handleSwitchView = (v: View) => {
    setView(v);
    setActiveEin(null);
    if (v !== "pipeline") {
      setActiveStage(null);
    }
  };

  /** Mark orgs in a stage as viewed when navigating to it */
  const handleSelectStage = useCallback((stage: PipelineStage | null) => {
    setActiveStage(stage);
    if (stage) {
      setViewedEins((prev) => {
        const next = new Set(prev);
        for (const org of portfolio) {
          if (org.stage === stage) next.add(org.ein);
        }
        try { localStorage.setItem("rsg_viewed_eins", JSON.stringify([...next])); } catch {}
        return next;
      });
    }
  }, [portfolio]);

  /** Mark orgs matching an inbox filter as viewed when navigating to it */
  const handleSelectInboxFilter = useCallback((filter: InboxFilter) => {
    setInboxFilter(filter);
    setActiveEin(null);
    setViewedEins((prev) => {
      const next = new Set(prev);
      for (const org of portfolio) {
        if (!(INBOX_STAGES as string[]).includes(org.stage)) continue;
        const score = org.analysisData?.readiness.overall ?? null;
        const isReady = score != null && score >= 65;
        if (filter === "ready" && isReady) next.add(org.ein);
        else if (filter === "needs_work" && !isReady) next.add(org.ein);
        else if (filter === "all") next.add(org.ein);
      }
      try { localStorage.setItem("rsg_viewed_eins", JSON.stringify([...next])); } catch {}
      return next;
    });
  }, [portfolio]);

  const allGrants = useMemo(
    () =>
      portfolio
        .filter((o) => o.analysisData)
        .flatMap((o) =>
          (o.analysisData!.grantMatches || []).map((g) => ({
            ...g,
            orgName: o.name,
            orgEin: o.ein,
          }))
        ),
    [portfolio]
  );

  const grantCount = allGrants.length;

  // Convert localStorage portfolio orgs to DbOrganization shape for GrantsView,
  // using real Supabase UUIDs when available
  const orgsAsDb: DbOrganization[] = useMemo(
    () =>
      portfolio.map((o) => ({
        id: einMap.get(o.ein) || String(o.ein),
        ein: o.ein,
        strein: o.strein,
        name: o.name,
        city: o.city,
        state: o.state,
        ntee_code: o.ntee_code,
        stage: o.stage,
        added_at: new Date(o.addedAt).toISOString(),
        analyzed_at: o.analyzedAt ? new Date(o.analyzedAt).toISOString() : null,
        analysis_data: o.analysisData,
        created_at: new Date(o.addedAt).toISOString(),
        updated_at: new Date(o.addedAt).toISOString(),
      })),
    [portfolio, einMap]
  );

  // Pipeline orgs (paid stages only)
  const pipelineOrgs = useMemo(
    () => portfolio.filter((o) => o.stage === "prospecting" || o.stage === "writing" || o.stage === "submitted"),
    [portfolio]
  );

  // Inbox orgs (free stages only)
  const inboxOrgs = useMemo(
    () => portfolio.filter((o) => (INBOX_STAGES as string[]).includes(o.stage)),
    [portfolio]
  );

  // Sidebar counts
  const counts: Record<View, number | undefined> = {
    orgs: inboxOrgs.length || undefined,
    grants: grantCount || undefined,
    pipeline: pipelineOrgs.length || undefined,
  };

  // Stage counts for pipeline nav — only unviewed orgs
  const stageCounts = useMemo(() => {
    const map: Record<PipelineStage, number> = {
      prospecting: 0, writing: 0, submitted: 0,
    };
    for (const org of portfolio) {
      if (org.stage in map && !viewedEins.has(org.ein)) {
        map[org.stage as PipelineStage]++;
      }
    }
    return map;
  }, [portfolio, viewedEins]);

  // Inbox sub-tab counts (unviewed only — badges disappear once all are seen)
  const inboxCounts = useMemo(() => {
    const c: Record<InboxFilter, number> = { all: 0, ready: 0, needs_work: 0 };
    for (const org of inboxOrgs) {
      if (viewedEins.has(org.ein)) continue;
      c.all++;
      const score = org.analysisData?.readiness.overall ?? null;
      if (score != null && score >= 65) c.ready++;
      else c.needs_work++;
    }
    return c;
  }, [inboxOrgs, viewedEins]);

  /** Consultant moves a grant-ready org into the pipeline */
  const handleStartProspecting = useCallback((ein: number) => {
    updateOrgStage(ein, "prospecting");
    refresh();
    setActiveEin(null);
    setView("pipeline");
    setActiveStage("prospecting");
  }, [refresh]);

  /** Derive the breadcrumb label from the current view context */
  const backLabel = useMemo(() => {
    if (view === "pipeline" && activeStage) {
      const stage = PIPELINE_ORG_STAGES.find((s) => s.key === activeStage);
      return stage?.label ?? "Pipeline";
    }
    if (view === "grants") return "Grants";
    return "Inbox";
  }, [view, activeStage]);

  const renderMainContent = () => {
    // Org detail takes priority — renders on top of whatever view is active
    if (activeOrg) {
      if (!activeOrg.analysisData) {
        return (
          <div>
            <button
              onClick={() => setActiveEin(null)}
              className="mb-4 flex items-center gap-1 text-xs font-medium text-gray-400 transition-colors hover:text-indigo-600 dark:text-neutral-500 dark:hover:text-indigo-400"
            >
              <span className="text-sm">‹</span> {backLabel}
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {activeOrg.name}
            </h1>
            <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-indigo-500 dark:border-neutral-700 dark:border-t-indigo-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Running Readiness Assessment
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-neutral-500">
                Pulling 990 filings, scanning website, computing readiness score…
              </p>
            </div>
          </div>
        );
      }

      return (
        <DashboardView
          org={activeOrg}
          backLabel={backLabel}
          onBack={() => setActiveEin(null)}
          onStartProspecting={handleStartProspecting}
        />
      );
    }

    if (view === "grants") {
      return (
        <GrantsView
          organizations={orgsAsDb}
          onSelectOrg={(orgId) => {
            // Reverse-lookup if it's a UUID, otherwise try as EIN
            for (const [ein, id] of einMap) {
              if (id === orgId) {
                handleSelectOrg(ein);
                return;
              }
            }
            const ein = parseInt(orgId, 10);
            if (!isNaN(ein)) handleSelectOrg(ein);
          }}
          onRefresh={refresh}
          onEngagementCreated={refreshEngagements}
        />
      );
    }

    if (view === "pipeline") {
      return (
        <PipelineView
          pipelineOrgs={pipelineOrgs}
          activeStage={activeStage}
          onSelectOrg={(ein) => handleSelectOrg(ein)}
          onSelectStage={handleSelectStage}
          onRefresh={refresh}
          applications={applications}
        />
      );
    }

    // view === "orgs" — Inbox list
    return (
      <WelcomeView
        hasOrgs={portfolio.length > 0}
        onOpenSearch={() => setSearchOpen(true)}
        portfolio={inboxOrgs}
        onSelectOrg={handleSelectOrg}
        assessingEins={assessingEins}
        applications={applications}
        filter={inboxFilter}
        viewedEins={viewedEins}
        onStartProspecting={handleStartProspecting}
        onDeclineOrg={handleRemoveOrg}
      />
    );
  };

  return (
    <div
      className={cn(
        "flex h-screen w-full flex-col overflow-hidden",
        "bg-gray-50 dark:bg-neutral-950"
      )}
    >
      {/* Full-width top nav */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900 md:px-6">
        <a
          href="/?choose=1"
          className="flex cursor-pointer items-center gap-2"
        >
          <div className="h-5 w-6 shrink-0 rounded-tl-lg rounded-tr-sm rounded-br-lg rounded-bl-sm bg-indigo-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            Ready Set Grants
          </span>
        </a>
        <ProfileDropdown theme={theme} onToggleTheme={toggleTheme} adminName={adminName} />
      </div>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <div
          className={cn(
            "hidden h-full shrink-0 flex-col border-r border-gray-200 bg-white transition-[width] duration-200 ease-in-out dark:border-neutral-800 dark:bg-neutral-900 md:flex",
            sidebarOpen ? "w-[220px]" : "w-[52px]"
          )}
        >
          <AppSidebar
            counts={counts}
            stageCounts={stageCounts}
            view={view}
            activeStage={activeStage}
            onSwitchView={handleSwitchView}
            onSelectStage={handleSelectStage}
            collapsed={!sidebarOpen}
            onToggleCollapse={() => setSidebarOpen((v) => !v)}
            inboxFilter={inboxFilter}
            inboxCounts={inboxCounts}
            onSelectInboxFilter={handleSelectInboxFilter}
          />
        </div>

        <main className="flex flex-1 flex-col overflow-y-auto bg-gray-50 pb-14 md:pb-0 dark:bg-neutral-950">
          <div className="mx-auto w-full max-w-[840px] flex-1 px-6 pt-8 pb-8 md:px-10 md:pt-8">
            {renderMainContent()}
          </div>
          <footer className="mx-auto max-w-[840px] px-6 pb-6 text-xs leading-relaxed text-gray-400 dark:text-neutral-600 md:px-10">
            Financial and filing data sourced live from the ProPublica Nonprofit
            Explorer API (IRS Form 990 data). Website housekeeping signals come
            from a live scan of the org&apos;s own site. Grant data sourced from
            Grants.gov, Foundation Directory Online, and Corporate Giving
            Database. This is a working prototype, not a finished product.
          </footer>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileTabBar
        view={view}
        onSwitchView={handleSwitchView}
        counts={counts}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onAdd={handleAddOrg}
        portfolio={portfolio}
      />
    </div>
  );
}
