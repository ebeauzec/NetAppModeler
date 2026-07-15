/**
 * NetApp Hardware Platforms & ONTAP Software Compatibility Registry
 * Contains compatibility maps, lifecycle boundaries, physical port layouts, and detailed multi-hop upgrade considerations.
 */

export const EXP_CARDS_CATALOG = {
  nic_10g_2port: { name: "Dual-port 10GbE SFP+ NIC", type: "nic", ports: ["e0e", "e0f"], speed: "10GbE", minOntap: "9.1", power: 15 },
  nic_25g_4port: { name: "Quad-port 25GbE SFP28 NIC", type: "nic", ports: ["e0g", "e0h", "e0i", "e0j"], speed: "25GbE", minOntap: "9.3", power: 22 },
  nic_100g_2port: { name: "Dual-port 100GbE NIC", type: "nic", ports: ["e1a", "e1b"], speed: "100GbE", minOntap: "9.8", power: 35 },
  nic_200g_2port: { name: "Dual-port 200GbE NIC", type: "nic", ports: ["e1a", "e1b"], speed: "200GbE", minOntap: "9.16.1", power: 45 },
  fc_hba_16g_2port: { name: "Dual-port 16Gb Fibre Channel HBA", type: "san", ports: ["0g", "0h"], speed: "16Gb FC", minOntap: "9.1", power: 18 },
  fc_hba_32g_2port: { name: "Dual-port 32Gb Fibre Channel HBA", type: "san", ports: ["0i", "0j"], speed: "32Gb FC", minOntap: "9.5", power: 25 },
  fc_hba_64g_2port: { name: "Dual-port 64Gb Fibre Channel HBA", type: "san", ports: ["0i", "0j"], speed: "64Gb FC", minOntap: "9.16.1", power: 28 },
  sas_hba_12g_4port: { name: "Quad-port 12G SAS Adapter", type: "storage", ports: ["0c", "0d", "0e", "0f"], speed: "12Gb SAS", minOntap: "9.1", power: 20 },
  roce_hba_100g_2port: { name: "Dual-port 100GbE NVMe-oF RoCE Adapter", type: "storage", ports: ["e0g", "e0h"], speed: "100GbE RoCE", minOntap: "9.8", power: 38 }
};

export const PLATFORM_SLOT_DETAILS = {
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
  4: [
    { num: 1, type: "PCIe Gen3 x16", recType: "nic", rec: "Primary 100GbE high-bandwidth network adapter" },
    { num: 2, type: "PCIe Gen3 x16", recType: "storage", rec: "100GbE NVMe-oF RoCE sync / storage HBA" },
    { num: 3, type: "PCIe Gen3 x8",  recType: "san", rec: "SAN Target HBA (32Gb/16Gb Fibre Channel)" },
    { num: 4, type: "PCIe Gen3 x8",  recType: "storage", rec: "12Gb SAS storage shelf expansion adapter" }
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
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"] // NVMe (RoCE)
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 8
  },
  "AFF A90": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "AFF A70": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "AFF A900": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 8
  },
  "AFF A800": {
    maxOntap: "9.13.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF A50": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A400": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF A30": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A20": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A300": {
    maxOntap: "9.13.1",
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
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF A220": {
    maxOntap: "9.13.1",
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
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
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
    maxOntap: "9.20.1",
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
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port", "nic_200g_2port", "fc_hba_64g_2port"],
    maxPcieSlots: 6
  },
  "AFF C800": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF C400": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "nic_100g_2port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF C250": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF C30": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "AFF C60": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "AFF C190": {
    maxOntap: "9.13.1",
    supportedShelves: ["ds224c"],
    unsupportedShelves: ["ns224", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ds224c": "DS224C SAS SSD shelf fully supported." },
    shelfErrors: {
      "ns224": "AFF C190 does not support NVMe shelves.",
      "ds212c": "HDD shelves not supported.",
      "ds460c": "HDD shelves not supported.",
      "ds2246": "Legacy 6G SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
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
    maxOntap: "9.20.1",
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
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 8
  },
  "FAS9000": {
    maxOntap: "9.13.1",
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
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 4
  },
  "FAS8700": {
    maxOntap: "9.20.1",
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
    maxOntap: "9.20.1",
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
    maxOntap: "9.13.1",
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
    maxOntap: "9.20.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: { "ds224c": "DS224C SFF shelf fully supported." },
    shelfErrors: {
      "ns224": "FAS2820 does not support NVMe expansion shelves.",
      "ds2246": "Legacy 6G SAS is not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
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
    maxOntap: "9.13.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: { "ds212c": "LFF HDD expansion supported." },
    shelfErrors: {
      "ns224": "FAS2720 does not support NVMe shelves.",
      "ds2246": "DS2246 is a legacy SAS-2 shelf and is unsupported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
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
    maxOntap: "9.13.1",
    supportedShelves: ["ds224c", "ds212c", "ds460c"],
    unsupportedShelves: ["ns224", "ds2246"],
    shelfWarnings: { "ds224c": "DS224C SFF expansion supported." },
    shelfErrors: {
      "ns224": "FAS2750 does not support NVMe shelves.",
      "ds2246": "Legacy 6G SAS not supported."
    },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v11.7",
    description: "Legacy entry SFF hybrid array (End of Support on ONTAP 9.15.1+).",
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "fc_hba_16g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "FAS2650": {
    maxOntap: "9.9.1",
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
    maxOntap: "9.9.1",
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
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b", "e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 8
  },
  "FAS70": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b", "e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "FAS50": {
    maxOntap: "9.20.1",
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
    ports: {
      cluster: ["e0a", "e0b"],
      data: ["e0c", "e0d"],
      san: ["0e", "0f"],
      storage: ["0a", "0b"]
    },
    supportedCards: ["nic_10g_2port", "nic_25g_4port", "fc_hba_16g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2
  },
  "ASA A1K": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 8
  },
  "ASA A90": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "ASA A70": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "ASA A50": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 6
  },
  "ASA A30": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "ASA A20": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2
  },
  "ASA C30": {
    maxOntap: "9.20.1",
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
      storage: ["e0g", "e0h"]
    },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4
  },
  "Default": {
    maxOntap: "9.16.1",
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
  }
};

// Returns compatibility profile for a parsed model
export function getPlatformProfile(modelStr) {
  if (!modelStr) return NETAPP_PLATFORMS["Default"];
  
  const upper = modelStr.toUpperCase();
  
  // Match ASA models first to prevent incorrect AFF fallbacks
  if (upper.includes("ASA A1K")) return NETAPP_PLATFORMS["ASA A1K"];
  if (upper.includes("ASA A90")) return NETAPP_PLATFORMS["ASA A90"];
  if (upper.includes("ASA A70")) return NETAPP_PLATFORMS["ASA A70"];
  if (upper.includes("ASA A50")) return NETAPP_PLATFORMS["ASA A50"];
  if (upper.includes("ASA A30")) return NETAPP_PLATFORMS["ASA A30"];
  if (upper.includes("ASA A20")) return NETAPP_PLATFORMS["ASA A20"];
  if (upper.includes("ASA C30")) return NETAPP_PLATFORMS["ASA C30"];
  
  // Match new FAS models
  if (upper.includes("FAS90")) return NETAPP_PLATFORMS["FAS90"];
  if (upper.includes("FAS70")) return NETAPP_PLATFORMS["FAS70"];
  if (upper.includes("FAS50")) return NETAPP_PLATFORMS["FAS50"];
  
  // Match key patterns
  if (upper.includes("A1K")) return NETAPP_PLATFORMS["AFF A1K"];
  if (upper.includes("A900")) return NETAPP_PLATFORMS["AFF A900"];
  if (upper.includes("A800")) return NETAPP_PLATFORMS["AFF A800"];
  if (upper.includes("A400") || upper.includes("AFF400")) return NETAPP_PLATFORMS["AFF A400"];
  if (upper.includes("A300")) return NETAPP_PLATFORMS["AFF A300"];
  if (upper.includes("A250")) return NETAPP_PLATFORMS["AFF A250"];
  if (upper.includes("A220")) return NETAPP_PLATFORMS["AFF A220"];
  if (upper.includes("A150")) return NETAPP_PLATFORMS["AFF A150"];
  if (upper.includes("A90")) return NETAPP_PLATFORMS["AFF A90"];
  if (upper.includes("A700")) return NETAPP_PLATFORMS["Default"];
  if (upper.includes("A70")) return NETAPP_PLATFORMS["AFF A70"];
  if (upper.includes("A50")) return NETAPP_PLATFORMS["AFF A50"];
  if (upper.includes("A30")) return NETAPP_PLATFORMS["AFF A30"];
  if (upper.includes("A200")) return NETAPP_PLATFORMS["Default"];
  if (upper.includes("A20")) return NETAPP_PLATFORMS["AFF A20"];
  
  if (upper.includes("C800")) return NETAPP_PLATFORMS["AFF C800"];
  if (upper.includes("C80")) return NETAPP_PLATFORMS["AFF C80"];
  if (upper.includes("C400")) return NETAPP_PLATFORMS["AFF C400"];
  if (upper.includes("C250")) return NETAPP_PLATFORMS["AFF C250"];
  if (upper.includes("C190")) return NETAPP_PLATFORMS["AFF C190"];
  if (upper.includes("C30")) return NETAPP_PLATFORMS["AFF C30"];
  if (upper.includes("C60")) return NETAPP_PLATFORMS["AFF C60"];
  
  if (upper.includes("9500")) return NETAPP_PLATFORMS["FAS9500"];
  if (upper.includes("9000")) return NETAPP_PLATFORMS["FAS9000"];
  if (upper.includes("8700")) return NETAPP_PLATFORMS["FAS8700"];
  if (upper.includes("8300")) return NETAPP_PLATFORMS["FAS8300"];
  if (upper.includes("8200")) return NETAPP_PLATFORMS["FAS8200"];
  if (upper.includes("2820")) return NETAPP_PLATFORMS["FAS2820"];
  if (upper.includes("2750")) return NETAPP_PLATFORMS["FAS2750"];
  if (upper.includes("2720")) return NETAPP_PLATFORMS["FAS2720"];
  if (upper.includes("2650")) return NETAPP_PLATFORMS["FAS2650"];
  if (upper.includes("2620")) return NETAPP_PLATFORMS["FAS2620"];
  
  if (upper.includes("2520")) return NETAPP_PLATFORMS["FAS2520"];
  
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
      considerations.push({
        title: hop.title,
        directUpgrade: hop.directUpgrade,
        risks: hop.risks,
        preReqs: hop.preReqs,
        commands: hop.commands
      });
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
