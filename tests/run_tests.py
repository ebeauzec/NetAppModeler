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
    // 3.12.0.1 — a switch running anywhere from 1.3.0.1 to 3.12.0.0 was silently
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
    check('runAudit: BP_SWITCH_RCF flags BES-53248 on 1.3.0.1 as outdated (real latest is 3.12.0.1, not the old 1.3.0.1 threshold)',
      !!swReportOutdated && swReportOutdated.status === 'warning', swReportOutdated);

    var switchStateCurrent = JSON.parse(JSON.stringify(switchStateOutdated));
    switchStateCurrent.switches[0].version = '3.12.0.1';
    var switchReportsCurrent = runAudit(switchStateCurrent);
    var swReportCurrent = switchReportsCurrent.find(function(r) { return r.id === 'BP_SWITCH_RCF'; });
    check('runAudit: BP_SWITCH_RCF reports compliant for BES-53248 on the real current version 3.12.0.1',
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

    // --- bestPractices.js: BP_SP_FIRMWARE catalog lookup picks the longest matching key,
    // not the first one in object order (confirmed bug: "AFF A90" is a prefix of "AFF A900",
    // and with "AFF A90" listed first in FIRMWARE_VERSIONS.sp, every AFF A900 system was
    // silently checked against AFF A90's firmware baseline instead of its own) ---
    var a900SpState = {
      version: { model: 'AFF A900', ontap: '9.19.1' },
      nodes: [{ name: 'node-a', memoryGB: 256, cpus: 32, ports: [] }, { name: 'node-b', memoryGB: 256, cpus: 32, ports: [] }],
      shelves: [], aggregates: [], spares: [], licenses: [], expansionCards: [], switches: [],
      metrocluster: 'none', spFirmware: [{ node: 'node-a', version: '16.7' }, { node: 'node-b', version: '16.7' }],
      diskFirmware: [], acpStatus: {}
    };
    var a900SpReports = runAudit(a900SpState);
    var a900SpReport = a900SpReports.find(function(r) { return r.id === 'BP_SP_FIRMWARE'; });
    check('runAudit: BP_SP_FIRMWARE matches "AFF A900" to its own catalog entry (16.7), not "AFF A90"\'s (18.6)',
      !!a900SpReport && a900SpReport.status === 'compliant', a900SpReport);

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

    // --- parser.js: onboard SAS Host Adapter extraction (sysconfig -a dumps list these as
    // "slot 0: SAS Host Adapter 0a (PMC-Sierra PM8001 rev. C, SAS, <UP>)", a different line
    // shape than the "port <name> up ..." format above, and real dumps can spread these
    // lines tens of thousands of characters past the per-node port-parsing window due to
    // verbose per-disk detail between each adapter entry — confirmed against a real customer
    // ASUP with a ~41000-char gap). 25000 chars of filler here deliberately exceeds the
    // 15000-char per-node window to prove the whole-document SAS-adapter pass isn't bounded
    // by it. ---
    var sasAsup = [
      'System ID: 300 (node-sas); System Serial Number: 1000000300',
      filler('sas-header-section', 2000),
      'node-sas details:',
      'port e0a up 1000 full-duplex cluster-interconnect',
      'port e0b up 1000 full-duplex cluster-interconnect',
      'port e0c up 1000 full-duplex data',
      'port e0d up 1000 full-duplex data',
      filler('sas-disk-detail-section', 25000),
      '\tslot 0: SAS Host Adapter 0a (PMC-Sierra PM8001 rev. C, SAS, <UP>)',
      '\tslot 0: SAS Host Adapter 0b (PMC-Sierra PM8001 rev. C, SAS, <UP>)',
      '\tslot 0: SAS Host Adapter 0c (PMC-Sierra PM8001 rev. C, SAS, <UP>)',
      '\tslot 0: SAS Host Adapter 0d (PMC-Sierra PM8001 rev. C, SAS, <DOWN>)'
    ].join('\n');
    var sasParsed = parseASUP(sasAsup);
    var sasNode = sasParsed.nodes.find(function(n) { return /node.?sas/i.test(n.name); });
    var sasStoragePorts = sasNode && sasNode.ports ? sasNode.ports.filter(function(p) { return p.type === 'storage'; }) : [];
    check('parseASUP: onboard SAS Host Adapter lines are captured as storage ports even ~25000 chars past the per-node window',
      sasStoragePorts.length === 4,
      sasNode ? sasNode.ports.map(function(p){return p.name + ':' + p.type;}) : null);
    check('parseASUP: SAS Host Adapter <DOWN> status is captured correctly',
      sasStoragePorts.some(function(p) { return p.name === '0d' && p.status === 'down'; }),
      sasStoragePorts);
    check('parseASUP: SAS Host Adapter pass does not clobber the real "port ..." pass\'s cluster/data ports',
      !!sasNode && sasNode.ports.filter(function(p) { return p.type !== 'storage'; }).length === 4,
      sasNode ? sasNode.ports.map(function(p){return p.name + ':' + p.type;}) : null);

    // --- parser.js: aggregate capacity falls back to aggr-info.xml when no "Size: X,
    // Usable: Y, Used: Z, Free: W" line is present. Found live on a real ASUP whose only
    // aggregate dump was "aggr status -r" (RAID/disk membership only, no capacity numbers
    // at all) — every real aggregate silently stayed at 0 GB usable/used/free, showing
    // "Usable Total: 0 GB" in the Before/After comparison view. size = available_size +
    // usedsize in real data (120740423036928 = 49055440392192 + 71684982644736), decimal GB. ---
    var aggrCapAsup = [
      'Aggregate test_data_aggr1 (online, raid_dp) (block checksums)',
      '  Plex /test_data_aggr1/plex0 (online, normal, active, pool0)',
      '    RAID group /test_data_aggr1/plex0/rg0 (normal, block checksums)',
      '',
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<T_AGGR_INFO>',
      '<asup:ROW col_time_us="1">',
      '<name>test_data_aggr1</name>',
      '<uuid>abc-123</uuid>',
      '<size>120740423036928</size>',
      '<available_size>49055440392192</available_size>',
      '<usedsize>71684982644736</usedsize>',
      '</asup:ROW>',
      '</T_AGGR_INFO>'
    ].join('\n');
    var aggrCapParsed = parseASUP(aggrCapAsup);
    var aggrCapResult = aggrCapParsed.aggregates.find(function(a) { return a.name === 'test_data_aggr1'; });
    check('parseASUP: aggregate capacity falls back to aggr-info.xml when no text "Size:" line exists',
      !!aggrCapResult && aggrCapResult.usableGB === 120740 && aggrCapResult.usedGB === 71685 && aggrCapResult.freeGB === 49055,
      aggrCapResult);

    // --- parser.js: modern tabular "storage aggregate show" format is recognized —
    // confirmed real gap 2026-10-13: the only aggregate-inventory pass in this file
    // split on the literal "Aggregate " text from the OLDER "aggr status"/"aggr status -r"
    // style dump; cDOT's current default "storage aggregate show" listing (no such
    // per-row marker) matched nothing at all, silently replacing every real aggregate
    // with the fully fabricated aggr_data_a/aggr_data_b placeholders. Covers both a
    // short name that fits on one line and a long name ONTAP wraps onto its own line
    // with size/available/etc. on the following indented line. ---
    var tabularAggrAsup = [
      'cluster1::> storage aggregate show',
      'Aggregate     Size Available Used% State   #Vols  Nodes            RAID Status',
      '--------- --------- --------- ----- ------- ------ ---------------- ------------',
      'aggr0_n1     349.3GB   17.21GB   95% online       3 n1               raid_dp, normal',
      'aggr_data_longname_01',
      '              10.00TB    4.00TB   60% online       5 n1               raid_dp, normal',
      '',
      '2 entries were displayed.'
    ].join('\n');
    var tabularAggrResult = parseASUP(tabularAggrAsup);
    var shortNameAggr = tabularAggrResult.aggregates.find(function(a) { return a.name === 'aggr0_n1'; });
    var wrappedNameAggr = tabularAggrResult.aggregates.find(function(a) { return a.name === 'aggr_data_longname_01'; });
    check('parseASUP: "storage aggregate show" tabular format — short single-line name parsed with real capacity, not the fabricated aggr_data_a/b placeholder',
      !!shortNameAggr && shortNameAggr.sizeGB === 349 && shortNameAggr.freeGB === 17,
      shortNameAggr);
    check('parseASUP: "storage aggregate show" tabular format — long wrapped-onto-next-line name parsed with real capacity',
      !!wrappedNameAggr && wrappedNameAggr.sizeGB === 10000 && wrappedNameAggr.freeGB === 4000 && wrappedNameAggr.node === 'n1',
      wrappedNameAggr);

    // --- parser.js: HA status columns were read in the wrong position — confirmed real
    // bug 2026-10-13: the regex required "true"/"false" immediately after the node name,
    // but real "storage failover show" output has the PARTNER node name there instead
    // ("Node  Partner  Possible  State Description"), so the single default command for
    // this field essentially never matched real output, leaving data.haStatus empty and
    // BP_HA_STATUS silently never firing. ---
    var haStatusAsup = [
      'cluster1::> storage failover show',
      '                              Takeover',
      'Node           Partner        Possible State Description',
      '-------------- -------------- -------- -------------------------------------',
      'node1          node2          true     Connected to node2',
      'node2          node1          false    Waiting for giveback of aggregates',
    ].join('\n');
    var haStatusResult = parseASUP(haStatusAsup);
    var haNode1 = haStatusResult.haStatus.find(function(h) { return h.node === 'node1'; });
    var haNode2 = haStatusResult.haStatus.find(function(h) { return h.node === 'node2'; });
    check('parseASUP: HA status parses real "storage failover show" output (node1: possible, connected)',
      !!haNode1 && haNode1.enabled === true && haNode1.partner === 'node2' && haNode1.state === 'Connected to node2',
      haNode1);
    check('parseASUP: HA status parses real "storage failover show" output (node2: not possible, waiting)',
      !!haNode2 && haNode2.enabled === false && /waiting/i.test(haNode2.state),
      haNode2);

    // --- parser.js: modern tabular "storage disk show -container-type spare" format is
    // recognized — confirmed real gap 2026-10-13: the only spare-disk pass in this file
    // required the older "Spare Disks (node): NETAPP model (size, type) - N spares"
    // summary line; cDOT's current default per-disk spare listing (no such summary line
    // anywhere) matched nothing, silently substituting the fully fabricated 1-spare-per-
    // node default and feeding Rule 4 (Spare Disk Availability) fake data. Two spares on
    // node1, one on node2, grouped by (owner, type, size) as real per-disk rows. ---
    var tabularSparesAsup = [
      'cluster1::> storage disk show -container-type spare',
      '                     Usable           Disk    Container   Container',
      'Disk                   Size Shelf Bay Type    Type        Name      Owner',
      '---------------- ---------- ----- --- ------- ----------- --------- --------',
      '1.0.0                1.75TB     0   0 SSD     spare       -         node1',
      '1.0.1                1.75TB     0   1 SSD     spare       -         node1',
      '1.0.2                1.75TB     0   2 SSD     spare       -         node2',
      '',
      '3 entries were displayed.'
    ].join('\n');
    var tabularSparesResult = parseASUP(tabularSparesAsup);
    var node1Spares = tabularSparesResult.spares.find(function(s) { return s.node === 'node1'; });
    var node2Spares = tabularSparesResult.spares.find(function(s) { return s.node === 'node2'; });
    check('parseASUP: "storage disk show -container-type spare" tabular format — real per-node spare counts, not the fabricated 1-per-node default',
      !!node1Spares && node1Spares.count === 2 && !!node2Spares && node2Spares.count === 1,
      tabularSparesResult.spares);

    // --- parser.js: LIFs parse real default "network interface show" output — confirmed
    // real gap 2026-10-13: the only LIF pass required admin/oper as two separate
    // space-delimited "up"/"down" tokens and the vserver name repeated on every row, but
    // real default output combines them into one "up/up"-style field and groups LIFs
    // under a single Vserver header line instead. Covers a home LIF, an off-home+down
    // LIF (home node name isn't knowable from this command, only the Is-Home boolean),
    // and vserver grouping across two vservers. ---
    var lifAsup = [
      'cluster1::> network interface show',
      '            Logical    Status     Network            Current    Current Is',
      'Vserver     Interface  Admin/Oper Address/Mask        Node       Port    Home',
      '----------- ---------- ---------- ------------------ ---------- ------- ----',
      'vs1',
      '            data1      up/up      10.0.0.5/24        node1      e0c     true',
      '            data2      up/down    10.0.0.6/24        node2      e0c     false',
      'vs2',
      '            mgmt       up/up      10.0.0.1/24        node1      e0M     true',
      '3 entries were displayed.'
    ].join('\n');
    var lifResult = parseASUP(lifAsup);
    var homeLif = lifResult.lifs.find(function(l) { return l.lif === 'data1'; });
    var offHomeLif = lifResult.lifs.find(function(l) { return l.lif === 'data2'; });
    var vs2Lif = lifResult.lifs.find(function(l) { return l.lif === 'mgmt'; });
    check('parseASUP: LIFs — real "network interface show" combined admin/oper "up/up" field parses as a home, up/up LIF',
      !!homeLif && homeLif.statusAdmin === 'up' && homeLif.statusOper === 'up' && homeLif.isHome === true,
      homeLif);
    check('parseASUP: LIFs — off-home, admin-up/oper-down LIF detected (feeds BP_LIF_DOWN / off-home revert warnings)',
      !!offHomeLif && offHomeLif.isHome === false && offHomeLif.statusOper === 'down',
      offHomeLif);
    check('parseASUP: LIFs — vserver grouping correctly attributes LIFs under their own vserver header line, not the previous one',
      !!vs2Lif && vs2Lif.vserver === 'vs2' && !!homeLif && homeLif.vserver === 'vs1',
      { vs2Lif: vs2Lif, homeLif: homeLif });

    // --- parser.js: Broken Disks and Health Alerts no longer require the literal CLI
    // command-echo text to be present first — confirmed real gap 2026-10-13: a per-file
    // multi-bundle ASUP capture (output only, command line never echoed — the same
    // reason STORAGE-SHELF.txt-style per-file sourcing exists elsewhere in this file)
    // would silently find zero broken disks / health alerts regardless of how many
    // actually existed, since the old code required "storage disk show ... -broken" /
    // "health alert show" text to be found before even trying the row pattern. ---
    var noEchoAsup = [
      'random unrelated preface text, no command ever echoed',
      'node1:1.0.5  SAS      15000   broken  disk failure reported',
      'node1    42   critical   Fan module failed in shelf 3',
      'more unrelated trailing text'
    ].join('\n');
    var noEchoResult = parseASUP(noEchoAsup);
    check('parseASUP: broken disks detected without a "storage disk show ... -broken" command-echo line present',
      noEchoResult.brokenDisks.length === 1 && noEchoResult.brokenDisks[0].disk === 'node1:1.0.5' && noEchoResult.brokenDisks[0].reason === 'broken',
      noEchoResult.brokenDisks);
    check('parseASUP: health alerts detected without a "health alert show" command-echo line present',
      noEchoResult.healthAlerts.length === 1 && noEchoResult.healthAlerts[0].severity === 'critical' && noEchoResult.healthAlerts[0].node === 'node1',
      noEchoResult.healthAlerts);

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

    // --- parser.js: keyword-fallback model inference (no "Model Name:"/"System Model:"
    // field present) must not let a shorter model keyword shadow a longer one it's a
    // prefix of — confirmed real bug: "a90" was checked before "a900" existed as its own
    // branch, so any bundle whose only model mention was plain "AFF A900" text (no
    // structured field) was silently misclassified as AFF A90, pointing every downstream
    // port/slot/firmware lookup at the wrong platform. Same bug confirmed for AFF
    // A700/A300/A200, ASA A900/C800 (all now fixed by reordering + adding the missing
    // longer-keyword branches) ---
    var shadowCases = [
      ['random text mentioning AFF A900 once, no structured model field', 'AFF A900'],
      ['random text mentioning ASA A900 once, no structured model field', 'ASA A900'],
      ['random text mentioning AFF A700 once, no structured model field', 'AFF A700'],
      ['random text mentioning AFF A300 once, no structured model field', 'AFF A300'],
      ['random text mentioning AFF A200 once, no structured model field', 'AFF A200'],
      ['random text mentioning AFF C800 once, no structured model field', 'AFF C800'],
      ['random text mentioning ASA C800 once, no structured model field', 'ASA C800'],
      ['random text mentioning ASA A800 once, no structured model field', 'ASA A800'],
    ];
    shadowCases.forEach(function(c) {
      var parsed = parseASUP(c[0]);
      check('parseASUP: keyword-fallback model inference does not let a shorter keyword shadow "' + c[1] + '"',
        parsed.version.model === c[1], parsed.version.model);
    });

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

    // --- ui.js: non-MCC SAS shelf cabling draws real multipath-HA topology (crossed),
    // not same-side pairing. Confirmed against FAS50's own install-cable.html
    // ("Cable controller A port 3d to IOMB port 3. Cable controller B port 3d to IOMA
    // port 3.") — a controller's redundant/return port must land on the OTHER
    // controller's IOM, not its own, or a single controller failure would make that
    // whole IOM module unreachable. Verified by reading the actual rendered SVG path
    // endpoints, not just checking cable count. ---
    resetState();
    document.getElementById('manual-platform-select').value = 'FAS50';
    document.getElementById('manual-nodes-select').value = '2';
    var mccCbFas50 = document.getElementById('deploy-metrocluster');
    if (mccCbFas50.checked) { mccCbFas50.checked = false; mccCbFas50.dispatchEvent(new Event('change', { bubbles: true })); }
    document.getElementById('load-greenfield-btn').click();
    var sasSvg = document.getElementById('visualizer-svg-frame') || document.querySelector('svg');
    var sasPaths = sasSvg ? Array.from(sasSvg.querySelectorAll('path.visual-cable')) : [];
    var returnFromIomA = sasPaths.find(function(p) { var d = p.getAttribute('d'); return d && d.indexOf('M 105,') === 0 && /\d+,\d+$/.test(d) && parseFloat(d.split(' ').pop().split(',')[0]) > 400; });
    var returnFromIomB = sasPaths.find(function(p) { var d = p.getAttribute('d'); return d && d.indexOf('M 570,') === 0 && /\d+,\d+$/.test(d) && parseFloat(d.split(' ').pop().split(',')[0]) < 400; });
    check('non-MCC SAS shelf: IOM-A\'s return cable crosses to Controller B\'s port (x > 400), not back to Controller A',
      !!returnFromIomA, returnFromIomA ? returnFromIomA.getAttribute('d') : sasPaths.map(function(p){return p.getAttribute('d');}));
    check('non-MCC SAS shelf: IOM-B\'s return cable crosses to Controller A\'s port (x < 400), not back to Controller B',
      !!returnFromIomB, returnFromIomB ? returnFromIomB.getAttribute('d') : null);

    // --- loadASUPData: real-ASUP audit dashboard's FIRST cabling render must reflect
    // auto-allocated HBA ports, not just later ones. Found live: a real single-node
    // FAS8040 audit with 12 SAS shelves only has 4 real onboard storage ports, needing
    // an auto-allocated HBA card to cover all 3 four-shelf stacks. allocateHBACardsForState()
    // was only being called inside initStep4Inputs(), AFTER renderCurrentAuditDashboard()
    // already drew the cabling SVG with just the 4 real ports — so the initial dashboard
    // showed a false "No Storage Port" break on the 3rd stack even though the auto-added
    // card (computed moments later) would have covered it. Uses the "manual state" branch
    // of loadASUPData (state.version truthy), the same branch parseASUP output takes,
    // not the greenfield/demo branch (which already called allocation before this point). ---
    var manyShelvesState = {
      version: { model: 'FAS8040', ontap: '9.10.1', serial: 'SAS-EXHAUST-TEST' },
      nodes: [{ name: 'node-sas-exhaust-test', ports: [] }],
      shelves: Array.from({ length: 12 }, function(_, i) {
        return { id: i, model: 'DS2246', cabling: 'Multipath HA', disks: [] };
      }),
      aggregates: [], spares: [], licenses: [], switches: [], expansionCards: [],
      alerts: [], parseWarnings: [], metrocluster: 'none'
    };
    loadASUPData(manyShelvesState, false);
    var exhaustSvg = document.getElementById('visualizer-svg-frame') || document.querySelector('svg');
    var exhaustText = exhaustSvg ? exhaustSvg.textContent : '';
    check('loadASUPData: real-ASUP audit dashboard\'s initial cabling render already reflects auto-allocated HBA ports (no false "No Storage Port")',
      exhaustText.indexOf('No Storage Port') === -1,
      { autoAddedCards: (manyShelvesState.expansionCards || []).filter(function(c){return c.autoAdded;}) });

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


def _check_consumer_imports(consumer_fname, sibling_fnames):
    """Static guard against the bug class found 2026-10-13: a js/*.js file calling a
    symbol exported by a sibling js/*.js file without importing it. This only "works"
    in the standalone bundle, where build_standalone.py concatenates every js/*.js
    file into one shared scope — it strips the `import`/`export` keywords themselves
    but does NOT reorder or remove the symbols those keywords named, so a function
    exported by one file is simply a bare top-level declaration in the bundle,
    reachable from any other file's code by plain name regardless of whether that
    file ever imported it. That masks a real defect: the consumer file is not a
    self-contained ES module when served directly (the documented "Development Mode"
    in README.md) — three real instances of this were found and fixed 2026-10-13:
    js/ui.js calling getShelfCabling() (js/rackLayouts.js) and indexing
    REMEDIATION_REFS (js/compatibility.js) with no import at all (hard crash /
    silent empty-string fallback), and js/bestPractices.js referencing
    FIRMWARE_VERSIONS (js/compatibility.js) behind a `typeof ... !== 'undefined'`
    guard that silently went to the empty-catalog branch with no import (no crash,
    but three firmware-currency audit rules could never fire in dev mode).

    Returns (ok, missing_list) where missing_list is [(symbol, source_filename), ...].
    """
    js_dir = os.path.join(BASE_DIR, "js")
    export_re = re.compile(r'^export\s+(?:const|function|class)\s+(\w+)', re.MULTILINE)

    exported_by = {}  # symbol -> source filename
    for fname in sibling_fnames:
        path = os.path.join(js_dir, fname)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            src = f.read()
        for m in export_re.finditer(src):
            exported_by[m.group(1)] = fname

    consumer_path = os.path.join(js_dir, consumer_fname)
    with open(consumer_path, "r", encoding="utf-8") as f:
        consumer_src = f.read()

    import_lines = [l for l in consumer_src.splitlines() if re.match(r'^\s*import\s*\{', l)]
    imported_symbols = set()
    for line in import_lines:
        m = re.match(r'^\s*import\s*\{([^}]*)\}\s*from', line)
        if m:
            imported_symbols.update(s.strip() for s in m.group(1).split(','))

    # Body with the import lines themselves removed, so a symbol's own import
    # statement doesn't count as a "usage" of it.
    body = "\n".join(l for l in consumer_src.splitlines() if not re.match(r'^\s*import\s*\{', l))

    # Strip comments so a symbol name only mentioned in prose (e.g. a code comment
    # referencing "compatibility.js's FIRMWARE_VERSIONS.switches") isn't mistaken for
    # a real usage. Approximate but sufficient for this lint: block comments first,
    # then line comments (skipping "//" that's part of a URL, e.g. "https://...").
    no_block_comments = re.sub(r'/\*.*?\*/', ' ', body, flags=re.DOTALL)
    no_comments = re.sub(r'(?<!:)//[^\n]*', '', no_block_comments)

    locally_defined_re = re.compile(r'\b(?:function|const|let|var|class)\s+(\w+)')
    locally_defined = set(locally_defined_re.findall(no_comments))

    missing = []
    for symbol, fname in exported_by.items():
        if symbol in imported_symbols or symbol in locally_defined:
            continue
        # Require actual code usage (call, property/index access, or a bare `typeof
        # SYMBOL` guard — the FIRMWARE_VERSIONS bug used exactly that pattern to dodge
        # a ReferenceError while still silently depending on the missing import).
        if re.search(r'\b' + re.escape(symbol) + r'\s*[\(\.\[]', no_comments) or \
           re.search(r'\btypeof\s+' + re.escape(symbol) + r'\b', no_comments):
            missing.append((symbol, fname))

    return len(missing) == 0, missing


def check_module_imports():
    checks = [
        ("ui.js", ["rackLayouts.js", "compatibility.js", "bestPractices.js", "parser.js", "demoData.js"]),
        ("bestPractices.js", ["compatibility.js"]),
    ]
    all_ok = True
    for consumer, siblings in checks:
        ok, missing = _check_consumer_imports(consumer, siblings)
        all_ok = all_ok and ok
        sibling_list = ",".join(s.replace(".js", "") for s in siblings)
        print(f"[{'PASS' if ok else 'FAIL'}] static check: every js/{{{sibling_list}}}.js export used in {consumer} is actually imported there")
        if not ok:
            details = ", ".join(f"{s} (from {f})" for s, f in missing)
            print(f"        details: referenced but not imported: {details}")
    return all_ok


def main():
    if not check_module_imports():
        print("\nStatic import check failed — fix before running the DOM test suite.")
        return 1

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
