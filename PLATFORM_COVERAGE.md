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

## Done (2026-08-11)

| Platform | Port catalog | Cabling endpoints |
|---|---|---|
| AFF A400 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF C400 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF A800 | ✅ corrected | ✅ sourced (1-2 shelves) |
| AFF C800 | ✅ corrected | ✅ sourced (1 shelf) |
| AFF A900 | ✅ corrected | ✅ sourced (1-4 shelves) |
| AFF A1K | ✅ corrected | ✅ sourced (1-4 shelves) |

## Tier 1 — Current-gen lineup (recommended next)

Actively sold/marketed as of this writing. Same install-guide pattern as
the platforms above; expect the same class of drift.

- [ ] AFF A90, AFF A70, AFF A50, AFF A30, AFF A20
- [ ] AFF C80, AFF C60, AFF C30
- [ ] ASA A1K, ASA A90, ASA A70, ASA A50, ASA A30, ASA A20
- [ ] ASA C800, ASA C400, ASA C250, ASA C30

## Tier 2 — Recent/still-common in the field

- [ ] AFF A300, AFF A250, AFF A220, AFF A150
- [ ] AFF C250, AFF C190
- [ ] ASA A900, ASA A800, ASA A400
- [ ] FAS9500, FAS9000, FAS8700, FAS8300, FAS8200, FAS90, FAS70, FAS50

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
