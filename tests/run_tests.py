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
