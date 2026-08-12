"""
NetAppModeler Regression Test Suite
=====================================
Pins the correctness fixes made in this pass (v2.55+) as automated
regression checks, so a future edit can't silently reintroduce any of them.
This is the check that was missing when those bugs were introduced/found
reactively via git history (44ff7e8, v2.38-v2.53, etc.).

Technique: rebuilds the standalone bundle, injects a test <script> that
exercises the bundle's globally-exposed functions (every top-level function
declaration becomes a `window` property once ES module syntax is stripped
for the flat single-file bundle — see build_standalone.py), runs it
headless via Edge, and reads back a JSON results blob from the DOM. This
follows the same pattern already used by scratch/validate_greenfield.py and
scratch/validate_save_load.py, just made assertion-based and tracked.

Usage:
  python tests/run_tests.py
Exits non-zero if any test fails.
"""

import json
import os
import re
import subprocess
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR)
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
STANDALONE_PATH = os.path.join(BASE_DIR, "standalone_netapp_modeler.html")
TEST_HTML_PATH = os.path.join(BASE_DIR, "test_run.html")  # gitignored, see .gitignore

TEST_SCRIPT = r"""
<script>
window.addEventListener('DOMContentLoaded', function() {
  var results = [];
  function check(name, cond, details) {
    results.push({ name: name, pass: !!cond, details: details === undefined ? null : details });
  }

  try {
    // --- computeUsableCapacityGB: git-verified NS224 MCC example (commit 621068e) ---
    // 24-disk NS224 group, 15300GB disks, MetroCluster mirrored:
    // 22 data disks x 15300GB / 2 = 168300GB usable.
    var mccUsable = computeUsableCapacityGB(24, 15300, 24, true);
    check('computeUsableCapacityGB: MCC 24-disk NS224 group -> 168300GB', mccUsable === 168300, mccUsable);

    // Same disks, non-MCC (no mirror halving) -> 336600GB
    var nonMccUsable = computeUsableCapacityGB(24, 15300, 24, false);
    check('computeUsableCapacityGB: non-MCC same group -> 336600GB', nonMccUsable === 336600, nonMccUsable);

    // Small partial-group addition still charges whole-group parity (2 disks minimum)
    var smallAdd = computeUsableCapacityGB(4, 15300, 24, false);
    check('computeUsableCapacityGB: 4 disks, 1 group -> parity charged once', smallAdd === (4 - 2) * 15300, smallAdd);

    // Zero/negative guards
    check('computeUsableCapacityGB: 0 disks -> 0', computeUsableCapacityGB(0, 15300, 24, false) === 0);

    // --- escapeHtml ---
    var escaped = escapeHtml('<img src=x onerror="alert(1)">');
    check('escapeHtml: strips angle brackets and quotes',
      escaped.indexOf('<') === -1 && escaped.indexOf('>') === -1 && escaped.indexOf('"') === -1,
      escaped);
    check('escapeHtml: null/undefined -> empty string', escapeHtml(null) === '' && escapeHtml(undefined) === '');

    // --- isHighEndPlatform (Task 6 dedup) ---
    check('isHighEndPlatform: AFF A1K is high-end', isHighEndPlatform('AFF A1K') === true);
    check('isHighEndPlatform: AFF A400 is not high-end', isHighEndPlatform('AFF A400') === false);

    // --- rackLayouts.js sanity (sourced cabling data) ---
    var a400Layout = getRackLayout('AFF A400');
    check('getRackLayout: AFF A400 has sourced NS224 shelf-1 cabling',
      !!(a400Layout && a400Layout.shelfCabling && a400Layout.shelfCabling.ns224 && a400Layout.shelfCabling.ns224[1] && a400Layout.shelfCabling.ns224[1].length === 4),
      a400Layout && a400Layout.shelfCabling ? Object.keys(a400Layout.shelfCabling.ns224 || {}) : null);
    check('getRackLayout: unknown platform returns null (no fabrication)', getRackLayout('Totally Fake Platform XYZ') === null);

    // --- ui.js: extractSizeLabel strips the media type back off a #disk-size option's
    // full label (confirmed via a live greenfield MCC repro: newly-added shelf disks stored
    // the whole "1.9TB NVMe SSD" string as both sizeStr AND type, so the Modelled
    // Configuration Transition summary displayed "1.9TB NVMe SSD NVMe SSD") ---
    check('extractSizeLabel: strips trailing media type off a full option label',
      extractSizeLabel('1.9TB NVMe SSD') === '1.9TB', extractSizeLabel('1.9TB NVMe SSD'));
    check('extractSizeLabel: already-clean size string passes through unchanged',
      extractSizeLabel('960GB') === '960GB', extractSizeLabel('960GB'));

    // --- bestPractices.js: BP_SWITCH_RCF uses the real firmware catalog, not a stale
    // hardcoded threshold (confirmed live: the rule compared switch firmware against a
    // hardcoded "1.3.0.1" for BES-53248 that had drifted out of sync with
    // compatibility.js's own FIRMWARE_VERSIONS.switches catalog, whose real latest is
    // 3.10.0.3 — a switch running anywhere from 1.3.0.1 to 3.10.0.2 was silently
    // reporting "compliant") ---
    var switchStateOutdated = {
      version: { model: 'AFF A1K', ontap: '9.19.1' },
      nodes: [{ name: 'node-a', memoryGB: 128, cpus: 16, ports: [] }, { name: 'node-b', memoryGB: 128, cpus: 16, ports: [] }],
      shelves: [], aggregates: [], spares: [], licenses: [], expansionCards: [],
      switches: [{ name: 'CSW-01', model: 'BES-53248', version: '1.3.0.1', role: 'cluster-switch' }],
      metrocluster: 'none', spFirmware: [], diskFirmware: [], acpStatus: {}
    };
    var switchReportsOutdated = runAudit(switchStateOutdated);
    var swReportOutdated = switchReportsOutdated.find(function(r) { return r.id === 'BP_SWITCH_RCF'; });
    check('runAudit: BP_SWITCH_RCF flags BES-53248 on 1.3.0.1 as outdated (real latest is 3.10.0.3, not the old 1.3.0.1 threshold)',
      !!swReportOutdated && swReportOutdated.status === 'warning', swReportOutdated);

    var switchStateCurrent = JSON.parse(JSON.stringify(switchStateOutdated));
    switchStateCurrent.switches[0].version = '3.10.0.3';
    var switchReportsCurrent = runAudit(switchStateCurrent);
    var swReportCurrent = switchReportsCurrent.find(function(r) { return r.id === 'BP_SWITCH_RCF'; });
    check('runAudit: BP_SWITCH_RCF reports compliant for BES-53248 on the real current version 3.10.0.3',
      !!swReportCurrent && swReportCurrent.status === 'compliant', swReportCurrent);

    // --- bestPractices.js: duplicate-report fix (Task 2) ---
    var stateForAudit = {
      version: { model: 'AFF A400', ontap: '9.15.1' },
      nodes: [{ name: 'node-a', memoryGB: 128, cpus: 16, ports: [] }, { name: 'node-b', memoryGB: 128, cpus: 16, ports: [] }],
      shelves: [], aggregates: [], spares: [], licenses: [], expansionCards: [],
      switches: [], metrocluster: 'none', spFirmware: [], diskFirmware: [], acpStatus: {}
    };
    var reports = runAudit(stateForAudit);
    var spFirmwareReports = reports.filter(function(r) { return r.id === 'BP_SP_FIRMWARE'; });
    var diskFirmwareReports = reports.filter(function(r) { return r.id === 'BP_DISK_FIRMWARE'; });
    var acpReports = reports.filter(function(r) { return r.id === 'BP_ACP_STATUS'; });
    check('runAudit: BP_DISK_FIRMWARE reported at most once (no dupes)', diskFirmwareReports.length <= 1, diskFirmwareReports.length);
    check('runAudit: BP_ACP_STATUS reported at most once (no dupes)', acpReports.length <= 1, acpReports.length);
    check('runAudit: BP_SP_FIRMWARE not reported when spFirmware is empty', spFirmwareReports.length === 0, spFirmwareReports.length);

    // --- bestPractices.js: BP_METROCLUSTER real-node-name matching (Task 3) ---
    var mccState = {
      version: { model: 'AFF A1K', ontap: '9.15.1' },
      nodes: [
        { name: 'a1k-node-a1', site: 'A', memoryGB: 512, cpus: 32, ports: [] },
        { name: 'a1k-node-b1', site: 'B', memoryGB: 512, cpus: 32, ports: [] }
      ],
      aggregates: [
        { name: 'aggr_data_a1', node: 'a1k-node-a1', disksCount: 66, usableGB: 100, usedGB: 10, freeGB: 90, raidType: 'raid_dp', isMirrored: true },
        { name: 'aggr_data_b1', node: 'a1k-node-b1', disksCount: 22, usableGB: 100, usedGB: 10, freeGB: 90, raidType: 'raid_dp', isMirrored: true }
      ],
      shelves: [], spares: [], licenses: [{ name: 'MetroCluster', status: 'active' }], expansionCards: [],
      switches: [], metrocluster: 'ip', spFirmware: [], diskFirmware: [], acpStatus: {}
    };
    var mccReports = runAudit(mccState);
    var mccReport = mccReports.find(function(r) { return r.id === 'BP_METROCLUSTER'; });
    check('runAudit: BP_METROCLUSTER detects real site disk imbalance (66 vs 22), not silently compliant',
      !!mccReport && mccReport.status !== 'compliant' && /66/.test(mccReport.description) && /22/.test(mccReport.description),
      mccReport);

    // --- bestPractices.js: BP_MCC_MIRRORING uses real isMirrored, not name guessing (Task 4) ---
    var mirrorState = JSON.parse(JSON.stringify(mccState));
    mirrorState.aggregates = [
      { name: 'aggr_data_a1', node: 'a1k-node-a1', disksCount: 22, usableGB: 100, usedGB: 10, freeGB: 90, raidType: 'raid_dp', isMirrored: false }
    ];
    var mirrorReports = runAudit(mirrorState);
    var mirrorReport = mirrorReports.find(function(r) { return r.id === 'BP_MCC_MIRRORING'; });
    check('runAudit: BP_MCC_MIRRORING flags isMirrored:false even though name has no "sync"/"local" hint',
      !!mirrorReport && mirrorReport.status !== 'compliant',
      mirrorReport);

    // --- parser.js: deterministic hashString (Task 12, replaces Math.random() alert IDs) ---
    var h1 = hashString('Alert: something went wrong on node-a');
    var h2 = hashString('Alert: something went wrong on node-a');
    var h3 = hashString('Alert: something else on node-b');
    check('hashString: same input -> same hash (deterministic)', h1 === h2, [h1, h2]);
    check('hashString: different input -> different hash', h1 !== h3, [h1, h3]);

    // --- parser.js: port-to-node correlation (Task 11, no more blind index chunking) ---
    // Padded to a realistic scale: real ASUP dumps mention every node's name together in
    // an early header block, then list each node's actual ports thousands of characters
    // later in that node's own detail section. A tiny synthetic doc can't exercise the
    // windowing bound meaningfully (any lookahead would trivially "see" both nodes' ports),
    // so this pads ~2000 filler chars between the header block and each node's port list.
    function filler(label, chars) {
      var s = '';
      while (s.length < chars) s += label + ' unrelated ASUP filler content line, not port data. ';
      return s.slice(0, chars);
    }
    var synthAsup = [
      'System ID: 100 (node-one); System Serial Number: 1000000100',
      'System ID: 200 (node-two); System Serial Number: 1000000200',
      filler('header-section', 2000),
      'node-one details:',
      'port e0a up 1000 full-duplex cluster-interconnect',
      'port e0b up 1000 full-duplex cluster-interconnect',
      'port e0c up 1000 full-duplex data',
      'port e0d up 1000 full-duplex data',
      'port e0e up 1000 full-duplex data',
      'port e0f up 1000 full-duplex data',
      filler('between-nodes-section', 2000),
      'node-two details:',
      'port e0a up 1000 full-duplex cluster-interconnect',
      'port e0b up 1000 full-duplex cluster-interconnect'
    ].join('\n');
    var parsed = parseASUP(synthAsup);
    var nodeOne = parsed.nodes.find(function(n) { return /node.?one/i.test(n.name); });
    var nodeTwo = parsed.nodes.find(function(n) { return /node.?two/i.test(n.name); });
    check('parseASUP: node with 6 real ports gets all 6, not chopped to 4',
      !!nodeOne && nodeOne.ports && nodeOne.ports.length === 6,
      nodeOne ? nodeOne.ports.map(function(p){return p.name;}) : null);
    check('parseASUP: second node does not inherit first node\'s ports',
      !!nodeTwo && nodeTwo.ports && nodeTwo.ports.length === 2,
      nodeTwo ? nodeTwo.ports.map(function(p){return p.name;}) : null);

    // --- parser.js: model detection prefers the system-board field over a sub-component's
    // (confirmed against a real customer ASUP: a Flash Cache module's own "Model name:"
    // line was matched before the real system board's, resolving to the wrong platform) ---
    var subComponentFirstAsup = [
      'FMM ID: Flash Cache in slot 4, Model name: X1974A-R6, Serial number: 1234',
      filler('unrelated-diagnostic-section', 500),
      'System Configuration:',
      'Model Name: FAS8040',
      'BIOS version: 9.6'
    ].join('\n');
    var subComponentParsed = parseASUP(subComponentFirstAsup);
    check('parseASUP: model detection prefers system-board "Model Name" (near BIOS version) over an earlier sub-component match',
      subComponentParsed.version.model === 'FAS8040', subComponentParsed.version.model);

    // --- parser.js: Pass 4 keyword-scan shelf ids must be clean small integers, not
    // "<model><index>" string concatenations (confirmed against a real customer ASUP: Set#forEach
    // has no index — its 2nd callback param is the value again — so using it as an array index
    // produced ids like "DS22461" ("DS2246" + 1 via JS string coercion), which could never match
    // any real shelf id discovered elsewhere and left permanent zero-disk ghost shelves) ---
    var keywordOnlyAsup = 'Random text mentioning DS2246 once and DS4246 once, no Shelf N: or SES blocks anywhere.';
    var keywordParsed = parseASUP(keywordOnlyAsup);
    var badGhostIds = keywordParsed.shelves.filter(function(s) { return /[A-Za-z]/.test(s.id); });
    check('parseASUP: keyword-scan shelf ids are clean integers, no "<model><n>" ghost ids',
      keywordParsed.shelves.length === 2 && badGhostIds.length === 0,
      keywordParsed.shelves.map(function(s){ return s.id; }));

    // --- parser.js: "storage disk show -v" key/value disk blocks are recognized (confirmed
    // against two real customer ASUPs where this was the ONLY disk-inventory format present —
    // the "Shelf N:" text these disks nest under carries only SES enclosure telemetry, never a
    // disk manifest, so this parses as one global pass keyed off each block's own "Shelf:" field).
    // Shelf 1 here has no matching Disk: block and its SES header repeats (as real multi-file
    // ASUP bundles do) to pin the duplicate-parseWarnings fix: a shelf with genuinely
    // unparseable disks should warn ONCE despite "Shelf 1:" appearing twice in the text. ---
    var diskBlockAsup = [
      'SES Configuration, shelf 0:',
      ' product identification=DS2246',
      'Vendor-specific information:',
      ' Product Serial Number: SHFHU1511001144',
      'SES Configuration, shelf 1:',
      ' product identification=DS2246',
      'Vendor-specific information:',
      ' Product Serial Number: SHFHU1511001143',
      // Real bundles repeat the same SES header across multiple report files/sections.
      'SES Configuration, shelf 1:',
      ' product identification=DS2246',
      'Vendor-specific information:',
      ' Product Serial Number: SHFHU1511001143',
      'Disk: 0a.00.0',
      'Shelf: 0',
      'Bay: 0',
      'Serial: S3L1B3A0',
      'Vendor: NETAPP',
      'Model: X425_SIRMN1T2A10',
      'Rev: NA01',
      'RPM: 10000',
      'Disk: 0a.00.1',
      'Shelf: 0',
      'Bay: 1',
      'Serial: S3L1B2WC',
      'Vendor: NETAPP',
      'Model: X425_SIRMN1T2A10',
      'Rev: NA01',
      'RPM: 10000'
    ].join('\n');
    var diskBlockParsed = parseASUP(diskBlockAsup);
    var diskBlockShelf = diskBlockParsed.shelves.find(function(s) { return s.id === '0'; });
    check('parseASUP: "storage disk show -v" key/value disk blocks populate real disk counts',
      !!diskBlockShelf && diskBlockShelf.disks.length === 2 && diskBlockShelf.disks[0].sizeGB === 1200,
      diskBlockShelf);

    var shelf1Warnings = (diskBlockParsed.parseWarnings || []).filter(function(w) {
      return /Shelf 1/.test(w.message);
    });
    check('parseASUP: a repeated "Shelf N:" header does not duplicate the same parse warning',
      shelf1Warnings.length === 1, shelf1Warnings);

    // --- parser.js: STORAGE-SHELF.txt "Shelf name:/Shelf id:/Shelf S/N:" format, cross-referenced
    // against storage-shelf.xml's <product_id>/<serial_number> pair to resolve the model (this
    // format carries no model field of its own) — confirmed against a real customer ASUP that had
    // no "Shelf N:" or SES Configuration text at all, where every shelf previously fell through to
    // a fully-fabricated MOCK-SHELF-001. Each physical shelf appears twice (once per IOM module),
    // which the second fixture block below exercises for the dedupe-by-serial behavior. Also pins
    // the "-<generation>" suffix handling: raw "DS212-12" matches the catalog's own bare "DS212",
    // but raw "DS460-12" needs a "C" appended to match the catalog's "DS460C" (no bare "DS460"
    // exists) — both real product_id values seen in the same bundle. ---
    var shelfXmlAsup = [
      '<ROW><shelf_name>1.0</shelf_name><shelf_uid>x</shelf_uid><vendor>NETAPP</vendor>',
      '<product_id>DS212-12</product_id>',
      '<serial_number>SHFHU2003000319</serial_number>',
      '<disk_count>12</disk_count></ROW>',
      '<ROW><shelf_name>1.1</shelf_name><shelf_uid>x</shelf_uid><vendor>NETAPP</vendor>',
      '<product_id>DS460-12</product_id>',
      '<serial_number>SHJHU2002000214</serial_number>',
      '<disk_count>36</disk_count></ROW>',
      'Shelf name:    0b.shelf0',
      'Shelf id:      0',
      'Channel:       0b',
      'Module:        A',
      'Shelf S/N:     SHFHU2003000319',
      'Shelf state:   ONLINE',
      // Same physical shelf, reported again for IOM module B — must not double-add.
      'Shelf name:    0a.shelf0',
      'Shelf id:      0',
      'Channel:       0a',
      'Module:        B',
      'Shelf S/N:     SHFHU2003000319',
      'Shelf state:   ONLINE',
      'Shelf name:    0b.shelf1',
      'Shelf id:      1',
      'Channel:       0b',
      'Module:        A',
      'Shelf S/N:     SHJHU2002000214',
      'Shelf state:   ONLINE'
    ].join('\n');
    var shelfXmlParsed = parseASUP(shelfXmlAsup);
    var xmlShelf0 = shelfXmlParsed.shelves.find(function(s) { return s.serial === 'SHFHU2003000319'; });
    var xmlShelf1 = shelfXmlParsed.shelves.find(function(s) { return s.serial === 'SHJHU2002000214'; });
    check('parseASUP: STORAGE-SHELF.txt shelf resolves model via storage-shelf.xml (bare "DS212" match)',
      !!xmlShelf0 && xmlShelf0.model === 'DS212', xmlShelf0);
    check('parseASUP: STORAGE-SHELF.txt shelf resolves model via storage-shelf.xml ("DS460C", C appended)',
      !!xmlShelf1 && xmlShelf1.model === 'DS460C', xmlShelf1);
    check('parseASUP: STORAGE-SHELF.txt does not double-add a shelf reported once per IOM module',
      shelfXmlParsed.shelves.length === 2, shelfXmlParsed.shelves.map(function(s){return s.serial;}));
    check('parseASUP: STORAGE-SHELF.txt shelves are not the fabricated MOCK-SHELF-001 fallback',
      shelfXmlParsed.shelves.every(function(s){ return s.serial !== 'MOCK-SHELF-001'; }));

    // --- ui.js: greenfield MetroCluster shelf-expansion UI-flow regression matrix.
    // Unlike the checks above (which call exported functions directly), these drive
    // the real app DOM the same way the live browser repro that found these bugs did —
    // resetState() (a top-level function, so it's on `window` in the bundle) instead
    // of clicking #reset-btn, which would block on a native confirm() dialog under
    // headless Edge. Shelf ids are read back from the rendered "NS224\nID: <id>"
    // text in the Modelled Configuration Transition panel, not from internal state
    // (currentState/modeledState are non-exported `let`s, not on `window`). ---
    function extractShelfIds(text) {
      var ids = [];
      var re = /NS224\s*[\r\n]+\s*ID:\s*(\S+)/g;
      var m;
      while ((m = re.exec(text)) !== null) ids.push(m[1]);
      return ids;
    }
    // "Disk Tiers / Sizes" rows only — not the whole page, which also contains the
    // What's New splash's own changelog copy quoting the historical bug string
    // ("...duplicated media-type label (\"1.9TB NVMe SSD NVMe SSD\")...") as
    // release-note prose. A whole-page substring check would false-positive on
    // that quote forever, independent of whether the app itself still has the bug.
    function diskTierLines(text) {
      return text.split('\n').filter(function(l) { return l.indexOf('Disk Tiers') === 0; });
    }
    function runGreenfieldMccShelfAdd(shelfCount) {
      resetState();
      document.getElementById('manual-platform-select').value = 'AFF A1K';
      document.getElementById('manual-nodes-select').value = '2';
      var mccCb = document.getElementById('deploy-metrocluster');
      mccCb.checked = true;
      mccCb.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('load-greenfield-btn').click();
      var shelfSel = document.getElementById('shelf-type');
      shelfSel.value = 'ns224';
      shelfSel.dispatchEvent(new Event('change', { bubbles: true }));
      document.getElementById('shelf-count-input').value = String(shelfCount);
      document.getElementById('next-btn').click();
      return document.body.innerText;
    }

    var mcc1ShelfText = runGreenfieldMccShelfAdd(1);
    var mcc1Ids = extractShelfIds(mcc1ShelfText);
    // Both panels render a full shelf-list snapshot, not a diff: "Before" is the
    // 2-shelf baseline (ids "1","2"); "After" is baseline + 1 new pair = 4 shelves
    // total, of which the LAST 2 are the newly-added symmetric pair.
    var mcc1AfterIds = mcc1Ids.slice(2);
    var mcc1NewIds = mcc1AfterIds.slice(-2);
    check('greenfield MCC + 1 shelf: After panel shows 4 shelves total (2 baseline + 2 new)',
      mcc1AfterIds.length === 4, mcc1AfterIds);
    check('greenfield MCC + 1 shelf: the 2 newly-added shelf ids are clean integers, not "<n>B"',
      mcc1NewIds.every(function(id) { return /^\d+$/.test(id); }), mcc1NewIds);
    check('greenfield MCC + 1 shelf: Disk Tiers rows have no duplicated media-type label',
      diskTierLines(mcc1ShelfText).every(function(l) { return l.indexOf('NVMe SSD NVMe SSD') === -1; }),
      diskTierLines(mcc1ShelfText));

    var mcc2ShelfText = runGreenfieldMccShelfAdd(2);
    var mcc2Ids = extractShelfIds(mcc2ShelfText);
    // Baseline 2 + 2 requested x 2 sites = 6 shelves total in the After panel; the
    // last 4 are the newly-added pairs.
    var mcc2AfterIds = mcc2Ids.slice(2);
    var mcc2NewIds = mcc2AfterIds.slice(-4);
    check('greenfield MCC + 2 shelves: After panel shows 6 shelves total (2 baseline + 4 new)',
      mcc2AfterIds.length === 6, mcc2AfterIds);
    check('greenfield MCC + 2 shelves: the 4 newly-added shelf ids are clean integers',
      mcc2NewIds.every(function(id) { return /^\d+$/.test(id); }), mcc2NewIds);
    check('greenfield MCC + 2 shelves: the 4 newly-added shelf ids are mutually distinct',
      (function() { var s = {}; mcc2NewIds.forEach(function(id){ s[id] = (s[id]||0)+1; }); return Object.keys(s).every(function(k){ return s[k] === 1; }); })(),
      mcc2NewIds);
    check('greenfield MCC + 2 shelves: Disk Tiers rows have no duplicated media-type label',
      diskTierLines(mcc2ShelfText).every(function(l) { return l.indexOf('NVMe SSD NVMe SSD') === -1; }),
      diskTierLines(mcc2ShelfText));

    // --- Non-MCC regression: the shelf-id fix must not affect the plain HA-pair path
    // (which never had the "<n>B" bug — its shelf ids come from a separate, simpler
    // code path — but the fix should leave it untouched either way). ---
    resetState();
    document.getElementById('manual-platform-select').value = 'AFF A1K';
    document.getElementById('manual-nodes-select').value = '2';
    var mccCbOff = document.getElementById('deploy-metrocluster');
    mccCbOff.checked = false;
    mccCbOff.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('load-greenfield-btn').click();
    var shelfSelHa = document.getElementById('shelf-type');
    shelfSelHa.value = 'ns224';
    shelfSelHa.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('shelf-count-input').value = '1';
    document.getElementById('next-btn').click();
    var haText = document.body.innerText;
    var haIds = extractShelfIds(haText);
    check('greenfield non-MCC + 1 shelf: no "Site-A"/"Site-B" split rendered (plain HA pair)',
      haText.indexOf('Site-A Node') === -1 && haText.indexOf('Site-B Node') === -1, haText.indexOf('Site-A Node'));
    check('greenfield non-MCC + 1 shelf: shelf ids are clean integers',
      haIds.every(function(id) { return /^\d+$/.test(id); }), haIds);

    // --- Audit Demo (generatePlatformBaseline, isGreenfield=false): Data Quality panel
    // and node RAM readout. Confirmed live: the audit demo showed "30% Low confidence"
    // with every field "Unknown" (dataSources was never populated for demo/greenfield
    // states — computeOverallConfidence() falls back to a hardcoded 30 when it's empty,
    // which is correct for a genuinely ambiguous real ASUP parse but wrong here, since
    // every field is fully known synthetic data) and "N/A (parse error)" RAM (memoryGB
    // was never set on generated nodes, despite nothing having been parsed at all). ---
    resetState();
    document.getElementById('manual-platform-select').value = 'AFF A1K';
    document.getElementById('manual-nodes-select').value = '2';
    document.getElementById('load-manual-platform-btn').click();
    var demoText = document.body.innerText;
    check('audit demo: Data Quality panel shows Good/100% confidence, not the 30% empty-dataSources fallback',
      demoText.indexOf('Good confidence') !== -1,
      demoText.slice(demoText.indexOf('Data Quality'), demoText.indexOf('Data Quality') + 120));
    check('audit demo: no field in the Data Quality panel reads "Unknown"',
      demoText.slice(demoText.indexOf('Data Quality'), demoText.indexOf('Current Storage')).indexOf('Unknown') === -1);
    // Scoped to the "MOTHERBOARD RAM" row specifically, not the whole page — the
    // What's New splash's own changelog copy for this exact fix quotes the string
    // "N/A (parse error)" while describing the bug, which false-positived a
    // whole-page check the same way the disk-tiers check did earlier in this file.
    var ramLineIdx = demoText.indexOf('MOTHERBOARD RAM');
    var ramLine = ramLineIdx !== -1 ? demoText.slice(ramLineIdx, ramLineIdx + 100) : '';
    check('audit demo: node RAM shows a real value, not "N/A (parse error)"',
      ramLine.indexOf('N/A (parse error)') === -1, ramLine);
    check('audit demo: node RAM readout mentions "128 GB" (the fallback default for platforms with no catalogued ram spec)',
      demoText.indexOf('128 GB RAM') !== -1);

    var resDiv = document.createElement('div');
    resDiv.id = 'test-results';
    resDiv.textContent = JSON.stringify(results);
    document.body.appendChild(resDiv);
  } catch (e) {
    var errDiv = document.createElement('div');
    errDiv.id = 'test-results';
    errDiv.textContent = JSON.stringify([{ name: 'FATAL: uncaught exception during test run', pass: false, details: e.message + '\n' + e.stack }]);
    document.body.appendChild(errDiv);
  }
});
</script>
"""


def main():
    print("Rebuilding standalone bundle...")
    build = subprocess.run([sys.executable, os.path.join(BASE_DIR, "build_standalone.py")],
                            cwd=BASE_DIR, capture_output=True, text=True)
    print(build.stdout)
    if build.returncode != 0:
        print("BUILD FAILED:")
        print(build.stderr)
        return 1

    with open(STANDALONE_PATH, "r", encoding="utf-8") as f:
        html = f.read()
    html = html.replace("</body>", TEST_SCRIPT + "</body>")
    with open(TEST_HTML_PATH, "w", encoding="utf-8") as f:
        f.write(html)

    file_url = "file:///" + os.path.abspath(TEST_HTML_PATH).replace(os.sep, "/")
    cmd = [EDGE_PATH, "--headless", "--disable-gpu", "--dump-dom", file_url]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", timeout=60)

    if os.path.exists(TEST_HTML_PATH):
        os.remove(TEST_HTML_PATH)

    dom = result.stdout
    m = re.search(r'<div[^>]*id="test-results"[^>]*>(.*?)</div>', dom, re.DOTALL | re.IGNORECASE)
    if not m:
        print("FAILED TO RUN TESTS — no #test-results element found in headless output.")
        print("Edge stderr:", result.stderr[:2000])
        return 1

    raw = (m.group(1).strip()
           .replace("&quot;", '"').replace("&#39;", "'")
           .replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&"))
    try:
        outcomes = json.loads(raw)
    except json.JSONDecodeError:
        print("FAILED TO PARSE TEST RESULTS:")
        print(raw[:3000])
        return 1

    failed = 0
    for o in outcomes:
        status = "PASS" if o.get("pass") else "FAIL"
        print(f"[{status}] {o.get('name')}")
        if not o.get("pass"):
            failed += 1
            if o.get("details") is not None:
                print(f"        details: {o.get('details')}")

    print(f"\n{len(outcomes) - failed}/{len(outcomes)} passed.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
