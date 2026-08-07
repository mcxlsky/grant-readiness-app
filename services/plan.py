"""
Turns a computed readiness score directly into a strategic plan - no export,
no copy-paste into a second tool. This is the step that replaces the
consultant's manual Typeform -> Claude workflow.
"""

INTROS = {
    "Grant-Ready": "{name} shows strong fundamentals across financial health, IRS filing compliance, and public-facing transparency. This is a good time to actively pursue funder outreach.",
    "Ready with Gaps": "{name} has a workable foundation but carries specific gaps that should be closed before or alongside outreach — funders and reviewers will notice them.",
    "Needs Work": "{name} is not yet positioned to compete for competitive grants. The priority right now is fixing foundational issues, not funder outreach.",
    "Not Ready": "{name} has significant foundational gaps. Reaching out to funders before addressing these risks burning the relationship before it starts.",
}

NEXT_STEPS = {
    "ready": [
        "Weeks 1-2: Close any quick-fix housekeeping gaps below (website, contact info, board/staff page).",
        "Weeks 2-4: Draft tailored outreach to the funders below, referencing specific program fit.",
        "Ongoing: Track outreach and responses; re-run this assessment quarterly.",
    ],
    "not_ready": [
        "Weeks 1-4: Resolve the foundational gaps below before any funder outreach.",
        "Month 2: Re-run this assessment to confirm readiness before approaching funders.",
        "In parallel: consider a readiness-focused consulting engagement to close gaps faster.",
    ],
}


def generate_plan(org_name, readiness, funders):
    tier = readiness["tier"]
    overall = readiness["overall"]
    gaps = readiness["gaps"]

    lines = []
    lines.append(INTROS[tier].format(name=org_name))
    lines.append("")
    lines.append(f"Overall readiness score: {overall}/100  ({tier})")
    lines.append(
        f"  Financial health: {readiness['financial']['score']}/100   "
        f"Filing compliance: {readiness['compliance']['score']}/100   "
        f"Digital housekeeping: {readiness['digital']['score']}/100"
    )
    lines.append("")
    lines.append("Top priorities, in order:")
    priorities = gaps[:6] if gaps else ["No major gaps detected — maintain current practices."]
    for i, gap in enumerate(priorities, 1):
        lines.append(f"  {i}. {gap}")
    lines.append("")
    lines.append("Suggested next steps:")
    step_key = "ready" if tier in ("Grant-Ready", "Ready with Gaps") else "not_ready"
    for step in NEXT_STEPS[step_key]:
        lines.append(f"  - {step}")
    lines.append("")
    lines.append("Illustrative funder starter list (cause-area match — placeholder for a full funder database):")
    for f in funders:
        lines.append(f"  - {f['name']} — {f['focus']}")

    return "\n".join(lines)
