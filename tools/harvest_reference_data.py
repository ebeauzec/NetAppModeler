"""
NetApp Reference Data Harvester
================================
Pulls official cabling/port-layout facts from NetApp's public documentation
(docs.netapp.com) for the platforms this app models, and saves the raw
extracted text — with source URL + fetch date — to data/netapp_docs_raw/.

This is a periodic, human/AI-run offline tool, NOT something the shipped
standalone_netapp_modeler.html calls at runtime. The app stays 100%
client-side/offline; only this refresh step touches the network.

Fetch technique (proven working against docs.netapp.com/kb.netapp.com from
this machine — see AIQscraper's server.py _enrich_fetch for the original):
plain urllib.request with a self-identifying User-Agent and a proxy-aware
opener (reads OS/env proxy settings so it also works on corporate networks).

Usage:
  python tools/harvest_reference_data.py
"""

import json
import os
import re
import urllib.request
import urllib.error
from datetime import date, datetime
from html.parser import HTMLParser

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
OUT_DIR = os.path.join(BASE_DIR, "data", "netapp_docs_raw")
MANIFEST_PATH = os.path.join(BASE_DIR, "data", "netapp_docs_manifest.json")

UA = "NetAppModeler-DataRefresh/1.0 (offline reference-data tool; public data only)"

# Target pages: (id, url, what it's for). All under docs.netapp.com's public,
# unauthenticated Install & Maintain doc set — no login required.
TARGETS = [
    ("a400-cable", "https://docs.netapp.com/us-en/ontap-systems/a400/install-detailed-guide.html",
     "AFF A400 controller cabling (cluster/HA, host network, mgmt, shelf options)"),
    ("a800-cable", "https://docs.netapp.com/us-en/ontap-systems/a800/install-detailed-guide.html",
     "AFF A800 controller cabling"),
    ("a900-cable", "https://docs.netapp.com/us-en/ontap-systems/a900/install-detailed-guide.html",
     "AFF A900 controller cabling"),
    ("a1k-cable", "https://docs.netapp.com/us-en/ontap-systems/a1k/install-cable.html",
     "AFF A1K controller cabling (cluster/HA, host network, mgmt, shelf options)"),
    ("a1k-overview", "https://docs.netapp.com/us-en/ontap-systems/a1k/overview.html",
     "AFF A1K chassis/port overview"),
    ("ns224-overview", "https://docs.netapp.com/us-en/ontap-systems/ns224/ns224-shelf-overview.html",
     "NS224 shelf overview (NSM module layout, IDs)"),
    ("ns224-to-a400", "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a400-c400.html",
     "NS224-to-AFF A400/C400 exact cable-endpoint mapping"),
    ("ns224-to-a800", "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a800-c800.html",
     "NS224-to-AFF A800/C800 exact cable-endpoint mapping"),
    ("ns224-to-a900", "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a900.html",
     "NS224-to-AFF A900 exact cable-endpoint mapping"),
    ("ns224-to-a1k", "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a1k.html",
     "NS224-to-AFF A1K exact cable-endpoint mapping"),

    # --- Tier 1: current-gen AFF/ASA lineup (PLATFORM_COVERAGE.md) ---
    ("a70-90-cable", "https://docs.netapp.com/us-en/ontap-systems/a70-90/install-cable.html",
     "AFF A90/A70 controller cabling (shared guide)"),
    ("a20-30-50-cable", "https://docs.netapp.com/us-en/ontap-systems/a20-30-50/install-cable.html",
     "AFF A50/A30/A20 controller cabling (shared guide)"),
    ("c80-cable", "https://docs.netapp.com/us-en/ontap-systems/c80/install-cable.html",
     "AFF C80 controller cabling"),
    ("c30-60-cable", "https://docs.netapp.com/us-en/ontap-systems/c30-60/install-cable.html",
     "AFF C60/C30 controller cabling (shared guide)"),
    ("asac250-guide", "https://docs.netapp.com/us-en/ontap-systems/asa-c250/install-detailed-guide.html",
     "ASA C250 controller cabling"),
    ("asac400-guide", "https://docs.netapp.com/us-en/ontap-systems/asa-c400/install-detailed-guide.html",
     "ASA C400 controller cabling"),
    ("asac800-guide", "https://docs.netapp.com/us-en/ontap-systems/asa-c800/install-detailed-guide.html",
     "ASA C800 controller cabling"),
    ("asa900-guide", "https://docs.netapp.com/us-en/ontap-systems/asa900/install_detailed_guide.html",
     "ASA A900 controller cabling"),
    ("asa800-guide", "https://docs.netapp.com/us-en/ontap-systems/asa800/install-detailed-guide.html",
     "ASA A800 controller cabling"),
    ("asa400-guide", "https://docs.netapp.com/us-en/ontap-systems/asa400/install-detailed-guide.html",
     "ASA A400 controller cabling"),

    # --- Tier 2: recent/common legacy ---
    ("a300-setup", "https://docs.netapp.com/us-en/ontap-systems/a300/install-setup.html",
     "AFF A300 install/cabling summary"),
    ("fas9500-guide", "https://docs.netapp.com/us-en/ontap-systems/fas9500/install-detailed-guide.html",
     "FAS9500 controller cabling"),
    ("fas9000-guide", "https://docs.netapp.com/us-en/ontap-systems/fas9000/install-detailed-guide.html",
     "FAS9000 controller cabling"),
    ("fas8300-guide", "https://docs.netapp.com/us-en/ontap-systems/fas8300/install-detailed-guide.html",
     "FAS8300 controller cabling"),
    ("fas8200-setup", "https://docs.netapp.com/us-en/ontap-systems/fas8200/install-setup.html",
     "FAS8200 install/cabling summary"),
    ("fas-70-90-cable", "https://docs.netapp.com/us-en/ontap-systems/fas-70-90/install-cable.html",
     "FAS90/FAS70 controller cabling (shared guide)"),
    ("fas50-cable", "https://docs.netapp.com/us-en/ontap-systems/fas50/install-cable.html",
     "FAS50 controller cabling"),

    # NOTE: a hyphenated-slug "-cable.html" probe (2026-08-12) was also tried for
    # ASA A1K/A70-90/A20-30-50/A400/A800/A900 and AFF A250/A220/A150/C250/C190 —
    # all 11 also returned a hard 404. Combined with the round-1 probe below,
    # these platforms (plus ASA C250/C400/C800) have now been checked against
    # every URL pattern that's worked for any other platform in this file, with
    # no hits. Not worth re-probing without a genuinely different technique
    # (Hardware Universe scraping) — see PLATFORM_COVERAGE.md.

    # NOTE: an "install-cable.html" text-variant probe was tried for ASA
    # C250/C400/C800/A900/A800/A400, FAS8300/FAS8200/FAS9000/FAS9500, AFF A300,
    # and AFF A700 on 2026-08-12 — all 12 returned a hard HTTP 404 (not a soft
    # 200 "article not available" page like some other platforms give). NetApp
    # genuinely does not publish that page for these platforms; only the
    # image-only "-guide"/"-setup" pages above exist. Not worth re-probing
    # unless NetApp restructures these docs — see PLATFORM_COVERAGE.md.

    # --- Tier 3: legacy/EOL ---
    ("a700-guide", "https://docs.netapp.com/us-en/ontap-systems/a700/install-detailed-guide.html",
     "AFF A700 controller cabling"),
    ("a700s-setup", "https://docs.netapp.com/us-en/ontap-systems/a700s/install-setup.html",
     "AFF A700s install/cabling summary"),
    ("fas2700-guide", "https://docs.netapp.com/us-en/ontap-systems/fas2700/install-detailed-guide.html",
     "FAS2720/FAS2750 controller cabling"),
    ("fas2800-guide", "https://docs.netapp.com/us-en/ontap-systems/fas2800/install-detailed-guide.html",
     "FAS2820 controller cabling"),
    ("fas2600-setup", "https://docs.netapp.com/us-en/ontap-systems/fas2600/install-setup.html",
     "FAS2650/FAS2620 install/cabling summary"),

    # NOTE (2026-08-12): probed "-cable.html" for FAS2700/FAS2800/FAS2600 and
    # "-detailed-guide.html" for FAS8080/8060/8040/8020, FAS2554/2552/2520 —
    # every single one 404'd, including platforms that had never been fetched
    # in ANY form before. Unlike the Tier 1/2 dead ends above (page exists as
    # an image-only guide, just not the text-cabling variant), these Tier 3
    # legacy/EOL platforms have no docs.netapp.com presence at all under this
    # URL scheme — NetApp appears to have stopped publishing (or archived
    # elsewhere, e.g. a login-gated legacy docs system) install docs for
    # controllers this old. Not worth further URL guessing.
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


def fetch_text(opener, url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with opener.open(req, timeout=20) as r:
        html = r.read().decode("utf-8", errors="replace")
    stripper = TextStripper()
    stripper.feed(html)
    text = re.sub(r"\s+", " ", "".join(stripper.parts)).strip()
    return text


def harvest():
    os.makedirs(OUT_DIR, exist_ok=True)
    opener = build_opener()
    manifest = {"fetchedAt": datetime.now().isoformat(), "pages": []}

    for page_id, url, description in TARGETS:
        entry = {"id": page_id, "url": url, "description": description}
        try:
            text = fetch_text(opener, url)
            out_path = os.path.join(OUT_DIR, f"{page_id}.txt")
            with open(out_path, "w", encoding="utf-8") as f:
                f.write(text)
            entry["status"] = "ok"
            entry["chars"] = len(text)
            entry["file"] = os.path.relpath(out_path, BASE_DIR).replace("\\", "/")
            print(f"OK   {page_id:20s} {len(text):6d} chars  {url}")
        except urllib.error.HTTPError as e:
            entry["status"] = f"http_error_{e.code}"
            print(f"FAIL {page_id:20s} HTTP {e.code}  {url}")
        except Exception as e:
            entry["status"] = f"error: {e}"
            print(f"FAIL {page_id:20s} {type(e).__name__}: {e}  {url}")
        manifest["pages"].append(entry)

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"\nManifest written to {MANIFEST_PATH}")


if __name__ == "__main__":
    harvest()
