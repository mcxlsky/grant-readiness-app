"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar, MobileTabBar } from "@/components/app-sidebar";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { SearchModal } from "@/components/search-modal";
import { WelcomeView } from "@/components/welcome-view";
import { IntakeView } from "@/components/intake-view";
import { DashboardView } from "@/components/dashboard-view";
import { ApplicationsView } from "@/components/applications-view";
import { GrantsView } from "@/components/grants-view";
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
import type { PortfolioOrg, OrgSearchResult, Stage, AnalysisData, GrantApplication } from "@/lib/types";
import { cn } from "@/lib/utils";

export type View = "orgs" | "inbox" | "grants";

export default function Home() {
  const router = useRouter();
  const [adminName, setAdminName] = useState("Admin");
  const [portfolio, setPortfolio] = useState<PortfolioOrg[]>([]);
  const [applications, setApplications] = useState<GrantApplication[]>([]);
  const [activeEin, setActiveEin] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [view, setView] = useState<View>("orgs");
  const { theme, toggleTheme } = useTheme();

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
    setPortfolio(p);
    setApplications(a);
  }, []);

  const refresh = useCallback(() => {
    setPortfolio(loadPortfolio());
    setApplications(loadApplications());
  }, []);

  const activeOrg = activeEin ? portfolio.find((o) => o.ein === activeEin) || null : null;

  const handleAddOrg = (org: OrgSearchResult) => {
    addOrg(org);
    refresh();
    setActiveEin(org.ein);
    setView("orgs");
  };

  const handleRemoveOrg = (ein: number) => {
    removeOrg(ein);
    if (activeEin === ein) setActiveEin(null);
    refresh();
  };

  const handleSelectOrg = (ein: number) => {
    setActiveEin(ein);
    setView("orgs");
  };

  const handleAcceptApp = (app: GrantApplication) => {
    // Parse EIN string to number (strip dashes)
    const einNum = parseInt(app.ein.replace(/\D/g, ""), 10);
    // Add to portfolio if not already there
    if (!portfolio.some((o) => o.ein === einNum)) {
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
    refresh();
    setActiveEin(einNum);
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
    if (v !== "orgs") {
      setActiveEin(null);
    }
  };

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

  const newAppCount = useMemo(
    () => applications.filter((a) => a.status === "new").length,
    [applications]
  );

  const grantCount = allGrants.length;

  const renderMainContent = () => {
    if (view === "inbox") {
      return (
        <ApplicationsView applications={applications} onRefresh={refresh} onAcceptOrg={handleAcceptApp} />
      );
    }

    if (view === "grants") {
      return <GrantsView grants={allGrants} portfolio={portfolio} onSelectOrg={handleSelectOrg} onRefresh={refresh} />;
    }

    // view === "orgs"
    if (!activeOrg) {
      return (
        <WelcomeView
          hasOrgs={portfolio.length > 0}
          onOpenSearch={() => setSearchOpen(true)}
          portfolio={portfolio}
          onSelectOrg={handleSelectOrg}
        />
      );
    }

    if (!activeOrg.analysisData) {
      return (
        <IntakeView
          org={activeOrg}
          onAnalysisComplete={handleAnalysisComplete}
          onBack={() => setActiveEin(null)}
        />
      );
    }

    return (
      <DashboardView
        org={activeOrg}
        onBack={() => setActiveEin(null)}
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
        <div className="hidden h-full w-[220px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 md:flex">
          <AppSidebar
            portfolio={portfolio}
            applications={applications}
            view={view}
            onSwitchView={handleSwitchView}
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
        newAppCount={newAppCount}
        grantCount={grantCount}
        orgCount={portfolio.length}
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
