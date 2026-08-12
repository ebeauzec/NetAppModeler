/**
 * NetApp Hardware Platforms & ONTAP Software Compatibility Registry
 * Contains compatibility maps, lifecycle boundaries, physical port layouts, and detailed multi-hop upgrade considerations.
 */

export const EXP_CARDS_CATALOG = {
  // === Ethernet NICs ===
  // Port naming: each card type uses a distinct slot-keyed prefix to avoid collision.
  // Slot 1 (primary NIC): e1a/e1b/...  Slot 2 (secondary NIC / 100G): e2a/e2b
  // Slot 3 (RoCE storage): e3a/e3b     Slot 8 (NS224 RoCE v2): e8a/e8b
  // FC/SAN adapters: 0g/0h (16G), 0i/0j (32G/64G FC), 0k/0l (NVMe/FC separate)
  // SAS adapters: 0c/0d (SAS ports, not overlapping onboard 0e/0f SAN)
  nic_10g_2port:          { name: "Dual-port 10GbE SFP+ NIC (X1117A)",                   type: "nic",     ports: ["e0e","e0f"],             speed: "10GbE",       minOntap: "9.1",    power: 15 },
  nic_25g_4port:          { name: "Quad-port 25GbE SFP28 NIC (X1146A)",                  type: "nic",     ports: ["e1a","e1b","e1c","e1d"], speed: "25GbE",       minOntap: "9.3",    power: 22 },
  nic_40g_2port:          { name: "Dual-port 40GbE QSFP+ NIC (X1146A)",                  type: "nic",     ports: ["e1a","e1b"],             speed: "40GbE",       minOntap: "9.5",    power: 20 },
  nic_100g_2port:         { name: "Dual-port 100GbE QSFP28 NIC (X91148A)",               type: "nic",     ports: ["e2a","e2b"],             speed: "100GbE",      minOntap: "9.8",    power: 35 },
  nic_100g_4port:         { name: "Quad-port 100GbE SFP28 NIC (X91144A)",                type: "nic",     ports: ["e1a","e1b","e1c","e1d"], speed: "100GbE",      minOntap: "9.10.1", power: 45 },
  nic_200g_2port:         { name: "Dual-port 200GbE QSFP56 NIC (X91160A)",               type: "nic",     ports: ["e2a","e2b"],             speed: "200GbE",      minOntap: "9.16.1", power: 45 },
  // === Fibre Channel HBAs ===
  fc_hba_16g_2port:       { name: "Dual-port 16Gb Fibre Channel HBA (X1132A)",           type: "san",     ports: ["0g","0h"],               speed: "16Gb FC",     minOntap: "9.1",    power: 18 },
  fc_hba_32g_2port:       { name: "Dual-port 32Gb Fibre Channel HBA (X2106A)",           type: "san",     ports: ["0i","0j"],               speed: "32Gb FC",     minOntap: "9.5",    power: 25 },
  fc_hba_64g_2port:       { name: "Dual-port 64Gb Fibre Channel HBA (X2107A)",           type: "san",     ports: ["0i","0j"],               speed: "64Gb FC",     minOntap: "9.14.1", power: 28 },
  // === SAS Storage Adapters ===
  // Ports 0c/0d avoid collision with onboard san ports 0e/0f
  sas_hba_12g_4port:      { name: "Quad-port 12G SAS Host Adapter (X1107A)",             type: "storage", ports: ["0a","0b","0c","0d"],     speed: "12Gb SAS",    minOntap: "9.1",    power: 20 },
  // === NVMe / RoCE Storage Adapters ===
  roce_hba_100g_2port:    { name: "Dual-port 100GbE NVMe-oF RoCE Adapter (X91148A)",     type: "storage", ports: ["e3a","e3b"],             speed: "100GbE RoCE", minOntap: "9.8",    power: 38 },
  roce_hba_100g_2port_v2: { name: "Dual-port 100GbE RoCE NS224 Shelf Adapter (X60141A)", type: "storage", ports: ["e8a","e8b"],             speed: "100GbE RoCE", minOntap: "9.12.1", power: 38 },
  nvme_tcp_100g_2port:    { name: "Dual-port 100GbE NVMe/TCP Host Adapter (X91148A)",    type: "nic",     ports: ["e2a","e2b"],             speed: "100GbE",      minOntap: "9.10.1", power: 35 },
  // NVMe/FC gets distinct ports 0k/0l so it can coexist with fc_hba_32g_2port (0i/0j)
  nvme_fc_32g_2port:      { name: "Dual-port 32Gb NVMe/FC HBA (X2106A)",                type: "san",     ports: ["0k","0l"],               speed: "32Gb FC",     minOntap: "9.9.1",  power: 25 },
};

export const PLATFORM_SLOT_DETAILS = {
  // 0 slots — virtual/cloud platforms (ONTAP Select, CVO)
  0: [],
  // 12 slots — AFX 2K ultra-high-performance
  12: [
    { num: 1,  type: "PCIe Gen5 x16", recType: "nic",     rec: "Primary 200G/400G data/cluster networking" },
    { num: 2,  type: "PCIe Gen5 x16", recType: "nic",     rec: "Secondary 200G/400G data/cluster networking" },
    { num: 3,  type: "PCIe Gen5 x16", recType: "nic",     rec: "Tertiary 100G data networking" },
    { num: 4,  type: "PCIe Gen5 x16", recType: "san",     rec: "64Gb/32Gb Fibre Channel SAN HBA" },
    { num: 5,  type: "PCIe Gen5 x16", recType: "san",     rec: "64Gb/32Gb Fibre Channel SAN HBA" },
    { num: 6,  type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE adapter" },
    { num: 7,  type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE adapter" },
    { num: 8,  type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE NS224 adapter" },
    { num: 9,  type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE NS224 adapter" },
    { num: 10, type: "PCIe Gen5 x16", recType: "nic",     rec: "Auxiliary 100G/200G data networking" },
    { num: 11, type: "PCIe Gen5 x16", recType: "san",     rec: "FC HBA target adapter" },
    { num: 12, type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed storage extension" }
  ],
  11: [
    { num: 1, type: "PCIe Gen5 x16", recType: "nic", rec: "Primary 200G/100G data/cluster networking" },
    { num: 2, type: "PCIe Gen5 x16", recType: "nic", rec: "Secondary 200G/100G data/cluster networking" },
    { num: 3, type: "PCIe Gen5 x16", recType: "san", rec: "64Gb/32Gb Fibre Channel SAN HBA" },
    { num: 4, type: "PCIe Gen5 x16", recType: "san", rec: "64Gb/32Gb Fibre Channel SAN HBA" },
    { num: 5, type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE adapter" },
    { num: 6, type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE adapter" },
    { num: 7, type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE adapter" },
    { num: 8, type: "PCIe Gen5 x16", recType: "nic", rec: "Auxiliary 100G/25G data connection" },
    { num: 9, type: "PCIe Gen5 x16", recType: "nic", rec: "Auxiliary 100G/25G data connection" },
    { num: 10, type: "PCIe Gen5 x16", recType: "san", rec: "FC HBA target adapter" },
    { num: 11, type: "PCIe Gen5 x16", recType: "storage", rec: "High-speed storage extension" }
  ],
  10: [
    { num: 1, type: "PCIe Gen4 x16", recType: "nic", rec: "Primary 100GbE data/cluster networking" },
    { num: 2, type: "PCIe Gen4 x16", recType: "nic", rec: "Secondary 100GbE data/cluster networking" },
    { num: 3, type: "PCIe Gen4 x16", recType: "san", rec: "Fibre Channel HBA (32Gb/16Gb FC SAN Target)" },
    { num: 4, type: "PCIe Gen4 x16", recType: "san", rec: "Fibre Channel HBA (32Gb/16Gb FC SAN Target)" },
    { num: 5, type: "PCIe Gen4 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE sync/storage" },
    { num: 6, type: "PCIe Gen4 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE sync/storage" },
    { num: 7, type: "PCIe Gen4 x8",  recType: "storage", rec: "Backend 12Gb SAS storage shelf adapter" },
    { num: 8, type: "PCIe Gen4 x8",  recType: "storage", rec: "Backend 12Gb SAS storage shelf adapter" },
    { num: 9, type: "PCIe Gen4 x8",  recType: "san", rec: "SAN Target HBA (Fibre Channel)" },
    { num: 10, type: "PCIe Gen4 x8", recType: "nic", rec: "Auxiliary Ethernet card" }
  ],
  8: [
    { num: 1, type: "PCIe Gen4 x16", recType: "nic", rec: "Primary 100GbE data/cluster networking" },
    { num: 2, type: "PCIe Gen4 x16", recType: "nic", rec: "Secondary 100GbE data/cluster networking" },
    { num: 3, type: "PCIe Gen4 x16", recType: "san", rec: "Fibre Channel HBA (32Gb/16Gb FC SAN Target)" },
    { num: 4, type: "PCIe Gen4 x16", recType: "san", rec: "Fibre Channel HBA (32Gb/16Gb FC SAN Target)" },
    { num: 5, type: "PCIe Gen4 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE sync/storage" },
    { num: 6, type: "PCIe Gen4 x16", recType: "storage", rec: "High-speed NVMe-oF RoCE sync/storage" },
    { num: 7, type: "PCIe Gen4 x8",  recType: "storage", rec: "Backend 12Gb SAS storage shelf adapter" },
    { num: 8, type: "PCIe Gen4 x8",  recType: "storage", rec: "Backend 12Gb SAS storage shelf adapter" }
  ],
  6: [
    { num: 1, type: "PCIe Gen4 x16", recType: "nic", rec: "Primary 100GbE/25GbE data networking" },
    { num: 2, type: "PCIe Gen4 x16", recType: "nic", rec: "Secondary 100GbE/25GbE data networking" },
    { num: 3, type: "PCIe Gen4 x16", recType: "san", rec: "Fibre Channel SAN Target HBA (32Gb/16Gb FC)" },
    { num: 4, type: "PCIe Gen4 x16", recType: "san", rec: "Fibre Channel SAN Target HBA (32Gb/16Gb FC)" },
    { num: 5, type: "PCIe Gen4 x16", recType: "storage", rec: "High-speed 100GbE NVMe-oF RoCE storage adapter" },
    { num: 6, type: "PCIe Gen4 x16", recType: "storage", rec: "High-speed 100GbE NVMe-oF RoCE storage adapter" }
  ],
  5: [
    { num: 1, type: "PCIe Gen4 x16", recType: "nic",     rec: "Primary 100GbE data/cluster networking" },
    { num: 2, type: "PCIe Gen4 x16", recType: "nic",     rec: "Secondary 100GbE data/cluster networking" },
    { num: 3, type: "PCIe Gen4 x16", recType: "san",     rec: "32Gb/16Gb Fibre Channel SAN HBA" },
    { num: 4, type: "PCIe Gen4 x16", recType: "storage", rec: "100GbE NVMe-oF RoCE adapter" },
    { num: 5, type: "PCIe Gen4 x8",  recType: "storage", rec: "12Gb SAS or auxiliary 25GbE NIC" }
  ],
  4: [
    { num: 1, type: "PCIe Gen3 x16", recType: "nic", rec: "Primary 100GbE high-bandwidth network adapter" },
    { num: 2, type: "PCIe Gen3 x16", recType: "storage", rec: "100GbE NVMe-oF RoCE sync / storage HBA" },
    { num: 3, type: "PCIe Gen3 x8",  recType: "san", rec: "SAN Target HBA (32Gb/16Gb Fibre Channel)" },
    { num: 4, type: "PCIe Gen3 x8",  recType: "storage", rec: "12Gb SAS storage shelf expansion adapter" }
  ],
  3: [
    { num: 1, type: "PCIe Gen4 x16", recType: "nic",     rec: "Primary 100GbE/25GbE data or RoCE storage networking" },
    { num: 2, type: "PCIe Gen4 x16", recType: "san",     rec: "32Gb/16Gb Fibre Channel SAN HBA" },
    { num: 3, type: "PCIe Gen4 x8",  recType: "storage", rec: "12Gb SAS or 100GbE RoCE shelf adapter" }
  ],
  2: [
    { num: 1, type: "PCIe Gen3 x16", recType: "nic", rec: "Primary 100G/25G network or RoCE storage card" },
    { num: 2, type: "PCIe Gen3 x8",  recType: "storage", rec: "Backend SAS adapter or 32G/16G FC SAN adapter" }
  ],
  1: [
    { num: 1, type: "PCIe Gen3 x8",  recType: "any", rec: "Universal expansion slot for storage or network adapters" }
  ]
};

export function getPlatformSlots(model) {
  const profile = getPlatformProfile(model);
  const maxSlots = profile.maxPcieSlots || 2;
  return PLATFORM_SLOT_DETAILS[maxSlots] || PLATFORM_SLOT_DETAILS[2];
}

export const NETAPP_PLATFORMS = {
  // --- AFF A-Series (NVMe High Performance All Flash) ---
  "AFF A1K": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is fully supported natively using PCIe slots."
    },
    shelfErrors: {
      "ds224c": "AFF A1K is a high-end all-NVMe controller and does not support SAS shelves (DS224C).",
      "ds212c": "LFF HDD shelves are not supported on AFF platforms.",
      "ds460c": "High-density SATA HDD shelves are not supported on AFF platforms.",
      "ds2246": "Legacy 6G SAS shelves are not supported on AFF A1K."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.1",
    description: "High-end NVMe-oF All Flash storage controller.",
    // Port scheme corrected against NetApp's official install/cabling guides
    // (docs.netapp.com/us-en/ontap-systems/a1k/install-cable.html and
    // .../ns224/hot-add-aff-cable-a1k.html, harvested 2026-08-11 — see
    // js/rackLayouts.js and DATA_SOURCES.md). I/O slots are numbered 1-11;
    // the previous e2a-e5b storage range didn't match any published cabling
    // step. e9a/e9b appear in the docs as both a "typical" host-network
    // example and as the shelf-3 RoCE pair — kept in both groups here.
    ports: {
      cluster: ["e1a", "e7a"],          // cluster/HA interconnect
      data:    ["e9a", "e9b"],          // 100GbE host network (typical example)
      san:     [],
      storage: ["e8a", "e8b", "e9a", "e9b", "e10a", "e10b", "e11a", "e11b"] // NS224 shelves 1-4, PCIe RoCE 100G
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 11
  },
  "AFF A90": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 natively cabled to on-board RoCE ports." },
    shelfErrors: {
      "ds224c": "AFF A90 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.0",
    description: "Next-generation mid-range NVMe storage system.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/a70-a90/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — cluster/HA is e1a+e7a, host is
    // e9a/e9b (100GbE), NS224 storage is on PCIe slots 8/11, not the generic
    // e0a/e0b/e0c/e0d/e2a-e5b template every other unreviewed platform still carries.
    ports: {
      cluster: ["e1a", "e7a"],
      data: ["e9a", "e9b"],
      san: ["0e", "0f"],
      storage: ["e8a", "e8b", "e11a", "e11b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "AFF A70": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF A70 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.0",
    description: "Next-generation NVMe storage platform.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/a70-a90/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — same scheme as AFF A90 (shares
    // the same cabling doc): cluster e1a+e7a, host e9a/e9b, storage on PCIe slots 8/11.
    ports: {
      cluster: ["e1a", "e7a"],
      data: ["e9a", "e9b"],
      san: ["0e", "0f"],
      storage: ["e8a", "e8b", "e11a", "e11b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "AFF A900": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is natively supported."
    },
    shelfErrors: {
      "ds224c": "AFF A900 is an all-NVMe system and does not support SAS SSD/HDD shelves.",
      "ds212c": "HDD shelves are not supported on AFF arrays.",
      "ds460c": "HDD shelves are not supported on AFF arrays.",
      "ds2246": "Legacy 6G SAS is not supported on AFF A900."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v18.4",
    description: "Enterprise NVMe All Flash storage system.",
    // Port scheme corrected against NetApp's official install/cabling guides
    // (docs.netapp.com/us-en/ontap-systems/a900/install-detailed-guide.html
    // and .../ns224/hot-add-aff-cable-a900.html, harvested 2026-08-11 — see
    // js/rackLayouts.js and DATA_SOURCES.md). Cluster interconnect is on
    // slots 4/8 (e4a/e8a), not onboard e0a/e0b; storage/NS224 ports are on
    // slots 1/2/10/11, not 3/7/11/15.
    ports: {
      cluster: ["e4a", "e8a"],
      data: ["e3a", "e3c", "e9a", "e9c", "e4b", "e8b"],
      san: ["5a", "5b", "5c", "5d", "7a", "7b", "7c", "7d"],
      storage: ["e1a", "e1b", "e2a", "e2b", "e10a", "e10b", "e11a", "e11b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 10
  },
  "AFF A800": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 is supported. Enforce target ONTAP version >= 9.8.",
      "ds224c": "DS224C SAS SSD shelf is supported, but NVMe shelves are preferred."
    },
    shelfErrors: {
      "ds212c": "LFF HDD shelves are not supported on AFF arrays.",
      "ds460c": "High-density mechanical storage is not supported on AFF A800.",
      "ds2246": "DS2246 legacy SAS-2 shelf is not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v14.6",
    description: "Enterprise NVMe NVMe-oF All Flash array (End of Support on ONTAP 9.15.1+).",
    // Corrected against docs.netapp.com/us-en/ontap-systems/a800/install-detailed-guide.html
    // and .../ns224/hot-add-aff-cable-a800-c800.html (harvested 2026-08-11, see
    // js/rackLayouts.js). Cluster/HA use e0a/e1a + e0b/e1b; FC host ports are
    // 2a-2d (no "e" prefix, per NetApp's own doc); NS224 storage uses PCIe
    // slot 5 (primary) and slot 3 (second shelf), not slot 2.
    ports: {
      cluster: ["e0a", "e0b", "e1a", "e1b"],
      data: ["e0c", "e0d", "e4a", "e4b", "e4c", "e4d"],
      san: ["0e", "0f", "2a", "2b", "2c", "2d"],
      storage: ["e3a", "e3b", "e5a", "e5b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF A50": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF A50 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Modern entry-level NVMe storage array.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/a20-a30-a50/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — cluster/HA is e2a+e4a (2-IOM SKU),
    // host data is e2b/e4b, NS224 storage is e3a/e3b, not the generic e0a-e0d template.
    ports: {
      cluster: ["e2a", "e4a"],
      data: ["e2b", "e4b"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A400": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is highly recommended for optimal performance.",
      "ds224c": "DS224C SAS shelf is supported for SAS SSD drives."
    },
    shelfErrors: {
      "ds212c": "AFF A400 does not support large-form SATA drives.",
      "ds460c": "AFF A400 does not support SATA HDD expansion stacks.",
      "ds2246": "Legacy 6G SAS is not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v15.5",
    description: "Mid-range NVMe storage platform.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a400-c400.html
    // (harvested 2026-08-11, see js/rackLayouts.js) — first NS224 shelf cables
    // to onboard e0c/e0d; a second shelf adds PCIe slot 5 (e5a/e5b).
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b", "e5a", "e5b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF A30": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF A30 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Modern entry NVMe storage platform.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/a20-a30-a50/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — same scheme as AFF A50 (shares the
    // same cabling doc): cluster e2a+e4a, host e2b/e4b, storage e3a/e3b.
    ports: {
      cluster: ["e2a", "e4a"],
      data: ["e2b", "e4b"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A20": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF A20 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Modern entry NVMe performance storage array.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/a20-a30-a50/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — AFF A20 only ships the one-I/O-module
    // SKU, so cluster/HA is e4a+e4b (not e2a+e4a like A30/A50); storage is e3a/e3b.
    ports: {
      cluster: ["e4a", "e4b"],
      data: ["e2a", "e2b", "e2c", "e2d"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A300": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ns224"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ds224c": "DS224C SAS SSD shelf is fully supported.",
      "ns224": "NS224 NVMe shelf requires PCIe RoCE 100G adapter cards and ONTAP >= 9.8."
    },
    shelfErrors: {
      "ds212c": "HDD expansion is unsupported on AFF arrays.",
      "ds460c": "HDD expansion is unsupported on AFF arrays.",
      "ds2246": "DS2246 legacy SAS-2 shelf is not supported on AFF A300."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v11.7",
    description: "Legacy All-Flash array (End of Support on ONTAP 9.15.1+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "AFF A250": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is natively supported."
    },
    shelfErrors: {
      "ds224c": "AFF A250 is an NVMe-only chassis and does not support SAS shelves.",
      "ds212c": "LFF HDD expansion is unsupported on AFF A250.",
      "ds460c": "High-density SATA is unsupported on AFF A250.",
      "ds2246": "Legacy SAS-2 is unsupported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v16.1",
    description: "Entry NVMe All Flash array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A220": {
    maxOntap: "9.15.1",
    supportedShelves: ["ds224c"],
    unsupportedShelves: ["ns224", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ds224c": "DS224C SAS SSD shelf is supported."
    },
    shelfErrors: {
      "ns224": "AFF A220 does not have 100Gb ports and cannot drive NVMe shelves.",
      "ds212c": "HDD expansion is unsupported on AFF arrays.",
      "ds460c": "HDD expansion is unsupported on AFF arrays.",
      "ds2246": "DS2246 legacy SAS-2 shelf is not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v11.7",
    description: "Legacy entry All-Flash controller (End of Support on ONTAP 9.15.1+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "AFF A150": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c"],
    unsupportedShelves: ["ns224", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ds224c": "DS224C SAS SSD shelf is supported." },
    shelfErrors: {
      "ns224": "AFF A150 does not support NVMe shelves.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy 6G SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v15.5",
    description: "Entry level NAS/SAN flash storage platform.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },

  // --- AFF C-Series (Capacity All Flash) ---
  "AFF C80": {
    minOntap: "9.16.1",
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF C80 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.0",
    description: "High-density capacity-optimized NVMe QLC storage array.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/c80/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — same port scheme as AFF A70/A90's
    // cabling doc: cluster e1a+e7a, host e9a/e9b, storage on PCIe slots 8/11.
    ports: {
      cluster: ["e1a", "e7a"],
      data: ["e9a", "e9b"],
      san: ["0e", "0f"],
      storage: ["e8a", "e8b", "e11a", "e11b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port", "nic_200g_2port", "fc_hba_64g_2port"],
    maxPcieSlots: 6
  },
  "AFF C800": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf fully supported." },
    shelfErrors: {
      "ds224c": "AFF C800 does not support SAS SSD/HDD shelves.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy 6G SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v18.4",
    description: "Capacity NVMe All Flash storage array.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a800-c800.html
    // (harvested 2026-08-11, see js/rackLayouts.js) — this doc covers A800 and
    // C800 identically; NS224 storage uses PCIe slot 5 (primary) and slot 3
    // (second shelf), not slots 2/6.
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b", "e5a", "e5b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF C400": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf is highly recommended." },
    shelfErrors: {
      "ds212c": "SATA HDD shelves not supported.",
      "ds460c": "SATA HDD shelves not supported.",
      "ds2246": "Legacy SAS-2 is not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v15.5",
    description: "Capacity NVMe All Flash storage platform.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/ns224/hot-add-aff-cable-a400-c400.html
    // (harvested 2026-08-11, see js/rackLayouts.js) — C400 NS224 storage uses
    // PCIe slot 4 (primary) and slot 5 (second shelf), no onboard RoCE path.
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e4a", "e4b", "e5a", "e5b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF C250": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf is supported natively." },
    shelfErrors: {
      "ds224c": "AFF C250 is NVMe-only and does not support SAS SSD/HDD shelves.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v16.1",
    description: "Entry capacity NVMe all flash storage.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF C30": {
    minOntap: "9.16.1",
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF C30 is NVMe-only.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Modern entry capacity NVMe storage.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/c30-c60/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — same scheme as AFF A50/A30's
    // 2-IOM variant: cluster e2a+e4a, host e2b/e4b, storage e3a/e3b.
    ports: {
      cluster: ["e2a", "e4a"],
      data: ["e2b", "e4b"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF C60": {
    minOntap: "9.16.1",
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "AFF C60 is NVMe-only.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Modern mid-range capacity NVMe storage.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/c30-c60/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — shares AFF C30's cabling doc and
    // port scheme: cluster e2a+e4a, host e2b/e4b, storage e3a/e3b.
    ports: {
      cluster: ["e2a", "e4a"],
      data: ["e2b", "e4b"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF C190": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c"],
    unsupportedShelves: ["ns224", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ds224c": "DS224C SAS SSD shelf fully supported." },
    shelfErrors: {
      "ns224": "AFF C190 does not support NVMe shelves.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy 6G SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v11.7",
    description: "Legacy entry All Flash array with limited licensing protocols (no FCP).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: [],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },

  // --- FAS Series (Hybrid / Capacity HDD) ---
  "FAS9500": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ns224"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelves are supported on FAS9500 using high speed interface ports.",
      "ds460c": "Ensure cabinet has adequate space and cooling load profiles for DS460C."
    },
    shelfErrors: {
      "ds2246": "DS2246 legacy 6G SAS shelf is not supported on FAS9500 controllers."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v18.2",
    description: "Enterprise hybrid storage system.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b", "0c", "0d"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 10
  },
  "FAS9000": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ns224"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf requires PCIe RoCE 100G adapter cards and ONTAP >= 9.8.",
      "ds460c": "DS460C fully supported."
    },
    shelfErrors: {
      "ds2246": "Legacy SAS-2 is not supported on FAS9000."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v11.9",
    description: "Legacy enterprise hybrid array (End of Support on ONTAP 9.15.1+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b", "0c", "0d"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 4
  },
  "FAS8700": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ns224"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf requires PCIe RoCE 100G adapter cards and ONTAP >= 9.8."
    },
    shelfErrors: {
      "ds2246": "Legacy SAS-2 is not supported on FAS8700."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.2",
    description: "High-end hybrid storage platform.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "FAS8300": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ns224"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelves are supported on FAS8300 starting in ONTAP 9.8 via RoCE ports.",
      "ds224c": "DS224C 12G SAS shelf is fully supported on FAS8300.",
      "ds212c": "DS212C 12G SAS Large Form Factor shelf is fully supported.",
      "ds460c": "DS460C High-Density SAS shelf is supported."
    },
    shelfErrors: {
      "ds2246": "DS2246 is a legacy 6G SAS shelf. Adding SAS-2 shelves violates NetApp best practices on FAS8300 controllers."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.2",
    description: "Mid-range hybrid storage array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "FAS8200": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: { "ds460c": "DS460C high-density SAS shelf is fully supported." },
    shelfErrors: {
      "ns224": "FAS8200 does not support NVMe expansion shelves.",
      "ds2246": "DS2246 legacy 6G SAS shelf is not supported on FAS8200."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v11.9",
    description: "Legacy mid-range hybrid array (End of Support on ONTAP 9.15.1+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "FAS2820": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: { "ds224c": "DS224C SFF shelf fully supported." },
    shelfErrors: {
      "ns224": "FAS2820 does not support NVMe expansion shelves.",
      "ds2246": "Legacy 6G SAS is not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v16.1",
    description: "Entry hybrid storage array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "FAS2720": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: { "ds212c": "LFF HDD expansion supported." },
    shelfErrors: {
      "ns224": "FAS2720 does not support NVMe shelves.",
      "ds2246": "DS2246 is a legacy SAS-2 shelf and is unsupported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v11.7",
    description: "Legacy entry LFF hybrid array (End of Support on ONTAP 9.15.1+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "FAS2750": {
    maxOntap: "9.15.1",
    // DS2246 (IOM6, 6Gb SAS) is supported — FAS2750's 12Gb SAS is backward-compatible with 6G shelves.
    // DS224C (IOM12, 12Gb SAS) is the native shelf; DS212C and DS460C are also supported.
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246", "ds4246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: {
      "ds2246": "DS2246 (IOM6, 6Gb SAS) runs at 6Gb speed on FAS2750's 12Gb controller. Supported but consider upgrading to DS224C for full 12Gb throughput.",
      "ds4246": "DS4246 (IOM6, 6Gb SAS) runs at 6Gb speed. Supported but consider upgrading shelves."
    },
    shelfErrors: {
      "ns224": "FAS2750 does not support NVMe/RoCE shelves (NS224). NS224 requires AFF A-series or newer FAS platforms."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v11.9",
    description: "Entry-level 2U SFF hybrid controller. End of Software Support: ONTAP 9.15.1 (no 9.16+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data:    ["e0c", "e0d"],
      san:     ["0e", "0f"],
      // 4 onboard SAS ports in 2 pairs — required for full multipath HA with DS2246/DS224C stacks
      storage: ["0a", "0b", "0c", "0d"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    // FAS2750 2U chassis: 3 PCIe slots per controller (slots 1, 2, 3)
    // In an HA pair in the same chassis: A-side uses slots 1-3, B-side uses slots 4-6
    maxPcieSlots: 3
  },
  "FAS2650": {
    maxOntap: "9.11.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: {},
    shelfErrors: {
      "ns224": "FAS2650 does not support NVMe shelves.",
      "ds2246": "Legacy 6G SAS not supported on this platform."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v10.5",
    description: "Legacy EOL SFF entry controller (Max ONTAP 9.9.1).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "FAS2620": {
    maxOntap: "9.11.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: {},
    shelfErrors: {
      "ns224": "FAS2620 does not support NVMe shelves.",
      "ds2246": "Legacy 6G SAS not supported on this platform."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v10.5",
    description: "Legacy EOL LFF entry controller (Max ONTAP 9.9.1).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "FAS2520": {
    maxOntap: "9.5",
    supportedShelves: [],
    unsupportedShelves: ["ns224", "ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {},
    shelfErrors: {
      "ns224": "FAS2520 is a legacy SAS-1/2 controller and cannot connect to NVMe shelves.",
      "ds224c": "DS224C 12G SAS shelf is not supported on FAS2520 controllers.",
      "ds212c": "12G SAS shelves are not supported on FAS2520.",
      "ds460c": "High-density SAS shelves are not supported on FAS2520.",
      "ds2246": "Legacy 6G SAS DS2246 shelf is not supported on FAS2520."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "SnapMirror", "FlexClone"],
    maxFirmware: "v8.5",
    description: "Legacy end-of-life FAS storage controller (Max ONTAP 9.5).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: [],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 1
  },
  "FAS90": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is supported via PCIe adapter or on-board RoCE links.",
      "ds224c": "DS224C SAS SSD/HDD shelf is fully supported natively."
    },
    shelfErrors: {
      "ds2246": "Legacy 6G SAS shelves (DS2246) are not supported on FAS90."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.1",
    description: "High-end Unified Hybrid Flash storage controller.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/fas70-fas90/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — same cluster/host scheme as
    // AFF A70/A90/A1K: cluster e1a+e7a, host e9a/e9b. NS224 storage is on PCIe
    // slots 10/11 (not 8/11 like the AFF A70/A90/C80 family).
    ports: {
      cluster: ["e1a", "e7a"],
      data: ["e9a", "e9b"],
      san: ["0e", "0f"],
      storage: ["e10a", "e10b", "e11a", "e11b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "FAS70": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is supported.",
      "ds224c": "DS224C SAS shelf is supported."
    },
    shelfErrors: {
      "ds2246": "Legacy 6G SAS shelves (DS2246) are not supported on FAS70."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.0",
    description: "Mid-range Unified Hybrid Flash storage controller.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/fas70-fas90/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — shares FAS90's cabling doc and
    // port scheme: cluster e1a+e7a, host e9a/e9b, NS224 storage on PCIe slots 10/11.
    ports: {
      cluster: ["e1a", "e7a"],
      data: ["e9a", "e9b"],
      san: ["0e", "0f"],
      storage: ["e10a", "e10b", "e11a", "e11b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "FAS50": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: {
      "ds2246": "FAS50 supports DS2246 legacy SAS shelves under transition compliance."
    },
    shelfErrors: {
      "ns224": "FAS50 does not support high-speed NVMe NS224 shelves."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Entry-level Unified Hybrid Flash storage controller.",
    // Corrected against docs.netapp.com/us-en/ontap-systems/fas50/install-cable.html
    // (harvested 2026-08-12, see js/rackLayouts.js) — cluster/HA is e4a/e4b (one
    // I/O module), host is e2a-e2d (10/25GbE) or FC 2a-2d, DS460C SAS storage is
    // ports 3a/3d (mini-SAS HD, no "e" prefix — legacy FAS SAS HBA naming).
    ports: {
      cluster: ["e4a", "e4b"],
      data: ["e2a", "e2b", "e2c", "e2d"],
      san: ["0e", "0f"],
      storage: ["3a", "3d"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "ASA A1K": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is fully supported natively using PCIe slots."
    },
    shelfErrors: {
      "ds224c": "ASA A1K is a high-end all-NVMe controller and does not support SAS shelves (DS224C).",
      "ds212c": "LFF HDD shelves are not supported on All-SAN arrays.",
      "ds460c": "High-density SATA HDD shelves are not supported on All-SAN arrays.",
      "ds2246": "Legacy 6G SAS shelves are not supported on ASA A1K."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.1",
    description: "High-end SAN-Optimized All-Flash storage controller.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b", "e4a", "e4b", "e5a", "e5b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 11
  },
  "ASA A90": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 natively cabled to on-board RoCE ports." },
    shelfErrors: {
      "ds224c": "ASA A90 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.0",
    description: "Next-generation mid-range SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b", "e4a", "e4b", "e5a", "e5b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "ASA A70": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "ASA A70 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v20.0",
    description: "Next-generation SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b", "e4a", "e4b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "ASA A50": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "ASA A50 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Entry-to-mid SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "ASA A30": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "ASA A30 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.0",
    description: "Entry SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "ASA A20": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "ASA A20 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v16.2",
    description: "Entry-level SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "ASA C30": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 QLC-SSD NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "ASA C30 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v17.2",
    description: "Capacity-optimized SAN All-Flash Array (QLC SSD).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "ASA C800": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf supported." },
    shelfErrors: {
      "ds224c": "ASA C800 is NVMe-only; SAS shelves are unsupported.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v18.4",
    description: "Capacity-optimized SAN All-Flash Array (QLC SSD).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e6a", "e6b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4,
    ram: 256,
    cpus: 32
  },
  "ASA C400": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf is highly recommended." },
    shelfErrors: {
      "ds212c": "SATA HDD shelves not supported.",
      "ds460c": "SATA HDD shelves not supported.",
      "ds2246": "Legacy SAS-2 is not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v15.5",
    description: "Capacity-optimized mid-range SAN All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4,
    ram: 256,
    cpus: 32
  },
  "ASA C250": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf is supported natively." },
    shelfErrors: {
      "ds224c": "ASA C250 is NVMe-only and does not support SAS SSD/HDD shelves.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy SAS not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v16.1",
    description: "Capacity-optimized entry SAN All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2,
    ram: 128,
    cpus: 16
  },
  "ASA A800": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 is supported. Enforce target ONTAP version >= 9.8.",
      "ds224c": "DS224C SAS SSD shelf is supported, but NVMe shelves are preferred."
    },
    shelfErrors: {
      "ds212c": "LFF HDD shelves are not supported on All-SAN arrays.",
      "ds460c": "High-density mechanical storage is not supported.",
      "ds2246": "DS2246 legacy SAS-2 shelf is not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v14.6",
    description: "High-performance SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4,
    ram: 256,
    cpus: 32
  },
  "ASA A400": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is highly recommended for optimal performance.",
      "ds224c": "DS224C SAS shelf is supported for SAS SSD drives."
    },
    shelfErrors: {
      "ds212c": "ASA A400 does not support large-form SATA drives.",
      "ds460c": "ASA A400 does not support SATA HDD expansion stacks.",
      "ds2246": "Legacy 6G SAS is not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v15.5",
    description: "High-performance mid-range SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e2a", "e2b", "e3a", "e3b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4,
    ram: 256,
    cpus: 32
  },
  "ASA A900": {
    maxOntap: "9.19.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {
      "ns224": "NS224 NVMe shelf is natively supported."
    },
    shelfErrors: {
      "ds224c": "ASA A900 is an all-NVMe system and does not support SAS SSD/HDD shelves.",
      "ds212c": "HDD shelves are not supported.",
      "ds460c": "HDD shelves are not supported.",
      "ds2246": "Legacy 6G SAS is not supported."
    },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v18.4",
    description: "Enterprise SAN-Optimized All-Flash Array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e3a", "e3b", "e7a", "e7b", "e11a", "e11b", "e15a", "e15b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 10,
    ram: 1024,
    cpus: 128
  },
  "FAS8080": {
    maxOntap: "9.8",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: {
      "ds2246": "Legacy 6G SAS shelf DS2246 is supported on historical FAS8080 controllers."
    },
    shelfErrors: {
      "ns224": "FAS8080 does not support high-speed NVMe storage shelves."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v9.6",
    description: "Legacy high-end FAS controller platform.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 8,
    ram: 128,
    cpus: 16
  },
  "FAS8060": {
    maxOntap: "9.8",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: {
      "ds2246": "DS2246 is supported."
    },
    shelfErrors: {
      "ns224": "FAS8060 does not support NVMe shelves."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v9.6",
    description: "Legacy mid-to-high FAS controller platform.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 4,
    ram: 64,
    cpus: 12
  },
  "FAS8040": {
    maxOntap: "9.8",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: { "ds2246": "DS2246 is supported." },
    shelfErrors: { "ns224": "FAS8040 does not support NVMe shelves." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v9.6",
    description: "Legacy mid-range FAS controller platform.",
    // storage ports corrected from e0a/e0b to the real 4-port onboard SAS Host
    // Adapter set — confirmed directly against a real customer ASUP's
    // SYSCONFIG-A.txt ("slot 0: SAS Host Adapter 0a/0b/0c/0d") and the
    // authoritative storage-port.xml export (<port>0a</port>...<port>0d</port>),
    // 2026-08-13. The 2-port version undercounted this platform's real SAS
    // capacity by half, causing false "port exhausted" warnings on the shelf
    // cabling diagram for real systems with more than ~2 shelf stacks.
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b", "0c", "0d"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 4,
    ram: 64,
    cpus: 12
  },
  "FAS8020": {
    maxOntap: "9.8",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: { "ds2246": "DS2246 is supported." },
    shelfErrors: { "ns224": "FAS8020 does not support NVMe shelves." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v9.6",
    description: "Legacy entry-mid FAS controller platform.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2,
    ram: 48,
    cpus: 8
  },
  "FAS2554": {
    maxOntap: "9.8",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: { "ds2246": "DS2246 is supported." },
    shelfErrors: { "ns224": "NVMe shelves are unsupported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v9.5",
    description: "Legacy entry hybrid LFF storage array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 1,
    ram: 36,
    cpus: 8
  },
  "FAS2552": {
    maxOntap: "9.8",
    supportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    unsupportedShelves: ["ns224"],
    shelfWarnings: { "ds2246": "DS2246 is supported." },
    shelfErrors: { "ns224": "NVMe shelves are unsupported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v9.5",
    description: "Legacy entry hybrid SFF storage array.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 1,
    ram: 36,
    cpus: 8
  },
  "ONTAP Select": {
    maxOntap: "9.12.1",
    supportedShelves: ["ns224", "ds224c"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: { "*": "Virtual disk storage cabled under hypervisor host limits." },
    shelfErrors: {},
    supportedLicenses: ["Cluster", "NFS", "CIFS", "iSCSI", "SnapMirror", "FlexClone"],
    maxFirmware: "v1.0",
    description: "Software-defined virtual storage appliance.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d", "e0e", "e0f"],
      san: [],
      storage: []
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port"],
    maxPcieSlots: 0,
    ram: 128,
    cpus: 16
  },
  "Cloud Volumes ONTAP": {
    maxOntap: "9.19.1",
    supportedShelves: [],
    unsupportedShelves: ["ns224", "ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: {},
    shelfErrors: { "*": "Physical hardware shelves are not cabled in cloud infrastructure." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v1.0",
    description: "ONTAP storage software running inside AWS, Azure, or GCP cloud VM.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: [],
      storage: []
    },
    supportedCards: [],
    maxPcieSlots: 0,
    ram: 128,
    cpus: 16
  },
  "Default": {
    maxOntap: "9.19.1",
    supportedShelves: ["ds224c", "ns224"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: {},
    shelfErrors: {
      "ds2246": "Legacy SAS-2 is unsupported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "SnapMirror", "FlexClone"],
    maxFirmware: "v12.0",
    description: "Standard NetApp Controller config baseline.",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
// === Additional platforms not in the detailed section above ===
// AFF A200 (legacy, EOL ONTAP 9.11.1)
"AFF A200": {
  tier: "entry", minOntap: "9.4", maxOntap: "9.11.1", maxRamGB: 192,
  supportedShelves: ["ds2246", "ds460c", "ds224c"], unsupportedShelves: ["ns224"],
  shelfWarnings: { "ds2246": "Legacy 6G SAS shelf supported on AFF A200." },
  shelfErrors: { "ns224": "AFF A200 does not support NVMe shelves." },
  supportedLicenses: ["Cluster", "NFS", "CIFS", "iSCSI", "FCP", "SnapMirror", "FlexClone"],
  maxFirmware: "v10.5", description: "Legacy entry AFF array (EOL ONTAP 9.11.1).",
  ports: { cluster: ["e0a","e0b"], data: ["e0c","e0d"], san: ["0e","0f"], storage: ["0a","0b"] },
  supportedCards: ["nic_10g_2port","fc_hba_16g_2port","sas_hba_12g_4port"], maxPcieSlots: 2
},
// AFF A700 (enterprise, uses onboard SAS+NVMe via RoCE)
"AFF A700": {
  tier: "enterprise", minOntap: "9.5", maxOntap: "9.19.1", maxRamGB: 1536,
  supportedShelves: ["ns224", "ds224c"], unsupportedShelves: ["ds212c","ds460c","ds2246"],
  shelfWarnings: { "ns224": "NS224 NVMe shelf supported via RoCE adapter.", "ds224c": "DS224C SAS SSD shelf supported." },
  shelfErrors: { "ds212c": "LFF HDD shelves not supported.", "ds460c": "HDD shelves not supported.", "ds2246": "Legacy 6G SAS not supported." },
  supportedLicenses: ["Cluster","NFS","CIFS","FCP","iSCSI","SnapMirror","FlexClone","FabricPool","MetroCluster"],
  maxFirmware: "v14.6", description: "High-end AFF all-flash system.",
  ports: { cluster: ["e0a","e0b"], data: ["e0c","e0d"], san: ["0e","0f"], storage: ["e0g","e0h"] },
  supportedCards: ["nic_25g_4port","nic_100g_2port","fc_hba_32g_2port","sas_hba_12g_4port","roce_hba_100g_2port"], maxPcieSlots: 8
},
// AFF A700s (enterprise, legacy)
"AFF A700s": {
  tier: "enterprise", minOntap: "9.5", maxOntap: "9.14.1", maxRamGB: 1024,
  supportedShelves: ["ns224"], unsupportedShelves: ["ds224c","ds212c","ds460c","ds2246"],
  shelfWarnings: {}, shelfErrors: { "ds224c": "SAS shelves not supported.", "ds212c": "HDD shelves not supported.", "ds460c": "HDD shelves not supported.", "ds2246": "Legacy SAS not supported." },
  supportedLicenses: ["Cluster","NFS","CIFS","FCP","iSCSI","SnapMirror","FlexClone","FabricPool","MetroCluster"],
  maxFirmware: "v14.6", description: "Legacy enterprise AFF system (EOL 9.14.1).",
  ports: { cluster: ["e0a","e0b"], data: ["e0c","e0d"], san: ["0e","0f"], storage: ["e0g","e0h"] },
  supportedCards: ["nic_25g_4port","nic_100g_2port","fc_hba_32g_2port","roce_hba_100g_2port"], maxPcieSlots: 6
},
// ASA A150 (entry SAN-only, SAS-based)
"ASA A150": {
  tier: "entry", sanOnly: true, minOntap: "9.13.1", maxOntap: "9.19.1", maxRamGB: 128,
  supportedShelves: ["ds224c"], unsupportedShelves: ["ns224","ds212c","ds460c","ds2246"],
  shelfWarnings: { "ds224c": "DS224C SAS SSD shelf supported." },
  shelfErrors: { "ns224": "ASA A150 does not support NVMe shelves.", "ds212c": "HDD shelves not supported.", "ds460c": "HDD shelves not supported.", "ds2246": "Legacy SAS not supported." },
  supportedLicenses: ["Cluster","FCP","iSCSI","SnapMirror","FlexClone","FabricPool"],
  maxFirmware: "v15.5", description: "Entry SAN-only All-Flash Array.",
  ports: { cluster: ["e0a","e0b"], data: ["e0c","e0d"], san: ["0e","0f"], storage: ["0a", "0b"] },
  supportedCards: ["nic_10g_2port","fc_hba_16g_2port","sas_hba_12g_4port"], maxPcieSlots: 2
},
// ASA A250 (entry SAN-only, NVMe)
"ASA A250": {
  tier: "entry", sanOnly: true, minOntap: "9.13.1", maxOntap: "9.19.1", maxRamGB: 256,
  supportedShelves: ["ns224"], unsupportedShelves: ["ds224c","ds212c","ds460c","ds2246"],
  shelfWarnings: { "ns224": "NS224 NVMe shelf natively supported." },
  shelfErrors: { "ds224c": "ASA A250 is NVMe-only.", "ds212c": "HDD shelves not supported.", "ds460c": "HDD shelves not supported.", "ds2246": "Legacy SAS not supported." },
  supportedLicenses: ["Cluster","FCP","iSCSI","SnapMirror","FlexClone","FabricPool","MetroCluster"],
  maxFirmware: "v16.1", description: "Entry SAN-only NVMe All-Flash Array.",
  ports: { cluster: ["e0a","e0b"], data: ["e0c","e0d"], san: ["0e","0f"], storage: ["e2a", "e2b", "e3a", "e3b"] },
  supportedCards: ["nic_25g_4port","fc_hba_32g_2port","roce_hba_100g_2port"], maxPcieSlots: 2
},
// FAS8020 / FAS8040 — full definitions are already in the detailed section above (lines ~1283, 1263).
// DO NOT redefine them here; duplicate keys in JS silently overwrite the detailed entry.
// AFX 2K (all-flash extreme — new July 2026)
"AFX 2K": {
  tier: "enterprise", minOntap: "9.19.1", maxOntap: "9.19.1", maxRamGB: 4096,
  supportedShelves: ["ns224"], unsupportedShelves: ["ds224c","ds212c","ds460c","ds2246"],
  shelfWarnings: { "ns224": "NS224 NVMe shelf natively supported at 400GbE." },
  shelfErrors: { "ds224c": "SAS shelves not supported.", "ds212c": "HDD shelves not supported.", "ds460c": "HDD shelves not supported.", "ds2246": "Legacy SAS not supported." },
  supportedLicenses: ["Cluster","NFS","CIFS","S3","FCP","iSCSI","NVMe/FC","NVMe/TCP","SnapMirror","FlexClone","FabricPool","MetroCluster"],
  maxFirmware: "v20.1", description: "Ultra high-performance All-Flash Extreme storage controller (July 2026).",
  ports: { cluster: ["e0a","e0b"], data: ["e1a","e1b","e1c","e1d"], san: ["0i","0j"], storage: ["e8a","e8b","e8c","e8d"] },
  supportedCards: ["nic_100g_4port","nic_200g_2port","fc_hba_64g_2port","roce_hba_100g_2port_v2"], maxPcieSlots: 12
}
};

// Platforms whose PCIe-slot RoCE HBAs support daisy-chaining 2 NS224 shelves per loop
// (all other platforms require one dedicated direct-connect port pair per shelf).
// Previously copy-pasted independently at 4 call sites (ui.js x3, bestPractices.js x1) —
// consolidated here so a future platform addition only needs to change one place.
export const HIGH_END_PLATFORM_MODELS = ['AFF A1K', 'AFF A90', 'AFF A70', 'AFF A900', 'FAS9500'];

export function isHighEndPlatform(model) {
  const upper = (model || "").toUpperCase();
  return HIGH_END_PLATFORM_MODELS.some(m => upper.includes(m));
}

// Returns compatibility profile for a parsed model string.
// Normalizes hyphens, extra spaces, and case before matching.
export function getPlatformProfile(modelStr) {
  if (!modelStr) return NETAPP_PLATFORMS["Default"];

  // Normalize: uppercase, replace hyphens/underscores with spaces, collapse whitespace
  const upper = modelStr.toUpperCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

  // Direct lookup first — exact match wins (fastest, no ambiguity)
  // Try both normalized and original-cased key
  const directKey = Object.keys(NETAPP_PLATFORMS).find(k => k.toUpperCase() === upper);
  if (directKey) return NETAPP_PLATFORMS[directKey];

  // === ASA models — must be matched BEFORE AFF/FAS patterns to avoid fallthrough ===
  // Longer/more-specific strings first to prevent partial matches
  if (upper.includes("ASA A1K"))  return NETAPP_PLATFORMS["ASA A1K"];
  if (upper.includes("ASA A900")) return NETAPP_PLATFORMS["ASA A900"];
  if (upper.includes("ASA A800")) return NETAPP_PLATFORMS["ASA A800"];
  if (upper.includes("ASA A400")) return NETAPP_PLATFORMS["ASA A400"];
  if (upper.includes("ASA A250")) return NETAPP_PLATFORMS["ASA A250"];
  if (upper.includes("ASA A150")) return NETAPP_PLATFORMS["ASA A150"];
  if (upper.includes("ASA A90"))  return NETAPP_PLATFORMS["ASA A90"];
  if (upper.includes("ASA A70"))  return NETAPP_PLATFORMS["ASA A70"];
  if (upper.includes("ASA A50"))  return NETAPP_PLATFORMS["ASA A50"];
  if (upper.includes("ASA A30"))  return NETAPP_PLATFORMS["ASA A30"];
  if (upper.includes("ASA A20"))  return NETAPP_PLATFORMS["ASA A20"];
  if (upper.includes("ASA C800")) return NETAPP_PLATFORMS["ASA C800"];
  if (upper.includes("ASA C400")) return NETAPP_PLATFORMS["ASA C400"];
  if (upper.includes("ASA C250")) return NETAPP_PLATFORMS["ASA C250"];
  if (upper.includes("ASA C30"))  return NETAPP_PLATFORMS["ASA C30"];
  if (upper.includes("ASA R2") || upper.includes("ASA R2")) return NETAPP_PLATFORMS["ASA r2"] || NETAPP_PLATFORMS["Default"];

  // === AFF A-Series — longest/most-specific strings first ===
  if (upper.includes("AFF A1K") || upper.includes("AFFA1K"))    return NETAPP_PLATFORMS["AFF A1K"];
  if (upper.includes("AFF A900") || upper.includes("AFFA900"))  return NETAPP_PLATFORMS["AFF A900"];
  if (upper.includes("AFF A800") || upper.includes("AFFA800"))  return NETAPP_PLATFORMS["AFF A800"];
  if (upper.includes("AFF A700S") || upper.includes("AFFA700S")) return NETAPP_PLATFORMS["AFF A700s"];
  if (upper.includes("AFF A700") || upper.includes("AFFA700"))  return NETAPP_PLATFORMS["AFF A700"];
  if (upper.includes("AFF A400") || upper.includes("AFFA400"))  return NETAPP_PLATFORMS["AFF A400"];
  if (upper.includes("AFF A300") || upper.includes("AFFA300"))  return NETAPP_PLATFORMS["AFF A300"];
  if (upper.includes("AFF A250") || upper.includes("AFFA250"))  return NETAPP_PLATFORMS["AFF A250"];
  if (upper.includes("AFF A220") || upper.includes("AFFA220"))  return NETAPP_PLATFORMS["AFF A220"];
  if (upper.includes("AFF A200") || upper.includes("AFFA200"))  return NETAPP_PLATFORMS["AFF A200"];
  if (upper.includes("AFF A150") || upper.includes("AFFA150"))  return NETAPP_PLATFORMS["AFF A150"];
  if (upper.includes("AFF A90")  || upper.includes("AFFA90"))   return NETAPP_PLATFORMS["AFF A90"];
  if (upper.includes("AFF A70")  || upper.includes("AFFA70"))   return NETAPP_PLATFORMS["AFF A70"];
  if (upper.includes("AFF A50")  || upper.includes("AFFA50"))   return NETAPP_PLATFORMS["AFF A50"];
  if (upper.includes("AFF A30")  || upper.includes("AFFA30"))   return NETAPP_PLATFORMS["AFF A30"];
  if (upper.includes("AFF A20")  || upper.includes("AFFA20"))   return NETAPP_PLATFORMS["AFF A20"];

  // === AFF C-Series ===
  if (upper.includes("AFF C800") || upper.includes("AFFC800"))  return NETAPP_PLATFORMS["AFF C800"];
  if (upper.includes("AFF C400") || upper.includes("AFFC400"))  return NETAPP_PLATFORMS["AFF C400"];
  if (upper.includes("AFF C250") || upper.includes("AFFC250"))  return NETAPP_PLATFORMS["AFF C250"];
  if (upper.includes("AFF C190") || upper.includes("AFFC190"))  return NETAPP_PLATFORMS["AFF C190"];
  if (upper.includes("AFF C80")  || upper.includes("AFFC80"))   return NETAPP_PLATFORMS["AFF C80"];
  if (upper.includes("AFF C60")  || upper.includes("AFFC60"))   return NETAPP_PLATFORMS["AFF C60"];
  if (upper.includes("AFF C30")  || upper.includes("AFFC30"))   return NETAPP_PLATFORMS["AFF C30"];

  // === AFX (ultra-high-performance, new 2026) ===
  if (upper.includes("AFX")) return NETAPP_PLATFORMS["AFX 2K"];

  // === FAS — longer/newer strings first to avoid partial matches ===
  if (upper.includes("FAS9500"))  return NETAPP_PLATFORMS["FAS9500"];
  if (upper.includes("FAS9000"))  return NETAPP_PLATFORMS["FAS9000"];
  if (upper.includes("FAS8700"))  return NETAPP_PLATFORMS["FAS8700"];
  if (upper.includes("FAS8300"))  return NETAPP_PLATFORMS["FAS8300"];
  if (upper.includes("FAS8200"))  return NETAPP_PLATFORMS["FAS8200"];
  if (upper.includes("FAS8080"))  return NETAPP_PLATFORMS["FAS8080"];
  if (upper.includes("FAS8060"))  return NETAPP_PLATFORMS["FAS8060"];
  if (upper.includes("FAS8040"))  return NETAPP_PLATFORMS["FAS8040"];
  if (upper.includes("FAS8020"))  return NETAPP_PLATFORMS["FAS8020"];
  if (upper.includes("FAS2820"))  return NETAPP_PLATFORMS["FAS2820"];
  if (upper.includes("FAS2750"))  return NETAPP_PLATFORMS["FAS2750"];
  if (upper.includes("FAS2720"))  return NETAPP_PLATFORMS["FAS2720"];
  if (upper.includes("FAS2650"))  return NETAPP_PLATFORMS["FAS2650"];
  if (upper.includes("FAS2620"))  return NETAPP_PLATFORMS["FAS2620"];
  if (upper.includes("FAS2554"))  return NETAPP_PLATFORMS["FAS2554"];
  if (upper.includes("FAS2552"))  return NETAPP_PLATFORMS["FAS2552"];
  if (upper.includes("FAS2520"))  return NETAPP_PLATFORMS["FAS2520"];
  // FAS next-gen (FAS90/70/50) — must come AFTER 4-digit FAS patterns
  if (upper.includes("FAS90"))    return NETAPP_PLATFORMS["FAS90"];
  if (upper.includes("FAS70"))    return NETAPP_PLATFORMS["FAS70"];
  if (upper.includes("FAS50"))    return NETAPP_PLATFORMS["FAS50"];

  // === Virtual / Cloud ===
  if (upper.includes("SELECT") || upper.includes("ONTAP SELECT"))         return NETAPP_PLATFORMS["ONTAP Select"]  || NETAPP_PLATFORMS["Default"];
  if (upper.includes("CLOUD VOLUMES ONTAP") || upper.includes("CVO"))     return NETAPP_PLATFORMS["Cloud Volumes ONTAP"] || NETAPP_PLATFORMS["Default"];

  return NETAPP_PLATFORMS["Default"];
}

// Detailed multi-hop upgrade considerations and risks
export function getUpgradeHopsConsiderations(currentVersion, targetVersion, controllerModel) {
  const considerations = [];
  
  if (compareVersions(currentVersion, targetVersion) >= 0) return []; // no upgrade

  // Sequence of hops to evaluate
  const hopSequence = [
    { from: "9.7", to: "9.8", title: "Hop 9.7 ➔ 9.8 Considerations", directUpgrade: true, risks: [
      "Root Volume Capacity Limit: ONTAP 9.8 expands controller diagnostic logging, requiring at least 32GB root volume size on both controllers. System will abort upgrade pre-checks if root size is insufficient.",
      "SAS Shelf Firmware Check: Older disk shelf bios versions (below v0210) are incompatible with the SCSI driver in 9.8 and will drop SAS cables offline. Shelves must be upgraded prior to ONTAP installer boot."
    ], preReqs: [
      "Verify root aggregate volume size using 'df -h' in system shell.",
      "Update SAS shelf firmware to latest stable version before starting node upgrade."
    ], commands: [
      "system node run -node * -command df -h /vol/vol0",
      "storage shelf firmware update"
    ]},
    { from: "9.8", to: "9.9.1", title: "Hop 9.8 ➔ 9.9.1 Considerations", directUpgrade: true, risks: [
      "Cluster Switch Health Check: Mandatory switch health check configuration is enforced. Upgrading requires verifying cluster interconnect switches are running NetApp qualified reference configuration files (RCF).",
      "Cipher Enforcements: Older SSH configurations and insecure TLS algorithms (like TLS 1.0) are blocked. Ensure administrative client scripts support TLS 1.2+."
    ], preReqs: [
      "Load NetApp-approved Reference Configuration Files (RCF) on switches.",
      "Verify TLS settings on admin interfaces."
    ], commands: [
      "system switch ethernet show",
      "security config modify -supported-protocols TLSv1.2,TLSv1.3"
    ]},
    { from: "9.9.1", to: "9.10.1", title: "Hop 9.9.1 ➤ 9.10.1 Considerations", directUpgrade: true, risks: [
      "S3 Object Storage: ONTAP 9.10.1 introduces native S3 object store. Review if any existing volume names conflict with S3 bucket namespace requirements.",
      "AutoSupport HTTPS Enforcement: Transport defaults change to HTTPS. Proxy configs using HTTP-only paths will stop delivering ASUPs."
    ], preReqs: [
      "Review existing volume and LUN naming for S3 namespace conflicts.",
      "Validate AutoSupport proxy configuration supports HTTPS."
    ], commands: [
      "system node autosupport show -fields transport",
      "volume show -fields name"
    ]},
    { from: "9.10.1", to: "9.11.1", title: "Hop 9.10.1 ➤ 9.11.1 Considerations", directUpgrade: true, risks: [
      "SnapLock Compliance Enhancements: ONTAP 9.11.1 enforces stricter SnapLock audit log retention. Existing audit logs must be migrated.",
      "Multi-Admin Verification Preview: MAV is introduced as an optional feature. Enabling it locks high-risk CLI commands behind quorum approval."
    ], preReqs: [
      "Review SnapLock audit log configuration before upgrade.",
      "Plan for MAV enablement if required by compliance policies."
    ], commands: [
      "snaplock log show",
      "security multi-admin-verification show"
    ]},
    { from: "9.11.1", to: "9.12.1", title: "Hop 9.11.1 ➤ 9.12.1 Considerations", directUpgrade: true, risks: [
      "AFF A300 / FAS8200 Warning: ONTAP 9.12.1 is the last supported release for AFF A300 and FAS8200 platforms. Plan hardware refresh if these models are present.",
      "Consistency Group GA: Consistency Groups become GA in 9.12.1 and can affect volume move behavior. Review CG policies before upgrading."
    ], preReqs: [
      "Confirm platform model support; AFF A300/FAS8200 cannot go beyond 9.12.1.",
      "Review any consistency group or application set configurations."
    ], commands: [
      "system node show -fields model",
      "consistency-group show"
    ]},
    { from: "9.12.1", to: "9.13.1", title: "Hop 9.12.1 ➔ 9.13.1 Considerations", directUpgrade: true, risks: [
      "ASA Platform Introduction: ONTAP 9.13.1 adds the ASA (All-SAN Array) platform family. If migrating from AFF to ASA personality, the cluster must be re-initialized — it cannot be done in-place.",
      "NVMe-oF Namespace Limit: ONTAP 9.13.1 changes how NVMe namespace group limits are enforced. Review NVMe subsystem configurations before upgrade."
    ], preReqs: [
      "Verify NVMe subsystem namespace group membership is within 9.13.1 limits.",
      "Confirm cluster health with 'cluster show' before starting ANDU."
    ], commands: [
      "vserver nvme subsystem show",
      "cluster image validate -version 9.13.1"
    ]},
    { from: "9.13.1", to: "9.14.1", title: "Hop 9.13.1 ➔ 9.14.1 Considerations", directUpgrade: true, risks: [
      "64Gb FC GA: ONTAP 9.14.1 adds native support for 64Gb Fibre Channel HBAs. Ensure SAN zone configuration is ready for high-speed FC adapters if these will be installed post-upgrade.",
      "SnapMirror Async Throttle Change: Default throttle for SnapMirror async transfers changes. Review SnapMirror policy throttle settings to avoid unexpected bandwidth usage."
    ], preReqs: [
      "Review all SnapMirror policy max-transfer-rate settings.",
      "Verify current disk firmware is at recommended levels before upgrade."
    ], commands: [
      "snapmirror policy show -fields type,max-transfer-rate",
      "storage disk show -fields disk,firmware-revision"
    ]},
    { from: "9.14.1", to: "9.15.1", title: "Hop 9.14.1 ➔ 9.15.1 Considerations", directUpgrade: true, risks: [
      "ONTAP One License Enforcement: 9.15.1 activates ONTAP One unified license enforcement. Legacy per-feature license keys (NFS, CIFS, FCP, iSCSI, SnapMirror individually) will begin reporting as non-compliant. Plan migration to ONTAP One or NLF bundles.",
      "Platform EOS: ONTAP 9.15.1 is the last supported release for AFF A220, AFF A300, FAS8200, FAS2750, and FAS2720. These controllers will not boot ONTAP 9.16.1+."
    ], preReqs: [
      "Verify all license keys and convert legacy 24-character keys to ONTAP One or NLF format via NetApp Support Site.",
      "Confirm all controllers in cluster are on the 9.15.1 support list."
    ], commands: [
      "system license show",
      "system node show -fields model"
    ]},
    { from: "9.9.1", to: "9.12.1", title: "Hop 9.9.1 ➔ 9.12.1 Considerations", directUpgrade: false, risks: [
      "Direct Upgrade Limit: Direct upgrade from 9.9.1 is supported ONLY if the cluster is currently running 9.9.1P13 or higher patch release; otherwise, an intermediate hop to ONTAP 9.10.1 is required.",
      "FAS2500 Hardware EOS: ONTAP 9.10.1+ completely removes kernel drivers for FAS2520, FAS2552, and FAS2554. DO NOT proceed if cluster contains these controller models.",
      "Licensing Model Transition: License validation mechanisms migrate to API checks. Expired feature keys will actively disable SnapMirror and FCP protocol endpoints."
    ], preReqs: [
      "Ensure current version is 9.9.1P13 or higher before proceeding directly to 9.12.1.",
      "Verify that no legacy FAS2500 models are present in the cluster nodes.",
      "Update license keys to 28-character API-valid formats."
    ], commands: [
      "cluster image validate -version 9.12.1",
      "system license show"
    ]},
    { from: "9.12.1", to: "9.15.1", title: "Hop 9.12.1 ➔ 9.15.1 Considerations", directUpgrade: false, risks: [
      "Multi-Hop Rule: Upgrades from 9.12.1 to 9.15.1 require an intermediate hop through ONTAP 9.13.1 first. Direct upgrades from 9.12.1 to 9.15.1 are blocked.",
      "FAS8200 / FAS2700 / A220 EOS: ONTAP 9.15.1 removes support for FAS8200, FAS2750, FAS2720, AFF A220, and AFF A300. Upgrading these models beyond 9.13.1 will cause system boot failure.",
      "ONTAP One Unified License: ONTAP 9.15.1 introduces ONTAP One, consolidating individual licenses into a unified entitlement package. Existing legacy keys should be migrated to the new format."
    ], preReqs: [
      "Upgrade first to ONTAP 9.13.1, reboot and stabilize cluster, and then execute upgrade to 9.15.1.",
      "Verify system model compatibility; do not attempt to upgrade legacy controllers past 9.13.1.",
      "Convert legacy protocol keys to ONTAP One format."
    ], commands: [
      "system node show -fields model,version",
      "system license clean-up -unused"
    ]},
    { from: "9.15.1", to: "9.16.1", title: "Hop 9.15.1 ➔ 9.16.1 Considerations", directUpgrade: true, risks: [
      "TLS 1.3 Enforcement: ONTAP 9.16.1 enforces TLS 1.3 for cluster communications. Web management tools must support TLS 1.3.",
      "32-Bit Compatibility Elimination: All legacy 32-bit volume structures and compatibility libraries are removed. Ensure older aggregates have been converted to 64-bit."
    ], preReqs: [
      "Verify that all volumes are 64-bit format using 'volume show'.",
      "Verify administration web client support for TLS 1.3."
    ], commands: [
      "volume show -fields block-type",
      "security ssl show"
    ]},
    { from: "9.16.1", to: "9.17.1", title: "Hop 9.16.1 ➔ 9.17.1 Considerations", directUpgrade: true, risks: [
      "AFF A900 / FAS9000 Firmware Dependency: ONTAP 9.17.1 requires minimum controller firmware v18.5 on AFF A900 and FAS9000 platforms. Verify and update controller firmware before ANDU.",
      "SnapMirror Cloud Sync Protocol Enforcement: ONTAP 9.17.1 enforces secure-channel-only for SnapMirror Cloud sync jobs. Any existing HTTP-based cloud mirror relationships will fail post-upgrade."
    ], preReqs: [
      "Verify controller firmware version using 'system node image show'.",
      "Review and update any SnapMirror Cloud sync policies to use HTTPS endpoints."
    ], commands: [
      "system node image show",
      "snapmirror show -type XDP -fields healthy,status"
    ]},
    { from: "9.17.1", to: "9.18.1", title: "Hop 9.17.1 ➔ 9.18.1 Considerations", directUpgrade: true, risks: [
      "Autonomous Ransomware Protection v3: ONTAP 9.18.1 updates ARP detection algorithms. Existing ARP-enabled volumes may trigger initial learning-mode re-entry post-upgrade.",
      "BlueXP Integration: ONTAP 9.18.1 deepens BlueXP integration for cloud tiering and backup. Ensure connector version is 3.9.30+ if BlueXP is in use."
    ], preReqs: [
      "Review ARP volume configurations and document current threat-detection thresholds.",
      "Update BlueXP connector to minimum required version if applicable."
    ], commands: [
      "security anti-ransomware volume show -fields state",
      "system node show"
    ]},
    { from: "9.18.1", to: "9.19.1", title: "Hop 9.18.1 ➔ 9.19.1 Considerations", directUpgrade: true, risks: [
      "AI/ML Workload Optimizations: ONTAP 9.19.1 introduces native GPU-direct storage path optimizations. Jumbo frames (MTU 9000) are mandatory on RoCE data paths for NVMe-oF workloads.",
      "Switch RCF v2.1+ Requirement: Cluster and storage switch Reference Configuration Files must be at v2.1 minimum. Upgrading with older RCFs may cause packet retransmission warnings under high load."
    ], preReqs: [
      "Set MTU 9000 on all NVMe-oF RoCE storage data ports.",
      "Update cluster switch RCF files to v2.1+ before initiating ANDU."
    ], commands: [
      "network port modify -node * -port e3a,e3b -mtu 9000",
      "system switch ethernet show -fields model,version"
    ]},
    { from: "9.16.1", to: "9.18.1", title: "Hop 9.16.1 ➔ 9.18.1 Considerations", directUpgrade: true, risks: [
      "Hardware Lifecycles: ONTAP 9.18.1 does not support AFF A300, AFF A220, FAS8200, or FAS2700. Verify the system model is FAS8300, FAS8700, AFF A400, or newer before proceeding.",
      "NVMe-oF Port Speed Enforcement: Port link speeds for NVMe targets must be 25GbE/100GbE minimum. Legacy 10GbE targets are deprecated and will not function."
    ], preReqs: [
      "Confirm cluster hardware models are in active support list.",
      "Check NVMe ports and ensure link speed settings are at least 25Gb."
    ], commands: [
      "network port show -field speed",
      "storage transition validation show"
    ]},
    { from: "9.17.1", to: "9.19.1", title: "Hop 9.17.1 ➔ 9.19.1 Considerations", directUpgrade: true, risks: [
      "AI Workload Enhancements: ONTAP 9.19.1 adds native Nvidia GPUDirect Storage (GDS) integrations. Ensure MTU is set to 9000 (Jumbo Frames) on data paths for optimal RoCE performance.",
      "Cluster Switch Transition: Switch profiles require RCF v2.0+ or Cisco NX-OS 10.x. Verify cluster interconnect switch levels prior to running the ONTAP upgrade command."
    ], preReqs: [
      "Configure network ports for Jumbo Frames (MTU 9000) on storage backend data networks.",
      "Upgrade Cisco/Broadcom switch configurations to support NX-OS 10.x RCF baselines."
    ], commands: [
      "network port modify -node * -port * -mtu 9000",
      "system switch ethernet show -fields model,version"
    ]},
    { from: "9.18.1", to: "9.20.1", title: "Hop 9.18.1 ➔ 9.20.1 Considerations", directUpgrade: true, risks: [
      "Cyber Vault Control: ONTAP 9.20.1 introduces native Cyber Vault isolation controls. Ensure admin interfaces are configured to use Multi-Admin Verification (MAV) on high-value commands.",
      "Switch RCF v2.2+ Requirements: Cluster switches must be updated to RCF v2.2+ before upgrading to 9.20.1 to avoid packet drop warnings."
    ], preReqs: [
      "Enable Multi-Admin Verification (MAV) for security settings.",
      "Validate switch RCF version is at least v2.2."
    ], commands: [
      "security multi-admin-verification show",
      "system switch ethernet show"
    ]},
    { from: "9.19.1", to: "9.20.1", title: "Hop 9.19.1 ➔ 9.20.1 Considerations", directUpgrade: true, risks: [
      "End of Support for Legacy Protocols: ONTAP 9.20.1 deprecates insecure legacy protocols. Ensure all external services use TLS 1.3.",
      "Root Aggregate Sizing Check: Root aggregates require at least 50GB free space for system core files."
    ], preReqs: [
      "Verify TLS 1.3 is configured for all management connections.",
      "Verify root aggregate has at least 50GB usable space."
    ], commands: [
      "security ssl show",
      "storage aggregate show -aggregate aggr0* -fields size,usable,used,avail"
    ]}
  ];

  // Filter hops that apply to the current upgrade span
  hopSequence.forEach(hop => {
    if (compareVersions(currentVersion, hop.to) < 0 && compareVersions(targetVersion, hop.to) >= 0) {
      // Only push hops that have full content (skip stub-only entries with no title)
      if (hop.title) {
        considerations.push({
          title: hop.title || `Hop → ${hop.to}`,
          directUpgrade: hop.directUpgrade !== false,
          risks:   Array.isArray(hop.risks)   ? hop.risks   : [],
          preReqs: Array.isArray(hop.preReqs) ? hop.preReqs : [],
          commands: Array.isArray(hop.commands) ? hop.commands : []
        });
      }
    }
  });

  return considerations;
}

// Version comparison helper: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
export function compareVersions(v1, v2) {
  if (!v1 || !v2) return 0;
  
  const parse = (v) => {
    const clean = v.split(' ')[0].split('P')[0];
    const parts = clean.split('.').map(x => parseInt(x) || 0);
    while (parts.length < 3) parts.push(0);
    
    let pLevel = 0;
    const pMatch = v.match(/P(\d+)/i);
    if (pMatch) pLevel = parseInt(pMatch[1]);
    
    return [...parts, pLevel];
  };

  const a = parse(v1);
  const b = parse(v2);

  for (let i = 0; i < 4; i++) {
    if (a[i] > b[i]) return 1;
    if (a[i] < b[i]) return -1;
  }
  return 0;
}


export const ONTAP_LIFECYCLE = {
  "9.7":    { status: "end_of_support",  releaseDate: "2019-09", endDate: "2023-07", latestPatch: "9.7P22",  notes: "End of Support July 2023. No patches or security fixes available." },
  "9.8":    { status: "end_of_support",  releaseDate: "2020-10", endDate: "2024-01", latestPatch: "9.8P20",  notes: "End of Support January 2024." },
  "9.9.1":  { status: "end_of_support",  releaseDate: "2021-04", endDate: "2024-07", latestPatch: "9.9.1P15", notes: "End of Support July 2024." },
  "9.10.1": { status: "end_of_support",  releaseDate: "2021-10", endDate: "2025-01", latestPatch: "9.10.1P15", notes: "End of Support January 2025. No patches or security fixes." },
  "9.11.1": { status: "end_of_support",  releaseDate: "2022-04", endDate: "2025-07", latestPatch: "9.11.1P18", notes: "End of Support July 2025. Upgrade urgently to 9.14.1+." },
  "9.12.1": { status: "limited_support", releaseDate: "2022-10", endDate: "2026-01", latestPatch: "9.12.1P12", notes: "Limited Support since Jan 2026. Critical fixes only. Upgrade to 9.14.1+ recommended." },
  "9.13.1": { status: "limited_support", releaseDate: "2023-06", endDate: "2026-07", latestPatch: "9.13.1P10", notes: "Limited Support expires July 2026. Upgrade to 9.15.1+ strongly recommended." },
  "9.14.1": { status: "active",          releaseDate: "2024-01", endDate: "2027-01", latestPatch: "9.14.1P16", notes: "Full Support through Jan 2027. Latest patch: P16. Widely deployed LTS release." },
  "9.15.1": { status: "active",          releaseDate: "2024-05", endDate: "2027-07", latestPatch: "9.15.1P19", notes: "Full Support through July 2027. Latest patch: P19. Recommended for AFF A1K/A90/A70 and FAS70/90." },
  "9.16.1": { status: "recommended",     releaseDate: "2025-01", endDate: "2028-01", latestPatch: "9.16.1P11", notes: "Full Support through Jan 2028. Latest patch: P11. Current recommended release for new deployments. Required for AFF A20/A30/A50, AFF C30/C60/C80, ASA R2, FAS50." },
  "9.17.1": { status: "recommended",     releaseDate: "2025-06", endDate: "2028-07", latestPatch: "9.17.1P1",  notes: "Full Support through July 2028. Latest patch: P1." },
  "9.18.1": { status: "recommended",     releaseDate: "2026-01", endDate: "2029-01", latestPatch: "9.18.1P1",  notes: "Full Support through Jan 2029. Latest patch: P1." },
  "9.19.1": { status: "recommended",     releaseDate: "2026-06", endDate: "2029-07", latestPatch: "9.19.1",    notes: "Full Support through July 2029." }
};

export const ONTAP_HOPS = {
  "9.7":    { "9.8": [], "9.9.1": ["9.8"], "9.12.1": ["9.8","9.9.1"], "9.14.1": ["9.8","9.9.1","9.12.1"], "9.16.1": ["9.8","9.9.1","9.12.1","9.15.1"] },
  "9.8":    { "9.9.1": [], "9.12.1": ["9.9.1"], "9.13.1": ["9.9.1","9.12.1"], "9.14.1": ["9.9.1","9.12.1","9.13.1"], "9.15.1": ["9.9.1","9.12.1","9.13.1"], "9.16.1": ["9.9.1","9.12.1","9.15.1"] },
  "9.9.1":  { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1","9.13.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"] },
  "9.10.1": { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"] },
  "9.11.1": { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"] },
  "9.12.1": { "9.13.1": [], "9.14.1": ["9.13.1"], "9.15.1": ["9.13.1"], "9.16.1": ["9.14.1"] },
  "9.13.1": { "9.14.1": [], "9.15.1": [], "9.16.1": ["9.15.1"] },
  "9.14.1": { "9.15.1": [], "9.16.1": [], "9.17.1": [], "9.18.1": ["9.16.1"], "9.19.1": ["9.17.1"] },
  "9.15.1": { "9.16.1": [], "9.17.1": [], "9.18.1": [], "9.19.1": ["9.17.1"] },
  "9.16.1": { "9.17.1": [], "9.18.1": [], "9.19.1": [] },
  "9.17.1": { "9.18.1": [], "9.19.1": [] },
  "9.18.1": { "9.19.1": [] },
  "9.19.1": { }
};

// =============================================================================
// FIRMWARE VERSION DATABASE
// Source: NetApp Support Site - Disk Drive & Firmware Matrix, SP/BMC Release Notes
// Last verified: 2026-Q3 — update these values when new firmware is released
// =============================================================================
export const FIRMWARE_VERSIONS = {
  shelves: {
    "ns224":  { latest: "1.1.3X0",  iomType: "NSM100",  minOntap: "9.8",  updateCmd: "storage shelf firmware update -shelf {id}",  checkCmd: "storage shelf show -fields firmware-version" },
    "ds224c": { latest: "IOM12.0220", iomType: "IOM12G", minOntap: "9.1",  updateCmd: "storage shelf firmware update -shelf {id}",  checkCmd: "storage shelf show -fields firmware-version" },
    "ds460c": { latest: "IOM12.0101", iomType: "IOM12B", minOntap: "8.3",  updateCmd: "storage shelf firmware update -shelf {id}",  checkCmd: "storage shelf show -fields firmware-version" },
    "ds2246": { latest: "IOM6.0101",  iomType: "IOM6",   minOntap: "8.1",  updateCmd: "storage shelf firmware update -shelf {id}",  checkCmd: "storage shelf show -fields firmware-version" },
    "ds4246": { latest: "IOM6.0101",  iomType: "IOM6",   minOntap: "8.2",  updateCmd: "storage shelf firmware update -shelf {id}",  checkCmd: "storage shelf show -fields firmware-version" },
    "ds4486": { latest: "IOM6.0101",  iomType: "IOM6",   minOntap: "8.2",  updateCmd: "storage shelf firmware update -shelf {id}",  checkCmd: "storage shelf show -fields firmware-version" },
  },
  sp: {
    // BMC/SP firmware version by controller platform model string (prefix match)
    "AFF A1K":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A90":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A70":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A50":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A30":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A900": { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A800": { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A700": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A400": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A300": { latest: "11.7",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A250": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF A220": { latest: "11.7",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF C800": { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF C400": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "AFF C250": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A1K":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A90":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A70":  { latest: "24.05",  family: "BMC18", updateCmd: "system service-processor image update -node {node} -package sp_fw.zip", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A900": { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A800": { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A400": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA A250": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA C800": { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "ASA C400": { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "FAS9500":  { latest: "11.12", family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "FAS8700":  { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "FAS8300":  { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "FAS8200":  { latest: "11.7",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "FAS2750":  { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "FAS2720":  { latest: "11.7",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
    "default":  { latest: "11.9",  family: "SP11",  updateCmd: "system service-processor image update -node {node}", checkCmd: "system service-processor show -node {node} -fields firmware-version" },
  },
  switches: {
    "BES-53248":       { latest: "3.10.0.3", rcf: "v1.9", type: "EFOS",  checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/switch-bes-53248/" },
    "Nexus 9336C-FX2": { latest: "10.4(2)F", rcf: "v1.9", type: "NX-OS", checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/switch-cisco-9336c-fx2/" },
    "Nexus 92300YC":   { latest: "9.3(13)",   rcf: "v1.7", type: "NX-OS", checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/" },
    "Nexus 3132Q-V":   { latest: "9.3(13)",   rcf: "v1.7", type: "NX-OS", checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/" },
  },
  disks: {
    // Disk firmware by NetApp part-number model prefix ΓÇö check storage disk show -fields model,firmware-revision
    // Source: NetApp Disk Drive Firmware Matrix (support.netapp.com > Downloads > Disk Drive Firmware)
    "X800": { latest: "NA04", type: "NVMe SSD", updateCmd: "storage disk firmware update -disk {disk}" },
    "X801": { latest: "NA05", type: "NVMe SSD", updateCmd: "storage disk firmware update -disk {disk}" },
    "X802": { latest: "NA04", type: "NVMe SSD", updateCmd: "storage disk firmware update -disk {disk}" },
    "X803": { latest: "NA02", type: "NVMe SSD", updateCmd: "storage disk firmware update -disk {disk}" },
    "X806": { latest: "NA03", type: "NVMe SSD", updateCmd: "storage disk firmware update -disk {disk}" },
    "X357": { latest: "NA04", type: "SAS SSD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X371": { latest: "NA05", type: "SAS SSD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X440": { latest: "NA03", type: "SAS SSD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X448": { latest: "NA03", type: "SAS SSD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X477": { latest: "0B26", type: "SAS HDD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X491": { latest: "A004", type: "SAS HDD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X527": { latest: "NA01", type: "SAS HDD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X575": { latest: "NA02", type: "SAS HDD",  updateCmd: "storage disk firmware update -disk {disk}" },
    "X316": { latest: "0B26", type: "SAS HDD",  updateCmd: "storage disk firmware update -disk {disk}" },
  }
};

// =============================================================================
// REMEDIATION REFERENCE DATABASE
// NetApp Knowledge Base articles and Technical Reports by remediation category
// =============================================================================
export const REMEDIATION_REFS = {
  cabling:      { kb: "000093050", tr: "TR-4182", title: "Ethernet Storage Cabling Guide",                  url: "https://www.netapp.com/media/10680-tr4182.pdf" },
  ontapUpg:     { kb: "000020671", tr: "TR-4622", title: "ONTAP 9 Upgrade Guide",                          url: "https://docs.netapp.com/us-en/ontap/upgrade/" },
  firmware:     { kb: "000020272", tr: "TR-4569", title: "NetApp Firmware and Disk Qualification Package", url: "https://mysupport.netapp.com/site/downloads/firmware" },
  sp:           { kb: "000094804", tr: "",         title: "Service Processor/BMC Administration Guide",   url: "https://docs.netapp.com/us-en/ontap/system-admin/manage-sp-concept.html" },
  acp:          { kb: "000016498", tr: "",         title: "Alternate Control Path (ACP) Configuration",   url: "https://docs.netapp.com/us-en/ontap/disks-aggregates/acp-concept.html" },
  metrocluster: { kb: "000030556", tr: "TR-4375", title: "MetroCluster Installation and Configuration",    url: "https://docs.netapp.com/us-en/ontap-metrocluster/" },
  licenses:     { kb: "000098779", tr: "",         title: "ONTAP Licensing Overview",                     url: "https://docs.netapp.com/us-en/ontap/system-admin/manage-licenses-concept.html" },
  spares:       { kb: "000010004", tr: "",         title: "Spare Disk Best Practices",                    url: "https://docs.netapp.com/us-en/ontap/disks-aggregates/" },
  switches:     { kb: "000054008", tr: "TR-4673", title: "Cluster Switch Health Monitor Configuration",    url: "https://docs.netapp.com/us-en/ontap-systems-switches/" },
  san:          { kb: "000097610", tr: "TR-4684", title: "NVMe-oF Host Configuration Guide",               url: "https://docs.netapp.com/us-en/ontap-sanhost/" },
  snapmirror:   { kb: "000093579", tr: "TR-4015", title: "SnapMirror Async Replication Guide",             url: "https://docs.netapp.com/us-en/ontap/data-protection/" },
  capacity:     { kb: "000091344", tr: "TR-3965", title: "Aggregate and Volume Best Practices",            url: "https://docs.netapp.com/us-en/ontap/" },
  ha:           { kb: "000098456", tr: "",         title: "Storage Failover Configuration",               url: "https://docs.netapp.com/us-en/ontap/high-availability/" },
  disks:        { kb: "000020272", tr: "",         title: "Disk Management and Replacement",              url: "https://docs.netapp.com/us-en/ontap/disks-aggregates/" },
  lifs:         { kb: "000051421", tr: "",         title: "LIF Management and Failover",                  url: "https://docs.netapp.com/us-en/ontap/networking/" },
  mtu:          { kb: "000032059", tr: "",         title: "Jumbo Frames / MTU Configuration",             url: "https://docs.netapp.com/us-en/ontap/networking/" },
  precheck:     { kb: "000020671", tr: "TR-4622", title: "ONTAP Pre-Upgrade Checklist",                   url: "https://docs.netapp.com/us-en/ontap/upgrade/task_verifying_the_lif_failover_configuration.html" },
};
