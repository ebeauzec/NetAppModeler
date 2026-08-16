# NetApp AutoSupport Analyzer & Modeler (v2.73)

A premium, client-side browser application designed for enterprise NetApp storage administrators and systems engineers to audit, analyze, and size NetApp ONTAP clusters. 

This tool parses NetApp AutoSupport (ASUP) logs to audit hardware configurations, sparing, licensing, cabling, firmware, and ONTAP lifecycle support status. It also includes an interactive sizing modeler to plan storage aggregates and forecast capacity growth.

---

## 🆕 New in this Version (v2.73)

- **Two new audit rules for aggregate health:** added two new audit rules based on well-established NetApp storage best practices — minimum disk count per aggregate (RAID-DP needs 5+, RAID4 needs 3+, or fault tolerance degrades — required fixing a parser bug where only the first RAID group's disk count was ever counted, undercounting multi-group aggregates), and non-root aggregates with "cfo" HA-policy (a real failover/data-loss risk). The second rule's underlying field has not been confirmed against a real ASUP bundle yet — it only fires when found, never claims false compliance. See `PLATFORM_COVERAGE.md` for details.

<details>
<summary>Earlier changelog (v2.72)</summary>

- **Switch model misidentification fixed:** the switch-detection pattern for "Nexus 9336C-FX2" matched any 9336C-family model string, so other real Cisco 9336C-series switch models could be silently mislabeled as FX2 and checked against the wrong firmware baseline. The detection pattern is now scoped to FX2 specifically.

</details>

<details>
<summary>Earlier changelog (v2.71)</summary>

- **ACP connectivity check gap fixed for DS212C:** the ACP (Alternate Control Path) connectivity check's shelf-detection regex omitted DS212C, so a cluster with only DS212C shelves silently skipped that check entirely. Fixed.

</details>

<details>
<summary>Earlier changelog (v2.70)</summary>

- **New platforms added, one detection bug fixed:** found a real bug — any ASUP reporting "AFX 1K" was silently matched to the "AFX 2K" profile, a distinct model with different specs. Also added recognition for three platforms the catalog didn't previously carry: FAS2850, FAS2880, FAS500f (previously fell through to `Default`). All four are now recognized, with same-family placeholder specs clearly marked "⚠ UNVERIFIED SPECS" pending sourcing from HWU — see `PLATFORM_COVERAGE.md`.

</details>

<details>
<summary>Earlier changelog (v2.69)</summary>

- **Upload warning text wrap fixed:** the v2.67 .7z/.rar warning under the upload drop zone still wrapped awkwardly, reported live — the icon and text weren't in a proper flex layout, so a wrapped line snapped to the container's left edge instead of aligning under the text. Shortened the copy and switched to a flex layout; confirmed it fits on one line at the drop zone's normal width and wraps cleanly (aligned, not left-snapped) at narrow widths.

</details>

<details>
<summary>Earlier changelog (v2.68)</summary>

- **Real ASUP aggregate capacity now populates:** reported live — the "Modelled Configuration Transition" comparison showed "Used: 0 GB (0.0%)" / "Usable Total: 0 GB" on both panels for a real ASUP. The parser only recognized capacity from a single-line "Size: X, Usable: Y, Used: Z, Free: W" CLI format; this ASUP's only aggregate dump was `aggr status -r` output (RAID/disk membership only, no capacity numbers at all), so every real aggregate silently stayed at 0 GB. The parser now also reads `aggr-info.xml` when present — a structured export with real byte-accurate size/available/used fields, cross-referenced by aggregate name. Confirmed against the real system: Usable Total now correctly reads 264.5 TB, Used 199.4 TB (75.4%).
- **Regression suite grew from 50 to 51 tests.**

</details>

<details>
<summary>Earlier changelog (v2.67)</summary>

- **Multi-stack SAS cabling diagram decluttered:** reported live on the same real 12-shelf, 3-stack system. With more than one storage-port stack, every cable used the same color and nearly identical anchor points, so long primary/return cables ran almost perfectly parallel through the same corridor — unreadable. Each stack's full cable set (primary, daisy-chain, crossed return) now gets its own distinct color and fans into its own lane in the diagram's side margins instead of overlapping.
- **File-upload picker's format filter fixed:** the `accept` attribute had a malformed trailing entry that silently restricted the OS file picker to `.zip` only, even though `.tar`, `.tar.gz`/`.tgz`, and `.gz` were always supported by the parser. All of them (plus plain text/log/xml) are now selectable directly. `.7z`/`.rar` genuinely aren't supported (no in-browser decoder for them, by design — this is a pure client-side tool) — that's now stated more clearly instead of implied.

</details>

<details>
<summary>Earlier changelog (v2.66)</summary>

- **Cabling diagram's first render now matches its own HBA auto-allocation:** v2.65 (below) fixed most of the false exhaustion, but one case remained, still visible live after that fix shipped. Root cause: the audit dashboard's cabling diagram was drawn *before* the Intelligent HBA Auto-Allocation step ran, so the first render of a real ASUP's cabling used only the real onboard storage ports, missing whatever HBA card the very next step was about to auto-add for full shelf coverage. Auto-allocation now runs before the initial render. Confirmed against the same real 12-shelf FAS8040 system: the one remaining false exhaustion warning is gone.
- **Regression suite grew from 49 to 50 tests**, adding a case that drives the real-ASUP-audit code path (not the greenfield/demo path, which was never affected) with a 12-shelf single-node state and asserts the *initial* cabling render already reflects auto-allocated ports.

</details>

<details>
<summary>Earlier changelog (v2.65)</summary>

- **Real ASUP storage port counts fixed (root cause of most false exhaustion warnings):** the parser never read onboard SAS Host Adapter ports from real `sysconfig -a` dumps (`slot 0: SAS Host Adapter 0a (...)`) — a different line shape than the network `port` format it already handled, and real dumps can spread these lines 40,000+ characters apart due to verbose per-disk detail, far past the per-node parsing window. Separately, FAS8040's static port catalog only listed 2 storage ports when the real platform has 4, confirmed against a real customer's own ASUP and NetApp's `storage-port.xml` export. Fixed both: the parser now extracts real SAS adapter ports directly from ASUP text for any platform (catalog is fallback only), and FAS8040's catalog entry is corrected.
- **Regression suite grew from 46 to 49 tests**, adding coverage for the new SAS Host Adapter parsing pass (including a case that deliberately pads 25,000 characters between a node's port block and its SAS adapter lines, to prove the new pass isn't bounded by the same window that caused the original bug).

</details>

<details>
<summary>Earlier changelog (v2.58 – v2.64)</summary>

- **Real-ASUP parser fixes:** verified against two real customer ASUP bundles. Model detection could pick up a sub-component's (e.g. Flash Cache module) part number instead of the system board's; a shelf-detection pass produced garbled ghost shelf IDs (`Set#forEach` has no index, so using its 2nd param as one silently mangled IDs); the `storage disk show -v` disk-inventory format — the *only* format present in either real bundle — wasn't recognized at all, zeroing out capacity math; a parse warning duplicated once per repeated shelf header across a bundle's many files; and the `Shelf name:/Shelf id:/Shelf S/N:` shelf format (cross-referenced against `storage-shelf.xml`) is now supported, closing the last gap where a real bundle's shelves fell through to a fully-fabricated placeholder.
- **Greenfield MetroCluster fixes:** adding a shelf to a greenfield MCC deployment produced a garbled Site-B shelf ID (e.g. `3B` next to a clean `3`); a disk-size dropdown's full label (`"1.9TB NVMe SSD"`) was stored as both the size and the type field, showing `"1.9TB NVMe SSD NVMe SSD"` in the capacity-change summary.
- **Data Quality panel & RAM readout fixed for Audit Demo / Greenfield:** these states never populated the parser's data-source tracking, so the report showed every field "Unknown" at a hardcoded 30% confidence (a fallback meant for genuinely ambiguous real ASUP parses, misapplied to fully-known synthetic data) and node RAM as "N/A (parse error)" despite nothing ever being parsed.
- **Switch firmware currency check fixed:** compared parsed switch firmware against a hardcoded threshold that had drifted stale relative to the real firmware catalog already in `compatibility.js` — a switch could be 2+ years out of date and still report "compliant". Also only checked 2 of the 8 switch models the parser recognizes; now checks every model with a catalog entry.
- **SAS shelf cabling diagram fixed to real multipath-HA topology:** the non-MetroCluster cabling diagram (any SAS shelf type — DS460C, DS224C, DS2246, DS212C — on any platform) wired each controller to only one IOM module; a single controller failure would make its exclusive IOM unreachable. Now crosses each controller's redundant port to the other controller's IOM, confirmed against a real install guide and cross-checked against the app's own textual cabling report.
- **One-step launcher:** `launch.py` / `launch.bat` start the local update helper and open the app together — "Check for Updates" works without a manual second terminal.
- **16 platforms now sourced and verified** against NetApp's official install guides with zero drift (up from 6): AFF A400/C400/A800/C800/A900/A1K/A70/A90/A50/A30/A20/C80/C60/C30, FAS70/FAS90/FAS50. Several had been carrying an identical placeholder port scheme since being added. See `PLATFORM_COVERAGE.md` for the full breakdown, including which platforms are confirmed unreachable by this sourcing technique (NetApp doesn't publish a text-cabling page for them) versus which are still open.
- **Regression suite grew from 19 to 46 tests**, including a DOM-driven UI-flow matrix that exercises the real app (greenfield MCC shelf-expansion, audit demo, SAS cabling topology) the same way the live testing that found these bugs did, not just unit-level function calls.

</details>

<details>
<summary>Earlier changelog (v2.51 – v2.57)</summary>

- **v2.57 — "Check for Updates" Button:** re-runs the sourced-data drift check on demand from inside the app. See [Checking for Updates](#-checking-for-updates) below — talks only to a local helper script; the app never reaches the internet on its own.
- **v2.56 — Sourced Cabling Reference Data:** `js/rackLayouts.js` encodes exact NS224-to-controller cable endpoints sourced from NetApp's official public install/cabling guides for AFF A400/C400/A800/C800/A900/A1K — see `DATA_SOURCES.md`. `tools/harvest_reference_data.py` (re)fetches these pages; `tools/apply_reference_data.py` cross-checks them against `compatibility.js`'s port catalog.
- **v2.56 — Port-Catalog Corrections:** that cross-check caught AFF A1K's storage ports not matching any published cabling step, AFF A900's cluster ports listed as onboard when NetApp's guide places them on PCIe slots, and A400/C400/A800/C800 missing their PCIe-slot NS224 storage ports entirely.
- **v2.56 — Automated Regression Suite:** `tests/run_tests.py` rebuilds the bundle and exercises it headless, pinning the v2.55 correctness fixes as automated assertions.
- **v2.55 — Audit Engine Correctness Fixes:** MetroCluster site-symmetry and SyncMirror checks now match real parsed data instead of literal placeholder strings that never matched real ASUPs. Fixed a duplicate-report bug and a crash when selecting a shelf type.
- **v2.55 — Unified Capacity Math:** consolidated 5 independently hand-written usable-capacity formulas into one shared, RAID-DP-correct helper.
- **v2.55 — Parser Hardening:** shelves that parse but end up with zero disks now get a fallback pass and a visible warning. Port-to-node assignment correlated to each node's own text block instead of blind index-chunking.
- **v2.55 — XSS Hardening:** parsed ASUP values rendered into the page are now HTML-escaped at the highest-traffic views.

</details>

---

## 🚀 Key Features

* **Resilient ASUP Parser:** Drag-and-drop or import raw NetApp AutoSupport text logs. The parser extracts cluster models, ONTAP versions, node IDs, shelf structures, disk inventories, spares, aggregates, system firmware/BIOS versions, and license keys.
  * **Newly Parsed Sections:** HA Status, Broken Disks, Health Alerts, SnapMirror, LIFs, Aggregate Space.
* **Best Practice Audit Engine:** Evaluates cluster compliance against NetApp storage design guidelines:
  * **ONTAP Lifecycle Support:** Checks if your ONTAP release is in active support, limited support, or has reached End of Support.
  * **Cabling Integrity:** Identifies single-path HA cabling risks (Single Points of Failure) and reports multipath HA compliance.
  * **Aggregate Sizing & Capacity Limits:** Audits active aggregate sizes against system maximums and warns at 80%/90% capacity thresholds.
  * **Disk Sparing Compliance:** Verifies that correct spare counts are maintained per loop/pool.
  * **License Expirations:** Audits installed software features for expired or missing entitlements.
  * **Controller System Firmware Checks (New):** Compares motherboard/BIOS versions against platform baselines and prints update command guidelines.
  * **Disk Size & ONTAP Compatibility Audits (New):** Validates SSD drive capacities (e.g. 15.3TB and 30.6TB) against target ONTAP version requirements to prevent software support conflicts.
  * **Disk-level Firmware Parsing (New):** Extracts disk-level firmware versions directly from parentheses formats or sysconfig -a style outputs and renders them in both the shelf inventory lists and comparative cabling tables.
  * **5 New Best Practice Rules (21-25):** 
    * Rule 21: Cluster switch RCF versions
    * Rule 22: Front-end port MTU sizing (Jumbo Frames)
    * Rule 23: MetroCluster aggregate SyncMirror status
    * Rule 24: Site hardware symmetry
    * Rule 25: Flash Pool SSD cache ratios
* **Interactive Sizing Modeler:** A scenario planning tool to model:
  * **2 New Demo Profiles:** ASA A400, AFF C800.
  * **Best-Practice Greenfield Baselines (New):** Initializes manual platform selections in a Greenfield state configured perfectly in compliance with best practices (optimal drive sizing solver, default spares, correct licenses, no SPOFs).
  * **Intelligent HBA Card Auto-Allocation (New):** Automatically determines, slots, and cables necessary SAS or RoCE HBA expansion cards when adding shelves based on slot optimization/compliance rules.
  * Node additions and platform upgrades (e.g., FAS to All-Flash AFF).
  * Aggregate configurations (RAID group sizes, disk layout, RAID-DP/RAID-TEC).
  * Storage efficiency gains (Deduplication, Compression, Pattern Detection) with real-time usable capacity forecasting.
* **Advanced MetroCluster Cabling Visualizer (New):** Fully renders dual-site split topologies, dynamically drawing local storage loops, DR replication paths, and expansion HBA cards.
* **100% Client-Side & Secure:** All parsing and calculations run locally in the browser. No data is sent to external servers, making it compliant with strict enterprise data privacy requirements.
* **Single-File Portability:** Compile the entire project (HTML, CSS, JS, libraries) into a single, offline-executable HTML bundle for field use in dark sites.

---

## 🛠️ Architecture & Project Structure

The project is built as a modular client-side web application using vanilla HTML5, CSS3 variables (Dark-Mode/Glassmorphism theme), and ES6 modules.

```
NetAppModeler/
│
├── index.html                  # Main application structure & wizards
├── app.css                     # Premium Dark-Mode / Glassmorphic UI stylesheet
├── build_standalone.py         # Python build script to compile the offline bundle
├── standalone_netapp_modeler.html # Compiled single-file offline distribution
├── launch.py / launch.bat      # One-step launcher: starts the update helper + opens the app
├── README.md                   # Project documentation
├── DATA_SOURCES.md             # Data sourcing/traceability registry (ONTAP lifecycle + cabling)
├── PLATFORM_COVERAGE.md        # Tracks which platforms' port/cabling data is sourced & verified
├── .gitignore                  # Git ignore rules
│
├── js/                         # JavaScript application logic
│   ├── parser.js               # AutoSupport text parser engine
│   ├── bestPractices.js        # Best practice audit rules engine
│   ├── compatibility.js        # NetApp platform registry, port layouts & support boundaries
│   ├── rackLayouts.js          # Sourced controller-to-shelf cable endpoint data
│   ├── ui.js                   # Wizard workflow controller and interactive sizing UI
│   └── jszip.min.js            # Library for compressing/decompressing configurations
│
├── tools/                      # Offline data-refresh tooling (never called by the shipped app)
│   ├── harvest_reference_data.py   # Fetches NetApp's public cabling docs -> data/netapp_docs_raw/
│   ├── apply_reference_data.py     # Cross-checks sourced ports against compatibility.js, flags drift
│   └── update_server.py            # Local helper (127.0.0.1:8765) the in-app "Check for Updates" button talks to
│
├── data/                       # Harvested reference data (raw text + manifest)
│
└── tests/
    └── run_tests.py            # Headless regression suite — run before every commit
```

---

## 💻 How to Run the App (No Server Required)

The easiest and recommended way to run this application is by using the compiled, self-contained standalone file. This requires **no web servers, command lines, or dependencies**.

### Direct File Access Mode (For Admins / Dark Sites)
1. Locate the file **`standalone_netapp_modeler.html`** in this directory.
2. **Double-click** the file (or drag and drop it into any modern web browser: Chrome, Edge, Firefox, Safari).
3. The application will load and execute 100% locally from your system (using the `file://` protocol) with full functionality. No data is sent to external servers, and it does not require an internet connection, making it ideal for restricted corporate dark sites and secure workstations.

---

## 🔄 Checking for Updates

The app itself never reaches the internet on its own — that's the whole point of the dark-site guarantee above. The header's **"Check for Updates"** button instead talks to a small local helper script.

**Easiest: start the app via the launcher instead of opening the HTML file directly.**

- Windows: double-click **`launch.bat`**
- Any OS: `python launch.py`

This starts the local helper (`tools/update_server.py`) in the background and opens `standalone_netapp_modeler.html` for you — "Check for Updates" just works, no manual terminal step. Close the helper's console window whenever you want the app back to fully offline.

**Manual alternative**, if you'd rather keep opening the HTML file directly (or aren't on a platform the launcher supports):

1. Open a terminal in this directory and run:
   ```bash
   python tools/update_server.py
   ```
   This starts a local server on `http://127.0.0.1:8765` — it fetches NetApp's public cabling docs itself (same technique as `tools/harvest_reference_data.py`) and only ever talks back to the app over localhost.
2. Click **Check for Updates** in the app. It reports any drift found between NetApp's published cabling guides and `js/compatibility.js`'s port catalog — it does **not** silently rewrite any source file.
3. If drift is reported, review it and apply the fix by hand (or re-run `python tools/apply_reference_data.py` for the full report), then `python build_standalone.py` to rebuild.
4. Close the terminal running `update_server.py` when you're done — the app goes back to being fully offline.

Why a local helper at all, instead of the app fetching directly? `docs.netapp.com` sends no `Access-Control-Allow-Origin` header, so a browser blocks the app's JS from reading the response even though the request itself would go through — this is a real, verified constraint, not a design choice. The helper has a normal Python network stack and serves its result back over localhost with CORS headers it controls.

---

## 🛠️ How to Compile the Standalone Bundle (For Developers)

If you are modifying the source code (`index.html`, `app.css`, or JavaScript files in `js/`) and wish to compile a new standalone HTML file:

### 1. Development Mode (Serving Modular Files)
To work on modular source files, you must serve them using a local HTTP server to satisfy browser CORS security policies for ES6 modules:
* **Using Python:** Run `python -m http.server 8000` in this directory, then navigate to `http://localhost:8000`.
* **Using VS Code:** Install the **Live Server** extension, open this directory, and click **Go Live**.

### 2. Bundling the Standalone File
Run the build script using Python:
```bash
python build_standalone.py
```
This compiles all files and assets into:
* **`standalone_netapp_modeler.html`**

---

## 🤝 Contributing

Contributions are welcome! Please ensure that:
1. Changes to CSS styles are done within `app.css` using the established design system variables.
2. Changes to compatibility maps, disk catalogs, or port slot details are updated in `js/compatibility.js`.
3. New audit rules are added inside `js/bestPractices.js` following the standard rule format.
4. Prior to committing code, compile the standalone bundle (`python build_standalone.py`) to verify it compiles successfully.

---

## ⚖️ Ownership, Intellectual Property & License Agreement

This project is the sole and exclusive intellectual property of **Eugene Beauzec**. It is protected by copyright and intellectual property laws. See the [LICENSE](LICENSE) file for the full legal text.

### 🔒 Proprietary Ownership & Independent Development Notice:
* **Exclusive Ownership:** All rights, title, and interest in and to this software application (NetApp ASUP Analyzer & Modeler), including source code, specs, workflows, configurations, and user interfaces, remain exclusively vested in **Eugene Beauzec**.
* **Independent Concept:** This application was independently conceived, authored, and assembled by Eugene Beauzec on his own time and using independent resources. It was not created as a work-for-hire, commissioned work, or contractual obligation for any employer, client, or sponsor.
* **Exclusion of Third-Party/Employer IP:** The software does not contain, derive from, or rely upon any confidential information, proprietary material, trade secrets, or non-public systems belonging to any employer, client, or third party.
* **Reservation of Rights:** All rights not expressly granted in writing by Eugene Beauzec are strictly reserved. No person or entity may copy, modify, distribute, or reverse engineer this software without express written authorisation.

### ⚠️ Liability & Hold-Harmless Terms:
**BY USING THIS SOFTWARE, YOU AGREE TO FULLY INDEMNIFY, DEFEND, AND HOLD HARMLESS EUGENE BEAUZEC AND CONTRIBUTORS FROM ANY AND ALL CLAIMS, LIABILITY, DATA LOSS, HARDWARE DAMAGE, SYSTEM DOWNTIME, OR SERVICE DISRUPTION.**

This tool is a configuration estimator/auditing helper only. All hardware topologies, firmware upgrades, and CLI scripts must be validated by certified systems engineers against official NetApp guides before execution. The author assumes no responsibility for actions taken based on this tool's outputs.

Copyright © 2026 Eugene Beauzec. All Rights Reserved.





















