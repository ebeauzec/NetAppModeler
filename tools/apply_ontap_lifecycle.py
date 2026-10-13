"""
NetApp ONTAP Lifecycle & Platform Availability Consistency Checker
=======================================================================
Cross-checks data/ontap_lifecycle_raw.json (see harvest_ontap_lifecycle.py)
against js/compatibility.js's ONTAP_LIFECYCLE table and DATA_SOURCES.md's
Platform Registry, the same way apply_reference_data.py cross-checks
sourced cabling data against the port catalog.

Reports only — never writes to compatibility.js or DATA_SOURCES.md. Applying
a fix stays a deliberate hand-edit, same philosophy as the cabling checker.

Usage:
  python tools/apply_ontap_lifecycle.py
Exits non-zero if any discrepancy is found (suitable for a pre-commit check).
"""

import json
import os
import re
import sys
from datetime import date

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
RAW_DATA_PATH = os.path.join(BASE_DIR, "data", "ontap_lifecycle_raw.json")
COMPATIBILITY_PATH = os.path.join(BASE_DIR, "js", "compatibility.js")
DATA_SOURCES_PATH = os.path.join(BASE_DIR, "DATA_SOURCES.md")

# A version cycle this old genuinely has no entry in ONTAP_LIFECYCLE (the app's
# own supportability floor starts at 9.7) — comparing against it would just be
# noise, not an actionable finding.
OLDEST_TRACKED_CYCLE = "9.7"


def month_of(iso_date_str):
    """'2026-07-01' -> '2026-07'. Returns None if unparseable."""
    if not iso_date_str or not re.match(r'^\d{4}-\d{2}', iso_date_str):
        return None
    return iso_date_str[:7]


def extract_lifecycle_from_compat_js(src):
    """Pulls {version: {releaseDate, endDate}} out of ONTAP_LIFECYCLE's object
    literal via regex (good enough for this flat, single-line-per-entry table;
    not a general JS parser)."""
    block_match = re.search(r'export const ONTAP_LIFECYCLE\s*=\s*\{(.*?)\n\};', src, re.DOTALL)
    if not block_match:
        return {}
    block = block_match.group(1)
    result = {}
    row_re = re.compile(
        r'"(?P<ver>[\d.]+)":\s*\{\s*status:\s*"[^"]*",\s*releaseDate:\s*"(?P<rd>[\d-]+)",\s*endDate:\s*"(?P<ed>[\d-]+)"'
    )
    for m in row_re.finditer(block):
        result[m.group('ver')] = {"releaseDate": m.group('rd'), "endDate": m.group('ed')}
    return result


def extract_active_platforms_from_data_sources(src):
    """Pulls platform rows marked plain 'ACTIVE' with no EOA/EOS note already
    present, from DATA_SOURCES.md's Platform Registry tables. A crude but
    sufficient heuristic: a markdown table row whose Status cell is exactly
    "ACTIVE" (no "EOS"/"EOA"/parenthetical lapsed note alongside it)."""
    result = set()
    for line in src.splitlines():
        m = re.match(r'^\|\s*([A-Za-z0-9 /]+?)\s*\|.*\|\s*(ACTIVE)\s*\|', line)
        if m:
            result.add(m.group(1).strip())
    return result


def cycle_at_least(cycle, floor):
    """Best-effort version comparison for ONTAP cycle strings like '9.14.1'."""
    def parts(v):
        return [int(x) for x in v.split('.')]
    a, b = parts(cycle), parts(floor)
    return a >= b + [0] * (len(a) - len(b)) if len(a) >= len(b) else a + [0] * (len(b) - len(a)) >= b


def compute_findings(raw, compat_src, data_sources_src, log=lambda s: None):
    """Returns a list of {type, message} problem dicts. `log` is called with
    "OK ..." lines for each clean check, so a CLI caller can print progress
    while a server caller can ignore it. Shared by main() below and
    tools/update_server.py's /check-ontap-updates route."""
    catalog_lifecycle = extract_lifecycle_from_compat_js(compat_src)
    active_platforms = extract_active_platforms_from_data_sources(data_sources_src)
    problems = []

    # --- 1. ONTAP version GA / End-Full / End-Limited dates ---
    # Primary: NetApp's own release-support-reference.html (GA date + the exact
    # GA+3y/GA+5y formula, confirmed against this project's own already-correct
    # rows — see harvest_ontap_lifecycle.py's module docstring). Secondary:
    # endoflife.date, consulted only to flag when it disagrees with the primary
    # source — never used to override it.
    rsr_block = raw.get("releaseSupportReference", {})
    secondary_by_cycle = {e["cycle"]: e for e in (raw.get("ontapVersions", {}).get("data") or []) if e.get("cycle")}

    if rsr_block.get("status") != "ok" or not rsr_block.get("data"):
        log(f"SKIP  ONTAP version check — primary-source harvest status was "
            f"'{rsr_block.get('status')}', not 'ok'")
    else:
        for cycle, entry in rsr_block["data"].items():
            if not cycle_at_least(cycle, OLDEST_TRACKED_CYCLE):
                continue
            catalog_entry = catalog_lifecycle.get(cycle)
            if catalog_entry is None:
                problems.append({"type": "new_release", "message":
                    f"ONTAP {cycle} is listed on NetApp's own release-support-reference.html "
                    f"(GA {entry['ga']}) but has no entry in compatibility.js's "
                    f"ONTAP_LIFECYCLE at all."})
                continue
            src_ga, src_end_full = entry["ga"], entry["endFull"]
            cat_ga, cat_end = catalog_entry["releaseDate"], catalog_entry["endDate"]
            if src_ga != cat_ga:
                problems.append({"type": "drift", "message":
                    f"ONTAP {cycle} releaseDate: catalog has '{cat_ga}', NetApp's own "
                    f"release-support-reference.html has '{src_ga}'"})
            if src_end_full != cat_end:
                problems.append({"type": "drift", "message":
                    f"ONTAP {cycle} endDate (End of Full Support): catalog has '{cat_end}', "
                    f"NetApp's own page + GA+3y formula gives '{src_end_full}'"})

            secondary_note = ""
            sec = secondary_by_cycle.get(cycle)
            if sec:
                sec_ga = month_of(sec.get("releaseDate"))
                if sec_ga and sec_ga != src_ga:
                    secondary_note = f" [endoflife.date disagrees: GA {sec_ga}]"
            log(f"OK    ONTAP {cycle}: GA {cat_ga}, End Full Support {cat_end}, "
                f"End Limited Support {entry['endLimited']} (not separately tracked in "
                f"compatibility.js — see DATA_SOURCES.md for that column){secondary_note}")

    # --- 2. Platform EOA status ---
    eoa_block = raw.get("eoaPlatforms", {})
    if eoa_block.get("status") != "ok" or eoa_block.get("data") is None:
        log(f"SKIP  Platform EOA check — harvest status was '{eoa_block.get('status')}', not 'ok'")
    else:
        for platform in eoa_block["data"]:
            if platform in active_platforms:
                problems.append({"type": "eoa_not_noted", "message":
                    f"{platform} is on NetApp's End-of-Availability index page, but "
                    f"DATA_SOURCES.md's Platform Registry still shows it as plain "
                    f"'ACTIVE' with no EOA/EOS note."})
            else:
                log(f"OK    {platform}: EOA on NetApp's page, already noted (or not tracked "
                    f"as plain ACTIVE) in DATA_SOURCES.md")

    return problems


def main():
    if not os.path.exists(RAW_DATA_PATH):
        print(f"No harvested data at {RAW_DATA_PATH} — run "
              f"`python tools/harvest_ontap_lifecycle.py` first.")
        return 1

    with open(RAW_DATA_PATH, "r", encoding="utf-8") as f:
        raw = json.load(f)
    with open(COMPATIBILITY_PATH, "r", encoding="utf-8") as f:
        compat_src = f.read()
    with open(DATA_SOURCES_PATH, "r", encoding="utf-8") as f:
        data_sources_src = f.read()

    problems = compute_findings(raw, compat_src, data_sources_src, log=print)

    print()
    if problems:
        print(f"{len(problems)} discrepanc{'y' if len(problems) == 1 else 'ies'} found:\n")
        for p in problems:
            print(f"  - {p['type'].upper().replace('_', ' ')}  {p['message']}")
        print(f"\nNothing was changed automatically. Review against the sources above and "
              f"hand-edit js/compatibility.js / DATA_SOURCES.md if a finding is confirmed "
              f"real (endoflife.date and NetApp's own index page are both independently-run "
              f"trackers — cross-check before trusting either blindly over the other).")
        return 1
    print("No drift detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
