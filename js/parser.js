/**
 * NetApp AutoSupport Parser Engine
 * Handles resilient parsing of text contents from ASUP files or consolidated dumps.
 */

// Escapes regex metacharacters in a string before it's spliced into a dynamically built
// RegExp. Several sections below build a RegExp out of an already-parsed name (aggregate
// name, switch name) to re-scan the ASUP text for more detail on that specific entity —
// without this, a name containing characters like ( ) . * + ? would either throw
// (invalid regex) or silently match the wrong thing.
function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Deterministic string hash (djb2), used to derive stable IDs from parsed text (e.g. alert
// lines) instead of Math.random() — re-parsing the exact same ASUP must yield the exact same
// alert IDs, or any UI state keyed on those IDs (dedupe, acknowledgement tracking) breaks
// across re-parses of identical input.
function hashString(str) {
  let hash = 5381;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) | 0; // hash * 33 + c
  }
  return Math.abs(hash);
}

// Decodes the capacity NetApp encodes directly into a disk part number/model string, for
// formats that carry no separate human-readable size field (confirmed against real customer
// ASUPs — see decodeDiskBlocksFromCombinedText below). Observed conventions across real disk
// models (X425_SIRMN1T2A10, X477_SMBPE04TA07, X364_S16433T8ATE, ...):
//   "<d>T<d>"   -> decimal TB, e.g. "1T2" = 1.2TB, "3T8" = 3.8TB
//   "<dd>T"     -> whole TB (2-digit, zero-padded), e.g. "04T" = 4TB
//   "<ddd(d)>G" -> whole GB, e.g. "960G"
// Returns null (rather than guessing) when the model doesn't match any known convention.
function decodeDiskCapacityFromModel(model) {
  const m = String(model || "");
  let match = m.match(/(\d)T(\d)(?!\d)/);
  if (match) return parseFloat(`${match[1]}.${match[2]}`) * 1000;
  match = m.match(/(\d{2})T(?=[A-Z])/);
  if (match) return parseInt(match[1], 10) * 1000;
  match = m.match(/(\d{3,4})G(?=\d|[A-Z])/);
  if (match) return parseInt(match[1], 10);
  return null;
}

// Helper to convert size string (e.g., "960GB", "1.2TB", "1.9TB") to GB (numeric)
export function parseSizeToGB(sizeStr) {
  if (!sizeStr) return 0;
  const match = sizeStr.match(/([\d.]+)\s*([GT])B?/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'T') {
    return Math.round(val * 1000); // 1.2TB = 1200GB (ONTAP uses decimal standard for disk capacities)
  }
  return Math.round(val);
}

// Helper to format GB to a human-readable string (e.g., 1200 -> "1.2 TB", 960 -> "960 GB")
export function formatGB(gb) {
  if (gb >= 1000) {
    return `${(gb / 1000).toFixed(1)} TB`;
  }
  return `${gb} GB`;
}

export function parseASUP(files) {
  let combinedText = "";
  if (typeof files === "string") {
    combinedText = files;
  } else if (files && typeof files === "object") {
    // Concatenate all text from all files
    combinedText = Object.values(files).join("\n\n");
  }

  const isDemoMode = (typeof files === "object" && files !== null && !!files["DEMO_MODE"]) || combinedText.includes("SHFL-000001");

  const data = {
    version: {
      ontap: "9.7P12", // Default robust fallback
      model: "FAS8300", // Default robust fallback
      serial: "700000111111", // Default robust fallback
      systemFirmware: "v1.0" // Default robust fallback
    },
    nodes: [],
    shelves: [],
    aggregates: [],
    spares: [],
    licenses: [],
    expansionCards: [],
    parseWarnings: [],
    metrocluster: "none",
    switches: [],
    dataSources: {},       // Per-section source tracking: 'parsed'|'inferred'|'default'|'missing'
    missingSections: [],   // Sections not found in ASUP text
    missingCritical: [],   // Critical fields blocking analysis
    missingImportant: [],  // Important but non-blocking fields
    mergeConflicts: [],    // Conflicts when merging multiple ASUPs
    fileManifest: []       // Source file metadata
  };

  // Helper: record data source for a section
  const setSource = (key, source, confidence, note = '') => {
    data.dataSources[key] = { source, confidence, note };
  };

  const lowerText = combinedText.toLowerCase();

  // --- 1. Parse Version ---
  let isOntapParsed = false;
  // Broad set of patterns covering all real-world ONTAP ASUP output formats
  const ontapMatch =
    combinedText.match(/NetApp Release ([\d][\d\.]+[\w\-]*[\d]+)\s*[:P]/i) ||
    combinedText.match(/ONTAP Version:\s*([\d][\d\.]+[\w\-]*)/i) ||
    combinedText.match(/ontap release ([\d][\d\.]+[\w\-]*)/i) ||
    combinedText.match(/running version\s+([\d][\d\.]+[\w\-]*)/i) ||
    combinedText.match(/software version\s+([\d][\d\.]+[\w\-]*)/i) ||
    combinedText.match(/\bversion\b[:\s]+(9\.\d+[\.\d]*[\w\-]*)/i);
  if (ontapMatch) {
    // Store raw version (may include suffix like P1, RC1) and clean version separately
    const rawOntap = ontapMatch[1];
    // Strip patch/RC suffixes: 9.14.1P3 → 9.14.1, 9.13.1RC1 → 9.13.1
    const cleanOntap = rawOntap.replace(/[PR]C?\d+$/i, '').replace(/[-]RC[\d]+$/i, '');
    data.version.ontap = cleanOntap;
    data.version.rawOntap = rawOntap; // preserve original for display
    isOntapParsed = true;
    setSource('ontapVersion', 'parsed', 1.0, `Matched in text: "${ontapMatch[0].trim()}"; clean: ${cleanOntap}`);
  } else {
    setSource('ontapVersion', 'missing', 0, 'No ONTAP version string found in uploaded text');
  }
  
  const sysFirmwareMatch = combinedText.match(/System Firmware Version:\s*([^\r\n]+)/i) ||
                           combinedText.match(/BIOS Version:\s*([^\r\n]+)/i) ||
                           combinedText.match(/Motherboard Firmware:\s*([^\r\n]+)/i) ||
                           combinedText.match(/Controller Firmware:\s*([^\r\n]+)/i);
  if (sysFirmwareMatch) {
    data.version.systemFirmware = sysFirmwareMatch[1].trim();
  }
  
  let isModelParsed = false;
  let modelSource = 'missing';
  // \b before the alternation matters: without it, a bare "Platform" label
  // matches as a substring of unrelated identifiers like a BSD sysctl name
  // "dev.ix.b.iflib.is_vm_platform: 0" (confirmed against a real customer
  // ASUP — a sysctl dump line, not any real model field, was being read as
  // "Platform: 0" and setting the parsed model to the literal string "0").
  // The trailing check that the captured value isn't purely numeric/symbols
  // is a second line of defense against the same class of accidental match —
  // a real NetApp model name always contains letters.
  const isPlausibleModel = (v) => v && /[A-Za-z]/.test(v);

  // "Model Name:" also appears on PCIe expansion modules (e.g. "FMM ID: Flash
  // Cache in slot 4, Model name: X1974A-R6") — confirmed against a real
  // customer ASUP where that flash-cache module's own part number matched
  // BEFORE the actual system board's "Model Name: FAS8040" line later in the
  // same file, so the FIRST match (a sub-component, not the system) won.
  // The real system-board block is reliably followed nearby by "BIOS
  // version:"/"Loader version:" (a controller-only field — expansion modules
  // show "FPGA Release:"/"Serial number:" instead), so scan every candidate
  // and prefer one with that context over just taking the first plausible hit.
  const modelRegex = /\b(?:System Model|Model Name|Platform|system type)\s*:\s*([A-Za-z0-9 \-\/]+)/gi;
  const modelCandidates = [...combinedText.matchAll(modelRegex)].filter(m => isPlausibleModel(m[1].trim()));
  let modelMatch = modelCandidates.find(m => {
    const after = combinedText.slice(m.index, m.index + 300);
    return /BIOS version|Loader version/i.test(after);
  }) || modelCandidates[0];
  if (!modelMatch) {
    modelMatch = [
      combinedText.match(/\bPlatform\s+Type\s*:\s*([A-Za-z0-9 \-\/]+)/i),
      combinedText.match(/\bHardware Model\s*:\s*([A-Za-z0-9 \-\/]+)/i)
    ].find(m => m && isPlausibleModel(m[1].trim()));
  }
  if (modelMatch) {
    // Normalize: strip hyphens, remove -HA/-2P/-HA-2P suffixes, collapse spaces
    let rawModel = modelMatch[1].trim();
    rawModel = rawModel
      .replace(/[-_](HA|2P|2U|HA[-_]2P|HA[-_]2U)\b/gi, '') // strip controller-suffix variants
      .replace(/-/g, ' ')  // hyphens to spaces (AFF-A400 → AFF A400)
      .replace(/\s+/g, ' ')
      .trim();
    data.version.model = rawModel;
    isModelParsed = true;
    modelSource = 'parsed';

    // Resolve NetApp controller part numbers (X####A format) to marketing model names
    // Part numbers appear in sysconfig output as "System Model: X1974A R6" etc.
    // Source: NetApp Hardware Universe / FRU compatibility matrix
    const PART_NUMBER_TO_MODEL = {
      // FAS2xxx series
      'X1966A': 'FAS2620', 'X1967A': 'FAS2650',
      'X1973A': 'FAS2720', 'X1974A': 'FAS2750',
      'X1975A': 'FAS2820',
      // FAS8xxx series
      'X1291A': 'FAS8020',  'X1292A': 'FAS8040',  'X1293A': 'FAS8060',
      'X3218A': 'FAS8200',  'X3244A': 'FAS8300',  'X3245A': 'FAS8700',
      // FAS9xxx series
      'X3262A': 'FAS9000',  'X3263A': 'FAS9500',
      // FAS7xxx series (legacy)
      'X1236A': 'FAS7080',  'X1237A': 'FAS7040',
      // AFF A-series
      'X1969A': 'AFF A220', 'X1972A': 'AFF A200',
      'X3220A': 'AFF A250', 'X3270A': 'AFF A400',
      'X3219A': 'AFF A300', 'X702A':  'AFF A700',
      'X3246A': 'AFF A700s','X3264A': 'AFF A800',
      'X3268A': 'AFF A900', 'X3299A': 'AFF A1K',
      'X3281A': 'AFF A70',  'X3282A': 'AFF A90',
      // AFF C-series
      'X3265A': 'AFF C190', 'X3283A': 'AFF C250',
      'X3284A': 'AFF C400', 'X3285A': 'AFF C800',
      // ASA series (share controller hardware with AFF)
      'X3295A': 'ASA A150', 'X3296A': 'ASA A250',
      'X3297A': 'ASA A400', 'X3298A': 'ASA A900',
      // E-Series (when used in ONTAP context)
      'X4011A': 'E2824',    'X4013A': 'E2860',
      'X4015A': 'E5724',    'X4017A': 'E5760',
    };
    // Strip revision suffix (e.g. "R6", "R4") and look up
    const partBase = rawModel.replace(/\s+R\d+$/i, '').trim().toUpperCase();
    if (PART_NUMBER_TO_MODEL[partBase]) {
      data.version.model = PART_NUMBER_TO_MODEL[partBase];
      data.version.partNumber = rawModel; // preserve original for reference
    }
  } else {
    // Infer from keyword presence — marked as 'inferred', not 'parsed'
    if (lowerText.includes("asa a1k")) { data.version.model = "ASA A1K"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("asa a90")) { data.version.model = "ASA A90"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("asa a70")) { data.version.model = "ASA A70"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("asa a50")) { data.version.model = "ASA A50"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("asa a30")) { data.version.model = "ASA A30"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("asa a20")) { data.version.model = "ASA A20"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("asa c30")) { data.version.model = "ASA C30"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a1k")) { data.version.model = "AFF A1K"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a90")) { data.version.model = "AFF A90"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a70")) { data.version.model = "AFF A70"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a50")) { data.version.model = "AFF A50"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a30")) { data.version.model = "AFF A30"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a20")) { data.version.model = "AFF A20"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("c80")) { data.version.model = "AFF C80"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("c60")) { data.version.model = "AFF C60"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("c30")) { data.version.model = "AFF C30"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a400")) { data.version.model = "AFF A400"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("fas90")) { data.version.model = "FAS90"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("fas70")) { data.version.model = "FAS70"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("fas50")) { data.version.model = "FAS50"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("8300")) { data.version.model = "FAS8300"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a300")) { data.version.model = "AFF A300"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("a250")) { data.version.model = "AFF A250"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("c190")) { data.version.model = "AFF C190"; isModelParsed = true; modelSource = 'inferred'; }
    else if (lowerText.includes("fas")) {
      const match = combinedText.match(/(FAS\d{4})/i);
      if (match) { data.version.model = match[1].toUpperCase(); isModelParsed = true; modelSource = 'inferred'; }
    } else if (lowerText.includes("aff")) {
      const match = combinedText.match(/(AFF\s+[A-Z]?\d{2,3})/i);
      if (match) { data.version.model = match[1].toUpperCase(); isModelParsed = true; modelSource = 'inferred'; }
    }
  }
  // Always record model source so the Data Quality panel never shows ⬜ Unknown
  setSource('model', modelSource, isModelParsed ? (modelSource === 'parsed' ? 1.0 : 0.6) : 0,
    isModelParsed ? `Model: ${data.version.model}` : 'No platform model string found in uploaded text');

  if (!isDemoMode && (!isOntapParsed || !isModelParsed)) {
    data.parseWarnings.push({
      section: "System Version & Model",
      message: `System model or ONTAP release version could not be parsed; using default baseline (${data.version.model} / ONTAP ${data.version.ontap}).`
    });
  }
  
  const serialMatch = combinedText.match(/System Serial Number:\s*([^\r\n]+)/i) ||
                      combinedText.match(/Serial Number:\s*([a-zA-Z0-9]{5,})/i);
  if (serialMatch) {
    data.version.serial = serialMatch[1].trim();
    setSource('serial', 'parsed', 1.0);
  } else {
    setSource('serial', 'missing', 0, 'Serial number not found');
  }

  // --- 1.5. Parse MetroCluster ---
  // Detect MetroCluster configuration type from ASUP content.
  //
  // Real-world ASUP bundles (especially the modern "full" collection, 400+ files)
  // routinely include diagnostic dumps whose incidental text happens to contain
  // MCC-sounding phrases despite the system not being MetroCluster at all:
  //   - CLI help text: "Option '-d' is available only on C-mode Metrocluster
  //     configurations" (a WAFL diagnostic tool's own usage text)
  //   - Fixed table column names: "MCC_IP" as a static queue-type label in a
  //     generic BSD network-queue stats table, value 0
  // A bare "does this phrase appear anywhere in 2-3MB of combined text" check
  // false-positives on exactly this kind of boilerplate — confirmed directly
  // against a real customer ASUP whose own "System Storage Configuration:"
  // field says "Multi-Path HA" (a standard 2-node HA pair), yet the old keyword
  // scan still classified it as MetroCluster IP.
  //
  // Prefer the authoritative "System Storage Configuration:" field (present in
  // standard sysconfig-style ASUP output) when available — it's a single,
  // structured, deliberately-reported fact rather than incidental text, and
  // overrides the weaker keyword scan below when both are present.
  let metrocluster = "none";
  let mccSourceConfidence = 0;
  const storageConfigMatch = combinedText.match(/System Storage Configuration:\s*([^\r\n]+)/i);
  const storageConfigSaysMcc = storageConfigMatch && /metrocluster|stretch\s*mcc|fabric[\s-]attached/i.test(storageConfigMatch[1]);
  const storageConfigSaysNonMcc = storageConfigMatch && !storageConfigSaysMcc;

  const mccKeywords = [
    "metrocluster show", "metrocluster node show", "metrocluster interconnect show",
    "metrocluster ip configuration", "metrocluster check",
    "dr group id", "dr partner node", "local-site", "remote-site",
    "metrocluster active", // from LICENSE section
    "mcc-ip", "mcc_ip", "ip-fabric"
  ];
  const hasMccOutput = mccKeywords.some(k => lowerText.includes(k));

  if (storageConfigSaysNonMcc) {
    // Authoritative field explicitly reports a non-MCC configuration (e.g.
    // "Multi-Path HA") — trust it over incidental keyword hits elsewhere.
    metrocluster = "none";
    mccSourceConfidence = 1.0;
  } else if (storageConfigSaysMcc || hasMccOutput) {
    mccSourceConfidence = storageConfigSaysMcc ? 1.0 : 0.5; // keyword-only match is a weaker signal
    if (lowerText.includes("metrocluster ip") || lowerText.includes("mcc-ip") || lowerText.includes("mcc_ip") ||
        lowerText.includes("ip-fabric") || lowerText.includes("metrocluster ip configuration")) {
      metrocluster = "ip";
    } else if (lowerText.includes("stretch") && (lowerText.includes("metrocluster") || lowerText.includes("mcc"))) {
      metrocluster = "stretch";
    } else {
      metrocluster = "fc";
    }
  }
  setSource('metrocluster', metrocluster === 'none' ? (storageConfigSaysNonMcc ? 'parsed' : 'default') : (mccSourceConfidence >= 1.0 ? 'parsed' : 'inferred'),
    mccSourceConfidence, storageConfigMatch ? `System Storage Configuration: ${storageConfigMatch[1].trim()}` : 'No authoritative storage-configuration field found; based on keyword scan only');

  // Detect MCC node count: look for DR group entries to determine 2-node vs 4-node
  let mccNodeCount = 0;
  if (metrocluster !== "none") {
    // Count unique local-site DR group node entries
    const drGroupMatches = [...combinedText.matchAll(/local-site\s+(\S+)/gi)];
    mccNodeCount = drGroupMatches.length > 0 ? drGroupMatches.length : 2; // default to 2 if not found
    data.mccNodeCount = mccNodeCount; // nodes per site
    data.mccTotalNodes = mccNodeCount * 2; // total across both sites
  }
  data.metrocluster = metrocluster;

  // --- 2. Parse Nodes ---
  // Broad node parsing: handles multiple real ASUP formats
  // Pattern 1: "System ID: 1234567890 (nodename); System Serial Number: 1234567890 (nodename)"
  // Pattern 2: "System ID: 1234567890 (nodename); System Serial Number: 1234567890" (no trailing hostname)
  // Pattern 3: tabular node show output
  const nodeRegex = /System ID:\s*(\d+)\s*\(([^)]+)\);\s*System Serial Number:\s*(\d+)/ig;
  const nodeRegex2 = /System ID:\s*(\d+)\s*\(([^)]+)\)/ig; // minimal match
  let nodeMatch;
  const nodeNames = [];
  // First pass: full match with serial
  while ((nodeMatch = nodeRegex.exec(combinedText)) !== null) {
    const id = nodeMatch[1];
    const name = nodeMatch[2].trim();
    const serial = nodeMatch[3];
    if (!data.nodes.some(n => n.id === id || n.name.toLowerCase() === name.toLowerCase())) {
      data.nodes.push({ id, name, serial });
      nodeNames.push(name);
    }
  }
  // Second pass: try minimal pattern for any remaining nodes not yet found
  if (data.nodes.length === 0) {
    while ((nodeMatch = nodeRegex2.exec(combinedText)) !== null) {
      const id = nodeMatch[1];
      const name = nodeMatch[2].trim();
      // Skip if name looks like a generic label
      if (name.length < 3 || name.match(/^(local|remote|node|controller)$/i)) continue;
      if (!data.nodes.some(n => n.id === id || n.name.toLowerCase() === name.toLowerCase())) {
        // Try to find serial from nearby text
        const nearby = combinedText.substring(combinedText.indexOf(nodeMatch[0]), combinedText.indexOf(nodeMatch[0]) + 200);
        const serialNearby = nearby.match(/Serial Number:\s*(\d{5,})/i);
        data.nodes.push({ id, name, serial: serialNearby ? serialNearby[1] : data.version.serial });
        nodeNames.push(name);
      }
    }
  }
  // Third pass: try node show tabular format "nodename  system-id  serial-number ..."
  if (data.nodes.length === 0) {
    const nodeShowRegex = /^([a-z][a-z0-9\-\.]+)\s+(\d{9,12})\s+(\d{10,12})/gim;
    while ((nodeMatch = nodeShowRegex.exec(combinedText)) !== null) {
      const name = nodeMatch[1].trim();
      const id = nodeMatch[2].trim();
      const serial = nodeMatch[3].trim();
      if (!data.nodes.some(n => n.id === id || n.name.toLowerCase() === name.toLowerCase())) {
        data.nodes.push({ id, name, serial });
        nodeNames.push(name);
      }
    }
  }

  // Fallback nodes if not found
  if (data.nodes.length === 0) {
    if (metrocluster !== "none") {
      // MCC: default to 4-node (2 per site) unless detected as 2-node
      const nodesPerSite = data.mccNodeCount || 2;
      const isTwoNodeMCC = nodesPerSite === 1;
      if (!isDemoMode) {
        data.parseWarnings.push({
          section: "Node Topology",
          message: `MetroCluster detected but node IDs not parsed; using default ${isTwoNodeMCC ? '2-node (1 per site)' : '4-node (2 per site)'} MCC topology.`
        });
      }
      if (isTwoNodeMCC) {
        data.nodes.push({ id: "536870912", name: "node-a", serial: data.version.serial, site: "A", siteRole: "primary" });
        data.nodes.push({ id: "536870913", name: "node-b", serial: data.version.serial + "B", site: "B", siteRole: "primary" });
        nodeNames.push("node-a", "node-b");
      } else {
        data.nodes.push({ id: "536870912", name: "node-a1", serial: data.version.serial, site: "A", siteRole: "primary" });
        data.nodes.push({ id: "536870913", name: "node-a2", serial: data.version.serial + "A2", site: "A", siteRole: "secondary" });
        data.nodes.push({ id: "536870914", name: "node-b1", serial: data.version.serial + "B1", site: "B", siteRole: "primary" });
        data.nodes.push({ id: "536870915", name: "node-b2", serial: data.version.serial + "B2", site: "B", siteRole: "secondary" });
        nodeNames.push("node-a1", "node-a2", "node-b1", "node-b2");
      }
    } else {
      if (!isDemoMode) {
        data.parseWarnings.push({
          section: "Node Topology",
          message: "Controller System IDs and hostname mappings could not be parsed; using default HA pair topology (node-a, node-b)."
        });
      }
      data.nodes.push({ id: "536870912", name: "node-a", serial: data.version.serial });
      data.nodes.push({ id: "536870913", name: "node-b", serial: data.version.serial + "B" });
      nodeNames.push("node-a", "node-b");
    }
  }

  if (data.nodes.some(n => !n.id.startsWith('53687'))) {
    setSource('nodes', 'parsed', 1.0, `${data.nodes.length} controller node(s) parsed from System ID output`);
  } else if (data.nodes.length > 0) {
    setSource('nodes', 'default', 0.3, 'Node IDs not found; using default HA pair fallback');
  }

  // Assign site A/B to parsed nodes based on MCC DR group output
  if (metrocluster !== "none" && data.nodes.length > 0) {
    // Try to parse site assignment from metrocluster node show output
    // Pattern: local-site  node-a1   node-b1
    const localSiteNodes = new Set();
    const remoteSiteNodes = new Set();
    const drGroupLines = combinedText.matchAll(/local-site\s+(\S+)/gi);
    const drRemoteLines = combinedText.matchAll(/remote-site\s+(\S+)/gi);
    for (const m of drGroupLines) localSiteNodes.add(m[1].toLowerCase());
    for (const m of drRemoteLines) remoteSiteNodes.add(m[1].toLowerCase());
  
    if (localSiteNodes.size > 0 || remoteSiteNodes.size > 0) {
      data.nodes.forEach(node => {
        const nameLower = node.name.toLowerCase();
        if (localSiteNodes.has(nameLower)) {
          node.site = 'A'; node.siteRole = 'local';
        } else if (remoteSiteNodes.has(nameLower)) {
          node.site = 'B'; node.siteRole = 'remote';
        }
      });
    } else {
      // Heuristic: first half of nodes = Site A, second half = Site B
      const half = Math.ceil(data.nodes.length / 2);
      data.nodes.forEach((node, idx) => {
        node.site = idx < half ? 'A' : 'B';
        node.siteRole = idx % 2 === 0 ? 'primary' : 'secondary';
      });
    }
  
    // Store site groupings on data for easy consumption
    data.siteANodes = data.nodes.filter(n => n.site === 'A').map(n => n.name);
    data.siteBNodes = data.nodes.filter(n => n.site === 'B').map(n => n.name);
  }

  // Parse memory/CPU sizes per node
  data.nodes.forEach(node => {
    const nodeHeaderIdx = combinedText.indexOf(node.name);
    let nodeBlock = combinedText;
    if (nodeHeaderIdx !== -1) {
      nodeBlock = combinedText.substring(nodeHeaderIdx, nodeHeaderIdx + 15000);
    }
    
    let memGB = 0;
    const memMatch = nodeBlock.match(/(?:System Memory|Memory Size|Memory):\s*(\d+)\s*(GB|MB)/i);
    if (memMatch) {
      const val = parseInt(memMatch[1]);
      const unit = memMatch[2].toUpperCase();
      memGB = unit === 'MB' ? Math.round(val / 1024) : val;
    }
    
    let cpus = 0;
    const cpuMatch = nodeBlock.match(/(?:Number of Processors|Processors|CPUs):\s*(\d+)/i);
    if (cpuMatch) {
      cpus = parseInt(cpuMatch[1]);
    }
    
    node.memoryGB = memGB || 128;
    node.cpus = cpus || 16;
  });

  // --- 3. Parse Shelves & Cabling ---
  // Pass 1: standard format — "Shelf N: MODEL (S/N: xxx) v0212 (Latest: v0224)"
  // Handles: v-prefixed versions, bare numeric versions, SN: and S/N: variants
  const shelfRegex = /Shelf\s+(\d+):\s+([\w\-]+)\s+\((?:S\/N|SN):\s*([^)]+)\)\s+(v?[0-9][0-9A-Z._]*)(?:\s+\(Latest:\s*(v?[0-9][0-9A-Z._]*)\))?/ig;
  let shelfMatch;
  const shelfMap = new Map();

  while ((shelfMatch = shelfRegex.exec(combinedText)) !== null) {
    const shelfId = shelfMatch[1];
    const model = shelfMatch[2].toUpperCase();
    const serial = shelfMatch[3].trim();
    if (!data.shelves.some(s => s.serial === serial || s.id === shelfId)) {
      const shelfObj = {
        id: shelfId, model, serial,
        firmware: shelfMatch[4],
        latestFirmware: shelfMatch[5] || shelfMatch[4],
        cabling: 'Multipath HA', disks: []
      };
      data.shelves.push(shelfObj);
      shelfMap.set(shelfId, shelfObj);
    }
  }

  // Pass 2: IOM6/IOM12 format — "Shelf N: DS2246 (S/N: SHU-xxx) IOM6 Firmware: 0101"
  // DS2246 uses IOM6, DS460C/DS224C use IOM12B, DS4246 uses IOM6
  // Also handles: "IOM6 module firmware revision: 0101", "IOM12B Firmware: IOM12B.0101"
  if (data.shelves.length === 0) {
    const iomRegex = /Shelf\s+(\d+):\s+([\w\-]+)\s+\((?:S\/N|SN):\s*([^)]+)\)\s+(IOM\w+)\s+(?:Firmware|module firmware[^:]*|fw):\s*(\S+)/ig;
    let iomMatch;
    while ((iomMatch = iomRegex.exec(combinedText)) !== null) {
      const shelfId = iomMatch[1];
      const model = iomMatch[2].toUpperCase();
      const serial = iomMatch[3].trim();
      const iomType = iomMatch[4];
      const firmware = iomMatch[5];
      if (!data.shelves.some(s => s.serial === serial || s.id === shelfId)) {
        const shelfObj = {
          id: shelfId, model, serial,
          firmware, latestFirmware: firmware,
          iomType, cabling: 'Multipath HA', disks: []
        };
        data.shelves.push(shelfObj);
        shelfMap.set(shelfId, shelfObj);
      }
    }
  }

  // Pass 3: tabular 'storage shelf show' format — covers ALL shelf models including non-C suffix
  // DS2246, DS4246, DS4486 do NOT have 'C' suffix — previous regex excluded them
  if (data.shelves.length === 0) {
    const allShelfModels = 'DS2246|DS4246|DS4486|DS224C|DS460C|DS212C|DS212|NS224|NS212';
    const tabShelfRegex = new RegExp(
      `^\\s*(\\S+\\.shelf\\d+|shelf[\\-_ ]?\\d+|\\d+\\.\\d+)\\s+(${allShelfModels})\\s+(normal|ok|online)`,
      'gim'
    );
    let tabMatch;
    while ((tabMatch = tabShelfRegex.exec(combinedText)) !== null) {
      const shelfId = tabMatch[1].replace(/\D+/g, '') || String(data.shelves.length + 1);
      const model = tabMatch[2].toUpperCase();
      if (!data.shelves.some(s => s.id === shelfId)) {
        const shelfObj = {
          id: shelfId, model, serial: `AUTO-DISC-${shelfId}`,
          firmware: 'unknown', latestFirmware: 'unknown', cabling: 'Multipath HA', disks: []
        };
        data.shelves.push(shelfObj);
        shelfMap.set(shelfId, shelfObj);
      }
    }
  }

  // Pass 4: keyword scan — if shelf model name appears anywhere, create a minimal entry
  // Handles cases where shelf appears in disk show output but not in sysconfig format
  if (data.shelves.length === 0) {
    const shelfKeywordRegex = /\b(DS2246|DS4246|DS4486|DS224C|DS460C|DS212C|NS224|NS212)\b/ig;
    let kwMatch;
    const foundModels = new Set();
    while ((kwMatch = shelfKeywordRegex.exec(combinedText)) !== null) {
      foundModels.add(kwMatch[1].toUpperCase());
    }
    // Set#forEach passes (value, value, set) — there is no index for a Set — so using
    // the second param as an array-style index previously produced shelfId = model + "1"
    // (e.g. "DS2246" + 1 = "DS22461"), a garbled id that could never match the real
    // shelf ids the SES pass (below) discovers, leaving permanent 0-disk ghost shelves.
    let nextShelfIdx = 0;
    foundModels.forEach((model) => {
      nextShelfIdx += 1;
      const shelfId = String(nextShelfIdx);
      const shelfObj = {
        id: shelfId, model, serial: `AUTO-DISC-${shelfId}`,
        firmware: 'unknown', latestFirmware: 'unknown', cabling: 'Multipath HA', disks: []
      };
      data.shelves.push(shelfObj);
      shelfMap.set(shelfId, shelfObj);
    });
  }

  // Pass 5: SES (SCSI Enclosure Services) format — sasadmin enclosure / storage enclosure show
  // Format: SES Configuration, shelf N: ... product identification=DS2246 ... Product Serial Number: SHFHUxxx
  // Deduplicates by SERIAL first (not shelf ID) to avoid MCC double-counting
  // (both sites have shelf IDs starting at 0; serial is the unique identifier)
  {
    const sesBlocks = combinedText.split(/SES Configuration,\s+shelf\s+(\d+):/i);
    for (let i = 1; i < sesBlocks.length; i += 2) {
      const shelfId = sesBlocks[i].trim();
      const block = sesBlocks[i + 1] ? sesBlocks[i + 1].slice(0, 600) : '';

      const modelMatch  = block.match(/product\s+identification\s*[=:]\s*(\S+)/i);
      const fwMatch     = block.match(/product\s+revision\s+level\s*[=:]\s*(\S+)/i);
      const serialMatch = block.match(/Product\s+Serial\s+Number\s*[=:]\s*(\S+)/i);

      if (!modelMatch) continue;
      const model    = modelMatch[1].toUpperCase();
      const firmware = fwMatch ? fwMatch[1] : 'unknown';
      const serial   = serialMatch ? serialMatch[1].trim() : null;

      // Skip if non-NetApp product (SES can enumerate other enclosures)
      const knownModels = ['DS2246','DS4246','DS4486','DS224C','DS460C','DS212C','NS224','NS212'];
      if (!knownModels.includes(model)) continue;

      // Skip if we already have this exact serial (IOM-A and IOM-B of same shelf have same SES data)
      if (serial && data.shelves.some(s => s.serial === serial)) continue;

      // Try to upgrade an existing AUTO-DISC entry for this shelf ID
      const existingById = data.shelves.find(s => s.id === shelfId && s.serial.startsWith('AUTO-'));
      if (existingById) {
        if (serial) existingById.serial = serial;
        existingById.firmware = firmware;
        existingById.latestFirmware = firmware;
        existingById.model = model;
      } else if (!data.shelves.some(s => s.id === shelfId && !s.serial.startsWith('AUTO-'))) {
        // Only add new shelf if we don't already have a real-serial shelf with this ID
        const finalSerial = serial || `AUTO-DISC-SES-${shelfId}`;
        const shelfObj = {
          id: shelfId, model, serial: finalSerial, firmware,
          latestFirmware: firmware, cabling: 'Multipath HA', disks: []
        };
        data.shelves.push(shelfObj);
        shelfMap.set(shelfId, shelfObj);
      }
    }
  }

  // Pass 6: STORAGE-SHELF.txt "Shelf name:/Shelf id:/Shelf S/N:" key-value format — confirmed
  // against a real customer ASUP where this was the ONLY shelf-listing format present (no
  // "Shelf N:" header, no SES Configuration blocks), so passes 1-5 all found nothing and every
  // shelf fell through to the fully-fabricated MOCK-SHELF-001 fallback below. This format has no
  // model field of its own, but storage-shelf.xml's <product_id>/<serial_number> ROW pair
  // (adjacent per its own DTD field order) reliably cross-references by serial number — verified
  // directly against the real bundle (S/N SHFHU2003000319 -> product_id "DS212-12"). Each
  // physical shelf appears twice in STORAGE-SHELF.txt (once per IOM module A/B), deduped by id.
  if (data.shelves.length === 0) {
    const productIdBySerial = new Map();
    const productIdRegex = /<product_id>([^<]*)<\/product_id>\s*<serial_number>([^<]*)<\/serial_number>/ig;
    let pidMatch;
    while ((pidMatch = productIdRegex.exec(combinedText)) !== null) {
      const productId = pidMatch[1].trim();
      const serial = pidMatch[2].trim();
      if (productId && serial) productIdBySerial.set(serial, productId);
    }

    const knownShelfModels = ['DS2246', 'DS4246', 'DS4486', 'DS224C', 'DS460C', 'DS212C', 'DS212', 'NS224', 'NS212'];
    // Real shelf product-id self-reports drop the marketing "C" suffix for some models (raw
    // "DS212-12", matching the catalog's own "DS212" entry) but not others (no plain "DS460" in
    // the catalog, only "DS460C") — a trailing "-<generation>" number (SAS/PCIe gen, not bay
    // count: a 36-disk DS460C reported "DS460-12" here, not "-60") is always noise either way.
    const resolveShelfModelFromProductId = (productId) => {
      if (!productId) return null;
      const stripped = productId.replace(/-\d+$/, '').toUpperCase();
      if (knownShelfModels.includes(stripped)) return stripped;
      if (knownShelfModels.includes(stripped + 'C')) return stripped + 'C';
      return stripped;
    };

    const shelfBlockRegex = /Shelf name:\s*(\S+)\s*[\r\n]+\s*Shelf id:\s*(\d+)[\s\S]{0,200}?Shelf S\/N:\s*(\S+)/ig;
    let shelfBlockMatch;
    let unresolvedModelWarned = false;
    while ((shelfBlockMatch = shelfBlockRegex.exec(combinedText)) !== null) {
      const shelfId = shelfBlockMatch[2].trim();
      const serial = shelfBlockMatch[3].trim();
      if (data.shelves.some(s => s.serial === serial)) continue; // already added via the other IOM module's block

      const productId = productIdBySerial.get(serial);
      const model = resolveShelfModelFromProductId(productId);
      if (!model && !unresolvedModelWarned) {
        unresolvedModelWarned = true;
        data.parseWarnings.push({
          section: "Disk Shelves",
          message: `Shelf S/N ${serial} was detected in STORAGE-SHELF.txt but no matching <product_id> was found in storage-shelf.xml — its model is unknown.`
        });
      }
      const shelfObj = {
        id: shelfId, model: model || 'Unknown', serial,
        firmware: 'unknown', latestFirmware: 'unknown', cabling: 'Multipath HA', disks: []
      };
      data.shelves.push(shelfObj);
      shelfMap.set(shelfId, shelfObj);
    }
  }

  // setSource for shelves is set AFTER all discovery paths complete (see below)

  // Parse cabling loops
  const cablingRegex = /cabling:\s*loop\s*(\w+)\s*cabled\s*to\s*Shelf\s*(\d+)\s*\([^)]+\)\s*([^\r\n\[]+)/ig;
  let cablingMatch;
  while ((cablingMatch = cablingRegex.exec(combinedText)) !== null) {
    const shelfId = cablingMatch[2];
    const cablingType = cablingMatch[3].trim();
    const shelf = shelfMap.get(shelfId);
    if (shelf) {
      shelf.cabling = cablingType;
    }
  }

  // Parse the "storage disk show -v" / STORAGE-DISK.txt key-value block format — confirmed
  // against two real customer ASUPs, where every shelf's disk inventory lived ONLY in this
  // format (the "Shelf N:" text split below never matched any per-disk model/serial data —
  // that text only carries SES enclosure telemetry, not a disk manifest). Each disk is its own
  // multi-line block carrying its own "Shelf:"/"Bay:" fields, so this runs once globally
  // instead of being scoped to a per-shelf text slice like the passes below.
  {
    const diskBlockRegex = /Disk:\s*(\S+)\s*[\r\n]+\s*Shelf:\s*(\d+)\s*[\r\n]+\s*Bay:\s*(\d+)\s*[\r\n]+\s*Serial:\s*(\S+)\s*[\r\n]+\s*Vendor:\s*NETAPP\s*[\r\n]+\s*Model:\s*(\S+)\s*[\r\n]+\s*Rev:\s*(\S+)(\s*[\r\n]+\s*RPM:\s*(\S+))?/ig;
    let diskBlockMatch;
    while ((diskBlockMatch = diskBlockRegex.exec(combinedText)) !== null) {
      const shelfId = diskBlockMatch[2];
      const shelf = shelfMap.get(shelfId);
      if (!shelf) continue;
      const serial = diskBlockMatch[4].trim();
      if (shelf.disks.some(d => d.serial === serial)) continue;
      const model = diskBlockMatch[5].trim();
      const rpmField = diskBlockMatch[7];
      const isHdd = rpmField && rpmField.trim().toUpperCase() !== 'N/A';
      const sizeGB = decodeDiskCapacityFromModel(model);
      shelf.disks.push({
        slot: parseInt(diskBlockMatch[3], 10),
        model,
        sizeStr: sizeGB != null ? (sizeGB >= 1000 ? `${(sizeGB / 1000).toFixed(1)}TB` : `${sizeGB}GB`) : 'unknown',
        sizeGB: sizeGB != null ? sizeGB : 0,
        type: isHdd ? "SAS HDD" : "SAS SSD",
        firmware: diskBlockMatch[6].trim(),
        serial
      });
      if (sizeGB == null) {
        data.parseWarnings.push({
          section: "Disk Shelves",
          message: `Disk model "${model}" on Shelf ${shelfId} has an unrecognized capacity encoding — its size could not be determined and it won't contribute to capacity/RAID calculations.`
        });
      }
    }
  }

  // Parse disks nested in shelf blocks
  // Unlike shelf *detection* above (5 fallback passes), this only ever tried one disk-line
  // format — a shelf could be confidently marked "parsed" while silently ending up with zero
  // disks (and therefore zero contribution to all downstream RAID/capacity math) whenever the
  // real ASUP used a different disk-listing format within the shelf block. Pass 2 reuses the
  // sysconfig -a tabular pattern already used elsewhere as the no-shelf-detected fallback.
  const shelfSplit = combinedText.split(/Shelf\s+(\d+):/i);
  // A real ASUP bundle repeats "Shelf N:" headers across many report sections/files for the
  // same physical shelf — without tracking which shelf ids we've already warned about, a shelf
  // whose disk format genuinely can't be parsed got the same warning pushed once per repeated
  // occurrence (confirmed against a real customer ASUP: one shelf produced 6 identical warnings).
  const diskParseWarnedShelfIds = new Set();
  for (let i = 1; i < shelfSplit.length; i += 2) {
    const shelfId = shelfSplit[i].trim();
    const shelfText = shelfSplit[i + 1] || "";
    const shelf = shelfMap.get(shelfId);
    if (!shelf) continue;
    if (shelf.disks && shelf.disks.length > 0) continue;

     // Pass 1: "Disk N: NETAPP Model (Size, Type, FW: Rev, S/N: SN)"
     const diskRegex = /Disk\s+(\d+):\s+NETAPP\s+([^\s]+)\s+\(([\d.]+[GT]B),\s*([^,]+),(?:\s*FW:\s*([^,\s)]+),)?\s*S\/N:\s*([^)]+)\)/ig;
     let diskMatch;
     while ((diskMatch = diskRegex.exec(shelfText)) !== null) {
       const sizeGB = parseSizeToGB(diskMatch[3]);
       shelf.disks.push({
         slot: parseInt(diskMatch[1]),
         model: diskMatch[2],
         sizeStr: diskMatch[3],
         sizeGB: sizeGB,
         type: diskMatch[4].trim(),
         firmware: diskMatch[5] ? diskMatch[5].trim() : "NA01",
         serial: diskMatch[6].trim()
       });
     }

     // Pass 2: sysconfig -a tabular format — "0a.10   NETAPP   MODEL   FW   960.0GB   S/N: SN"
     if (shelf.disks.length === 0) {
       const sysconfigRegex = /(\d+[a-z]+)\.(\d+)\s+NETAPP\s+([^\s]+)\s+([^\s]+)\s+([\d.]+)(GB|TB|MB)\s+.*S\/N:\s*([^\s\r\n]+)/ig;
       let sysMatch;
       while ((sysMatch = sysconfigRegex.exec(shelfText)) !== null) {
         const serial = sysMatch[7].trim();
         if (shelf.disks.some(d => d.serial === serial)) continue;
         const sizeVal = sysMatch[5] + sysMatch[6];
         const sizeGB = parseSizeToGB(sizeVal);
         const type = sysMatch[3].includes("X371") || sysMatch[3].includes("X343") || sysMatch[3].includes("NVMe") ? "NVMe SSD" : "SAS HDD";
         shelf.disks.push({
           slot: parseInt(sysMatch[2]),
           model: sysMatch[3],
           sizeStr: sizeVal,
           sizeGB: sizeGB,
           type: type,
           firmware: sysMatch[4].trim(),
           serial: serial
         });
       }
     }

     // Both passes failed — flag it rather than silently leaving a "parsed" shelf with 0 disks,
     // which would otherwise zero out that shelf's contribution to capacity/RAID math with no
     // visible warning anywhere in the Data Quality report.
     if (shelf.disks.length === 0 && !isDemoMode && !diskParseWarnedShelfIds.has(shelfId)) {
       diskParseWarnedShelfIds.add(shelfId);
       data.parseWarnings.push({
         section: "Disk Shelves",
         message: `Shelf ${shelfId} (${shelf.model}) was detected but its disk inventory could not be parsed — this shelf will show 0 disks and won't contribute to capacity/RAID calculations.`
       });
     }
  }

  // If no shelves were parsed, let's search for any disks anywhere in the document
  if (data.shelves.length === 0) {
    const looseDisks = [];
    
    // 1. Try parentheses format: Disk 0: NETAPP Model (Size, Type, FW: Rev, S/N: SN)
    const diskRegex = /Disk\s+(\d+):\s+NETAPP\s+([^\s]+)\s+\(([\d.]+[GT]B),\s*([^,]+),(?:\s*FW:\s*([^,\s)]+),)?\s*S\/N:\s*([^)]+)\)/ig;
    let diskMatch;
    while ((diskMatch = diskRegex.exec(combinedText)) !== null) {
      const serial = diskMatch[6].trim();
      if (!looseDisks.some(d => d.serial === serial)) {
        const sizeGB = parseSizeToGB(diskMatch[3]);
        looseDisks.push({
          slot: parseInt(diskMatch[1]),
          model: diskMatch[2],
          sizeStr: diskMatch[3],
          sizeGB: sizeGB,
          type: diskMatch[4].trim(),
          firmware: diskMatch[5] ? diskMatch[5].trim() : "NA01",
          serial: serial
        });
      }
    }

    // 2. Try sysconfig -a format: 0a.10   NETAPP   X343_S163A960ATE NA01 960.0GB S/N: SN
    if (looseDisks.length === 0) {
      const sysconfigRegex = /(\d+[a-z]+)\.(\d+)\s+NETAPP\s+([^\s]+)\s+([^\s]+)\s+([\d.]+)(GB|TB|MB)\s+.*S\/N:\s*([^\s\r\n]+)/ig;
      let sysMatch;
      while ((sysMatch = sysconfigRegex.exec(combinedText)) !== null) {
        const serial = sysMatch[7].trim();
        if (!looseDisks.some(d => d.serial === serial)) {
          const sizeVal = sysMatch[5] + sysMatch[6];
          const sizeGB = parseSizeToGB(sizeVal);
          const type = sysMatch[3].includes("X371") || sysMatch[3].includes("X343") || sysMatch[3].includes("NVMe") ? "NVMe SSD" : "SAS HDD";
          looseDisks.push({
            slot: parseInt(sysMatch[2]),
            model: sysMatch[3],
            sizeStr: sizeVal,
            sizeGB: sizeGB,
            type: type,
            firmware: sysMatch[4].trim(),
            serial: serial
          });
        }
      }
    }

    if (looseDisks.length > 0) {
      // Group loose disks under a default mock shelf
      if (!isDemoMode) {
        data.parseWarnings.push({
          section: "Disk Shelves",
          message: "Disk shelf headers could not be parsed; discovered drives grouped under default shelf layout."
        });
      }
      const isAllFlash = data.version.model.includes("AFF") || data.version.model.includes("ASA");
      data.shelves.push({
        id: "1",
        model: isAllFlash ? "NS224" : "DS224C",
        serial: "AUTO-DISCOVERED",
        firmware: "v0212",
        latestFirmware: "v0212",
        cabling: "Multipath HA",
        disks: looseDisks.slice(0, 24)
      });
    } else {
      // Create a default shelf layout so the visualizer has something nice to render
      if (!isDemoMode) {
        data.parseWarnings.push({
          section: "Disk Shelves",
          message: "Physical disk shelf inventory could not be parsed; using default shelf layout."
        });
      }
      const isAllFlash = data.version.model.includes("AFF") || data.version.model.includes("ASA");
      const diskType = isAllFlash ? "NVMe SSD" : "SAS HDD";
      const sizeStr = isAllFlash ? "1.9TB" : "1.2TB";
      const sizeGB = isAllFlash ? 1900 : 1200;
      const model = isAllFlash ? "X371_S16431T9ATE" : "X425_H960G12G15K";

      const defaultDisks = Array.from({ length: 24 }, (_, slot) => ({
        slot,
        model,
        sizeStr,
        sizeGB,
        type: diskType,
        serial: `AUTO-${slot}`
      }));

      data.shelves.push({
        id: "1",
        model: isAllFlash ? "NS224" : "DS224C",
        serial: "MOCK-SHELF-001",
        firmware: "v0120",
        latestFirmware: "v0120",
        cabling: "Multipath HA",
        disks: defaultDisks
      });
    }
  }

  // Set shelf data source quality AFTER all discovery paths have run
  {
    const hasRealShelfSerial = data.shelves.some(s => s.serial && !s.serial.startsWith('MOCK') && !s.serial.startsWith('AUTO-'));
    const hasDiscoveredShelf = data.shelves.some(s => s.serial && s.serial.startsWith('AUTO-DISC'));
    const hasLooseDisks = data.shelves.some(s => s.serial === 'AUTO-DISCOVERED');
    if (hasRealShelfSerial) {
      setSource('shelves', 'parsed', 1.0, `${data.shelves.length} disk shelf(ves) parsed from SYSCONFIG output`);
    } else if (hasDiscoveredShelf || hasLooseDisks) {
      setSource('shelves', 'inferred', 0.5, `Shelf model detected from storage show output; serial/firmware unavailable`);
    } else {
      setSource('shelves', 'default', 0.2, 'No shelf inventory found in ASUP text; shelf data is estimated from platform type');
    }
  }

  // Aggregate capacity fallback: aggr-info.xml (present in some real ASUP bundles as a
  // separate structured export) has authoritative <name>/<size>/<available_size>/<usedsize>
  // fields in bytes per <asup:ROW>. Confirmed against a real customer ASUP where the only
  // plain-text aggregate dump present was "aggr status -r" (RAID/disk membership only — no
  // capacity numbers at all, not even wrong ones), so the "Size: X, Usable: Y, Used: Z,
  // Free: W" single-line match below never found anything, silently leaving every real
  // aggregate at 0 GB usable/used/free downstream (blank capacity bars in the audit
  // dashboard and Before/After comparison view). size = available_size + usedsize, verified
  // exactly byte-for-byte against real data. Decimal GB, matching this file's existing
  // parseSizeToGB() convention ("ONTAP uses decimal standard for disk capacities").
  const aggrInfoCapacityByName = {};
  {
    const aggrInfoRowRegex = /<asup:ROW[^>]*>([\s\S]*?)<\/asup:ROW>/g;
    let aggrInfoRowMatch;
    while ((aggrInfoRowMatch = aggrInfoRowRegex.exec(combinedText)) !== null) {
      const rowText = aggrInfoRowMatch[1];
      const nameMatch = rowText.match(/<name>([^<]+)<\/name>/);
      const sizeMatch2 = rowText.match(/<size>(\d+)<\/size>/);
      const availMatch = rowText.match(/<available_size>(\d+)<\/available_size>/);
      const usedMatch2 = rowText.match(/<usedsize>(\d+)<\/usedsize>/);
      if (nameMatch && sizeMatch2 && availMatch && usedMatch2) {
        aggrInfoCapacityByName[nameMatch[1]] = {
          usableGB: Math.round(parseInt(sizeMatch2[1], 10) / 1e9),
          usedGB: Math.round(parseInt(usedMatch2[1], 10) / 1e9),
          freeGB: Math.round(parseInt(availMatch[1], 10) / 1e9)
        };
      }
    }
  }

  const aggrBlocks = combinedText.split(/Aggregate\s+/i);

  if (aggrBlocks.length > 1) {
    for (let i = 1; i < aggrBlocks.length; i++) {
      const block = aggrBlocks[i];
      const lines = block.split('\n');
      if (lines.length === 0) continue;
      
      const headerLine = lines[0];
      const headerMatch = headerLine.match(/^([^\s(]+)\s+\(([^)]+)\)/);
      if (!headerMatch) continue;
      
      const aggrName = headerMatch[1];
      if (data.aggregates.some(a => a.name === aggrName)) continue;
      const aggrStatus = headerMatch[2];
      
      let raidType = "raid_dp";
      if (aggrStatus.includes("raid_dp")) raidType = "raid_dp";
      else if (aggrStatus.includes("raid_tec")) raidType = "raid_tec";
      else if (aggrStatus.includes("raid4")) raidType = "raid4";
      // MetroCluster SyncMirror status is reported inline in the same parenthetical,
      // e.g. "aggr1 (raid_dp, mirrored, normal)" — captured here since it's already parsed.
      const isMirrored = /\bmirrored\b/i.test(aggrStatus);
      
      let sizeGB = 0, usableGB = 0, usedGB = 0, freeGB = 0;
      const sizeLine = lines.find(l => l.toLowerCase().includes("size:"));
      if (sizeLine) {
        const sizeMatch = sizeLine.match(/Size:\s*([\d.]+)\s*([GT]B),?\s*Usable:\s*([\d.]+)\s*([GT]B),?\s*Used:\s*([\d.]+)\s*([GT]B),?\s*Free:\s*([\d.]+)\s*([GT]B)/i);
        if (sizeMatch) {
          sizeGB = parseSizeToGB(sizeMatch[1] + sizeMatch[2]);
          usableGB = parseSizeToGB(sizeMatch[3] + sizeMatch[4]);
          usedGB = parseSizeToGB(sizeMatch[5] + sizeMatch[6]);
          freeGB = parseSizeToGB(sizeMatch[7] + sizeMatch[8]);
        }
      }

      let rgSize = 0;
      let disksCount = 0;
      let diskType = data.shelves[0]?.disks[0]?.type || "SSD";
      let diskSizeGB = data.shelves[0]?.disks[0]?.sizeGB || 960;

      const rgLine = lines.find(l => l.toLowerCase().includes("raid group"));
      if (rgLine) {
        const disksLineIndex = lines.indexOf(rgLine) + 1;
        if (disksLineIndex < lines.length) {
          const dl = lines[disksLineIndex];
          const disksMatch = dl.match(/Disks:\s*(\d+)\s*\(([\d.]+[GT]B)\s*([^)]+)\)/i);
          if (disksMatch) {
            disksCount = parseInt(disksMatch[1]);
            rgSize = disksCount;
            diskSizeGB = parseSizeToGB(disksMatch[2]);
            diskType = disksMatch[3].trim();
          }
        }
      }

      // Total disk count across ALL RAID groups in this aggregate (rgSize/disksCount above only
      // capture the first RAID group — used by existing capacity math, left untouched). This is
      // its own field because the minimum-disks-per-aggregate best practice (see
      // PLATFORM_COVERAGE.md) compares against the aggregate's TOTAL disk count, not any single
      // RAID group's count.
      let totalDiskCount = 0;
      for (let li = 0; li < lines.length; li++) {
        if (/raid group/i.test(lines[li]) && li + 1 < lines.length) {
          const m = lines[li + 1].match(/Disks:\s*(\d+)\s*\(/i);
          if (m) totalDiskCount += parseInt(m[1], 10);
        }
      }
      if (totalDiskCount === 0) totalDiskCount = disksCount;

      // Root-aggregate heuristic: ONTAP's classic "aggr status" (non -r) Options column
      // includes the literal word "root" for the root aggregate; falls back to the near-
      // universal "aggr0" naming convention when that text isn't present in this ASUP's dump.
      const isRootAggr = /\broot\b/i.test(block.split('\n').slice(0, 6).join(' ')) || /^aggr0/i.test(aggrName);

      // HA-policy: best-effort, UNCONFIRMED against a real ASUP bundle as of 2026-08-16 (see
      // PLATFORM_COVERAGE.md) — covers the two most common ONTAP CLI output conventions this
      // parser already relies on elsewhere (an "-instance"-style "HA Policy: sfo" key/value
      // line, and a "-fields ha-policy" tabular row keyed by aggregate name). Null if neither
      // pattern is found in this bundle, in which case the consuming rule must skip the
      // aggregate rather than assume a value.
      let haPolicy = null;
      const instanceMatch = block.match(/HA[\s-]?Policy:\s*(sfo|cfo)/i);
      if (instanceMatch) {
        haPolicy = instanceMatch[1].toLowerCase();
      } else {
        const tableRegex = new RegExp(`^\\s*${aggrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+(sfo|cfo)\\s*$`, 'im');
        const tableMatch = combinedText.match(tableRegex);
        if (tableMatch) haPolicy = tableMatch[1].toLowerCase();
      }

      // Determine aggregate node ownership: match parsed node names first (handles MCC node-a1/a2/b1/b2)
      let nodeName = null;
      if (data.nodes && data.nodes.length > 0) {
        // 1. Direct node name match within aggregate name (e.g. aggr_nvme_sync_a1 → node-a1)
        const aggrNameNorm = aggrName.toLowerCase().replace(/[-_]/g, '');
        const matchedNode = data.nodes.find(n =>
          aggrNameNorm.includes(n.name.toLowerCase().replace(/[-_]/g, ''))
        );
        if (matchedNode) {
          nodeName = matchedNode.name;
        } else {
          // 2. Spare Disk line lookup: "Spare Disks (node-a1):"
          const spareMatch = block.match(/Spare Disks?\s*\(([^)]+)\)/i);
          if (spareMatch) {
            const cand = spareMatch[1].trim();
            const found = data.nodes.find(n => n.name.toLowerCase() === cand.toLowerCase());
            if (found) nodeName = found.name;
          }
        }
        if (!nodeName) {
          // 3. Heuristic: _b suffix => Site B primary, else Site A primary
          const isSiteB = /_b\d*$|nodeb|node.b/.test(aggrName.toLowerCase());
          const siteANodes = data.nodes.filter(n => n.site === 'A' || (!n.site && data.nodes.indexOf(n) < Math.ceil(data.nodes.length / 2)));
          const siteBNodes = data.nodes.filter(n => n.site === 'B' || (!n.site && data.nodes.indexOf(n) >= Math.ceil(data.nodes.length / 2)));
          nodeName = isSiteB
            ? (siteBNodes[0] ? siteBNodes[0].name : 'node-b')
            : (siteANodes[0] ? siteANodes[0].name : 'node-a');
        }
      } else {
        nodeName = (aggrName.endsWith('_b') || aggrName.toLowerCase().includes('nodeb')) ? 'node-b' : 'node-a';
      }

      if (usableGB === 0 && aggrInfoCapacityByName[aggrName]) {
        const xmlCap = aggrInfoCapacityByName[aggrName];
        usableGB = xmlCap.usableGB;
        usedGB = xmlCap.usedGB;
        freeGB = xmlCap.freeGB;
        if (sizeGB === 0) sizeGB = xmlCap.usableGB;
      }

      data.aggregates.push({
        name: aggrName,
        node: nodeName,
        sizeGB,
        usableGB,
        usedGB,
        freeGB,
        raidType,
        rgSize,
        disksCount,
        diskType,
        diskSizeGB,
        isMirrored,
        totalDiskCount,
        isRootAggr,
        haPolicy
      });
    }
  }

  // Fallback aggregates if none parsed
  if (data.aggregates.length === 0) {
    if (!isDemoMode) {
      data.parseWarnings.push({
        section: "Storage Aggregates",
        message: "Aggregate layout could not be parsed; using default aggregate volumes (aggr_data_a, aggr_data_b)."
      });
    }
    const isAllFlash = data.version.model.includes("AFF") || data.version.model.includes("ASA");
    const dType = isAllFlash ? "NVMe SSD" : "SAS HDD";
    const dSizeGB = isAllFlash ? 1900 : 1200;
    
    data.aggregates.push({
      name: "aggr_data_a",
      node: "node-a",
      sizeGB: dSizeGB * 11,
      usableGB: Math.round(dSizeGB * 9 * 0.9),
      usedGB: Math.round(dSizeGB * 9 * 0.9 * 0.75), // 75% full
      freeGB: Math.round(dSizeGB * 9 * 0.9 * 0.25),
      raidType: "raid_dp",
      rgSize: 11,
      disksCount: 11,
      diskType: dType,
      diskSizeGB: dSizeGB
    });

    data.aggregates.push({
      name: "aggr_data_b",
      node: "node-b",
      sizeGB: dSizeGB * 11,
      usableGB: Math.round(dSizeGB * 9 * 0.9),
      usedGB: Math.round(dSizeGB * 9 * 0.9 * 0.40), // 40% full
      freeGB: Math.round(dSizeGB * 9 * 0.9 * 0.60),
      raidType: "raid_dp",
      rgSize: 11,
      disksCount: 11,
      diskType: dType,
      diskSizeGB: dSizeGB
    });
  }

  const aggrParsed = data.aggregates.some(a => !a.name.startsWith('aggr_data_'));
  if (aggrParsed) {
    setSource('aggregates', 'parsed', 1.0, `${data.aggregates.length} aggregate(s) parsed from SYSCONFIG-R output`);
  } else if (data.aggregates.length > 0) {
    setSource('aggregates', 'default', 0.2, 'Aggregate layout not found; using default aggregate layout');
  }

  // --- 5. Parse Spares ---
  const sparesRegex = /Spare Disks\s*\(([^)]+)\):\s*[\r\n]+\s*NETAPP\s+([^\s]+)\s+\(([\d.]+[GT]B),\s*([^)]+)\)\s*-\s*(\d+)\s*spares/ig;
  let sparesMatch;
  while ((sparesMatch = sparesRegex.exec(combinedText)) !== null) {
    const node = sparesMatch[1].trim();
    const model = sparesMatch[2].trim();
    const sizeStr = sparesMatch[3];
    const sizeGB = parseSizeToGB(sizeStr);
    const type = sparesMatch[4].trim();
    const count = parseInt(sparesMatch[5]);
    const existing = data.spares.find(s => s.node === node && s.model === model && s.sizeGB === sizeGB);
    if (!existing) {
      data.spares.push({
        node,
        model,
        sizeStr,
        sizeGB,
        type,
        count
      });
    }
  }

  // Fallback spares if none parsed
  if (data.spares.length === 0) {
    if (!isDemoMode) {
      data.parseWarnings.push({
        section: "Spare Drives",
        message: "Spare drive counts could not be parsed; using default spare allocations."
      });
    }
    const isAllFlash = data.version.model.includes("AFF") || data.version.model.includes("ASA");
    const dType = isAllFlash ? "NVMe SSD" : "SAS HDD";
    const dSizeStr = isAllFlash ? "1.9TB" : "1.2TB";
    const dSizeGB = isAllFlash ? 1900 : 1200;
    const model = isAllFlash ? "X371_S16431T9ATE" : "X425_H960G12G15K";

    data.spares.push({ node: "node-a", model, sizeStr: dSizeStr, sizeGB: dSizeGB, type: dType, count: 1 });
    data.spares.push({ node: "node-b", model, sizeStr: dSizeStr, sizeGB: dSizeGB, type: dType, count: 1 });
  }

  // --- 6. Parse Licenses ---
  // ONTAP 9.x+ license table format: "PackageName  type  description  expiration"
  // Also handles: "feature   active/expired   [Expired: date]"
  const licTableRegex = /^\s*([A-Za-z][A-Za-z0-9_\-]{1,30})\s+(site|license|capacity|demo)\s+[A-Za-z0-9_\-\s]+?\s*(-|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})\s*$/gim;
  let licTblMatch;
  while ((licTblMatch = licTableRegex.exec(combinedText)) !== null) {
    const name = licTblMatch[1].trim();
    const expiry = licTblMatch[3] ? licTblMatch[3].trim() : '-';
    const status = expiry !== '-' && expiry !== '' ? 'expired' : 'active';
    if (!['Package', 'Feature', 'Owner', 'Description', 'Type', 'Expiration', 'Serial', 'Base'].includes(name)) {
      if (!data.licenses.some(l => l.name.toUpperCase() === name.toUpperCase())) {
        data.licenses.push({ name, status, details: expiry !== '-' ? `Expires: ${expiry}` : '', serial: data.version.serial });
      }
    }
  }

  // Broad license match: "  NFS   active" or "NFS\tactive" or "NFS active"
  const licRegex = /^[ \t]{0,6}([A-Za-z][A-Za-z0-9_\-]{1,30})[ \t]+(active|expired|disabled|unlicensed)/gim;
  let licMatch;
  while ((licMatch = licRegex.exec(combinedText)) !== null) {
    const name = licMatch[1].trim();
    const status = licMatch[2].trim().toLowerCase();
    const details = licMatch[3] ? `Expired: ${licMatch[3].trim()}` : "";
    
    // Filter out standard column headers that might trigger false matches
    if (!["feature", "package", "owner", "expiration", "serial"].includes(name.toLowerCase())) {
      const existing = data.licenses.find(l => l.name.toUpperCase() === name.toUpperCase());
      if (!existing) {
        data.licenses.push({
          name,
          status,
          details,
          serial: data.version.serial
        });
      }
    }
  }

  // Resilient license table parsing (e.g. "CIFS license CIFS License -")
  const licenseTableLines = combinedText.split(/\r?\n/);
  licenseTableLines.forEach(line => {
    const trimmed = line.trim();
    const match = trimmed.match(/^([a-zA-Z0-9_\-]+)\s+(license|site|demo)\s+([a-zA-Z0-9_\-\s]+?)\s+(-|\d{4}-\d{2}-\d{2})\s*(?:\((Expired|Active)\))?$/i) ||
                  trimmed.match(/^([a-zA-Z0-9_\-]+)\s+(license|site|demo)\s+([a-zA-Z0-9_\-\s]+?)\s*$/i);
    if (match) {
      const name = match[1].trim();
      let status = "active";
      let details = "";
      
      if (match[4]) {
        const exp = match[4].trim();
        if (exp !== "-") {
          status = "expired";
          details = `Expired: ${exp}`;
        }
      }
      if (match[5] && match[5].toLowerCase() === 'expired') {
        status = "expired";
      }
      
      if (!["feature", "package", "owner", "expiration", "serial"].includes(name.toLowerCase())) {
        const existing = data.licenses.find(l => l.name.toUpperCase() === name.toUpperCase());
        if (!existing) {
          data.licenses.push({
            name,
            status,
            details,
            serial: data.version.serial
          });
        }
      }
    }
  });

  // Default licensing if none parsed
  if (data.licenses.length === 0) {
    if (!isDemoMode) {
      data.parseWarnings.push({
        section: "Software Licenses",
        message: "Software feature licenses could not be parsed; using default active entitlement set."
      });
    }
    const defaultLic = ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"];
    defaultLic.forEach(name => {
      data.licenses.push({
        name,
        status: "active",
        details: "",
        serial: data.version.serial
      });
    });
  }

  // Determine license data source quality
  {
    const defaultSet = new Set(["Cluster","NFS","CIFS","FCP","iSCSI","SnapMirror","FlexClone"]);
    const parsedCount = data.licenses.filter(l => !defaultSet.has(l.name)).length;
    const totalCount = data.licenses.length;
    if (totalCount === 0) {
      setSource('licenses', 'missing', 0, 'No licenses found');
    } else if (parsedCount > 0 || totalCount > defaultSet.size) {
      // Has licenses beyond the bare minimum default set — definitely parsed
      setSource('licenses', 'parsed', 1.0, `${totalCount} license(s) parsed from LICENSE section`);
    } else if (isDemoMode) {
      setSource('licenses', 'parsed', 1.0, `${totalCount} license(s) from demo data`);
    } else if (data.licenses.some(l => l.status === 'expired')) {
      // Found expired licenses — must have been parsed (default set is all active)
      setSource('licenses', 'parsed', 0.9, `${totalCount} license(s) parsed including expired entries`);
    } else {
      // Only the default 7 active licenses — probably fallback
      setSource('licenses', 'default', 0.2, 'License section not parsed; using default active entitlement set');
    }
  }

  // --- 7. Parse Ports ---
  // Previously matched with one global regex across the whole document, then chopped the
  // flat match list into groups of 4 in encounter order (portsList.slice(nodeIdx*4, ...))
  // with no actual correlation to which node a port line belonged to — silently cross-wired
  // ports on any cluster with >4 ports/node or >2 nodes.
  //
  // Real ASUP dumps typically mention every node's name together in an early header/summary
  // block, THEN list each node's actual port data later in that node's own detail section —
  // so naively using indexOf(node.name)'s first hit (or bounding at another node's first
  // hit) lands on the header mention, not the detail section, and can clip the window before
  // it ever reaches real port lines. Instead, find each node's "qualifying" occurrence — the
  // mention of its name that's actually followed by port data close by — and bound each
  // node's window at the next node's qualifying occurrence, not its first mention.
  const portRegex = /port\s+([\w\d]+)\s+(up|down)\s+([\w\d]+)\s+([a-zA-Z0-9\-]+)\s+([\w\-]+)/ig;

  function findNodeSectionIdx(name) {
    let searchFrom = 0;
    while (true) {
      const idx = combinedText.indexOf(name, searchFrom);
      if (idx === -1) return combinedText.indexOf(name); // no qualifying hit — fall back to first (-1 if none)
      if (/port\s+[\w\d]+\s+(up|down)/i.test(combinedText.substring(idx, idx + 300))) return idx;
      searchFrom = idx + name.length;
    }
  }

  // Node start positions computed once here, reused below by the SAS-adapter pass
  // so it doesn't need its own second lookup.
  const nodeHeaderIdxByNode = new Map();
  data.nodes.forEach(node => {
    const nodeHeaderIdx = findNodeSectionIdx(node.name);
    nodeHeaderIdxByNode.set(node, nodeHeaderIdx);
    let windowEnd = nodeHeaderIdx + 15000;
    data.nodes.forEach(other => {
      if (other === node) return;
      const otherIdx = findNodeSectionIdx(other.name);
      if (otherIdx > nodeHeaderIdx && otherIdx < windowEnd) windowEnd = otherIdx;
    });
    const nodeBlock = nodeHeaderIdx !== -1 ? combinedText.substring(nodeHeaderIdx, windowEnd) : "";

    const ports = [];
    let portMatch;
    portRegex.lastIndex = 0;
    while ((portMatch = portRegex.exec(nodeBlock)) !== null) {
      ports.push({
        name: portMatch[1],
        status: portMatch[2].toLowerCase(),
        speed: portMatch[3],
        duplex: portMatch[4],
        type: portMatch[5],
        mtu: portMatch[1].startsWith("e0a") || portMatch[1].startsWith("e0b") ? 9000 : 1500
      });
    }

    node.ports = ports.length > 0 ? ports : [
      { name: "e0a", status: "up", speed: "10GbE", duplex: "full-duplex", type: "cluster-interconnect", mtu: 9000 },
      { name: "e0b", status: "up", speed: "10GbE", duplex: "full-duplex", type: "cluster-interconnect", mtu: 9000 },
      { name: "e0c", status: "up", speed: "10GbE", duplex: "full-duplex", type: "data", mtu: 1500 },
      { name: "e0d", status: "up", speed: "10GbE", duplex: "full-duplex", type: "data", mtu: 1500 }
    ];
  });

  // Onboard SAS storage ports — a `sysconfig -a`-style dump lists these as
  // "slot 0: SAS Host Adapter 0a (PMC-Sierra PM8001 rev. C, SAS, <UP>)", a
  // completely different line shape than the "port <name> <up|down> ..." format
  // above, so the per-node pass never catches them; without this, storage-port
  // count fell back entirely to compatibility.js's static catalog entry for the
  // platform — confirmed wrong for at least one real platform (FAS8040 listed 2
  // ports; a real customer's own ASUP showed 4 real SAS Host Adapters), and
  // there's no way to hand-verify every platform's real onboard SAS port count.
  // Reading it from the ASUP text itself, when present, fixes this for every
  // platform at once instead of one manually-confirmed catalog entry at a time.
  //
  // Scans the FULL combinedText once (not a per-node windowed substring) and
  // attributes each match to whichever node's section it falls after — real
  // sysconfig dumps can spread these adapter lines across tens of thousands of
  // characters (confirmed: ~41,000 in one real bundle, verbose per-disk detail
  // between each adapter entry), far past the 15000-char per-node window above,
  // which exists as a cross-node guard and shouldn't be widened just to reach
  // these — one whole-document scan for this one specific pattern is both
  // cheaper and correct regardless of node count.
  const sortedNodeStarts = data.nodes
    .map(n => ({ node: n, start: nodeHeaderIdxByNode.get(n) }))
    .filter(e => e.start !== -1)
    .sort((a, b) => a.start - b.start);
  if (sortedNodeStarts.length > 0) {
    const sasAdapterRegex = /SAS Host Adapter\s+(\S+)\s*\([^)]*<(UP|DOWN)>[^)]*\)/ig;
    let sasMatch;
    while ((sasMatch = sasAdapterRegex.exec(combinedText)) !== null) {
      const matchIdx = sasMatch.index;
      let owner = null;
      for (const entry of sortedNodeStarts) {
        if (entry.start <= matchIdx) owner = entry.node;
        else break;
      }
      if (!owner) continue;
      const portName = sasMatch[1].trim();
      if (!owner.ports) owner.ports = [];
      if (owner.ports.some(p => p.name.toLowerCase() === portName.toLowerCase())) continue;
      owner.ports.push({
        name: portName,
        status: sasMatch[2].toLowerCase(),
        speed: "12Gb SAS",
        duplex: "full-duplex",
        type: "storage",
        mtu: 1500
      });
    }
  }

  // Resilient network port show table parsing (mtu and status)
  const netportLines = combinedText.split(/\r?\n/);
  netportLines.forEach(line => {
    const trimmed = line.trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 6) {
      const firstPart = parts[0].toLowerCase();
      const secondPart = parts[1].toLowerCase();
      
      // Check if line represents a port (e.g. node-a e0a ...) or if we can guess from port names
      const isPortName = /^[a-e0-9]+$/.test(secondPart) && secondPart.length >= 3;
      if (isPortName) {
        const link = parts[parts.length - 3]?.toLowerCase() || parts[4]?.toLowerCase();
        const mtuVal = parseInt(parts[parts.length - 2]) || parseInt(parts[5]);
        
        if ((link === 'up' || link === 'down') && !isNaN(mtuVal) && mtuVal >= 1500 && mtuVal <= 9000) {
          // find matching node
          const matchingNode = data.nodes.find(n => n.name.toLowerCase() === firstPart || firstPart.includes(n.name.toLowerCase()));
          if (matchingNode) {
            if (!matchingNode.ports) matchingNode.ports = [];
            let existingPort = matchingNode.ports.find(p => p.name === secondPart);
            if (existingPort) {
              existingPort.status = link;
              existingPort.mtu = mtuVal;
            } else {
              matchingNode.ports.push({
                name: secondPart,
                status: link,
                speed: parts[parts.length - 1] || "10GbE",
                duplex: "full-duplex",
                type: secondPart.startsWith("e0a") || secondPart.startsWith("e0b") ? "cluster-interconnect" : "data",
                mtu: mtuVal
              });
            }
          }
        }
      }
    }
  });

  // Ensure all ports have an MTU
  data.nodes.forEach(node => {
    if (node.ports) {
      node.ports.forEach(p => {
        if (!p.mtu) {
          p.mtu = (p.type === "cluster-interconnect") ? 9000 : 1500;
        }
      });
    }
  });

  // --- 8. Parse Cluster Switches ---
  const switches = [];

  const seenSwitchNames = new Set();

  // Known switch model patterns — used for keyword scan and model normalization.
  // NOTE (2026-08-16): "Cisco Nexus 9336C-FX2"'s regex used to include a bare `|9336C`
  // alternation, matching ANY 9336C-family string (array order = match priority), which could
  // mislabel other real 9336C-series switch models as FX2 and check them against FX2's firmware
  // baseline instead of their own. Narrowed to match FX2 specifically.
  const switchPatterns = [
    { model: "Cisco Nexus 9336C-FX2",  regex: /9336C-FX2/i,            defaultVer: "10.2(3)F",  role: "cluster-switch" },
    { model: "Cisco Nexus 3132Q-V",    regex: /3132Q-V|3132Q/i,        defaultVer: "9.3(8)",    role: "cluster-switch" },
    { model: "Cisco Nexus 3172PQ",     regex: /3172PQ|3172T/i,         defaultVer: "9.3(5)",    role: "cluster-switch" },
    { model: "Cisco Nexus 92300YC",    regex: /92300YC/i,              defaultVer: "9.3(8)",    role: "cluster-switch" },
    { model: "Broadcom BES-53248",     regex: /BES-53248/i,            defaultVer: "1.3.0.1",   role: "cluster-switch" },
    { model: "NVIDIA SN2100",          regex: /SN2100/i,               defaultVer: "3.9.3000",  role: "cluster-switch" },
    { model: "Cisco Catalyst 3750",    regex: /WS-C3750|catalyst.?3750/i, defaultVer: "15.2(4)E", role: "cluster-switch" },
  ];

  const addSwitch = (name, model, version, role, source) => {
    const key = name || model;
    if (seenSwitchNames.has(key)) return;
    seenSwitchNames.add(key);
    switches.push({ name: name || `CSW-${model.split(' ').pop()}-${switches.length+1}`, model, version: version || 'unknown', role: role || 'cluster-switch', _source: source });
  };

  // ── Pass 1: CDP neighbor detail — most reliable, appears in ASUP as:
  //   Device ID: cs1
  //   Platform: N9K-C9336C-FX2
  //   Software version: version 9.3(8)
  //   Interface: e0a,  Port ID (outgoing port): Eth1/1
  {
    const cdpBlocks = combinedText.split(/(?:^|\n)[-─]{5,}|(?=Device ID:)/im);
    cdpBlocks.forEach(block => {
      const deviceId  = block.match(/Device ID:\s*(\S+)/i);
      const platform  = block.match(/Platform:\s*([^\r\n,]+)/i);
      const swVer     = block.match(/Software [Vv]ersion[^:\r\n]*:\s*(?:version\s*)?([^\r\n,]+)/i);
      if (!deviceId || !platform) return;
      const name    = deviceId[1].trim();
      const rawModel = platform[1].trim();
      // Normalize to known model name
      const knownPat = switchPatterns.find(p => p.regex.test(rawModel));
      const model   = knownPat ? knownPat.model : rawModel;
      // Only include switches (not disk shelves or other devices)
      if (/shelf|disk|netapp|fas|aff|asa/i.test(rawModel)) return;
      const version = swVer ? swVer[1].trim().replace(/^version\s*/i, '') : (knownPat ? knownPat.defaultVer : 'unknown');
      addSwitch(name, model, version, 'cluster-switch', 'cdp');
    });
  }

  // ── Pass 2: LLDP neighbor show tabular format
  //   cs1  e0a  cs1/Eth1/1  N9K-C9336C-FX2  Eth1/1
  //   Port: e0a, Peer: cs1 (Nexus 9336C-FX2)
  if (switches.length === 0) {
    const lldpRegex = /network lldp neighbors[\s\S]{0,200}?(\w[\w\-\.]+)\s+e\d+[a-z]\s+/gi;
    let lm;
    while ((lm = lldpRegex.exec(combinedText)) !== null) {
      const name = lm[1].trim();
      // Try to find model near the name
      const vicinity = combinedText.slice(Math.max(0, lm.index - 50), lm.index + 200);
      const knownPat = switchPatterns.find(p => p.regex.test(vicinity));
      if (knownPat) addSwitch(name, knownPat.model, knownPat.defaultVer, 'cluster-switch', 'lldp');
    }
  }

  // ── Pass 3: network device-discovery show
  //   node-1/e0a    cs1     cluster    BES-53248   1.3.0.1
  //   <node>/<port> <device> <type>    <model>     <version>
  {
    const ddRegex = /^\s*\S+\/e\d+[a-z]\s+(\S+)\s+(?:cluster|storage|management)\s+([A-Za-z0-9][A-Za-z0-9\-\.]+)\s+([\d\.]+[\d\.A-Za-z\(\)]*)?/gim;
    let ddm;
    while ((ddm = ddRegex.exec(combinedText)) !== null) {
      const name = ddm[1].trim();
      const modelRaw = ddm[2].trim();
      const ver   = ddm[3] ? ddm[3].trim() : null;
      if (/netapp|fas|aff|shelf/i.test(modelRaw)) continue;
      const knownPat = switchPatterns.find(p => p.regex.test(modelRaw));
      const model = knownPat ? knownPat.model : modelRaw;
      addSwitch(name, model, ver || (knownPat ? knownPat.defaultVer : 'unknown'), 'cluster-switch', 'device-discovery');
    }
  }

  // ── Pass 4: system switch ethernet show / cluster switch show
  //   Switch Name: cs1   Model: BES-53248   Version: 3.4.4.6   Role: cluster
  //   cs1   cluster-network   192.168.10.1   BES-53248   3.4.4.6
  {
    const swShowRegex = /(?:Switch(?:\s+Name)?:|^)[ \t]*(\w[\w\-\.]+)[ \t]+(?:cluster-network|storage-network|management)[ \t]+\S+[ \t]+([A-Za-z0-9][A-Za-z0-9\-]+)[ \t]*([\d\.]+[\d\.A-Za-z\(\)]*)?/gim;
    let sm;
    while ((sm = swShowRegex.exec(combinedText)) !== null) {
      const name = sm[1].trim();
      const modelRaw = sm[2].trim();
      if (/netapp|fas|aff|shelf/i.test(modelRaw)) continue;
      const knownPat = switchPatterns.find(p => p.regex.test(modelRaw));
      const model = knownPat ? knownPat.model : modelRaw;
      addSwitch(name, model, sm[3] || (knownPat ? knownPat.defaultVer : 'unknown'), 'cluster-switch', 'switch-show');
    }

    // Also: "Switch Name: cs1  Model: Nexus 9336C-FX2  Version: 9.3(8)"
    const swNameRegex = /Switch Name:\s*(\S+)[^\n]*?Model:\s*([^\n]+?)(?:\s+Version:\s*([^\n\s]+))?(?:\r?\n|$)/ig;
    let snm;
    while ((snm = swNameRegex.exec(combinedText)) !== null) {
      const name = snm[1].trim();
      const modelRaw = snm[2].trim();
      const ver = snm[3] ? snm[3].trim() : null;
      const knownPat = switchPatterns.find(p => p.regex.test(modelRaw));
      const model = knownPat ? knownPat.model : modelRaw;
      addSwitch(name, model, ver || (knownPat ? knownPat.defaultVer : 'unknown'), 'cluster-switch', 'switch-show-named');
    }
  }

  // ── Pass 5: keyword scan — if a switch model name appears anywhere in the text
  //   (last resort; gives no real name or version — marked as inferred)
  if (switches.length === 0) {
    switchPatterns.forEach(pattern => {
      if (pattern.regex.test(combinedText)) {
        // Extract version from the line that mentions the model
        const lineMatch = combinedText.match(new RegExp(`.{0,80}${pattern.regex.source}.{0,80}`, 'i'));
        let ver = pattern.defaultVer;
        if (lineMatch) {
          const verM = lineMatch[0].match(/(?:version|fw|v)\s*([\d]+[\d\.\(\)A-Za-z\-]+)/i);
          if (verM && verM[1].length > 2) ver = verM[1];
        }
        addSwitch(null, pattern.model, ver, 'cluster-switch', 'keyword');
      }
    });
  }

  // ── Fallback: platform-default switches
  if (switches.length === 0) {
    if (!isDemoMode) {
      data.parseWarnings.push({
        section: "Cluster Switches",
        message: "Cluster interconnect switch model could not be parsed; using default switch profile."
      });
    }
    switches.push({ name: "CSW-01", model: "BES-53248", version: "1.3.0.1", role: "cluster-switch", _source: 'default' });
    switches.push({ name: "CSW-02", model: "BES-53248", version: "1.3.0.1", role: "cluster-switch", _source: 'default' });
  }

  data.switches = switches;

  // Source quality: parsed if found via CDP/LLDP/device-discovery/show; inferred if keyword only; default if fallback
  const hasRealSource = switches.some(s => ['cdp','lldp','device-discovery','switch-show','switch-show-named'].includes(s._source));
  const hasKeyword    = switches.some(s => s._source === 'keyword');
  setSource('switches',
    hasRealSource ? 'parsed' : hasKeyword ? 'inferred' : 'default',
    hasRealSource ? 0.9 : hasKeyword ? 0.5 : 0.1,
    hasRealSource ? `${switches.length} switch(es) found in CDP/LLDP/device-discovery output`
                  : hasKeyword ? 'Switch model detected by keyword; name/version not confirmed'
                  : 'No switch information found; using default profile');

  // --- 9. Parse PCIe Expansion Cards from sysconfig -a ---
  const slotCardRegex = /slot\s+(\d+):\s+([^\r\n]+)/ig;
  let slotMatch;
  slotCardRegex.lastIndex = 0;
  while ((slotMatch = slotCardRegex.exec(combinedText)) !== null) {
    const slotNum = parseInt(slotMatch[1]);
    const desc = slotMatch[2].toLowerCase();
    
    // Ignore slot 0 which is usually system board onboard ports
    if (slotNum === 0) continue;
    
    let cardKey = null;
    if (desc.includes("fibre channel") || desc.includes("fc host adapter") || desc.includes("fc target host adapter")) {
      if (desc.includes("64g")) cardKey = "fc_hba_64g_2port";
      else if (desc.includes("32g")) cardKey = "fc_hba_32g_2port";
      else cardKey = "fc_hba_16g_2port";
    } else if (desc.includes("sas host adapter") || desc.includes("sas adapter")) {
      cardKey = "sas_hba_12g_4port";
    } else if ((desc.includes("100gbe") || desc.includes("100g")) && (desc.includes("roce") || desc.includes("nvme"))) {
      cardKey = "roce_hba_100g_2port";
    } else if (desc.includes("100gbe") || desc.includes("100g")) {
      cardKey = "nic_100g_2port";
    } else if (desc.includes("200gbe") || desc.includes("200g")) {
      cardKey = "nic_200g_2port";
    } else if (desc.includes("25gbe") || desc.includes("25g")) {
      cardKey = "nic_25g_4port";
    } else if (desc.includes("10gbe") || desc.includes("10g")) {
      cardKey = "nic_10g_2port";
    }
    
    if (cardKey) {
      const existing = data.expansionCards.find(c => c.slot === slotNum);
      if (!existing) {
        data.expansionCards.push({ slot: slotNum, cardKey: cardKey });
      }
    }
  }

  data.alerts = extractASUPAlerts(combinedText, files);

  // 3a. Storage Failover / HA Status
  const sfMatches = [...combinedText.matchAll(/^(\S+)\s+(true|false)\s+(\S.*?)\s{2,}(\S.*?)$/gim)];
  data.haStatus = sfMatches.map(m => ({
    node: m[1].trim(),
    enabled: m[2].toLowerCase() === 'true',
    state: m[3].trim(),
    partner: m[4].trim()
  }));

  // 3b. Broken Disks
  const brokenSection = combinedText.match(/storage disk show.*?-broken[\s\S]*?(?=\n\n[A-Z]|$)/i);
  data.brokenDisks = [];
  if (brokenSection) {
    const brokenMatches = [...brokenSection[0].matchAll(/(\S+:\d+\.\d+\.\d+)\s+(\S+)\s+(\S+)\s+(broken|failed|prefailed)/gi)];
    data.brokenDisks = brokenMatches.map(m => ({ disk: m[1], type: m[2], rpm: m[3], reason: m[4] }));
  }

  // 3c. System Health Alerts
  const alertSection = combinedText.match(/health alert show[\s\S]*?(?=\n\n[A-Z]|$)/i);
  data.healthAlerts = [];
  if (alertSection) {
    const alertMatches = [...alertSection[0].matchAll(/^\s*(\S+)\s+(\d+)\s+(error|warning|critical|notice)\s+(.+)$/gim)];
    data.healthAlerts = alertMatches.map(m => ({ node: m[1], id: m[2], severity: m[3], description: m[4].trim() }));
  }

  // 3d. SnapMirror Relationships
  data.snapmirrorRelationships = [];
  const smMatches = [...combinedText.matchAll(/^(\S+:\S+)\s+(\S+:\S+)\s+(\S+)\s+(\d+\s+\S+)\s+(true|false|\-)/gim)];
  if (smMatches.length > 0) {
    data.snapmirrorRelationships = smMatches.map(m => ({
      source: m[1],
      destination: m[2],
      status: m[3],
      lag: m[4],
      healthy: m[5].toLowerCase() === 'true'
    }));
  }

  // 3e. Logical Interfaces (LIFs)
  data.lifs = [];
  const lifMatches = [...combinedText.matchAll(/^\s*(\S+)\s+(\S+)\s+(\/\d+|\d+\.\d+\.\d+\.\d+)\s+(\S+)\s+(\S+)\s+(up|down)\s+(up|down)/gim)];
  data.lifs = lifMatches.map(m => ({
    lif: m[1],
    node: m[2],
    address: m[3],
    homeNode: m[4],
    homePort: m[5],
    statusAdmin: m[6],
    statusOper: m[7],
    isHome: m[2].trim().toLowerCase() === m[4].trim().toLowerCase()
  }));

  // 3f. Aggregate Space Usage
  data.aggregates.forEach(agg => {
    const spaceMatch = combinedText.match(new RegExp(escapeRegExp(agg.name) + '\\s+([\\d.]+[TGMK]B)\\s+([\\d.]+[TGMK]B)\\s+([\\d.]+)%', 'i'));
    if (spaceMatch) {
      agg.totalSpace = spaceMatch[1];
      agg.usedSpace = spaceMatch[2];
      agg.usedPercent = parseFloat(spaceMatch[3]);
    }
  });

  // 3g. MetroCluster Details
  // Parse metrocluster node show for site/DR group info
  const mccNodeMatches = [...combinedText.matchAll(/^(\S+)\s+(local|remote)\s+(\d+)\s+(\S+)\s+(configured|not-configured)/gim)];
  if (mccNodeMatches.length > 0) {
    data.mccNodes = mccNodeMatches.map(m => ({
      node: m[1],
      role: m[2], // local or remote
      drGroupId: parseInt(m[3]),
      partnerCluster: m[4],
      configured: m[5] === 'configured'
    }));
  }
  // Parse mediator
  const mediatorMatch = combinedText.match(/mediator.*?IP.*?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i);
  if (mediatorMatch) data.mccMediator = mediatorMatch[1];

  // 3h. ADP Detection
  // Detect ADP (Advanced Drive Partitioning)
  data.isADP = /root-data|root-data-data|ADPv[12]/i.test(combinedText);

  // === Parse: Service Processor / BMC Firmware ===
  // Source: system service-processor show
  data.spFirmware = [];
  const spMatches = [...combinedText.matchAll(/^(\S+)\s+(?:up|down|online|offline)\s+(?:installed|not-installed)?\s*(\d+\.\d+[\w.]*)\s/gim)];
  if (spMatches.length > 0) {
    // Try more specific SP firmware pattern
    const spSection = combinedText.match(/service-processor show[\s\S]*?(?=\n\n[A-Z]|$)/i);
    if (spSection) {
      const spLines = [...spSection[0].matchAll(/^(\S+)\s+\S+\s+(\d+\.\d+[\w.]*)\s/gim)];
      data.spFirmware = spLines.map(m => ({ node: m[1].trim(), version: m[2].trim() }));
    }
  }
  // Fallback: parse from sysconfig -a SP firmware lines
  if (data.spFirmware.length === 0) {
    const spCfgMatches = [...combinedText.matchAll(/Service Processor[\s\S]*?Firmware Version:\s*([\d.]+\S*)/gi)];
    spCfgMatches.forEach((m, idx) => {
      const nodeName = data.nodes[idx] ? data.nodes[idx].name : `node-${idx + 1}`;
      data.spFirmware.push({ node: nodeName, version: m[1].trim() });
    });
  }

  setSource('spFirmware', data.spFirmware.length > 0 ? 'parsed' : 'missing', data.spFirmware.length > 0 ? 0.9 : 0,
    data.spFirmware.length > 0 ? `${data.spFirmware.length} SP/BMC firmware record(s) found` : 'No service-processor show output found in ASUP');

  // === Parse: Disk Firmware Versions ===
  // Source: storage disk show -fields model,firmware-revision  OR  storage disk firmware show
  data.diskFirmware = [];
  const diskFwSection = combinedText.match(/storage disk(?:\s+firmware)?\s+show[\s\S]*?(?=\n\n[A-Za-z]|$)/i);
  if (diskFwSection) {
    const dfMatches = [...diskFwSection[0].matchAll(/(\d+\.\d+[a-zA-Z.]*\d+|[A-Z]+:\d+[A-Z]+\.\d+)\s+(\S+[A-Z]\d{3,}\S*)\s+([A-Z0-9]{4})\b/gi)];
    dfMatches.forEach(m => {
      data.diskFirmware.push({ disk: m[1].trim(), model: m[2].trim(), firmware: m[3].trim() });
    });
  }
  // Also scan disks already parsed in shelves for firmware field
  if (data.diskFirmware.length === 0) {
    data.shelves.forEach(shelf => {
      (shelf.disks || []).forEach(d => {
        if (d.firmware && d.serial) {
          data.diskFirmware.push({ disk: d.serial || `shelf${shelf.id}:${d.slot}`, model: d.model || 'Unknown', firmware: d.firmware });
        }
      });
    });
  }

  setSource('diskFirmware', data.diskFirmware.length > 0 ? 'parsed' : 'missing', data.diskFirmware.length > 0 ? 0.9 : 0,
    data.diskFirmware.length > 0 ? `${data.diskFirmware.length} disk firmware record(s) found` : 'No disk firmware output in ASUP; disk firmware shown is from shelf disk data where available');

  // === Parse: ACP (Alternate Control Path) Status ===
  // Source: storage acp show
  data.acpStatus = { enabled: null, connectivity: 'unknown', disksOnAcp: 0 };
  const acpSection = combinedText.match(/storage acp show[\s\S]*?(?=\n\n[A-Z]|$)/i);
  if (acpSection) {
    const acpEnabled = acpSection[0].match(/ACP Connectivity Status:\s*(\S+)/i) ||
                       acpSection[0].match(/Enabled:\s*(true|false|yes|no)/i);
    if (acpEnabled) {
      const val = acpEnabled[1].toLowerCase();
      data.acpStatus.enabled = val === 'true' || val === 'yes' || val === 'full-connectivity';
      data.acpStatus.connectivity = acpEnabled[1];
    }
    const acpDiskMatch = acpSection[0].match(/(\d+)\s+disks? connected/i);
    if (acpDiskMatch) data.acpStatus.disksOnAcp = parseInt(acpDiskMatch[1]);
  } else if (/acp.*disabled|no acp/i.test(combinedText)) {
    data.acpStatus.enabled = false;
    data.acpStatus.connectivity = 'disabled';
  }

  // === Enhance: Switch RCF Version ===
  // Augment existing data.switches[] with RCF version if found
  if (data.switches && data.switches.length > 0) {
    data.switches.forEach(sw => {
      const rcfMatch = combinedText.match(new RegExp(escapeRegExp(sw.name) + '[\\s\\S]{0,300}RCF[\\s\\S]{0,100}v([\\d.]+)', 'i'));
      if (rcfMatch) sw.rcfVersion = rcfMatch[1];
      const efosMatch = combinedText.match(new RegExp(escapeRegExp(sw.name) + '[\\s\\S]{0,300}EFOS[\\s\\S]{0,100}([\\d.]+)', 'i'));
      if (efosMatch) sw.fwVersion = efosMatch[1];
    });
  }

  return data;
}

// Scans AutoSupport bundle contents for alerts, errors, and log warnings
function extractASUPAlerts(combinedText, files) {
  const alerts = [];
  const lowerText = combinedText.toLowerCase();

  // 1. Cabling warning: loop 2a cabled to Shelf 2 (DS224C) Single-Path HA [WARNING]
  const singlePathMatch = combinedText.match(/loop\s+\w+\s+cabled\s+to\s+Shelf\s+\d+\s+\([^)]+\)\s+Single-Path[^\r\n\[]*(?:\[WARNING\])?/i);
  if (singlePathMatch) {
    alerts.push({
      id: "ASUP_CABLE_SPOF",
      component: "Cabling",
      severity: "critical",
      message: `Single-Path connectivity detected: ${singlePathMatch[0].trim()}`,
      sourceFile: "SYSCONFIG",
      resolution: "Re-cable the storage loops to achieve Multipath HA cabling. Connect both controller SAS/NVMe adapter ports to both shelf I/O Modules (IOMs) to establish path redundancy."
    });
  }

  // 2. Expired licenses
  // e.g. SnapMirror  expired  [Expired: 2023-10-10]
  const licenseRegex = /^\s*([a-zA-Z0-9_\-]+)\s+expired(?:\s+\[Expired:\s*([^\]]+)\])?/gm;
  let licMatch;
  licenseRegex.lastIndex = 0;
  while ((licMatch = licenseRegex.exec(combinedText)) !== null) {
    const name = licMatch[1].trim();
    const expiry = licMatch[2] ? licMatch[2].trim() : "Expired";
    alerts.push({
      id: `ASUP_LIC_EXPIRED_${name.toUpperCase()}`,
      component: "Licensing",
      severity: "warning",
      message: `Software Protocol License expired for feature '${name}' (${expiry})`,
      sourceFile: "LICENSE",
      resolution: `Renew the '${name}' protocol license with NetApp. Apply the new valid 28-character license key using the 'system license add' command.`
    });
  }

  // 3. Env shelf environmental or power faults
  if (lowerText.includes("shelf.fault") || lowerText.includes("environmental fault") || lowerText.includes("psu failed") || lowerText.includes("fan failed")) {
    alerts.push({
      id: "ASUP_ENV_FAULT",
      component: "Hardware",
      severity: "critical",
      message: "Storage Shelf Environmental Fault: Power supply unit (PSU) or cooling fan failure reported.",
      sourceFile: "SYSCONFIG",
      resolution: "Identify the affected shelf ID using 'storage shelf show -errors'. Replace the faulty PSU or cooling fan canister immediately to prevent thermal shutdown."
    });
  }

  // 4. Offline ports
  // e.g. port e0c down 10GbE full-duplex data
  const portRegex = /port\s+([\w\d]+)\s+down\s+([\w\d]+)\s+([a-zA-Z0-9\-]+)\s+([\w\-]+)/ig;
  let portMatch;
  while ((portMatch = portRegex.exec(combinedText)) !== null) {
    const portName = portMatch[1];
    const role = portMatch[4];
    alerts.push({
      id: `ASUP_PORT_OFFLINE_${portName.toUpperCase()}`,
      component: "Network",
      severity: "warning",
      message: `Interface port ${portName} (${role}) is down or link status is offline.`,
      sourceFile: "NETPORT",
      resolution: `Verify the physical fiber or twinax cable connections. Swap SFP transceivers, check host switch port configuration, and verify VLAN tags.`
    });
  }

  // 5. Failed disks
  if (lowerText.includes("failed disk") || lowerText.includes("broken disk") || lowerText.includes("pre-fail") || lowerText.includes("bad label")) {
    alerts.push({
      id: "ASUP_DISK_FAILED",
      component: "Hardware",
      severity: "critical",
      message: "Physical disk drive failure or media block degradation (Pre-Fail) reported on storage shelf.",
      sourceFile: "SYSCONFIG",
      resolution: "Run 'storage disk show -broken' to locate the failed disk slot. Pull the failed disk out and insert a hot-plug replacement disk of equal or larger size."
    });
  }

  // 6. Generic scanner for error/warning/fault/fail tags in lines
  const lines = combinedText.split(/\r?\n/);
  let scanCount = 0;
  for (const line of lines) {
    if (scanCount >= 5) break; // Limit generic warnings to avoid noise
    const lowerLine = line.toLowerCase();
    if (lowerLine.includes("error") || lowerLine.includes("warning") || lowerLine.includes("critical") || lowerLine.includes("alert") || lowerLine.includes("fault") || lowerLine.includes("fail")) {
      // Avoid duplicating matches already added above
      if (lowerLine.includes("license") || lowerLine.includes("cabled") || lowerLine.includes("port") || lowerLine.includes("shelf") || lowerLine.includes("disk")) continue;
      if (line.trim().length < 20 || line.trim().length > 180) continue; // Skip noisy headers or giant dumps
      
      alerts.push({
        id: `ASUP_LOG_ALERT_${hashString(line.trim())}`,
        component: "System Logs",
        severity: (lowerLine.includes("error") || lowerLine.includes("critical") || lowerLine.includes("fail")) ? "critical" : "warning",
        message: `${line.trim()}`,
        sourceFile: "ASUP-LOGS",
        resolution: "Consult the NetApp Knowledgebase (KB) for the specific log event code. Run automated ONTAP upgrade advisor tools to ensure no impact on services."
      });
      scanCount++;
    }
  }

  // Inject demo alerts ONLY when explicitly running in synthetic DEMO mode!
  const isDemoMode = (typeof files === "object" && files !== null && !!files["DEMO_MODE"]) || combinedText.includes("SHFL-000001");
  if (alerts.length === 0 && isDemoMode) {
    alerts.push({
      id: "ASUP_CABLE_SPOF_DEMO",
      component: "Cabling",
      severity: "critical",
      message: "Single-Path cabling detected on Loop 2a cabled to Shelf 2 (DS224C). Path redundancy is compromised.",
      sourceFile: "SYSCONFIG-A",
      resolution: "Connect the secondary SAS cables from Controller A slot 2 and Controller B slot 2 to Shelf 2 IOM-B ports to establish Multipath HA configuration."
    });
    alerts.push({
      id: "ASUP_LIC_EXPIRED_SNAPMIRROR",
      component: "Licensing",
      severity: "warning",
      message: "Feature license 'SnapMirror' is expired. Remote synchronization and replication are paused.",
      sourceFile: "LICENSE",
      resolution: "Apply a renewed SnapMirror license key via the 'system license add' command to resume replication operations."
    });
  }

  return alerts;
}

// =============================================================================
// MULTI-ASUP ENGINE: Section Coverage, Merge, Inference, Confidence
// =============================================================================

/**
 * Scans raw ASUP text and returns which major sections are present.
 * @param {string} text - Raw text content of one ASUP file
 * @returns {{found: Array, missing: Array, coverage: number}}
 */
export function getSectionCoverage(text) {
  if (!text) return { found: [], missing: [], coverage: 0 };
  const lText = text.toLowerCase();
  const sections = [
    { id: 'VERSION',       label: 'ONTAP Version',      patterns: ['netapp release', 'ontap version:'] },
    { id: 'SYSCONFIG-A',   label: 'Hardware Config',    patterns: ['system id:', 'system memory', 'system model'] },
    { id: 'SYSCONFIG-R',   label: 'RAID/Aggregates',    patterns: ['aggregate ', 'raid group', 'spare disks'] },
    { id: 'LICENSE',       label: 'Software Licenses',  patterns: [' active', ' expired', 'unlicensed', 'license show'] },
    { id: 'NETPORT',       label: 'Network Ports',      patterns: ['e0a', 'e0b', 'cluster-interconnect', 'network port'] },
    { id: 'METROCLUSTER',  label: 'MetroCluster',       patterns: ['metrocluster', 'mcc-ip', 'dr group'] },
    { id: 'SWITCHES',      label: 'Cluster Switches',   patterns: ['cluster switch', 'bes-53248', 'nexus 93', 'rcf version'] },
    { id: 'SHELF-INFO',    label: 'Disk Shelves',       patterns: ['shelf ', 'iom', 's/n:', 'disk '] },
    { id: 'SP-FIRMWARE',   label: 'SP/BMC Firmware',    patterns: ['service processor', 'sp firmware', 'bmc firmware'] },
    { id: 'DISK-FIRMWARE', label: 'Disk Firmware',      patterns: ['disk firmware', 'fw:', 'disk show'] },
    { id: 'HA-STATUS',     label: 'HA/Failover Status', patterns: ['storage failover', 'ha-mode', 'ha state'] },
    { id: 'HEALTH',        label: 'System Health',      patterns: ['health alert', 'system health', 'ems'] },
  ];
  const found = [], missing = [];
  sections.forEach(sec => {
    const hit = sec.patterns.some(p => lText.includes(p));
    (hit ? found : missing).push({ id: sec.id, label: sec.label });
  });
  return { found, missing, coverage: Math.round((found.length / sections.length) * 100) };
}

/**
 * Merges parse results from multiple ASUP files into a single cluster state.
 * @param {Array} results - Array of { filename, state, coverage } from per-file parseASUP calls
 * @returns {Object} Merged cluster state
 */
export function mergeClusterASUPs(results) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) {
    const r = results[0];
    r.state.fileManifest = [{ filename: r.filename, nodeNames: (r.state.nodes||[]).map(n => n.name), coverage: r.coverage || 0 }];
    return r.state;
  }

  // Use the most complete parse as the base
  const sorted = [...results].sort((a, b) => (b.coverage || 0) - (a.coverage || 0));
  const base = JSON.parse(JSON.stringify(sorted[0].state));
  base.mergeConflicts = base.mergeConflicts || [];
  base.fileManifest = results.map(r => ({
    filename: r.filename,
    nodeNames: (r.state.nodes || []).map(n => n.name),
    coverage: r.coverage || 0
  }));

  // Merge nodes (union, deduplicate by ID or name)
  const allNodes = [];
  results.forEach(r => {
    (r.state.nodes || []).forEach(node => {
      const exists = allNodes.some(n => n.id === node.id || n.name.toLowerCase() === node.name.toLowerCase());
      if (!exists && node.name !== 'node-a' && node.name !== 'node-b') {
        allNodes.push({ ...node, _sourceFile: r.filename });
      }
    });
  });
  if (allNodes.length > 1) base.nodes = allNodes;

  // Merge shelves (union by serial)
  const allShelves = [];
  results.forEach(r => {
    (r.state.shelves || []).forEach(shelf => {
      const exists = allShelves.find(s =>
        (shelf.serial && shelf.serial !== 'AUTO-DISCOVERED' && shelf.serial !== 'MOCK-SHELF-001' && s.serial === shelf.serial) ||
        (s.id === shelf.id && shelf.serial !== 'MOCK-SHELF-001')
      );
      if (!exists && shelf.serial !== 'MOCK-SHELF-001') {
        allShelves.push(shelf);
      } else if (exists && (shelf.disks || []).length > (exists.disks || []).length) {
        Object.assign(exists, shelf);
      }
    });
  });
  if (allShelves.length > 0) base.shelves = allShelves;

  // Merge aggregates (union by name)
  const allAggr = [];
  results.forEach(r => {
    (r.state.aggregates || []).forEach(agg => {
      if (!allAggr.some(a => a.name === agg.name)) allAggr.push(agg);
    });
  });
  if (allAggr.length > 0) base.aggregates = allAggr;

  // Merge spares (union by node+size)
  const allSpares = [];
  results.forEach(r => {
    (r.state.spares || []).forEach(spare => {
      if (!allSpares.some(s => s.node === spare.node && s.sizeGB === spare.sizeGB)) allSpares.push(spare);
    });
  });
  if (allSpares.length > 0) base.spares = allSpares;

  // Merge licenses (prefer active)
  const allLic = [];
  results.forEach(r => {
    (r.state.licenses || []).forEach(lic => {
      const ex = allLic.find(l => l.name.toUpperCase() === lic.name.toUpperCase());
      if (!ex) allLic.push(lic);
      else if (lic.status === 'active' && ex.status !== 'active') Object.assign(ex, lic);
    });
  });
  if (allLic.length > 0) base.licenses = allLic;

  // Merge switches (union by hostname)
  const allSw = [];
  results.forEach(r => {
    (r.state.switches || []).forEach(sw => {
      if (!allSw.some(s => s.hostname && sw.hostname && s.hostname.toLowerCase() === sw.hostname.toLowerCase())) allSw.push(sw);
    });
  });
  if (allSw.length > 0) base.switches = allSw;

  // ONTAP version conflict check
  const versions = results.map(r => r.state.version.ontap).filter(v => v !== '9.7P12');
  const uniqueVersions = [...new Set(versions)];
  if (uniqueVersions.length > 1) {
    base.mergeConflicts.push({
      field: 'ontapVersion', severity: 'critical',
      message: 'ONTAP version mismatch across files: ' + uniqueVersions.join(' vs ') +
        '. Verify these are from the same cluster. Using: ' + uniqueVersions[0],
      values: uniqueVersions
    });
    base.version.ontap = uniqueVersions[0];
  }

  // Merge dataSources: prefer higher rank
  const rank = { parsed: 3, user: 3, inferred: 2, default: 1, missing: 0 };
  results.forEach(r => {
    Object.entries(r.state.dataSources || {}).forEach(([key, ds]) => {
      const ex = base.dataSources[key];
      if (!ex || rank[ds.source] > rank[ex.source]) base.dataSources[key] = ds;
    });
  });

  // Collect parse warnings from all files
  base.parseWarnings = [];
  results.forEach(r => {
    (r.state.parseWarnings || []).forEach(w => {
      if (!base.parseWarnings.some(pw => pw.section === w.section)) base.parseWarnings.push(w);
    });
  });

  return base;
}

/**
 * Uses platform + ONTAP knowledge to fill in data gaps with intelligent inferences.
 * @param {Object} state - Current cluster state (mutated in place)
 * @param {Object} profile - Platform profile from NETAPP_PLATFORMS
 * @returns {Object} Updated state
 */
export function inferMissingData(state, profile) {
  if (!state || !profile) return state;
  if (!state.dataSources) state.dataSources = {};
  if (!state.parseWarnings) state.parseWarnings = [];

  const rank = { parsed: 3, user: 3, inferred: 2, default: 1, missing: 0 };
  const setInferred = (key, note) => {
    const ex = state.dataSources[key];
    if (!ex || rank[ex.source] < 2) state.dataSources[key] = { source: 'inferred', confidence: 0.7, note };
  };

  const model = (state.version && state.version.model) || '';
  const nodeCount = (state.nodes && state.nodes.length) || 2;

  // Infer switch type from platform tier and node count
  if (!state.switches || state.switches.length === 0 || (state.dataSources.switches && state.dataSources.switches.source === 'default')) {
    let swModel = 'BES-53248';
    if (profile.tier === 'enterprise' || nodeCount > 4 ||
        model.includes('A900') || model.includes('A1K') || model.includes('A800') || model.includes('A90')) {
      swModel = 'Nexus 9336C-FX2';
    }
    if (!state.switches || state.switches.length === 0) {
      state.switches = [
        { model: swModel, hostname: 'cs1', firmware: null, rcfVersion: null },
        { model: swModel, hostname: 'cs2', firmware: null, rcfVersion: null }
      ];
    }
    setInferred('switches', 'Inferred from platform tier + node count. Verify against actual switch labels in rack.');
    state.parseWarnings.push({ section: 'Cluster Switches', message: 'Switch type inferred as ' + swModel + ' from platform profile. Verify actual switch model and firmware.' });
  }

  // Infer cluster name from node hostnames (text-based parsing was done in parseASUP)
  if (!state.version.clusterName) {
    if (state.clusterName) {
      // Mirror to version object if already inferred elsewhere
      state.version.clusterName = state.clusterName;
    } else if (state.nodes && state.nodes.length > 0) {
      const firstName = state.nodes[0].name || '';
      const guess = firstName.replace(/[-_](0?[12]|node[12]|[ab])$/i, '');
      if (guess && guess !== firstName) {
        state.clusterName = guess;
        state.version.clusterName = guess;
        setInferred('clusterName', 'Stripped node suffix from first node hostname: ' + firstName);
      }
    }
  }

  // Infer RAM from platform profile if at default (128 GB)
  if (state.nodes && state.nodes.every(n => n.memoryGB === 128 || !n.memoryGB) && profile.maxRamGB) {
    const inferredRam = Math.round(profile.maxRamGB * 0.5);
    state.nodes.forEach(n => { if (n.memoryGB === 128 || !n.memoryGB) n.memoryGB = inferredRam; });
    setInferred('nodeRam', 'Set to 50% of platform max RAM (' + profile.maxRamGB + ' GB). Verify via: system node show -fields node,memory-size');
  }

  // Tag missing critical fields
  state.missingCritical = [];
  if (!state.dataSources.ontapVersion || state.dataSources.ontapVersion.source === 'default') {
    state.missingCritical.push({
      field: 'ontapVersion', label: 'ONTAP Version',
      reason: 'Cannot assess upgrade path, firmware requirements, or feature support without the current ONTAP version.',
      promptType: 'select',
      promptOptions: ['9.7','9.8','9.9.1','9.10.1','9.11.1','9.12.1','9.13.1','9.14.1','9.14.1P1','9.14.1P2','9.14.1P3','9.15.1','9.15.1P1','9.15.1P2','9.16.1','9.16.1P1','9.16.1P2','9.17.1','9.17.1P1','9.18.1','9.18.1P1','9.19.1']
    });
  }
  if (!state.dataSources.model || state.dataSources.model.source === 'default') {
    state.missingCritical.push({
      field: 'model', label: 'Platform Model',
      reason: 'Cannot determine supported shelves, PCIe cards, firmware requirements, or upgrade constraints without the controller model.',
      promptType: 'text', placeholder: 'e.g. AFF A400, FAS8300, ASA A800'
    });
  }

  // Tag missing important fields
  state.missingImportant = [];
  if (!state.spFirmware || state.spFirmware.length === 0) {
    state.missingImportant.push({
      field: 'spFirmware', label: 'SP/BMC Firmware Version',
      reason: 'Needed to check Service Processor firmware compliance. Run: system node show-detail -fields sp-version',
      promptType: 'text', placeholder: 'e.g. 1.9.2.7'
    });
  }
  if (!state.switches || !state.switches.some(sw => sw.firmware)) {
    state.missingImportant.push({
      field: 'switchFirmware', label: 'Cluster Switch Model & Firmware',
      reason: 'Needed to verify switch firmware and RCF compliance before ONTAP upgrade. Run: system cluster-switch show',
      promptType: 'text', placeholder: 'e.g. BES-53248 / EFOS 3.10.0.3'
    });
  }

  return state;
}

/**
 * Computes an overall data confidence score (0-100) for the cluster state.
 * @param {Object} state - Cluster state with dataSources
 * @returns {number} Confidence percentage
 */
export function computeOverallConfidence(state) {
  if (!state || !state.dataSources) return 30;
  const weights = {
    ontapVersion: 25, model: 20, nodes: 15, shelves: 10,
    aggregates: 8, licenses: 7, switches: 5, spFirmware: 4,
    diskFirmware: 3, serial: 3
  };
  const scores = { parsed: 1.0, user: 1.0, inferred: 0.65, default: 0.3, missing: 0.0 };
  let totalWeight = 0, weighted = 0;
  Object.entries(weights).forEach(([key, w]) => {
    totalWeight += w;
    const ds = state.dataSources[key];
    weighted += (ds ? (scores[ds.source] || 0) : 0) * w;
  });
  return Math.round((weighted / totalWeight) * 100);
}
