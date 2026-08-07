"""
Grant readiness scoring engine.

Three weighted categories, each 0-100:
  - Financial health   (35%) - from the org's most recent IRS 990 filing
  - Filing compliance  (25%) - recency/consistency of IRS filings on record
  - Digital housekeeping (40%) - from the live website scan

Weighted toward digital housekeeping deliberately: that's the signal
existing 990-only tools miss entirely, and it's the fastest thing an org can
actually fix.
"""
from datetime import datetime

CURRENT_YEAR = datetime.utcnow().year

WEIGHTS = {"financial": 0.35, "compliance": 0.25, "digital": 0.40}


def _latest_filing(org_json):
    filings = org_json.get("filings_with_data") or []
    if not filings:
        return None
    return sorted(filings, key=lambda f: f.get("tax_prd_yr", 0), reverse=True)[0]


def score_financial_health(org_json):
    filing = _latest_filing(org_json)
    checks = []

    if not filing:
        checks.append(("No detailed financial filing on record (likely a 990-N e-Postcard filer, under $50K revenue, or data not yet processed)", False, 0))
        return {"score": 40, "checks": checks}

    revenue = filing.get("totrevenue") or 0
    expenses = filing.get("totfuncexpns") or 0
    net_assets = filing.get("totnetassetend") or 0
    filing_year = filing.get("tax_prd_yr")
    points = 0

    if expenses and revenue >= expenses:
        checks.append(("Revenue covered expenses in the most recent filing", True, 25))
        points += 25
    elif expenses:
        deficit_pct = (expenses - revenue) / expenses
        ok = deficit_pct < 0.10
        checks.append((f"Ran a {'modest' if ok else 'significant'} deficit in the most recent filing ({deficit_pct:.0%} of expenses)", ok, 25 if ok else 10))
        points += 25 if ok else 10
    else:
        checks.append(("Expense data not available to assess deficit/surplus", False, 10))
        points += 10

    months_reserve = (net_assets / (expenses / 12)) if expenses else None
    if months_reserve is not None:
        if months_reserve >= 3:
            checks.append((f"Holds roughly {months_reserve:.1f} months of operating reserve", True, 30))
            points += 30
        elif months_reserve >= 1:
            checks.append((f"Thin operating reserve (~{months_reserve:.1f} months of expenses)", False, 15))
            points += 15
        elif months_reserve >= 0:
            checks.append(("Very low operating reserve (under 1 month of expenses)", False, 5))
            points += 5
        else:
            checks.append(("Negative net assets (liabilities exceed assets)", False, 0))
    else:
        checks.append(("Reserve ratio not calculable from available data", False, 10))
        points += 10

    gross_fr = filing.get("grsincfndrsng") or 0
    net_fr = filing.get("netincfndrsng")
    if gross_fr and net_fr is not None:
        ok = net_fr > 0
        checks.append((f"Fundraising activity shows {'net-positive' if ok else 'net-negative'} results", ok, 15 if ok else 5))
        points += 15 if ok else 5
    else:
        points += 10

    checks.append((f"Most recent detailed filing: FY{filing_year} (revenue ${revenue:,.0f})", True, 0))

    return {"score": min(round(points), 100), "checks": checks}


def score_filing_compliance(org_json):
    checks = []
    points = 0
    org = org_json.get("organization", {})
    filings_with_data = org_json.get("filings_with_data") or []
    filings_without_data = org_json.get("filings_without_data") or []
    all_years = [f.get("tax_prd_yr") for f in filings_with_data] + [f.get("tax_prd_yr") for f in filings_without_data]
    all_years = sorted({y for y in all_years if y})

    if all_years:
        latest_year = max(all_years)
        years_behind = CURRENT_YEAR - latest_year
        if years_behind <= 2:
            checks.append((f"Most recent filing on record is FY{latest_year} — current", True, 50))
            points += 50
        elif years_behind <= 4:
            checks.append((f"Most recent filing on record is FY{latest_year} — {years_behind} years old", False, 25))
            points += 25
        else:
            checks.append((f"Most recent filing on record is FY{latest_year} — significantly out of date ({years_behind} years)", False, 0))
    else:
        checks.append(("No IRS filings found on record for this EIN (may be a very small/new org filing 990-N, which isn't fully indexed)", False, 10))
        points += 10

    if len(all_years) >= 2:
        gaps = [b - a for a, b in zip(all_years, all_years[1:]) if b - a > 1]
        if not gaps:
            checks.append(("No gaps detected in filing history", True, 30))
            points += 30
        else:
            checks.append((f"{len(gaps)} gap(s) detected in filing history", False, 10))
            points += 10
    else:
        points += 15

    ruling_date = org.get("ruling_date")
    if ruling_date:
        checks.append((f"IRS tax-exempt status established {ruling_date[:4]}", True, 20))
        points += 20
    else:
        checks.append(("No IRS determination date on record", False, 0))

    return {"score": min(round(points), 100), "checks": checks}


def score_digital_housekeeping(site_scan):
    from .website_scan import SIGNAL_LABELS

    checks = []
    if not site_scan:
        checks.append(("No website URL was provided for this org", False, 0))
        return {"score": 0, "checks": checks}

    if not site_scan.get("reachable"):
        checks.append((f"Website could not be reached ({site_scan.get('error') or 'unknown error'})", False, 0))
        return {"score": 0, "checks": checks}

    points = 0
    checks.append(("Website is live and reachable", True, 15))
    points += 15

    sig = site_scan.get("signals", {})
    weight_map = {"donate": 20, "board_staff": 20, "contact": 15, "annual_report": 15, "mission": 15}
    for key, weight in weight_map.items():
        present = sig.get(key, False)
        checks.append((SIGNAL_LABELS[key], present, weight if present else 0))
        points += weight if present else 0

    if site_scan.get("low_content_warning"):
        checks.append(("Site returned very little readable text — may be a JS-only site our scanner can't fully read (worth a manual check)", False, 0))

    year = site_scan.get("footer_year")
    if year and year >= CURRENT_YEAR - 1:
        checks.append((f"Site shows recent-year content ({year})", True, 0))
    elif year:
        checks.append((f"Most recent year visible on site is {year} — may be stale", False, 0))

    return {"score": min(round(points), 100), "checks": checks}


def compute_readiness(org_json, site_scan):
    fin = score_financial_health(org_json)
    comp = score_filing_compliance(org_json)
    dig = score_digital_housekeeping(site_scan)

    overall = (
        fin["score"] * WEIGHTS["financial"]
        + comp["score"] * WEIGHTS["compliance"]
        + dig["score"] * WEIGHTS["digital"]
    )

    if overall >= 80:
        tier = "Grant-Ready"
    elif overall >= 65:
        tier = "Ready with Gaps"
    elif overall >= 40:
        tier = "Needs Work"
    else:
        tier = "Not Ready"

    gaps = []
    for section in (fin, comp, dig):
        for label, passed, _weight in section["checks"]:
            if not passed:
                gaps.append(label)

    return {
        "overall": round(overall, 1),
        "tier": tier,
        "financial": fin,
        "compliance": comp,
        "digital": dig,
        "gaps": gaps,
        "weights": WEIGHTS,
    }
