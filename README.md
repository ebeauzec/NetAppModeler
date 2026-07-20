# NetApp AutoSupport Analyzer & Modeler (v2.12)

A premium, client-side browser application designed for enterprise NetApp storage administrators and systems engineers to audit, analyze, and size NetApp ONTAP clusters. 

This tool parses NetApp AutoSupport (ASUP) logs to audit hardware configurations, sparing, licensing, cabling, firmware, and ONTAP lifecycle support status. It also includes an interactive sizing modeler to plan storage aggregates and forecast capacity growth.

---

## 🆕 New in this Version (v2.12)
* **Parser Alert Fallback Sanitization:** Completely removed model name checks (`FAS8300`) from demo alert injection in `extractASUPAlerts()`. Real production FAS8300 AutoSupport logs without alerts now report 0 findings with 100% fidelity, eliminating false cabling SPOF and expired license alerts on healthy customer systems.
* **Transparent Partial Parse Warnings:** Added explicit `parseWarnings` tracking and an Amber UI Banner in Step 2. If log regexes fail to extract specific sections (nodes, shelves, aggregates, spares, licenses, or switches) from custom or unusual ASUP formats, a prominent notice explicitly lists which sections are using fallback defaults.
* **License Default Integrity:** Default fallback licenses for unparsed logs now default to `active` instead of injecting a false `expired` SnapMirror license.
* **Cross-Platform Build Script Safety:** Wrapped optional local environment scratch path copies in `build_standalone.py` with safety checks (`os.path.exists`) and exception handling, preventing tracebacks for external contributors.
* **Hardware & Disk Expansion (v2.11):** Added FAS50/70/90, ASA block arrays (ASA A1K-C30), and 61.2TB QLC SSDs.

---

## 🚀 Key Features

* **Resilient ASUP Parser:** Drag-and-drop or import raw NetApp AutoSupport text logs. The parser extracts cluster models, ONTAP versions, node IDs, shelf structures, disk inventories, spares, aggregates, system firmware/BIOS versions, and license keys.
* **Best Practice Audit Engine:** Evaluates cluster compliance against NetApp storage design guidelines:
  * **ONTAP Lifecycle Support:** Checks if your ONTAP release is in active support, limited support, or has reached End of Support.
  * **Cabling Integrity:** Identifies single-path HA cabling risks (Single Points of Failure) and reports multipath HA compliance.
  * **Aggregate Sizing & Capacity Limits:** Audits active aggregate sizes against system maximums and warns at 80%/90% capacity thresholds.
  * **Disk Sparing Compliance:** Verifies that correct spare counts are maintained per loop/pool.
  * **License Expirations:** Audits installed software features for expired or missing entitlements.
  * **Controller System Firmware Checks (New):** Compares motherboard/BIOS versions against platform baselines and prints update command guidelines.
  * **Disk Size & ONTAP Compatibility Audits (New):** Validates SSD drive capacities (e.g. 15.3TB and 30.6TB) against target ONTAP version requirements to prevent software support conflicts.
  * **Disk-level Firmware Parsing (New):** Extracts disk-level firmware versions directly from parentheses formats or sysconfig -a style outputs and renders them in both the shelf inventory lists and comparative cabling tables.
* **Interactive Sizing Modeler:** A scenario planning tool to model:
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
├── README.md                   # Project documentation
├── .gitignore                  # Git ignore rules
│
└── js/                         # JavaScript application logic
    ├── parser.js               # AutoSupport text parser engine
    ├── bestPractices.js        # Best practice audit rules engine
    ├── compatibility.js        # NetApp platform registry, port layouts & support boundaries
    ├── ui.js                   # Wizard workflow controller and interactive sizing UI
    └── jszip.min.js            # Library for compressing/decompressing configurations
```

---

## 💻 How to Run the App (No Server Required)

The easiest and recommended way to run this application is by using the compiled, self-contained standalone file. This requires **no web servers, command lines, or dependencies**.

### Direct File Access Mode (For Admins / Dark Sites)
1. Locate the file **`standalone_netapp_modeler.html`** in this directory.
2. **Double-click** the file (or drag and drop it into any modern web browser: Chrome, Edge, Firefox, Safari).
3. The application will load and execute 100% locally from your system (using the `file://` protocol) with full functionality. No data is sent to external servers, and it does not require an internet connection, making it ideal for restricted corporate dark sites and secure workstations.

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
