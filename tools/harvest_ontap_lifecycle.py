"""
NetApp ONTAP Lifecycle & Platform Availability Harvester
===========================================================
Pulls ONTAP release lifecycle facts (GA date, End of Support) and the list
of hardware platforms that have reached End of Availability, from public,
no-login sources — mirroring harvest_reference_data.py's proven technique
(plain urllib + a self-identifying User-Agent + a proxy-aware opener) and
used the same way: a periodic, human/AI-run offline tool. The shipped
standalone_netapp_modeler.html never calls this itself.

Sources (all public, no auth required — confirmed reachable 2026-10-13):
  - https://docs.netapp.com/us-en/ontap/release-notes/release-support-reference.html
    PRIMARY source for GA dates. NetApp's own official "ONTAP 9 release
    support" page — found via the separately-maintained NetApp Reference
    Library (not part of this repo; a curated cross-check, not a
    dependency), which cites it as its own ONTAP-currency check. Confirmed
    2026-10-13 to carry two real HTML tables: a Version/Release-date table
    (month+year precision, 9.9.1 onward — does not cover 9.7/9.8, which
    predate NetApp's current twice-yearly release cadence), and a support-
    level-by-year table whose "Yes" cells resolve to an exact formula:
    Full Support lasts through Year 3 after GA (patch/P-releases and
    vulnerability alerts stop after that), Limited Support (technical
    support, downloads, root-cause analysis, no new patches) continues
    through Year 5, Self-Service (docs access only) is Years 6-8. So:
    End of Full Support = GA + 3 years, End of Limited Support = GA + 5
    years — confirmed to exactly match this project's own already-correct
    rows (9.9.1 through 9.14.1, 9.19.1) and used to catch three wrong GA
    dates (9.15.1, 9.17.1, 9.18.1) on 2026-10-13. This is a first-party
    NetApp source — SECONDARY (endoflife.date, below) wins only when this
    page is unreachable.
  - https://endoflife.date/api/netapp-ontap.json
    SECONDARY/cross-check source. A clean public JSON API (not scraped
    HTML): {cycle, releaseDate, eol, lts} per ONTAP release line — this is
    the site DATA_SOURCES.md has long named as its ONTAP lifecycle source.
    Its "eol" field is a single date with no Full-vs-Limited split, and
    confirmed 2026-10-13 to disagree with NetApp's own page on exactly the
    three rows above — kept only as an independent second opinion to flag
    disagreement with the primary source, never to override it.
  - https://docs.netapp.com/us-en/ontap-systems/endofavail/
    The list of which hardware platforms have reached End of
    Availability (no longer sold, still supported). This index page
    lists PLATFORM NAMES only, not exact EOA/EOS dates — NetApp
    publishes the actual date on each platform's own page, not
    centrally, which would need a much larger per-platform harvest (same
    shape as harvest_reference_data.py's TARGETS list) to automate.
    Treat this list as an "is this platform EOA at all" signal.

Deliberately NOT sourced here: ONTAP P-release/patch numbers (e.g. the
latest patch on the 9.17.1 line). NetApp's only listing of those is
mysupport.netapp.com's software-downloads page, confirmed 2026-10-13 to
be a client-side-rendered app that returns only a loading-spinner shell
to a plain fetch — it requires an authenticated NetApp support login to
see real data. This tool stays 100% no-login by design, the same reason
hwu.netapp.com was never scraped for cabling data either (see
DATA_SOURCES.md) — patch-level freshness stays a manual update.

Usage:
  python tools/harvest_ontap_lifecycle.py
"""

import json
import os
import re
import urllib.error
import urllib.request
from datetime import datetime
from html.parser import HTMLParser

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
OUT_PATH = os.path.join(BASE_DIR, "data", "ontap_lifecycle_raw.json")

UA = "NetAppModeler-DataRefresh/1.0 (offline reference-data tool; public data only)"

RELEASE_SUPPORT_URL = "https://docs.netapp.com/us-en/ontap/release-notes/release-support-reference.html"
ENDOFLIFE_URL = "https://endoflife.date/api/netapp-ontap.json"
EOA_INDEX_URL = "https://docs.netapp.com/us-en/ontap-systems/endofavail/"

MONTH_NUM = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}

# Every "<Family> <Model>"-shaped platform name this app's catalog might need
# to recognize on the EOA index page — see js/compatibility.js's
# NETAPP_PLATFORMS keys. Matched case-insensitively as a whole word within
# the page's stripped text; a platform not in this list simply won't be
# looked for, even if NetApp's page happens to mention it.
KNOWN_PLATFORM_NAMES = [
    "AFF A1K", "AFF A90", "AFF A70", "AFF A900", "AFF A800", "AFF A50", "AFF A400",
    "AFF A30", "AFF A20", "AFF A300", "AFF A250", "AFF A220", "AFF A150", "AFF A200",
    "AFF A700", "AFF A700s", "AFF C80", "AFF C800", "AFF C400", "AFF C250", "AFF C30",
    "AFF C60", "AFF C190", "ASA A1K", "ASA A90", "ASA A70", "ASA A50", "ASA A30",
    "ASA A20", "ASA A800", "ASA A400", "ASA A900", "ASA A150", "ASA A250", "ASA C30",
    "ASA C800", "ASA C400", "ASA C250", "FAS500f", "FAS9500", "FAS9000", "FAS8700",
    "FAS8300", "FAS8200", "FAS2820", "FAS2850", "FAS2880", "FAS2720", "FAS2750",
    "FAS2650", "FAS2620", "FAS2520", "FAS90", "FAS70", "FAS50", "FAS8080", "FAS8060",
    "FAS8040", "FAS8020", "FAS2554", "FAS2552",
]


def build_opener():
    proxies = urllib.request.getproxies()
    handlers = [urllib.request.ProxyHandler(proxies or {})]
    return urllib.request.build_opener(*handlers)


class TextStripper(HTMLParser):
    """Strips HTML tags/scripts/styles, keeps readable text content."""
    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self._skip = True

    def handle_endtag(self, tag):
        if tag in ("script", "style"):
            self._skip = False

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)


def fetch(opener, url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with opener.open(req, timeout=20) as r:
        return r.read().decode("utf-8", errors="replace")


def fetch_text(opener, url):
    html = fetch(opener, url)
    stripper = TextStripper()
    stripper.feed(html)
    return re.sub(r"\s+", " ", "".join(stripper.parts)).strip()


def _html_tables(html):
    """Minimal <table>/<tr>/<td|th> extractor — good enough for NetApp's plain,
    unstyled documentation tables; not a general HTML parser."""
    tables = re.findall(r'<table.*?</table>', html, re.DOTALL)
    out = []
    for t in tables:
        rows = []
        for r in re.findall(r'<tr.*?</tr>', t, re.DOTALL):
            cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.DOTALL)
            rows.append([re.sub(r'<[^>]+>', '', c).strip() for c in cells])
        out.append(rows)
    return out


def add_years(year_month, years):
    """'2025-09' + 3 -> '2028-09'."""
    y, m = (int(x) for x in year_month.split('-'))
    return f"{y + years:04d}-{m:02d}"


def harvest_release_support_reference(opener):
    """Returns (status, {cycle: {ga: 'YYYY-MM', endFull: 'YYYY-MM', endLimited:
    'YYYY-MM'}}) parsed from NetApp's own official GA-date table, with End
    Full/Limited Support derived via the GA+3y/GA+5y formula confirmed against
    this page's own support-level-by-year table (see module docstring)."""
    try:
        html = fetch(opener, RELEASE_SUPPORT_URL)
    except urllib.error.HTTPError as e:
        return f"http_error_{e.code}", None
    except Exception as e:
        return f"error: {type(e).__name__}: {e}", None

    tables = _html_tables(html)
    version_table = next((t for t in tables if t and t[0][:2] == ["Version", "Release date"]), None)
    if not version_table:
        return "error: version/release-date table not found on page (page structure may have changed)", None

    result = {}
    date_re = re.compile(r'^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$', re.IGNORECASE)
    for row in version_table[1:]:
        if len(row) < 2:
            continue
        cycle, release_date = row[0].strip(), row[1].strip()
        m = date_re.match(release_date)
        if not re.match(r'^\d+(\.\d+)*$', cycle) or not m:
            continue  # skips the trailing prose row ("If you are running...")
        ga = f"{int(m.group(2)):04d}-{MONTH_NUM[m.group(1).lower()]:02d}"
        result[cycle] = {"ga": ga, "endFull": add_years(ga, 3), "endLimited": add_years(ga, 5)}

    if not result:
        return "error: no version rows parsed", None
    return "ok", result


def harvest_ontap_versions(opener):
    """Returns (status, data) — data is the raw list of {cycle, releaseDate,
    eol, lts} dicts from endoflife.date, newest-first as the API returns it."""
    try:
        raw = fetch(opener, ENDOFLIFE_URL)
        data = json.loads(raw)
        if not isinstance(data, list) or not data:
            return "error: unexpected response shape", None
        return "ok", data
    except urllib.error.HTTPError as e:
        return f"http_error_{e.code}", None
    except Exception as e:
        return f"error: {type(e).__name__}: {e}", None


def harvest_eoa_platforms(opener):
    """Returns (status, list_of_platform_names) found mentioned on NetApp's
    EOA index page, restricted to names this app's catalog actually uses."""
    try:
        text = fetch_text(opener, EOA_INDEX_URL)
    except urllib.error.HTTPError as e:
        return f"http_error_{e.code}", None
    except Exception as e:
        return f"error: {type(e).__name__}: {e}", None

    # Word-boundary regex, not a plain substring check: "AFF A90" is a textual
    # prefix of "AFF A900", so a naive `name in text` test would wrongly treat
    # a page that only mentions "AFF A900" as also mentioning "AFF A90" — same
    # shadowing bug class fixed in js/parser.js's model-detection this session.
    # `\b` after a trailing digit correctly fails to match mid-number (no
    # word/non-word transition between two digits), so "AFF A900" does NOT
    # satisfy `\bAFF A90\b`.
    found = [
        name for name in KNOWN_PLATFORM_NAMES
        if re.search(r'\b' + re.escape(name) + r'\b', text, re.IGNORECASE)
    ]
    return "ok", found


def harvest():
    opener = build_opener()
    fetched_at = datetime.now().isoformat()

    rsr_status, rsr_versions = harvest_release_support_reference(opener)
    print(f"ONTAP lifecycle (NetApp's own release-support-reference.html, PRIMARY): {rsr_status}"
          + (f" — {len(rsr_versions)} release lines" if rsr_versions else ""))

    ontap_status, ontap_versions = harvest_ontap_versions(opener)
    print(f"ONTAP lifecycle (endoflife.date, secondary cross-check): {ontap_status}"
          + (f" — {len(ontap_versions)} release lines" if ontap_versions else ""))

    eoa_status, eoa_platforms = harvest_eoa_platforms(opener)
    print(f"Platform EOA index (docs.netapp.com): {eoa_status}"
          + (f" — {len(eoa_platforms)} known platforms listed as EOA" if eoa_platforms else ""))

    result = {
        "fetchedAt": fetched_at,
        "releaseSupportReference": {
            "status": rsr_status,
            "source": RELEASE_SUPPORT_URL,
            "note": "PRIMARY source. GA date direct from NetApp's own table; "
                    "endFull/endLimited derived via GA+3y/GA+5y, confirmed against "
                    "this same page's support-level-by-year table.",
            "data": rsr_versions,
        },
        "ontapVersions": {
            "status": ontap_status,
            "source": ENDOFLIFE_URL,
            "note": "SECONDARY cross-check only — defer to releaseSupportReference "
                    "above when the two disagree (see module docstring).",
            "data": ontap_versions,
        },
        "eoaPlatforms": {
            "status": eoa_status,
            "source": EOA_INDEX_URL,
            "note": "Platform NAMES only — NetApp's index page doesn't carry exact "
                    "EOA/EOS dates centrally; those live on each platform's own doc "
                    "page, not harvested here.",
            "data": eoa_platforms,
        },
        "notAutomated": {
            "ontapPatchReleases": "NetApp's only public listing of per-branch latest "
                "patch/P-release numbers is mysupport.netapp.com's downloads page, "
                "which is a client-side-rendered app requiring an authenticated "
                "NetApp support login (confirmed: a plain fetch returns only a "
                "loading-spinner shell, no data). Stays a manual update — see "
                "DATA_SOURCES.md's Update Procedure.",
        },
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(result, f, indent=2)
    print(f"\nWritten to {OUT_PATH}")
    return result


if __name__ == "__main__":
    harvest()
