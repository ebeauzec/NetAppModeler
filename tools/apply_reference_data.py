"""
NetApp Reference Data Consistency Checker
===========================================
Cross-checks js/rackLayouts.js's sourced controller port names (pulled
directly from NetApp's official cabling guides — see
tools/harvest_reference_data.py) against js/compatibility.js's
NETAPP_PLATFORMS[model].ports lists.

If a port name appears in a real, sourced cabling instruction
(rackLayouts.js) but is absent from that platform's port catalog
(compatibility.js), that's a concrete signal the catalog is wrong for that
platform — exactly the class of bug found and fixed for AFF A1K and AFF A900
during the 2026-08-11 harvest (compatibility.js had e2a-e5b for A1K storage;
the real docs say e8a-e11b).

This is a CHECKER, not yet a full auto-regenerator: compatibility.js's
NETAPP_PLATFORMS table mixes hand-authored fields (descriptions, shelf
compatibility notes, license lists) that aren't sourced from these cabling
docs at all, so blindly regenerating the whole platform block would discard
real hand-curated data. Once more platforms are harvested and the schema
stabilizes, this can grow into the auto-apply compiler the project plan
calls for — flagged here as a known next step, not attempted prematurely.

Usage:
  python tools/apply_reference_data.py
Exits non-zero if any discrepancy is found (suitable for a pre-commit check).
"""

import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
RACK_LAYOUTS_PATH = os.path.join(BASE_DIR, "js", "rackLayouts.js")
COMPATIBILITY_PATH = os.path.join(BASE_DIR, "js", "compatibility.js")


def extract_sourced_ports_by_platform(rack_layouts_src):
    """Pull every controllerPort value out of RACK_LAYOUTS' shelfCabling /
    clusterCabling / controllerPorts blocks, grouped by platform model key."""
    result = {}
    # Split into per-platform blocks: '"AFF A400": {' ... up to the matching
    # top-level closing brace before the next '"...": {' at the same indent.
    platform_starts = [
        (m.group(1), m.start())
        for m in re.finditer(r'^\s{2}"([^"]+)":\s*\{', rack_layouts_src, re.MULTILINE)
    ]
    for i, (model, start) in enumerate(platform_starts):
        end = platform_starts[i + 1][1] if i + 1 < len(platform_starts) else len(rack_layouts_src)
        block = rack_layouts_src[start:end]
        ports = set()
        for m in re.finditer(r'controllerPort:\s*"([^"]+)"', block):
            ports.add(m.group(1))
        for m in re.finditer(r'\ba:\s*"([^"]+)",\s*b:\s*"([^"]+)"', block):
            ports.add(m.group(1))
            ports.add(m.group(2))
        if ports:
            result[model] = ports
    return result


def extract_catalog_ports_by_platform(compat_src):
    """Pull the ports: {...} object contents for each NETAPP_PLATFORMS[model]."""
    result = {}
    platform_starts = [
        (m.group(1), m.start())
        for m in re.finditer(r'^\s{2}"([^"]+)":\s*\{', compat_src, re.MULTILINE)
    ]
    for i, (model, start) in enumerate(platform_starts):
        end = platform_starts[i + 1][1] if i + 1 < len(platform_starts) else len(compat_src)
        block = compat_src[start:end]
        ports_match = re.search(r'ports:\s*\{(.*?)\n\s{4}\}', block, re.DOTALL)
        if not ports_match:
            continue
        ports_block = ports_match.group(1)
        ports = set(re.findall(r'"([a-zA-Z0-9]+)"', ports_block))
        result[model] = ports
    return result


def main():
    with open(RACK_LAYOUTS_PATH, "r", encoding="utf-8") as f:
        rack_src = f.read()
    with open(COMPATIBILITY_PATH, "r", encoding="utf-8") as f:
        compat_src = f.read()

    sourced = extract_sourced_ports_by_platform(rack_src)
    catalog = extract_catalog_ports_by_platform(compat_src)

    problems = []
    for model, sourced_ports in sourced.items():
        catalog_ports = catalog.get(model)
        if catalog_ports is None:
            # Platform has sourced cabling data but no compatibility.js entry
            # at all (e.g. "AFF C400" may only exist as a compact profile) —
            # not necessarily wrong, just can't cross-check; note and move on.
            print(f"NOTE  {model}: no matching NETAPP_PLATFORMS entry to cross-check against")
            continue
        missing = sorted(p for p in sourced_ports if p not in catalog_ports)
        if missing:
            problems.append((model, missing))
            print(f"DRIFT {model}: sourced cabling docs reference port(s) {missing} "
                  f"not present in compatibility.js's port catalog")
        else:
            print(f"OK    {model}: all sourced ports present in catalog")

    if problems:
        print(f"\n{len(problems)} platform(s) with port-catalog drift. "
              "Update NETAPP_PLATFORMS[model].ports in js/compatibility.js "
              "to match js/rackLayouts.js's sourced cabling data.")
        return 1
    print("\nNo drift detected.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
