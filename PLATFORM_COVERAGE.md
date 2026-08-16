# Platform Cabling-Data Coverage Tracker

> Tracks which platforms in `js/compatibility.js`'s `NETAPP_PLATFORMS` have
> had their port catalog cross-checked against NetApp's official sourced
> cabling docs (`js/rackLayouts.js`, harvested via
> `tools/harvest_reference_data.py`). This is the standing, multi-session
> plan for extending that same harvest-and-correct methodology to the rest
> of the catalog — see `DATA_SOURCES.md` for how the sourcing/tooling works.
>
> **Process for adding a platform:** find its `install-detailed-guide.html`
> / `install-cable.html` and shelf hot-add page(s) on `docs.netapp.com` (use
> `tools/harvest_reference_data.py`'s `TARGETS` list as a template — add
> entries, run it), read the harvested text in `data/netapp_docs_raw/`,
> add a `RACK_LAYOUTS[model]` entry to `js/rackLayouts.js` with real cable
> endpoints, then run `python tools/apply_reference_data.py` to check the
> existing `ports` catalog against it and fix any drift found. Run
> `python tests/run_tests.py` before committing.

## Done (2026-08-11 – 2026-08-12)

| Platform | Port catalog | Cabling endpoints |
|---|---|---|
| AFF A400 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF C400 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF A800 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF C800 | ✅ corrected | ✅ sourced (1 shelf) |
| AFF A900 | ✅ corrected | ✅ sourced (1-4 shelves) |
| AFF A1K | ✅ corrected | ✅ sourced (1-4 shelves) |
| AFF A70 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF A90 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF C80 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF A50 | ✅ corrected | ✅ sourced (1 shelf) |
| AFF A30 | ✅ corrected | ✅ sourced (1 shelf) |
| AFF A20 | ✅ corrected | ✅ sourced (1 shelf) |
| AFF C60 | ✅ corrected | ✅ sourced (1 shelf) |
| AFF C30 | ✅ corrected | ✅ sourced (1 shelf) |
| FAS90 | ✅ corrected | ✅ sourced (1-2 shelves) |
| FAS70 | ✅ corrected | ✅ sourced (1-2 shelves) |

All 16 pass `tools/apply_reference_data.py` with no drift.

**FAS50** has a real sourced `install-cable.html` too, for DS460C (SAS)
shelf cabling, not NS224 — FAS50 doesn't support NS224 at all (matches the
existing `compatibility.js` flag). The specific real endpoints
(`controller port 3a/3d` ↔ `shelf IOM A/B port 1/3`, mini-SAS HD, daisy-
chainable across two shelves) aren't captured as a `getShelfCabling()`
sourced-data entry in `js/rackLayouts.js` — that would need a schema
extension to represent inter-shelf daisy-chain links, which the current
`{shelfIOM, shelfPort, controllerSide, controllerPort}` shape (point-to-
point only, no shelf-to-shelf) doesn't support. Not done; the 2-shelf
daisy-chain case specifically would need this.

However, investigating this surfaced and fixed a bigger, more consequential
bug in the SAME renderer (2026-08-13): the non-MetroCluster SAS shelf
cabling view (`js/ui.js`, `drawCablingTopology`'s "Draw Shelves for this HA
pair" block) wired each controller to only ONE IOM module (Controller A ->
IOM-A only, Controller B -> IOM-B only) for every SAS shelf type (DS460C,
DS224C, DS2246, DS212C) on every non-MCC platform — not a real multipath-HA
topology, since a single controller failure would make its exclusive IOM
module unreachable. Confirmed against FAS50's own sourced doc ("Cable
controller A port 3d to IOMB port 3. Cable controller B port 3d to IOMA
port 3.") that real cabling crosses each controller's redundant port to the
OTHER IOM module. Fixed the return-path cable assignment to cross
controllers, verified by reading actual rendered SVG path endpoints, pinned
with 2 new regression tests. This fix applies to every SAS-shelf platform
using this view, not just FAS50.

Validated broadly (2026-08-13) across the dimensions this logic actually
depends on (it's platform/shelf-model-agnostic — only `isNS224Shelf` is
model-based anywhere in this function, and that's a different branch):
port-count exhaustion up to 49 shelves/13 stacks (FAS50, 2→50000TB) with no
off-by-one errors; multi-HA-pair (4-node, round-robin stack distribution
across pairs) with independent correct crossing per pair; and cross-checked
against `generateCablingTableHtml` (the textual cabling report), which
already encoded the correct crossed topology before this fix — confirming
the SVG diagram was the one that was wrong, not the underlying model.
`drawCablingTopology` is a single shared function called from all 5 places
shelf diagrams render (live dashboard, shelf-add preview, both Before/After
comparison panels), so one fix covers all of them.

**Left unverified, not touched:** the MetroCluster+SAS-shelves branch (a
narrower combination — SAS shelves under MCC) has two cases. 2-node MCC
(1 controller/site) is structurally correct as-is — there's no second local
controller to cross to. 4-node MCC (2 controllers/site) uses a different,
simpler redundancy model (shelf stacks distributed round-robin across the
two local controllers, each stack still gets full IOM-A/IOM-B redundancy
from its assigned controller) rather than crossing each stack between both
local controllers. Confirmed it renders without error, but there's no
sourced NetApp doc for this specific combination to verify which model is
actually correct — left as-is rather than guessing.

**Note on A70/A90/C80 vs A50/A30/A20/C60/C30:** the former three share one
port scheme (cluster e1a+e7a, host e9a/e9b, NS224 storage on PCIe slots
8/11 — the same scheme AFF A1K uses); the latter five share a different one
(cluster e2a+e4a on the two-I/O-module SKU, host e2b/e4b, storage e3a/e3b).
AFF A20 only ships the one-I/O-module SKU, so its cluster ports are e4a/e4b
instead. For A50/A30/C60/C30, only a single-NS224-shelf cabling procedure
is published — a second-shelf port assignment was not found in NetApp's
docs for this family and is not modeled (`shelfCabling.ns224` only has a
`1` entry, no `2`).

## Tier 1 — Current-gen lineup (ASA remainder is blocked)

Actively sold/marketed as of this writing. Same install-guide pattern as
the platforms above; expect the same class of drift — but see below, this
family turned out to be unreachable by this technique.

- [ ] ASA A1K, ASA A90, ASA A70, ASA A50, ASA A30, ASA A20 — **blocked**
- [ ] ASA C800, ASA C400, ASA C250, ASA C30 — **blocked**

ASA controllers are commonly the same physical chassis as their AFF
counterpart with different licensing/software — but this has NOT been
confirmed against a dedicated ASA cabling doc for any of these, so none are
assumed to share AFF's port scheme without their own source. NetApp's ASA
install pages harvested so far (`asa400-guide.txt`, `asa800-guide.txt`,
`asa900-guide.txt`, `asac250/400/800-guide.txt`) are all
`install-detailed-guide.html`-style pages that reference cabling
illustrations rather than embedding port names as text — the scraper can't
extract port data from them. **Confirmed 2026-08-12 (two probe rounds):**
neither the bare `asaXX/install-cable.html` pattern nor the hyphenated
`asa-aXX/install-cable.html` pattern (which does work for ASA C-series'
`install-detailed-guide.html`) resolves for any ASA A-series or the
remaining ASA C-series model — all return a hard HTTP 404. This family is
genuinely blocked by this technique; would need the Hardware Universe
fallback path (different sourcing technique, not yet built), not another
URL guess.

## Tier 2 — Recent/still-common in the field

- [x] ~~FAS90, FAS70~~ — done, see above
- [x] ~~FAS50~~ — port catalog corrected (N/A for NS224 — FAS50 doesn't support it); DS460C cabling sourced but not wired into the renderer, see note above
- [ ] AFF A300, AFF A250, AFF A220, AFF A150 — **blocked** (confirmed no `install-cable.html`, HTTP 404, 2026-08-12)
- [ ] AFF C250, AFF C190 — **blocked** (confirmed no `install-cable.html`, HTTP 404, 2026-08-12)
- [ ] ASA A900, ASA A800, ASA A400 — **blocked**, see Tier 1 ASA note above
- [ ] FAS9500, FAS9000, FAS8700, FAS8300, FAS8200 — **blocked** (confirmed no `install-cable.html`, HTTP 404, 2026-08-12)

Every remaining Tier 2 platform is now confirmed blocked by this technique —
none have a scrapable text-cabling page. Nothing left to attempt here
without the Hardware Universe fallback.

## Tier 3 — Legacy/EOL — all confirmed blocked, no docs.netapp.com presence

- [ ] FAS2820, FAS2750, FAS2720, FAS2650, FAS2620, FAS2554, FAS2552, FAS2520
- [ ] FAS8080, FAS8060, FAS8040, FAS8020

**Confirmed 2026-08-12:** unlike Tier 1/2's dead ends (the page exists as an
image-only guide, just not the text-cabling variant), these get a hard 404
on `install-detailed-guide.html`/`install-setup.html` too — the URL pattern
that DID work for FAS2700/FAS2800/FAS2600 (Tier 3's own "recent-legacy"
siblings, still `-guide`/`-setup` style pages, harvested and already listed
above but never fully checked against this scheme). NetApp appears to have
stopped publishing install docs for controllers this old under the current
docs.netapp.com URL scheme — they may be archived elsewhere (a login-gated
legacy docs system) or simply retired. Not worth further URL guessing.

## Not applicable (no physical rear panel)

`Cloud Volumes ONTAP`, `ONTAP Select`, `Default` — software-only/virtual,
no cabling to source.

## Not yet covered by this file

Shelf models beyond NS224 (DS224C, DS212C, DS460C, DS2246), expansion card
part-number/slot-compatibility data, and MetroCluster switch models. These
are real gaps in the "every component and configuration" scope but are a
separate harvesting pass — NS224 was prioritized first because it's the
current-gen shelf and the one this project's git history shows the most
repeated cabling bugs on.

## New stubs added 2026-08-16 — specs unverified, need HWU/docs.netapp.com

AFX 1K, FAS2850, FAS2880, and FAS500f are real current-generation NetApp
platforms without full catalog entries yet. Each stub below borrows its
`ports`, `supportedCards`, and `maxPcieSlots` from a same-family sibling
already in `js/compatibility.js` as a placeholder, and is marked with a
`⚠ UNVERIFIED SPECS` prefix in its `description` field so it's visibly
flagged in the UI until corrected.

| Platform | Borrowed from | Real gap this fixed |
|---|---|---|
| AFX 1K | AFX 2K profile verbatim | Previously any "AFX 1K" ASUP string silently matched the "AFX 2K" profile — wrong model entirely, not just unsourced |
| FAS2850 | FAS2820 | Not recognized at all — fell through to `Default` |
| FAS2880 | FAS2820 | Not recognized at all — fell through to `Default` |
| FAS500f | AFF A250 | Not recognized at all — fell through to `Default` |

Next step: source real HWU/`install-cable.html` data for these four and
drop the `⚠ UNVERIFIED SPECS` marker, same process as the Done section above.

## Open gap: ds212c shelf firmware not tracked

`ds212c` is referenced throughout `NETAPP_PLATFORMS` (`js/compatibility.js`)
as a supported shelf but has no entry in `FIRMWARE_VERSIONS.shelves` —
open gap, needs sourcing from NetApp's Shelf Firmware Matrix / HWU.

Also fixed: `js/bestPractices.js`'s `BP_ACP_STATUS` rule matched SAS shelf
models via a regex that omitted `ds212c` — a cluster with only `ds212c`
shelves silently skipped the ACP connectivity check entirely. Added
`ds212c` to that regex.

## Switch model misidentification bug fixed (2026-08-16)

`js/parser.js`'s `"Cisco Nexus 9336C-FX2"` switch-detection pattern's
regex included a bare `9336C` alternation, so it matched (and mislabeled)
ANY 9336C-family switch model string as FX2 — meaning any other real
Cisco 9336C-series switch would be checked against FX2's firmware
baseline instead of its own. This also made the pre-existing `"Cisco
Catalyst 9336"` pattern (not a real Cisco product name) permanently
unreachable dead code. Tightened the FX2 regex to `9336C-FX2` only and
removed the non-product "Catalyst 9336" pattern. Verified in-browser: the
narrowed pattern still correctly resolves `N9K-C9336C-FX2` sample text
via `parseASUP()`, on both the dev-server ES modules and the standalone
bundle.

## Two new audit rules for aggregate health (2026-08-16)

Two new `bestPractices.js` rules based on well-established NetApp storage
best practices:

- **`BP_MIN_DISK_AGGR`**: RAID-DP aggregates should have >= 5 disks,
  RAID4 >= 3, or fault tolerance/performance is degraded. Required a
  `parser.js` fix first: the aggregate-parsing loop only ever captured
  the FIRST RAID group's disk count (`rgSize`/`disksCount`, used
  elsewhere by pinned capacity math — deliberately left untouched), so a
  new `totalDiskCount` field now sums disks across every RAID group in
  the aggregate block. Verified: a 2-RAID-group aggregate (3+3 disks)
  correctly totals 6 and does NOT false-positive, while a real 1-group
  3-disk RAID-DP aggregate correctly fires the warning.
- **`BP_NON_ROOT_CFO_HAPOLICY`**: a non-root aggregate with `cfo`
  HA-policy means its HA partner can't take it over on failover — real
  data-loss risk. **⚠ UNCONFIRMED AGAINST A REAL ASUP**: `parser.js`'s
  new `haPolicy` extraction (an "HA Policy: sfo/cfo" instance-style
  line, or a "-fields ha-policy" tabular row) is a best-effort guess at
  how this field might appear in real ASUP text, modeled on conventions
  this parser already relies on elsewhere — it has never been seen in an
  actual customer bundle. The rule only ever fires when that field is
  actually found, and reports neither "compliant" nor "warning" when it
  isn't (no false confidence). **Next real-ASUP test should specifically
  check whether `ha-policy` ever appears in the aggregate/storage
  sections of an actual bundle**, and correct the regex in `parser.js`
  if the real format differs.

Both rules follow Rule 5's existing convention of excluding root
aggregates (`aggr0` prefix / literal "root" in the block's Options text).
