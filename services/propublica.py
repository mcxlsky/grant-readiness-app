"""
Live client for the ProPublica Nonprofit Explorer API.
Docs: https://projects.propublica.org/nonprofits/api/

This is real, free, public data sourced from IRS Form 990 filings and the
IRS Exempt Organizations Business Master File. No API key required.
"""
import requests

BASE = "https://projects.propublica.org/nonprofits/api/v2"
TIMEOUT = 15
HEADERS = {"User-Agent": "GrantReadinessPrototype/0.1 (research/demo use)"}


def search_orgs(query, state=None):
    """Search for organizations by name. Returns the raw ProPublica search payload."""
    params = {"q": query}
    if state:
        params["state[id]"] = state
    resp = requests.get(f"{BASE}/search.json", params=params, headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def get_org(ein):
    """Fetch full org profile + filing history for a given EIN (with or without dashes)."""
    clean_ein = str(ein).replace("-", "").strip()
    resp = requests.get(f"{BASE}/organizations/{clean_ein}.json", headers=HEADERS, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()
