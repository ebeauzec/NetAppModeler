/**
 * NetApp Rack/Cabling Reference Data
 * ===================================
 * Physical rear-view layout and cable-endpoint data for the cabling diagram,
 * sourced from NetApp's official public Installation & Setup / hot-add
 * cabling documentation (docs.netapp.com — no login required), harvested by
 * tools/harvest_reference_data.py. Raw extracted text lives in
 * data/netapp_docs_raw/ with a manifest at data/netapp_docs_manifest.json —
 * every field below traces back to a specific fetched page.
 *
 * IMPORTANT — what "accurate" means here: the cable ENDPOINTS (which named
 * port on the controller connects to which named port on the shelf IOM) are
 * sourced directly from NetApp's literal step-by-step cabling instructions
 * ("Cable shelf NSM A port e0a to controller A port e0c...") and are as
 * correct as the published docs. The visual POSITIONS (x/y layout) are a
 * clean schematic grid, not a pixel match to NetApp's product photos —
 * NetApp's actual rear-panel diagrams are rendered by an interactive
 * JS component on their doc site that isn't scrapable as flat image/SVG
 * data. See DATA_SOURCES.md for the full sourcing writeup.
 *
 * Only the platforms harvested so far are covered here. getRackLayout()
 * returns null for anything else, and callers must fall back to the
 * existing schematic renderer — never silently guess.
 */

// Cable pull-tab orientation: which direction the connector's release tab
// faces when correctly seated. Determines which way the cable-bend curve
// should bow in the rendered diagram. Source: each platform's install guide,
// "Cable pull-tabs are up for all onboard ports and down for expansion (NIC)
// cards" (A400) / "up for all networking module ports" (A900) / NS224 "up",
// DS224-C "down" (A900 hot-add guide).
export const PULL_TAB_ORIENTATION = {
  onboard: "up",
  expansionCard: "down",
  ns224: "up",
  sasShelf: "down", // DS224C/DS2246/DS460C etc.
};

/**
 * RACK_LAYOUTS[platformModel] = {
 *   source: { url, fetched, note },
 *   controllerPorts: { cluster: [...], data: [...], storage: [...] } — real
 *     port names confirmed from the install guide's cabling steps (NOT
 *     necessarily identical to compatibility.js's NETAPP_PLATFORMS[model].ports
 *     — see DATA_SOURCES.md discrepancy notes for platforms where the two
 *     differ; this file is the more recently-verified source).
 *   clusterCabling: { switchless: [{a, b}], switched: [{port, target}] } —
 *     literal endpoint pairs from the "Cable a two-node switchless cluster" /
 *     "Cable a switched cluster" steps.
 *   shelfCabling: { ns224: { <shelfIndex 1-based>: [{shelfIOM, shelfPort,
 *     controllerSide, controllerPort}] } } — literal endpoint pairs from the
 *     platform-specific NS224 hot-add cabling guide, one entry per physical
 *     cable. controllerSide is 'A' or 'B' (which controller in the HA pair).
 * }
 */
export const RACK_LAYOUTS = {
  "AFF A400": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a400-c400.html",
      fetched: "2026-08-11",
      note: "Controller-side cluster ports not in guide text (image-only step); MetroCluster IP data LIF ports e0a/e0b confirmed from install-detailed-guide.html.",
    },
    shelfCabling: {
      ns224: {
        // "Hot-adding one shelf using one set of RoCE-capable ports (onboard)"
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e0c" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e0d" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e0c" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e0d" },
        ],
        // "Hot-adding one or two shelves using two sets of RoCE-capable ports
        // (onboard + PCIe slot 5)" — shelf 1 half of that pairing
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e0c" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e5b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e0c" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e5b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e5a", shelfIndex2Only: true },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e0d", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e5a", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e0d", shelfIndex2Only: true },
        ],
      },
    },
  },

  "AFF C400": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a400-c400.html",
      fetched: "2026-08-11",
      note: "C400 uses PCIe slots 4 and 5 exclusively (no onboard RoCE storage path), unlike A400.",
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e4a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e4b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e4a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e4b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e4a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e5b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e4a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e5b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e5a", shelfIndex2Only: true },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e4b", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e5a", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e4b", shelfIndex2Only: true },
        ],
      },
    },
  },

  "AFF A800": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a800/install-detailed-guide.html",
      fetched: "2026-08-11",
    },
    clusterCabling: {
      switchless: [
        { a: "e0b", b: "e0b", role: "HA interconnect" },
        { a: "e1b", b: "e1b", role: "HA interconnect" },
        { a: "e0a", b: "e0a", role: "cluster interconnect" },
        { a: "e1a", b: "e1a", role: "cluster interconnect" },
      ],
    },
    controllerPorts: {
      fc: ["2a", "2b", "2c", "2d"],
      data10gbe: ["e4a", "e4b", "e4c", "e4d"],
    },
    shelfCabling: {
      // Source: ns224-to-a800.txt (hot-add guide) — RoCE PCIe cards in
      // slot 5 (shelf 1) and slot 3 (shelf 2).
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e5a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e5b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e5a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e5b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e5a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e3b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e5a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e3b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e3a", shelfIndex2Only: true },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e5b", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e3a", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e5b", shelfIndex2Only: true },
        ],
      },
    },
  },

  "AFF C800": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a800-c800.html",
      fetched: "2026-08-11",
      note: "Same NS224 cabling pattern as A800 — this doc covers both platforms together.",
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e5a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e5b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e5a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e5b" },
        ],
      },
    },
  },

  "AFF A900": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a900/install-detailed-guide.html",
      fetched: "2026-08-11",
      note: "Storage/cluster port scheme confirmed here differs from compatibility.js's existing NETAPP_PLATFORMS['AFF A900'].ports — see DATA_SOURCES.md.",
    },
    clusterCabling: {
      switchless: [
        { a: "e4a", b: "e4a", role: "cluster interconnect (slot A4/B4)" },
        { a: "e8a", b: "e8a", role: "cluster interconnect (slot A8/B8)" },
      ],
    },
    controllerPorts: {
      data25gbe: ["e3a", "e3c", "e9a", "e9c"],
      host40gbe: ["e4b", "e8b"],
      fc32g: ["5a", "5b", "5c", "5d", "7a", "7b", "7c", "7d"],
    },
    psuPowerDomains: {
      note: "PSU 1 and 3 power all side-A components; PSU 2 and 4 power all side-B components.",
      sideA: [1, 3],
      sideB: [2, 4],
    },
    shelfCabling: {
      // Source: a900-cable.txt (shelf 1) + ns224-to-a900.txt hot-add guide (shelves 2-4)
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e2a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e10b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e2a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e10b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e10a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e2b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e10a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e2b" },
        ],
        3: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e1a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e1a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b" },
        ],
        4: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e1b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e1b" },
        ],
      },
    },
  },

  "AFF A1K": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a1k/install-cable.html",
      fetched: "2026-08-11",
      note: "I/O slots numbered 1-11. compatibility.js's existing storage port list (e2a-e5b) does not match this guide's e10/e11-based scheme — see DATA_SOURCES.md.",
    },
    clusterCabling: {
      switchless: [
        { a: "e1a", b: "e1a", role: "cluster/HA interconnect" },
        { a: "e7a", b: "e7a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      host100gbe: ["e9a", "e9b"],
      mgmt: ["wrench"], // 1000BASE-T RJ-45
    },
    shelfCabling: {
      // Source: a1k-cable.txt (shelves 1-2) + ns224-to-a1k.txt hot-add guide (shelves 2-4,
      // multiple I/O-module-count variants — only the baseline variant kept here)
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e10b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "B", controllerPort: "e10a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b" },
        ],
        3: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e9a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e9b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "B", controllerPort: "e9a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "B", controllerPort: "e9b" },
        ],
        4: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e8a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e9b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "B", controllerPort: "e8a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "B", controllerPort: "e9b" },
        ],
      },
    },
  },

  "AFF A70": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a70-90/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF A90 (\"Cable your AFF A70 or AFF A90...\") — same port scheme as AFF A1K's e1a/e7a cluster, e9a/e9b host, but storage uses PCIe slots 8/11 not 9/10/11.",
    },
    clusterCabling: {
      switchless: [
        { a: "e1a", b: "e1a", role: "cluster/HA interconnect" },
        { a: "e7a", b: "e7a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      host100gbe: ["e9a", "e9b"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e8b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e8b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e8a", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e8a", shelfIndex2Only: true },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b", shelfIndex2Only: true },
        ],
      },
    },
  },

  "AFF A90": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a70-90/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF A70 — identical port scheme.",
    },
    clusterCabling: {
      switchless: [
        { a: "e1a", b: "e1a", role: "cluster/HA interconnect" },
        { a: "e7a", b: "e7a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      host100gbe: ["e9a", "e9b"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e8b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e8b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e8a", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e8a", shelfIndex2Only: true },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b", shelfIndex2Only: true },
        ],
      },
    },
  },

  "AFF C80": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/c80/install-cable.html",
      fetched: "2026-08-12",
      note: "Same cluster/host/storage port scheme as AFF A70/A90's cabling doc.",
    },
    clusterCabling: {
      switchless: [
        { a: "e1a", b: "e1a", role: "cluster/HA interconnect" },
        { a: "e7a", b: "e7a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      host100gbe: ["e9a", "e9b"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b" },
        ],
        2: [
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e11a" },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e8b" },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e11a" },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e8b" },
          { shelfIOM: "A", shelfPort: "e0a", controllerSide: "A", controllerPort: "e8a", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0b", controllerSide: "A", controllerPort: "e11b", shelfIndex2Only: true },
          { shelfIOM: "B", shelfPort: "e0a", controllerSide: "B", controllerPort: "e8a", shelfIndex2Only: true },
          { shelfIOM: "A", shelfPort: "e0b", controllerSide: "B", controllerPort: "e11b", shelfIndex2Only: true },
        ],
      },
    },
  },

  "AFF A50": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a20-30-50/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF A30 and AFF A20. Two I/O-module SKUs exist (two 2-port 40/100GbE, or one) — cluster/host ports below are the 2-IOM variant, the doc's primary/first-listed option; the 1-IOM variant instead uses e4a/e4b for both cluster and host and is not separately modeled here.",
    },
    clusterCabling: {
      switchless: [
        { a: "e2a", b: "e2a", role: "cluster/HA interconnect" },
        { a: "e4a", b: "e4a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      hostEthernet2iom: ["e2b", "e4b"],
      hostEthernet1iom4port: ["e2a", "e2b", "e2c", "e2d"],
      hostFc4port: ["2a", "2b", "2c", "2d"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      // Only a single-NS224-shelf procedure is published for this platform family.
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e1a", controllerSide: "A", controllerPort: "e3a" },
          { shelfIOM: "B", shelfPort: "e1b", controllerSide: "A", controllerPort: "e3b" },
          { shelfIOM: "B", shelfPort: "e1a", controllerSide: "B", controllerPort: "e3a" },
          { shelfIOM: "A", shelfPort: "e1b", controllerSide: "B", controllerPort: "e3b" },
        ],
      },
    },
  },

  "AFF A30": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a20-30-50/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF A50 and AFF A20 — identical port scheme to AFF A50.",
    },
    clusterCabling: {
      switchless: [
        { a: "e2a", b: "e2a", role: "cluster/HA interconnect" },
        { a: "e4a", b: "e4a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      hostEthernet2iom: ["e2b", "e4b"],
      hostEthernet1iom4port: ["e2a", "e2b", "e2c", "e2d"],
      hostFc4port: ["2a", "2b", "2c", "2d"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e1a", controllerSide: "A", controllerPort: "e3a" },
          { shelfIOM: "B", shelfPort: "e1b", controllerSide: "A", controllerPort: "e3b" },
          { shelfIOM: "B", shelfPort: "e1a", controllerSide: "B", controllerPort: "e3a" },
          { shelfIOM: "A", shelfPort: "e1b", controllerSide: "B", controllerPort: "e3b" },
        ],
      },
    },
  },

  "AFF A20": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/a20-30-50/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF A30 and AFF A50. AFF A20 only ships the one-I/O-module 10/25GbE SKU (no two-IOM 40/100GbE variant) — cluster is e4a/e4b, not e2a/e4a.",
    },
    clusterCabling: {
      switchless: [
        { a: "e4a", b: "e4a", role: "cluster/HA interconnect" },
        { a: "e4b", b: "e4b", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      hostEthernet1iom4port: ["e2a", "e2b", "e2c", "e2d"],
      hostFc4port: ["2a", "2b", "2c", "2d"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e1a", controllerSide: "A", controllerPort: "e3a" },
          { shelfIOM: "B", shelfPort: "e1b", controllerSide: "A", controllerPort: "e3b" },
          { shelfIOM: "B", shelfPort: "e1a", controllerSide: "B", controllerPort: "e3a" },
          { shelfIOM: "A", shelfPort: "e1b", controllerSide: "B", controllerPort: "e3b" },
        ],
      },
    },
  },

  "AFF C60": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/c30-60/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF C30 — identical port scheme to AFF A50/A30's 2-IOM variant.",
    },
    clusterCabling: {
      switchless: [
        { a: "e2a", b: "e2a", role: "cluster/HA interconnect" },
        { a: "e4a", b: "e4a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      hostEthernet2iom: ["e2b", "e4b"],
      hostEthernet1iom4port: ["e2a", "e2b", "e2c", "e2d"],
      hostFc4port: ["2a", "2b", "2c", "2d"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e1a", controllerSide: "A", controllerPort: "e3a" },
          { shelfIOM: "B", shelfPort: "e1b", controllerSide: "A", controllerPort: "e3b" },
          { shelfIOM: "B", shelfPort: "e1a", controllerSide: "B", controllerPort: "e3a" },
          { shelfIOM: "A", shelfPort: "e1b", controllerSide: "B", controllerPort: "e3b" },
        ],
      },
    },
  },

  "AFF C30": {
    source: {
      url: "https://docs.netapp.com/us-en/ontap-systems/c30-60/install-cable.html",
      fetched: "2026-08-12",
      note: "Shares one cabling doc with AFF C60 — identical port scheme.",
    },
    clusterCabling: {
      switchless: [
        { a: "e2a", b: "e2a", role: "cluster/HA interconnect" },
        { a: "e4a", b: "e4a", role: "cluster/HA interconnect" },
      ],
    },
    controllerPorts: {
      hostEthernet2iom: ["e2b", "e4b"],
      hostEthernet1iom4port: ["e2a", "e2b", "e2c", "e2d"],
      hostFc4port: ["2a", "2b", "2c", "2d"],
      mgmt: ["wrench"],
    },
    shelfCabling: {
      ns224: {
        1: [
          { shelfIOM: "A", shelfPort: "e1a", controllerSide: "A", controllerPort: "e3a" },
          { shelfIOM: "B", shelfPort: "e1b", controllerSide: "A", controllerPort: "e3b" },
          { shelfIOM: "B", shelfPort: "e1a", controllerSide: "B", controllerPort: "e3a" },
          { shelfIOM: "A", shelfPort: "e1b", controllerSide: "B", controllerPort: "e3b" },
        ],
      },
    },
  },
};

// NS224 shelf: NSM module (IOM equivalent) physical position and shelf-ID
// defaults. Source: ns224-overview.txt + a900-cable.txt ("shelves are
// pre-set to shelf ID 00 and 01").
export const NS224_SHELF_FACTS = {
  moduleNames: ["A", "B"], // NSM A / NSM B, not IOM A/B (NS224 uses "NSM")
  defaultShelfIds: ["00", "01"],
  pullTab: "up",
};

/**
 * Returns the sourced rack-layout entry for a platform model, or null if
 * this platform hasn't been harvested yet. Callers MUST fall back to the
 * existing schematic renderer on null — never fabricate a layout.
 */
export function getRackLayout(model) {
  return RACK_LAYOUTS[model] || null;
}

/**
 * Returns the shelf-cabling endpoint list for a platform + shelf-slot-index
 * (1-based, in the order shelves are added), or null if not covered.
 */
export function getShelfCabling(model, shelfType, shelfIndex) {
  const layout = getRackLayout(model);
  if (!layout || !layout.shelfCabling || !layout.shelfCabling[shelfType]) return null;
  return layout.shelfCabling[shelfType][shelfIndex] || null;
}
