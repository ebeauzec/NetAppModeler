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

**FAS50** has a real sourced `install-cable.html` too, but it's DS460C
(SAS) shelf cabling, not NS224 — FAS50 doesn't support NS224 at all (matches
the existing `compatibility.js` flag). The DS460C cable-endpoint data
(`controller port 3a/3d` ↔ `shelf IOM A/B port 1/3`, mini-SAS HD, daisy-
chainable across two shelves) is a genuinely different shape than every
other entry in this file and isn't captured in `js/rackLayouts.js` yet —
the SAS/DS460C rendering path in `js/ui.js`'s `drawCablingTopology` doesn't
call `getShelfCabling()` the way the NS224 path does, so there's nowhere to
plug it in without also extending that renderer. Tracked as a follow-up,
not done.

**Note on A70/A90/C80 vs A50/A30/A20/C60/C30:** the former three share one
port scheme (cluster e1a+e7a, host e9a/e9b, NS224 storage on PCIe slots
8/11 — the same scheme AFF A1K uses); the latter five share a different one
(cluster e2a+e4a on the two-I/O-module SKU, host e2b/e4b, storage e3a/e3b).
AFF A20 only ships the one-I/O-module SKU, so its cluster ports are e4a/e4b
instead. For A50/A30/C60/C30, only a single-NS224-shelf cabling procedure
is published — a second-shelf port assignment was not found in NetApp's
docs for this family and is not modeled (`shelfCabling.ns224` only has a
`1` entry, no `2`).

## Tier 1 — Current-gen lineup (recommended next)

Actively sold/marketed as of this writing. Same install-guide pattern as
the platforms above; expect the same class of drift.

- [ ] ASA A1K, ASA A90, ASA A70, ASA A50, ASA A30, ASA A20
- [ ] ASA C800, ASA C400, ASA C250, ASA C30

ASA controllers are commonly the same physical chassis as their AFF
counterpart with different licensing/software — but this has NOT been
confirmed against a dedicated ASA cabling doc for any of these, so none are
assumed to share AFF's port scheme without their own source. NetApp's ASA
install pages harvested so far (`asa400-guide.txt`, `asa800-guide.txt`,
`asa900-guide.txt`, `asac250/400/800-guide.txt`) are all
`install-detailed-guide.html`-style pages that reference cabling
illustrations rather than embedding port names as text — the scraper can't
extract port data from them. **Confirmed 2026-08-12:** the `install-cable.html`
variant that worked for every Tier 1 AFF/FAS platform returns a hard HTTP
404 for all of these — NetApp genuinely doesn't publish that page for this
family. Would need the Hardware Universe fallback path (different
sourcing technique, not yet built) instead of another URL guess.

## Tier 2 — Recent/still-common in the field

- [ ] AFF A300 (confirmed no `install-cable.html`, HTTP 404, 2026-08-12), AFF A250, AFF A220, AFF A150
- [ ] AFF C250, AFF C190
- [ ] ASA A900, ASA A800, ASA A400 (confirmed no `install-cable.html`, HTTP 404, 2026-08-12)
- [x] ~~FAS90, FAS70~~ — done, see above
- [ ] FAS9500, FAS9000, FAS8700, FAS8300, FAS8200 (confirmed no `install-cable.html`, HTTP 404, 2026-08-12)
- [x] ~~FAS50~~ — port catalog corrected N/A (FAS50 doesn't support NS224); DS460C cabling sourced but not wired into the renderer, see note above

## Tier 3 — Legacy/EOL

- [ ] FAS2820, FAS2750, FAS2720, FAS2650, FAS2620, FAS2554, FAS2552, FAS2520
- [ ] FAS8080, FAS8060, FAS8040, FAS8020

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
