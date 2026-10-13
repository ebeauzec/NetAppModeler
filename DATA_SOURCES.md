# NetApp ASUP Analyzer & Modeler — Data Sources & Verification Registry

> **PURPOSE:** Every value in `compatibility.js` and version-related constants in `ui.js` and `bestPractices.js` must be traceable to an authoritative NetApp source. This document records those sources and must be updated whenever data is refreshed.
>
> **LAST VERIFIED:** October 13, 2026 (ONTAP lifecycle/platform support tables, firmware baselines below); August 12, 2026 (platform port/cabling data — unchanged since, except FAS500f, see Known Data Corrections)  
> **CURRENT LATEST ONTAP:** 9.19.1 (GA July 2026) — still the latest GA as of this verification date  
> **NEXT EXPECTED RELEASE:** 9.20.1 (Q4 2026, not yet released)

---

## Authoritative Sources

Always check these sources when updating data in the tool:

| Source | URL | What it covers |
|--------|-----|----------------|
| **NetApp Hardware Universe (HWU)** | https://hwu.netapp.com | Platform min/max ONTAP, shelf compat, slot configs, RAM limits |
| **ONTAP Release Support Reference (NetApp, PRIMARY for GA dates)** | https://docs.netapp.com/us-en/ontap/release-notes/release-support-reference.html | Official GA dates per release line + the exact support-tier-by-year table (confirmed 2026-10-13: End of Full Support = GA + 3y, End of Limited Support = GA + 5y). Public, no login. Found via the separately-maintained NetApp Reference Library's own citation — not a dependency of this project. Harvested by `tools/harvest_ontap_lifecycle.py`. |
| **ONTAP Lifecycle (endoflife.date, secondary cross-check)** | https://endoflife.date/api/netapp-ontap.json | GA dates + a single `eol` date per line — used only to flag disagreement with the primary source above, never to override it (confirmed 2026-10-13 to be less accurate on 3 of 11 rows). |
| **ONTAP Release Notes** | https://docs.netapp.com/us-en/ontap/release-notes.html | New platform support per release |
| **NetApp Software Lifecycle Policy** | https://www.netapp.com/us/media/nb-3085.pdf | Lifecycle definitions |
| **NetApp ONTAP Upgrade Advisor** | https://aiq.netapp.com/upgrade | Supported upgrade paths |
| **NetApp IMT** | https://mysupport.netapp.com/matrix | Protocol/switch/shelf interoperability |
| **NetApp Support Site EOL/EOS** | https://mysupport.netapp.com/eol | Hardware EOS announcements |

---

## Physical/Cabling Reference Sources

Port names and cable-endpoint data in `js/rackLayouts.js` (and the corrections
made to `NETAPP_PLATFORMS[model].ports` in `compatibility.js`) are sourced
from NetApp's public Installation & Setup / hot-add cabling guides on
`docs.netapp.com` — no login required, unlike Hardware Universe. Two things
are NOT scrapable from these pages: `hwu.netapp.com` itself (Azure B2C login
wall) and the interactive "Animation" rear-panel diagrams embedded in the
install guides (client-side JS component, not a flat image/SVG). See
`js/rackLayouts.js`'s file header for what "accurate" means given that gap —
cable endpoints are sourced and correct; visual positions are a clean
schematic, not a pixel match to NetApp's product photos.

**Harvest tooling:** `tools/harvest_reference_data.py` fetches the target
pages (plain `urllib` + a self-identifying User-Agent + a proxy-aware opener
— this combination reaches `docs.netapp.com`/`kb.netapp.com` fine; a bare
`WebFetch`-style request without the UA/proxy handling gets a 403) and saves
raw extracted text to `data/netapp_docs_raw/*.txt` with a manifest at
`data/netapp_docs_manifest.json`. `tools/apply_reference_data.py` then
cross-checks the sourced port names against `compatibility.js`'s catalog and
flags drift — run it after any harvest or manual data edit.

| Page | Covers |
|------|--------|
| `ontap-systems/{a400,a800,a900}/install-detailed-guide.html` | Controller cluster/HA/host cabling, port names |
| `ontap-systems/a1k/install-cable.html`, `a1k/overview.html` | AFF A1K cabling + key specs |
| `ontap-systems/a70-90/install-cable.html` | AFF A70/A90 controller cabling (shared page) |
| `ontap-systems/a20-30-50/install-cable.html` | AFF A50/A30/A20 controller cabling (shared page) |
| `ontap-systems/c80/install-cable.html` | AFF C80 controller cabling |
| `ontap-systems/c30-60/install-cable.html` | AFF C60/C30 controller cabling (shared page) |
| `ontap-systems/fas-70-90/install-cable.html` | FAS70/FAS90 controller cabling (shared page) |
| `ontap-systems/fas50/install-cable.html` | FAS50 controller cabling — DS460C (SAS) shelf, not NS224 |
| `ontap-systems/ns224/ns224-shelf-overview.html` | NSM module naming, default shelf IDs |
| `ontap-systems/ns224/hot-add-aff-cable-{a400-c400,a800-c800,a900,a1k}.html` | Exact NS224-to-controller cable endpoint pairs, per platform and shelf count |

**Confirmed corrections made 2026-08-11** (compatibility.js's prior port
lists didn't match these sourced guides): AFF A1K storage ports (was
`e2a-e5b`, should be `e8a-e11b`), AFF A900 cluster ports (was onboard
`e0a/e0b`, should be PCIe slot `e4a/e8a`) and storage ports (was
`e3/e7/e11/e15`, should be `e1/e2/e10/e11`), AFF A400/C400/A800/C800 NS224
storage ports missing their PCIe-slot pairs. Re-run
`tools/apply_reference_data.py` after touching any of these platforms'
`ports` field.

**Confirmed corrections made 2026-08-12** (10 more platforms found on the
same generic placeholder port scheme — cluster `e0a/e0b`, data `e0c/e0d`,
storage `e2a-e5b` — regardless of what the platform actually uses): AFF
A70/A90/C80 turned out to share AFF A1K's real scheme (cluster `e1a+e7a`,
host `e9a/e9b`, storage on PCIe slots 8/11), not the generic template at
all. AFF A50/A30/A20/C60/C30 share a different real scheme (cluster
`e2a+e4a` on the two-I/O-module SKU, host `e2b/e4b`, storage `e3a/e3b`).
FAS70/FAS90 share the A70/A90 cluster/host scheme but use different storage
slots (10/11). FAS50 is SAS-only (no NS224); its ports were corrected to
cluster `e4a/e4b`, host `e2a-e2d`, storage `3a/3d`. All 16 sourced platforms
pass `tools/apply_reference_data.py` with zero drift — see
`PLATFORM_COVERAGE.md` for the full per-platform table and for which
remaining platforms are confirmed unreachable by this technique (NetApp
doesn't publish an `install-cable.html`-equivalent text page for them —
verified by probing 26 URL patterns across ASA A/C-series, AFF
A250/A220/A150/C250/C190, FAS8200/8300/9000/9500/8080/8060/8040/8020, and
Tier 3 legacy FAS28xx/25xx, all returning HTTP 404).

**Confirmed correction made 2026-08-12 (storage port count, real ASUP data):**
FAS8040's `ports.storage` was `["0a","0b"]` (2 ports) — corrected to
`["0a","0b","0c","0d"]` (4 ports), sourced directly from a real customer
ASUP's `SYSCONFIG-A.txt` (`slot 0: SAS Host Adapter 0a/0b/0c/0d`) and the
authoritative `storage-port.xml` export. The 2-port version undercounted
this platform's real SAS capacity by half, causing false "port exhausted"
warnings on the shelf cabling diagram for real systems with more than ~2
shelf stacks. Sibling platforms `FAS8020`/`FAS8060`/`FAS8080` are
deliberately left at `["0a","0b"]` — there's no real customer data
confirming their actual port counts, and entry vs. high-end hardware within
the same generation can genuinely differ; don't propagate this fix to them
without independent confirmation.

Separately (same date, parser-level rather than catalog-level): `js/parser.js`
now extracts onboard SAS Host Adapter ports directly from ASUP `sysconfig -a`
text (`slot 0: SAS Host Adapter 0a (...)`) when present, for any platform —
the compatibility.js catalog above is now a fallback for when this text
isn't in the bundle, not the only source. This is what actually fixed the
false exhaustion warnings on a real 12-shelf FAS8040 system; the FAS8040
catalog correction alone would only have helped platforms whose ASUP lacks
this text entirely.

**Confirmed correction made 2026-08-12 (call-order bug, not a data issue):**
after the two corrections above shipped (v2.65), one false "No Storage Port"
warning remained on the same real 12-shelf FAS8040 system, confirmed live.
Cause: `js/ui.js`'s `loadASUPData()` drew the audit dashboard's cabling SVG
via `renderCurrentAuditDashboard()` *before* `initStep4Inputs()` ran
`allocateHBACardsForState()` — so the very first render computed available
storage ports from only the real onboard ports, missing the auto-added HBA
card the very next step was about to compute. `allocateHBACardsForState()`
now runs before the initial dashboard render (it's idempotent — removes its
own prior auto-added cards before recomputing — so the later call inside
`initStep4Inputs()` is a harmless no-op re-confirmation, not a duplicate).
Confirmed: the remaining false exhaustion warning is gone.

**Confirmed correction made 2026-08-12 (parser gap, not a catalog issue):**
the "Modelled Configuration Transition" comparison view showed "Usable Total:
0 GB" on both Before/After panels for a real ASUP. Cause: the parser only
recognized aggregate capacity from a single-line `aggr show`-style "Size: X,
Usable: Y, Used: Z, Free: W" text format; this real bundle's only aggregate
dump was `aggr status -r` (RAID/disk membership, no capacity numbers at
all), so every real aggregate's `usableGB`/`usedGB`/`freeGB` silently stayed
at 0. Fixed: `js/parser.js` now also reads `aggr-info.xml` when present — a
structured per-aggregate export with `<name>`/`<size>`/`<available_size>`/
`<usedsize>` in bytes (verified exactly against real data: size =
available_size + usedsize, byte-for-byte) — cross-referenced by aggregate
name as a fallback when the text-format match finds nothing. Confirmed
against the real 12-shelf FAS8040 system: Usable Total now reads 264.5 TB,
Used 199.4 TB (75.4%). Known limitation, not fixed: one anonymized sample
bundle (`manual_asup1.zip`) has aggregate names redacted inconsistently
between its own files (`aggr-info.xml` uses SHA-like hashes, the text dump
uses literal `XXXXXXXXXXXXXXXXXXXXXXX`), so the name-based join can't work
there — deliberately not worked around with a positional fallback, since
that risks silently attaching the wrong aggregate's capacity to the wrong
name for a bundle with genuinely different aggregate ordering.

**What this deliberately does NOT do:** the shipped `standalone_netapp_modeler.html`
never makes a network call — both harvest tools above are local, human/AI-run
Python scripts, run on demand, never from the browser app itself. This keeps
the "100% client-side, dark-site safe" guarantee in this file's parent
README intact.

**In-app "Check for Updates" button (v2.57, launcher added v2.58):** `tools/update_server.py` is a
small local HTTP server (`127.0.0.1:8765` only) that the header's "Check for
Updates" button talks to. It exists because `docs.netapp.com` sends no
`Access-Control-Allow-Origin` header — confirmed by inspecting the response
headers directly — so the app's own JS can't read a direct fetch to that
domain even though the request would succeed. The helper runs the same
harvest + drift-check as the two tools above and reports the result back
over localhost; it never auto-applies a fix to `compatibility.js`. The user
starts it — either automatically via `launch.py`/`launch.bat` (recommended;
starts the helper and opens the app in one step) or manually
(`python tools/update_server.py`) — and it only ever serves 127.0.0.1; see
README.md's "Checking for Updates" section.

---

## ONTAP Lifecycle & Platform Availability Harvest Tooling (added v2.76)

Same pattern as the cabling harvester above, parallel tooling: `tools/harvest_ontap_lifecycle.py`
fetches NetApp's own official [release-support-reference.html](https://docs.netapp.com/us-en/ontap/release-notes/release-support-reference.html)
(GA dates + the exact support-tier-by-year table it publishes, from which End of Full Support =
GA + 3 years and End of Limited Support = GA + 5 years is derived and confirmed against every
already-correct row in this document), [endoflife.date's API](https://endoflife.date/api/netapp-ontap.json)
as a secondary cross-check, and NetApp's [End-of-Availability index](https://docs.netapp.com/us-en/ontap-systems/endofavail/)
(platform names only — no exact EOA/EOS dates; those require an authenticated support-site login).
All three are confirmed public, no-login sources, reachable with the same plain-`urllib` +
self-identifying-User-Agent + proxy-aware-opener technique as the cabling harvester — saved to
`data/ontap_lifecycle_raw.json`. `tools/apply_ontap_lifecycle.py` then cross-checks the harvested
GA/End-Full-Support dates against `js/compatibility.js`'s `ONTAP_LIFECYCLE`, and the EOA platform
list against this document's Platform Registry below, reporting drift only — same "never silently
rewrite a source file" philosophy as `apply_reference_data.py`. Wired into
`tools/update_server.py`'s `/check-ontap-updates` route and the in-app "Check for Updates" button
alongside the existing cabling check; see README.md's "Checking for Updates" section.

**Deliberately not automated: ONTAP P-release/patch numbers** (e.g. the real latest patch on the
9.17.1 line). NetApp's only public listing of those is `mysupport.netapp.com`'s downloads page,
confirmed 2026-10-13 to be a client-side-rendered app that returns only a loading-spinner shell to
a plain fetch — it requires an authenticated NetApp support login to see real data. This project
stays 100% no-login by design (the same reason `hwu.netapp.com` was never scraped for cabling data
either), so `ONTAP_LIFECYCLE`'s `latestPatch` field stays a manual update per the Update Procedure
below.

---

## ONTAP Version Registry (Last verified: October 13, 2026)

Source: endoflife.date/netapp-ontap

**2026-10-13 reconciliation:** this table and `js/compatibility.js`'s `ONTAP_LIFECYCLE`
had drifted independently out of sync with each other — GA/End-Full-Support dates
disagreed by one to several months on most rows, and the 9.17.1 GA date disagreed by
about seven months. `ONTAP_LIFECYCLE` has been realigned to exactly match the dates in
this table (the documented single source of truth); see Known Data Corrections below.

| Version | GA Released | End Full Support | End Limited Support | Status (Oct 2026) |
|---------|------------|-----------------|--------------------|--------------------|
| 9.0–9.6 | 2016–2019 | — | — | OBSOLETE |
| 9.7 | Nov 2019 | Jul 31 2023 | Jul 31 2025 | Self-Service Only (CORRECTED 2026-10-13 via live endoflife.date re-check: GA was "Oct 2019"/eol "Oct 2022" — real GA Nov 1 2019, eol Jul 31 2023) |
| 9.8 | Oct 2020 | Dec 31 2023 | Dec 31 2025 | Self-Service Only |
| 9.9.1 | Jun 2021 | Jun 30 2024 | Jun 30 2026 | Self-Service Only (CORRECTED: was "Transitioning" — End Limited Support passed Jun 2026) |
| 9.10.1 | Jan 2022 | Jan 31 2025 | Jan 31 2027 | LIMITED SUPPORT |
| 9.11.1 | Jul 2022 | Jul 31 2025 | Jul 31 2027 | LIMITED SUPPORT |
| 9.12.1 | Feb 2023 | Feb 28 2026 | Feb 28 2028 | LIMITED SUPPORT |
| 9.13.1 | Jun 2023 | Jun 30 2026 | Jun 30 2028 | LIMITED SUPPORT |
| 9.14.1 | Jan 2024 | Jan 31 2027 | Jan 31 2029 | FULL SUPPORT |
| 9.15.1 | Jul 2024 | Jul 31 2027 | Jul 31 2029 | FULL SUPPORT (CORRECTED 2026-10-13 via NetApp's own `release-support-reference.html`: GA was "May 2024" — real GA July 2024. End Full/Limited were already correct) |
| 9.16.1 | Jan 2025 | Jan 31 2028 | Jan 31 2030 | FULL SUPPORT (REVERTED 2026-10-13: an earlier pass today changed End Full/Limited to "Feb 26 2028"/"Feb 26 2030" using endoflife.date's slightly-off `eol` field — NetApp's own `release-support-reference.html` confirms the exact support-tier formula is GA + 3y (End Full) / GA + 5y (End Limited); from the correct Jan 2025 GA that's Jan 2028/Jan 2030, the original values) |
| 9.17.1 | Sep 2025 | Sep 30 2028 | Sep 30 2030 | FULL SUPPORT (CORRECTED 2026-10-13 via NetApp's own `release-support-reference.html`: GA was "Jan 15 2026" — real GA September 2025. End Full/Limited were already correct) |
| 9.18.1 | Nov 2025 | Nov 30 2028 | Nov 30 2030 | FULL SUPPORT (CORRECTED 2026-10-13 via NetApp's own `release-support-reference.html`: GA was "Feb 4 2026" — real GA November 2025; End Full/Limited recomputed via the GA+3y/GA+5y formula, below) |
| **9.19.1** | **Jul 2026** | **Jul 31 2029** | **Jul 31 2031** | **FULL SUPPORT — LATEST GA** (CORRECTED 2026-10-13: GA was "May 2026" — real GA July 2026, confirmed by both endoflife.date and NetApp's own `release-support-reference.html`) |
| 9.20.1 | Q4 2026 (expected) | — | — | NOT RELEASED |

**2026-10-13, second reconciliation pass (this table's own first pass earlier today used endoflife.date alone; this one adds NetApp's own first-party
`docs.netapp.com/us-en/ontap/release-notes/release-support-reference.html`, confirmed public/no-login):** that page gives the authoritative GA date
per version AND the exact support-tier structure — a published table of what's available in which year after GA (Technical support/Root-cause
analysis/Software downloads run through Year 5; Service updates/patch releases and vulnerability alerts stop after Year 3). That resolves to a
clean **End of Full Support = GA + 3 years, End of Limited Support = GA + 5 years** formula, confirmed exactly against every row in this table whose
GA date was already correct (9.9.1 through 9.14.1, 9.19.1). Three rows (9.15.1, 9.17.1, 9.18.1) had a wrong GA date despite an already-correct
End Full/Limited pair (suggesting the End dates were computed correctly at some point from a different, correct GA figure, and only the GA field
itself later drifted) — now corrected using this more authoritative source. endoflife.date remains useful as a second independent public source
and is still what `tools/harvest_ontap_lifecycle.py` cross-checks, but NetApp's own page wins any disagreement between the two.

---

## Platform Registry (Last verified: July 28, 2026)

Source: NetApp Hardware Universe (hwu.netapp.com)

### AFF A-Series

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| AFF A200 | 9.4 | 9.11.1 | EOL | Dropped in 9.12.1 |
| AFF A220 | 9.4 | 9.17.1* | EOS 2028-03 | CORRECTION (was "EOS Nov 2026"): EOA 2023-03, EOS 2028-03 per NetApp EOA/EOS records. * confirm final max in HWU |
| AFF A250 | 9.8 | 9.19.1 | ACTIVE | |
| AFF A300 | 9.4 | 9.17.1* | EOS (lapsed 2026-06) | CORRECTION (was "EOS Nov 2026"): EOA 2021-06, EOS 2026-06 per NetApp EOA/EOS records — support has already ended, not pending. * confirm final max in HWU |
| AFF A320 | 9.6 | 9.14.1 | EOS | Dropped in 9.15.1 |
| AFF A400 | 9.7 | 9.19.1 | ACTIVE | |
| AFF A700 | 9.5 | 9.19.1 | ACTIVE | Confirmed still supported. EOA 2023-10, EOS 2028-10 (still within support) |
| AFF A700s | 9.5 | 9.14.1 | EOS (lapsed 2026-06) | Dropped in 9.15.1. EOA 2021-06, EOS 2026-06 per NetApp EOA/EOS records |
| AFF A800 | 9.7 | 9.19.1 | ACTIVE | Confirmed still supported |
| AFF A900 | 9.10.1 | 9.19.1 | ACTIVE | |
| AFF A150 | 9.12.1 | 9.19.1 | ACTIVE | Replaces AFF A220 |
| AFF A20 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A30 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A50 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A70 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A90 | 9.15.1 | 9.19.1 | ACTIVE | NVIDIA DGX certified |
| AFF A1K | 9.15.1 | 9.19.1 | ACTIVE | |

### AFF C-Series

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| AFF C190 | 9.6 | 9.19.1 | ACTIVE | EOA 2022-06, EOS 2027-06 per NetApp EOA/EOS records — still within support but closer to end than plain "ACTIVE" implied |
| AFF C250 | 9.12.1 | 9.19.1 | ACTIVE | |
| AFF C400 | 9.12.1 | 9.19.1 | ACTIVE | |
| AFF C800 | 9.12.1 | 9.19.1 | ACTIVE | |
| AFF C30 | **9.16.1** | 9.19.1 | ACTIVE | CORRECTION: min is 9.16.1 not 9.15.1 |
| AFF C60 | **9.16.1** | 9.19.1 | ACTIVE | CORRECTION: min is 9.16.1 not 9.15.1 |
| AFF C80 | **9.16.1** | 9.19.1 | ACTIVE | CORRECTION: min is 9.16.1 not 9.15.1 |

### ASA A-Series

| Platform | Min ONTAP | Max ONTAP | Status |
|----------|-----------|-----------|--------|
| ASA A150 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A250 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A400 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A800 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A900 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A1K | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A20 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A30 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A50 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A70 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A90 | 9.15.1 | 9.19.1 | ACTIVE |

### ASA C-Series / ASA r2

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| ASA C250 | 9.14.1 | 9.19.1 | ACTIVE | |
| ASA C400 | 9.14.1 | 9.19.1 | ACTIVE | |
| ASA C800 | 9.14.1 | 9.19.1 | ACTIVE | |
| ASA C30 | 9.16.1 | 9.19.1 | ACTIVE | |
| ASA r2 | 9.16.1 | 9.19.1 | ACTIVE | New architecture, SAN-only |

### FAS Series

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| FAS2520/2552/2554 | 8.x | 9.8 | EOL | |
| FAS8020/8040/8060/8080 | 8.2 | 9.8 | EOL | Confirmed max 9.8 |
| FAS2620/2650 | 9.2 | 9.11.1 | EOL | Dropped in 9.12.1 |
| FAS2720 | 9.7 | 9.14.1 | EOS | |
| FAS2750 | 9.7 | 9.15.1 | EOS | |
| FAS2820 | 9.12.1 | 9.19.1 | ACTIVE | |
| FAS8200 | 9.3 | 9.16.1 | EOS | Dropped in 9.17.1. EOA 2022-06, EOS 2027-06 per NetApp EOA/EOS records (still within hardware support, just dropped from current ONTAP) |
| FAS8300 | 9.7 | 9.19.1 | ACTIVE | |
| FAS8700 | 9.7 | 9.19.1 | ACTIVE | Confirmed still supported |
| FAS9000 | 9.5 | 9.19.1 | ACTIVE | |
| FAS9500 | 9.10.1 | 9.19.1 | ACTIVE | |
| FAS50 | 9.15.1 | 9.19.1 | ACTIVE | |
| FAS70 | 9.15.1 | 9.19.1 | ACTIVE | |
| FAS90 | 9.15.1 | 9.19.1 | ACTIVE | |

### New Platforms (2026)

| Platform | Min ONTAP | Notes |
|----------|-----------|-------|
| AFX 2K | 9.19.1 | Announced July 2026. High-performance NAS/S3/AI. |

---

## Known Data Corrections (History)

| What was wrong | Correct value | Fixed in version | Source |
|----------------|---------------|-----------------|--------|
| All platforms had maxOntap 9.20.1 | 9.20.1 not released | v2.22 | endoflife.date |
| AFF A200 maxOntap was 9.10.1 | 9.11.1 | v2.23 | HWU |
| AFF A300 maxOntap was 9.15.1 | 9.17.1 (EOS Nov 2026) | v2.23 | NetApp EOSL |
| AFF A700/A800 assumed EOS | Both still active on 9.19.1 | v2.23 | HWU |
| FAS8700 assumed EOS at 9.16.1 | Still active on 9.19.1 | v2.23 | HWU |
| AFF C30/C60/C80 minOntap 9.15.1 | Correct: 9.16.1 | v2.24 (pending) | HWU |
| AFX 2K not present | Added in v2.24 (pending) | v2.24 (pending) | NetApp Jul 2026 |
| AFF A1K storage ports were `e2a-e5b` | `e8a-e11b` | v2.56 | docs.netapp.com install-cable |
| AFF A900 cluster ports were onboard `e0a/e0b` | PCIe slot `e4a/e8a` | v2.56 | docs.netapp.com install-detailed-guide |
| A70/A90/C80/FAS70/FAS90 on generic e0a-e0d/e2a-e5b template | Real scheme: cluster `e1a+e7a`, host `e9a/e9b` | v2.60/v2.61 | docs.netapp.com install-cable |
| A50/A30/A20/C60/C30 on generic e0a-e0d/e2a-e5b template | Real scheme: cluster `e2a+e4a`, host `e2b/e4b`, storage `e3a/e3b` | v2.60 | docs.netapp.com install-cable |
| FAS50 ports were `e0a/e0b` cluster, `0a/0b` storage | Real: cluster `e4a/e4b`, storage `3a/3d` (SAS, no NS224) | v2.61 | docs.netapp.com install-cable |
| BP_SWITCH_RCF compliance threshold hardcoded at `1.3.0.1` | Real latest (BES-53248): `3.10.0.3`, sourced from `FIRMWARE_VERSIONS.switches` | v2.63 | Already-catalogued firmware DB |
| Non-MCC SAS shelf cabling diagram wired each controller to only one IOM (not real multipath) | Crossed: each controller's redundant port -> the OTHER controller's IOM | v2.64 | FAS50 install-cable.html |
| FAS8040 storage ports were `["0a","0b"]` (2 ports) | Real: `["0a","0b","0c","0d"]` (4 ports) | v2.65 | Real customer ASUP SYSCONFIG-A.txt + storage-port.xml |
| Parser never read onboard SAS Host Adapter ports from `sysconfig -a` text (any platform) | Whole-document `SAS Host Adapter` regex pass extracts real storage ports, catalog is fallback only | v2.65 | Real customer ASUP (12-shelf FAS8040) |
| Audit dashboard's initial cabling render ran before HBA auto-allocation, missing auto-added ports | `allocateHBACardsForState()` now runs before the initial render, not after | v2.66 | Real customer ASUP (12-shelf FAS8040), confirmed live |
| Aggregate capacity stayed at 0 GB when only `aggr status -r` text was present (no "Size:" line) | Falls back to `aggr-info.xml`'s `<size>`/`<available_size>`/`<usedsize>` when present | v2.68 | Real customer ASUP (12-shelf FAS8040), confirmed live |
| AFF A220/A300 EOS listed as pending "Nov 2026" | A220 EOS 2028-03; A300 EOS 2026-06 (already lapsed) | v2.76 | NetApp EOA/EOS records |
| AFF C190/A700s, FAS8200 had no EOA/EOS dates despite being close to or past them | Added: C190 EOS 2027-06; A700s EOS 2026-06 (lapsed); FAS8200 EOS 2027-06 | v2.76 | NetApp EOA/EOS records |
| FAS500f described as "real current-generation" platform | It's EOA 2022-06/EOS 2027-06 — simply uncatalogued before v2.70, not new hardware | v2.76 | NetApp EOA/EOS records |
| FAS500f ports were AFF A250 placeholders (`data: e0c/e0d`, `san: 0e/0f`, 2 PCIe slots) | Real (sourced): `data: e4a-e4d` (10GbE host), `san: 2a-2d` (FC host), 4 PCIe slots | v2.76 | docs.netapp.com/us-en/ontap-systems/fas500f/install-detailed-guide.html |
| `FIRMWARE_VERSIONS.switches["BES-53248"]` latest was `3.10.0.3` | `3.12.0.1` | v2.76 | NetApp firmware-support-matrix |
| `FIRMWARE_VERSIONS.switches["Nexus 9336C-FX2"]` latest was `10.4(2)F` (actually the AFX-generation 9332D-GX2A/9364D-GX2A firmware train, not 9336C-FX2's) | `9.3(12)` — 9336C-FX2 is EOA and never ran NX-OS 10.x | v2.76 | NetApp firmware-support-matrix |
| `NVIDIA SN2100` had no entry in `FIRMWARE_VERSIONS.switches` despite `parser.js` detecting it, so BP_SWITCH_RCF could never check it | Added: latest `5.11.0` (Cumulus Linux) | v2.76 | NetApp switch firmware records |
| `FIRMWARE_VERSIONS.sp` (SP/BMC-by-model) was never through the sourced-correction process; grouped A1K/A90/A70/A50/A30 together at one value and was missing several platforms entirely (FAS90/70, C80, A20, C60/C30, A700s, FAS9000, A200, FAS2650/2620, FAS8060/8080, FAS2820) | Rebuilt per real independent per-family firmware tracks (6 families, not 1), sourced from NetApp KB (CONTAP-474887/344840/705061/323139/657167/323134); A50/A30/A20/C60/C30/FAS50 now correctly split from A1K/A90/A70/C80/FAS90/FAS70 (they use different firmware, matching the already-known port-scheme family split) | v2.76 | NetApp firmware-support-matrix + per-model KB articles |
| `BP_SP_FIRMWARE`'s catalog lookup used `.find()` on object-insertion order with `startsWith()`, so a shorter key (`"AFF A90"`) listed earlier could shadow a longer, more specific key (`"AFF A900"`) that's really a match too — AFF A900/A300 and ASA A900 were silently checked against the wrong platform's firmware baseline | Lookup now picks the longest matching key, independent of object key order | v2.76 | Code inspection, not a data-source fix |
| `ONTAP_LIFECYCLE`'s `releaseDate`/`endDate` had drifted independently from this file's own Version Registry table (above), by 1-9 months on most rows, worst on 9.17.1 (~7 months) | Realigned to exactly match this table's GA/End-Full-Support columns | v2.76 | This file's own ONTAP Version Registry (internal consistency fix) |
| 9.10.1 and 9.11.1 marked `status: "end_of_support"` ("no patches or security fixes available") | Both are still in their Limited Support window today (End Limited Support Jan/Jul 2027) — corrected to `"limited_support"` | v2.76 | This file's own End Limited Support dates, checked against today's date |
| `latestPatch` was stale on every version 9.9.1 through 9.19.1 (e.g. 9.17.1 showed `P1`, real latest is `P11`) | Refreshed from current NetApp ONTAP downloads-page data | v2.76 | mysupport.netapp.com/site/products/all/details/ontap9/downloads-tab |
| `js/parser.js` model-detection keyword fallback misclassified AFF A900/A700/A300/A200, ASA A900/C800 as the shorter A90/A70/A30/A20/C80 sibling (prefix-shadowing, same bug class as the already-fixed AFX 1K/9336C) | Reordered longest-keyword-first; added missing branches + a generic ASA fallback regex | v2.76 | Code inspection, not a data-source fix |
| `js/parser.js` never recognized the modern tabular `storage aggregate show` / `storage disk show -container-type spare` formats — the current default ONTAP commands for both | New dedicated passes for both, including wrapped long aggregate names | v2.76 | ONTAP CLI output conventions |
| `js/parser.js` HA status regex required `true`/`false` in the wrong column (partner name is actually there; `Possible` is column 3) | Fixed column mapping to match real `storage failover show` output | v2.76 | ONTAP CLI output conventions |
| `js/parser.js` LIFs required admin/oper as two separate tokens and a per-row repeated vserver name; real `network interface show` combines them (`up/up`) and groups under one vserver header line | Rewritten to match real default output; old assumption kept as a fallback | v2.76 | ONTAP CLI output conventions |
| `js/parser.js` Broken Disks / Health Alerts required the CLI command text to be echoed before searching for data rows — never true for per-file multi-bundle captures | Search for the row pattern directly, no command-echo anchor required | v2.76 | Code inspection, consistent with existing STORAGE-SHELF.txt per-file handling |

---

## Update Procedure

When a new ONTAP version is released or a platform changes support status:

### 1. Verify release data
- [ ] Run `python tools/harvest_ontap_lifecycle.py` then `python tools/apply_ontap_lifecycle.py` (or click "Check for Updates" in-app) — pulls NetApp's own release-support-reference.html (primary) + endoflife.date (cross-check) + the EOA platform index automatically and reports drift
- [ ] Check https://docs.netapp.com/us-en/ontap/release-notes.html for new/dropped platforms
- [ ] Check https://hwu.netapp.com for platform max ONTAP changes
- [ ] Check NetApp's downloads page (requires support-site login — not automatable here) for the real latest P-release per branch
- [ ] Update the tables in this document (DATA_SOURCES.md) first

### 2. Update js/compatibility.js
- [ ] `ONTAP_LIFECYCLE` — add new version entry; GA/End-Full/End-Limited dates from step 1's harvest (or GA + 3y/+5y by hand), `latestPatch` from the manual P-release check above
- [ ] `ONTAP_HOPS` — add upgrade paths FROM and TO the new version
- [ ] `maxOntap` for platforms dropping support (check HWU)
- [ ] `minOntap` for newly introduced platforms
- [ ] Compact profile section (lines ~1383+)
- [ ] Full profile section maxOntap values

### 3. Update js/ui.js
- [ ] `targetOptions` array (lines ~305 and ~3602) — add new version string
- [ ] `ONTAP_HOPS` table (lines ~34-120) — add rows for new version
- [ ] `resolveBaseVersionKey()` (lines ~191-210) — add base version mapping
- [ ] `compliantVersions` (line ~1797) — add if in Full Support

### 4. Update js/bestPractices.js
- [ ] Sync any inline `ONTAP_LIFECYCLE` or compliance thresholds

### 5. Build, commit, tag, push
```
python build_standalone.py
git add -A
git commit -m "Update: ONTAP X.Y.1 data refresh per DATA_SOURCES.md"
git tag -a vX.YY -m "vX.YY - ONTAP X.Y.1 data refresh"
git push origin main && git push origin vX.YY
```

---

## Maintenance Schedule

NetApp releases ONTAP approximately twice per year (Q1 and Q2/Q3):

| When | Action |
|------|--------|
| January | Check for Q4 release. Update lifecycle + hops + maxOntap |
| May/June | Check for Q2 release. Update lifecycle + hops + maxOntap |
| Quarterly | Spot-check endoflife.date for status changes |
| Platform announcement | Add new platform profile to compatibility.js immediately |

---

Copyright (c) 2026 Eugene Beauzec. All Rights Reserved.