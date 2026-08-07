"""
Live website scanner. Fetches an org's real website (homepage + up to 3
same-domain sub-pages) and looks for the "housekeeping" signals a funder or
grant reviewer would notice: a way to donate, a board/staff/leadership page,
contact info, financial transparency, and a stated mission.

This is real HTTP + HTML parsing against the org's actual site - not mocked.
Limitation (documented, not hidden): this reads server-rendered HTML. Sites
built entirely in client-side JS (React/Vue with no SSR) will show up as
"reachable" but with little extractable text - that itself is logged as a
low-confidence signal rather than silently guessed at.
"""
import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

UA = "Mozilla/5.0 (compatible; GrantReadinessPrototype/0.1; +research/demo use)"
TIMEOUT = 10
MAX_SUBPAGES = 3

SIGNAL_KEYWORDS = {
    "donate": ["donate", "give now", "support us", "make a gift", "ways to give", "donation"],
    "board_staff": ["board of directors", "our board", "leadership", "our team", "staff", "meet the team", "who we are"],
    "contact": ["contact us", "contact", "get in touch"],
    "annual_report": ["annual report", "financials", "form 990", "990", "guidestar", "candid", "charity navigator", "transparency"],
    "mission": ["our mission", "mission statement", "about us", "what we do"],
}

SIGNAL_LABELS = {
    "donate": "Has a clear way to donate or give online",
    "board_staff": "Publishes board, leadership, or staff information",
    "contact": "Has a contact page or visible contact info",
    "annual_report": "Shares financials, an annual report, or 990/transparency info",
    "mission": "States mission or 'about us' clearly",
}


def _fetch(url):
    resp = requests.get(url, headers={"User-Agent": UA}, timeout=TIMEOUT, allow_redirects=True)
    resp.raise_for_status()
    return resp


def _find_link(soup, base_url, keywords, same_domain_netloc):
    for a in soup.find_all("a", href=True):
        label = a.get_text(" ", strip=True).lower()
        if any(kw in label for kw in keywords):
            href = urljoin(base_url, a["href"])
            if urlparse(href).netloc == same_domain_netloc:
                return href
    return None


def scan_website(url, timeout=TIMEOUT):
    result = {
        "url": url,
        "reachable": False,
        "error": None,
        "title": None,
        "meta_description": None,
        "signals": {k: False for k in SIGNAL_KEYWORDS},
        "footer_year": None,
        "word_count": 0,
        "pages_checked": [],
        "low_content_warning": False,
    }
    if not url:
        result["error"] = "no_url_provided"
        return result

    if not url.startswith("http"):
        url = "https://" + url

    try:
        resp = _fetch(url)
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
        return result

    result["reachable"] = True
    result["url"] = resp.url
    same_domain_netloc = urlparse(resp.url).netloc

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(" ", strip=True).lower()
    result["word_count"] = len(text.split())
    result["pages_checked"].append(resp.url)

    title_tag = soup.find("title")
    result["title"] = title_tag.get_text(strip=True) if title_tag else None
    meta = soup.find("meta", attrs={"name": "description"})
    result["meta_description"] = meta["content"].strip() if meta and meta.get("content") else None

    if result["word_count"] < 60:
        result["low_content_warning"] = True  # likely a JS-rendered SPA we can't read server-side

    link_texts = " ".join(a.get_text(" ", strip=True).lower() for a in soup.find_all("a"))
    haystack = text + " " + link_texts
    for signal, keywords in SIGNAL_KEYWORDS.items():
        result["signals"][signal] = any(kw in haystack for kw in keywords)

    years = re.findall(r"(20[1-3][0-9])", text[-1500:])
    if years:
        result["footer_year"] = max(int(y) for y in years)

    # Follow up to MAX_SUBPAGES links to fill in signals not yet confirmed on the homepage
    missing = [k for k, v in result["signals"].items() if not v]
    fetched = 0
    for signal in missing:
        if fetched >= MAX_SUBPAGES:
            break
        link = _find_link(soup, resp.url, SIGNAL_KEYWORDS[signal], same_domain_netloc)
        if not link or link in result["pages_checked"]:
            continue
        try:
            sub_resp = _fetch(link)
        except Exception:
            continue
        fetched += 1
        result["pages_checked"].append(sub_resp.url)
        sub_soup = BeautifulSoup(sub_resp.text, "html.parser")
        sub_text = sub_soup.get_text(" ", strip=True).lower()
        sub_links = " ".join(a.get_text(" ", strip=True).lower() for a in sub_soup.find_all("a"))
        sub_haystack = sub_text + " " + sub_links
        for sig2, kws in SIGNAL_KEYWORDS.items():
            if not result["signals"][sig2] and any(kw in sub_haystack for kw in kws):
                result["signals"][sig2] = True

    return result
