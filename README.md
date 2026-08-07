# Grant Readiness & Prospecting — Working Prototype

A real, running version of the product from the PRD: search a nonprofit,
pull its live IRS filing data, scan its actual website, get a scored
readiness assessment and a generated strategic plan — with no copy-paste
between tools.

## What's real vs. placeholder

**Real, live data:**
- Organization search and financial/filing history — pulled live from the
  [ProPublica Nonprofit Explorer API](https://projects.propublica.org/nonprofits/api/)
  (sourced from actual IRS Form 990 filings, free, no API key needed).
- Website housekeeping scan — a real HTTP fetch and HTML parse of the org's
  actual website (homepage + up to 3 relevant sub-pages), checking for a
  donate path, board/staff info, contact info, financial transparency, and
  mission clarity.
- Readiness scoring — a genuine rubric (see `services/scoring.py`) across
  financial health, filing compliance, and digital housekeeping, weighted
  40% toward the website signals since that's the fastest thing an org can
  fix and the thing 990-only tools miss.
- Strategic plan generation — built directly from the score and detected
  gaps, in the same request. No Typeform, no manual copy-paste.

**Placeholder, clearly labeled in the UI:**
- The funder shortlist is a small, hand-picked list of ~10 well-known
  national funders tagged by cause area (`services/funders.py`). It stands
  in for the real funder database this product would need — that requires
  either a licensed data source (e.g. Candid's API) or building an original
  dataset from 990-PF grant disclosures. This prototype demonstrates the
  matching *mechanic*, not a production-grade funder index.

## Known limitations (by design, for a first prototype)

- The website scanner reads server-rendered HTML. Sites built entirely in
  client-side JavaScript (no server-side rendering) will show as
  "reachable" but with little extractable text — the app flags this
  explicitly rather than guessing.
- 990-N e-Postcard filers (orgs under ~$50K revenue) don't disclose
  detailed financials to the IRS, so the Financial Health score is
  necessarily thinner for very small orgs. This is a real constraint of
  public data, not a bug.
- No CRM sync, no auth, no persistence — this is the diagnostic engine at
  the center of the product, not the full app from the PRD.

## Running it

```bash
cd grant_readiness_app
pip install -r requirements.txt
python app.py
```

Then open **http://127.0.0.1:5050** in a browser.

Try searching for an organization you know, or test with these two (used
during development, real EINs):
- **Teach For America** (EIN 13-3541913) — large, established org; shows
  what a strong score looks like.
- **Sisters Community Garden, Sisters OR** (EIN 46-5750038) — a tiny org
  that only files a 990-N; shows how the tool handles thin public data and
  still surfaces useful housekeeping gaps from the live website scan.

## Project layout

```
app.py                     Flask routes (search, analyze)
services/propublica.py     Live ProPublica API client
services/website_scan.py   Live website fetch + signal detection
services/scoring.py        Readiness scoring rubric
services/funders.py        Placeholder funder shortlist
services/plan.py           Strategic plan generator
templates/                 UI (Jinja + plain CSS, no JS framework)
```
