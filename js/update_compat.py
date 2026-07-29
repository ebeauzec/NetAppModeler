import re
import sys

file_path = "g:\\My Drive\\AntiGravity\\NetAppModeler\\js\\compatibility.js"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. maxOntap to 9.16.1
content = re.sub(r'maxOntap:\s*"(9\.17\.1|9\.18\.1|9\.19\.1|9\.20\.1|9\.16\.2)"', 'maxOntap: "9.16.1"', content)

# 2. minOntap for new platforms
models_min_ontap = {
    "AFF A1K": "9.15.1", "AFF A90": "9.15.1", "AFF A70": "9.15.1",
    "AFF A50": "9.16.1", "AFF A30": "9.16.1", "AFF A20": "9.16.1",
    "AFF C30": "9.16.1", "AFF C60": "9.16.1", "AFF C80": "9.16.1",
    "ASA A1K": "9.16.1", "ASA A90": "9.16.1", "ASA A70": "9.16.1",
    "ASA A50": "9.16.1", "ASA A30": "9.16.1", "ASA A20": "9.16.1",
    "FAS70": "9.15.1", "FAS90": "9.15.1", "FAS50": "9.16.1"
}
for model, version in models_min_ontap.items():
    content = re.sub(r'("' + model + r'"\s*:\s*\{[^}]*?minOntap:\s*")([^"]*)(")', r'\g<1>' + version + r'\g<3>', content)
    content = re.sub(r'("' + model + r'"\s*:\s*\{[\s\S]*?minOntap:\s*")([^"]*)(")', r'\g<1>' + version + r'\g<3>', content)

# 3. ONTAP_LIFECYCLE
lifecycle_replacement = """export const ONTAP_LIFECYCLE = {
  "9.7":    { status: "end_of_support",  releaseDate: "2019-09", endDate: "2023-07", latestPatch: "9.7P22",  notes: "End of Support July 2023. No patches or security fixes available." },
  "9.8":    { status: "end_of_support",  releaseDate: "2020-10", endDate: "2024-01", latestPatch: "9.8P20",  notes: "End of Support January 2024." },
  "9.9.1":  { status: "end_of_support",  releaseDate: "2021-04", endDate: "2024-07", latestPatch: "9.9.1P15", notes: "End of Support July 2024." },
  "9.10.1": { status: "end_of_support",  releaseDate: "2021-10", endDate: "2025-01", latestPatch: "9.10.1P15", notes: "End of Support January 2025. No patches or security fixes." },
  "9.11.1": { status: "end_of_support",  releaseDate: "2022-04", endDate: "2025-07", latestPatch: "9.11.1P18", notes: "End of Support July 2025. Upgrade urgently to 9.14.1+." },
  "9.12.1": { status: "limited_support", releaseDate: "2022-10", endDate: "2026-01", latestPatch: "9.12.1P12", notes: "Limited Support since Jan 2026. Critical fixes only. Upgrade to 9.14.1+ recommended." },
  "9.13.1": { status: "limited_support", releaseDate: "2023-06", endDate: "2026-07", latestPatch: "9.13.1P10", notes: "Limited Support expires July 2026. Upgrade to 9.15.1+ strongly recommended." },
  "9.14.1": { status: "active",          releaseDate: "2024-01", endDate: "2027-01", latestPatch: "9.14.1P16", notes: "Full Support through Jan 2027. Latest patch: P16. Widely deployed LTS release." },
  "9.15.1": { status: "active",          releaseDate: "2024-05", endDate: "2027-07", latestPatch: "9.15.1P19", notes: "Full Support through July 2027. Latest patch: P19. Recommended for AFF A1K/A90/A70 and FAS70/90." },
  "9.16.1": { status: "recommended",     releaseDate: "2025-01", endDate: "2028-01", latestPatch: "9.16.1P11", notes: "Full Support through Jan 2028. Latest patch: P11. Current recommended release for new deployments. Required for AFF A20/A30/A50, AFF C30/C60/C80, ASA R2, FAS50." }
};"""
content = re.sub(r'export const ONTAP_LIFECYCLE = \{[\s\S]*?\n\};\n', lifecycle_replacement + '\n', content)

# 4. ONTAP_HOPS
hops_replacement = """export const ONTAP_HOPS = {
  "9.7":    { "9.8": [], "9.9.1": ["9.8"], "9.12.1": ["9.8","9.9.1"], "9.14.1": ["9.8","9.9.1","9.12.1"], "9.16.1": ["9.8","9.9.1","9.12.1","9.15.1"] },
  "9.8":    { "9.9.1": [], "9.12.1": ["9.9.1"], "9.13.1": ["9.9.1","9.12.1"], "9.14.1": ["9.9.1","9.12.1","9.13.1"], "9.15.1": ["9.9.1","9.12.1","9.13.1"], "9.16.1": ["9.9.1","9.12.1","9.15.1"] },
  "9.9.1":  { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1","9.13.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"] },
  "9.10.1": { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"] },
  "9.11.1": { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"] },
  "9.12.1": { "9.13.1": [], "9.14.1": ["9.13.1"], "9.15.1": ["9.13.1"], "9.16.1": ["9.14.1"] },
  "9.13.1": { "9.14.1": [], "9.15.1": [], "9.16.1": ["9.15.1"] },
  "9.14.1": { "9.15.1": [], "9.16.1": [] },
  "9.15.1": { "9.16.1": [] },
  "9.16.1": { }
};"""
content = re.sub(r'export const ONTAP_HOPS = \{[\s\S]*?\n\};\n', hops_replacement + '\n', content)

# 5. FIRMWARE_VERSIONS
content = re.sub(r'("ns224"\s*:\s*\{\s*latest:\s*")[^"]*(")', r'\g<1>' + '1.1.3X0' + r'\g<2>', content)
content = re.sub(r'("ds224c"\s*:\s*\{\s*latest:\s*")[^"]*(")', r'\g<1>' + 'IOM12.0220' + r'\g<2>', content)
content = re.sub(r'("ds460c"\s*:\s*\{\s*latest:\s*")[^"]*(")', r'\g<1>' + 'IOM12.0101' + r'\g<2>', content)

sp_latest = {
    "AFF A1K": "24.05", "AFF A90": "24.05", "AFF A70": "24.05", "AFF A50": "24.05", "AFF A30": "24.05", "AFF A20": "24.05",
    "AFF A900": "11.12", "AFF A800": "11.12",
    "ASA A1K": "24.05", "ASA A90": "24.05", "ASA A70": "24.05",
    "FAS90": "24.05", "FAS70": "24.05", "FAS50": "24.05"
}

for k, v in sp_latest.items():
    if k in content:
        content = re.sub(r'("' + k + r'"\s*:\s*\{\s*latest:\s*")[^"]*(")', r'\g<1>' + v + r'\g<2>', content)

switches_replacement = """  switches: {
    "BES-53248":       { latest: "3.10.0.3", rcf: "v1.9", type: "EFOS",  checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/switch-bes-53248/" },
    "Nexus 9336C-FX2": { latest: "10.4(2)F", rcf: "v1.9", type: "NX-OS", checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/switch-cisco-9336c-fx2/" },
    "Nexus 92300YC":   { latest: "9.3(13)",   rcf: "v1.7", type: "NX-OS", checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/" },
    "Nexus 3132Q-V":   { latest: "9.3(13)",   rcf: "v1.7", type: "NX-OS", checkCmd: "show version", updateGuide: "https://docs.netapp.com/us-en/ontap-systems-switches/" },
  },"""
content = re.sub(r'  switches: \{[\s\S]*?\n  \},', switches_replacement, content)


# 6. PLATFORM PROFILES MISSING
missing_platforms = """
  "FAS50": {
    minOntap: "9.16.1", maxOntap: "9.16.1",
    supportedShelves: ["ns224", "ds224c", "ds460c"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: { "ns224": "NS224 supported on FAS50 from 9.16.1.", "ds460c": "DS460C high-density HDD supported." },
    shelfErrors: { "ds2246": "Legacy 6G SAS not supported on FAS50." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v24.05",
    description: "Entry-level hybrid Flash FAS controller (2026). Supports NVMe and SAS shelves.",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port"],
    maxPcieSlots: 2, tier: "entry"
  },
  "FAS70": {
    minOntap: "9.15.1", maxOntap: "9.16.1",
    supportedShelves: ["ns224", "ds224c", "ds460c", "ds212c"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe supported.", "ds460c": "DS460C high-density HDD supported." },
    shelfErrors: { "ds2246": "Legacy 6G SAS not supported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v24.05",
    description: "Midrange hybrid FAS controller (2025). Replaces FAS8300.",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 6, tier: "midrange"
  },
  "FAS90": {
    minOntap: "9.15.1", maxOntap: "9.16.1",
    supportedShelves: ["ns224", "ds224c", "ds460c", "ds212c"],
    unsupportedShelves: ["ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe supported.", "ds460c": "DS460C high-density HDD supported (max 700+ drives)." },
    shelfErrors: { "ds2246": "Legacy 6G SAS not supported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v24.05",
    description: "Enterprise hybrid FAS controller (2025). Replaces FAS8700/9000.",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "nic_100g_4port", "fc_hba_32g_2port", "fc_hba_64g_2port", "sas_hba_12g_4port", "roce_hba_100g_2port"],
    maxPcieSlots: 10, tier: "enterprise"
  },
  "ASA A20": {
    minOntap: "9.16.1", maxOntap: "9.16.1", sanOnly: true, isASAR2: true,
    supportedShelves: ["ns224"], unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfErrors: { "ds224c": "ASA R2 is NVMe-only.", "ds212c": "HDD shelves unsupported.", "ds460c": "HDD shelves unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "NVMe/FC", "NVMe/TCP", "SnapMirror"],
    maxFirmware: "v24.05",
    description: "ASA R2 entry-level SAN-optimized array (2026). Active-active symmetric HA.",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port"],
    maxPcieSlots: 2, tier: "entry", defaultProtocols: ["NVMe/FC", "NVMe/TCP", "iSCSI", "FC"]
  },
  "ASA A30": {
    minOntap: "9.16.1", maxOntap: "9.16.1", sanOnly: true, isASAR2: true,
    supportedShelves: ["ns224"], unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfErrors: { "ds224c": "ASA R2 NVMe-only.", "ds212c": "HDD unsupported.", "ds460c": "HDD unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "NVMe/FC", "NVMe/TCP", "SnapMirror"],
    maxFirmware: "v24.05",
    description: "ASA R2 entry-level SAN-optimized (2026).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port"],
    maxPcieSlots: 2, tier: "entry", defaultProtocols: ["NVMe/FC", "NVMe/TCP", "iSCSI", "FC"]
  },
  "ASA A50": {
    minOntap: "9.16.1", maxOntap: "9.16.1", sanOnly: true, isASAR2: true,
    supportedShelves: ["ns224"], unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfErrors: { "ds224c": "ASA R2 NVMe-only.", "ds212c": "HDD unsupported.", "ds460c": "HDD unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "NVMe/FC", "NVMe/TCP", "SnapMirror"],
    maxFirmware: "v24.05",
    description: "ASA R2 midrange SAN-optimized (2026).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port"],
    maxPcieSlots: 4, tier: "midrange", defaultProtocols: ["NVMe/FC", "NVMe/TCP", "iSCSI", "FC"]
  },
  "ASA A70": {
    minOntap: "9.16.1", maxOntap: "9.16.1", sanOnly: true, isASAR2: true,
    supportedShelves: ["ns224"], unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfErrors: { "ds224c": "ASA R2 NVMe-only.", "ds212c": "HDD unsupported.", "ds460c": "HDD unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "NVMe/FC", "NVMe/TCP", "SnapMirror"],
    maxFirmware: "v24.05",
    description: "ASA R2 midrange high-performance SAN array (2026).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "fc_hba_64g_2port"],
    maxPcieSlots: 6, tier: "midrange", defaultProtocols: ["NVMe/FC", "NVMe/TCP", "iSCSI", "FC"]
  },
  "ASA A90": {
    minOntap: "9.16.1", maxOntap: "9.16.1", sanOnly: true, isASAR2: true,
    supportedShelves: ["ns224"], unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfErrors: { "ds224c": "ASA R2 NVMe-only.", "ds212c": "HDD unsupported.", "ds460c": "HDD unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "NVMe/FC", "NVMe/TCP", "SnapMirror"],
    maxFirmware: "v24.05",
    description: "ASA R2 enterprise SAN array (2026).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "nic_100g_4port", "fc_hba_32g_2port", "fc_hba_64g_2port"],
    maxPcieSlots: 8, tier: "enterprise", defaultProtocols: ["NVMe/FC", "NVMe/TCP", "iSCSI", "FC"]
  },
  "ASA A1K": {
    minOntap: "9.16.1", maxOntap: "9.16.1", sanOnly: true, isASAR2: true,
    supportedShelves: ["ns224"], unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfErrors: { "ds224c": "ASA R2 NVMe-only.", "ds212c": "HDD unsupported.", "ds460c": "HDD unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "FCP", "iSCSI", "NVMe/FC", "NVMe/TCP", "SnapMirror"],
    maxFirmware: "v24.05",
    description: "ASA R2 flagship enterprise SAN array (2026). Highest performance SAN workloads.",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_100g_2port", "nic_100g_4port", "nic_200g_2port", "fc_hba_64g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 11, tier: "enterprise", defaultProtocols: ["NVMe/FC", "NVMe/TCP", "FC", "iSCSI"]
  },"""

# Insert missing platforms into NETAPP_PLATFORMS
# I will just remove the existing instances of these blocks and append them
to_remove = ["FAS50", "FAS70", "FAS90", "ASA A20", "ASA A30", "ASA A50", "ASA A70", "ASA A90", "ASA A1K"]
for plat in to_remove:
    # Match the entire object definition
    content = re.sub(r'\s*"' + plat + r'"\s*:\s*\{[^}]*?\},?', '', content, count=1)
    # Also remove from compact list if present
    content = re.sub(r'\s*"' + plat + r'"\s*:\s*\{[^}]*?tier[^}]*\},?', '', content)

content = re.sub(r'(export const NETAPP_PLATFORMS = \{)', r'\1' + missing_platforms, content)

# Check for C30, C60, C80 as well
missing_c_platforms = """
  "AFF C30": {
    minOntap: "9.16.1", maxOntap: "9.16.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf required." },
    shelfErrors: { "ds224c": "C30 is NVMe-only. SAS shelves unsupported.", "ds212c": "HDD shelves unsupported.", "ds460c": "HDD shelves unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v24.05",
    description: "Entry-level QLC capacity flash array (2026 Gen2).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 2, tier: "entry", isCapacityFlash: true
  },
  "AFF C60": {
    minOntap: "9.16.1", maxOntap: "9.16.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf required." },
    shelfErrors: { "ds224c": "SAS shelves unsupported.", "ds212c": "HDD shelves unsupported.", "ds460c": "HDD shelves unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool"],
    maxFirmware: "v24.05",
    description: "Midrange QLC capacity flash array (2026 Gen2).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "fc_hba_32g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 4, tier: "midrange", isCapacityFlash: true
  },
  "AFF C80": {
    minOntap: "9.16.1", maxOntap: "9.16.1",
    supportedShelves: ["ns224"],
    unsupportedShelves: ["ds224c", "ds212c", "ds460c", "ds2246"],
    shelfWarnings: { "ns224": "NS224 NVMe shelf required." },
    shelfErrors: { "ds224c": "SAS shelves unsupported.", "ds212c": "HDD shelves unsupported.", "ds460c": "HDD shelves unsupported.", "ds2246": "Legacy SAS unsupported." },
    supportedLicenses: ["Cluster", "NFS", "CIFS", "FCP", "iSCSI", "SnapMirror", "FlexClone", "FabricPool", "MetroCluster"],
    maxFirmware: "v24.05",
    description: "High-end QLC capacity flash array (2026 Gen2).",
    ports: { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], storage: ["e0g", "e0h"] },
    supportedCards: ["nic_25g_4port", "nic_100g_2port", "nic_100g_4port", "fc_hba_32g_2port", "fc_hba_64g_2port", "roce_hba_100g_2port"],
    maxPcieSlots: 8, tier: "enterprise", isCapacityFlash: true
  },"""

c_to_remove = ["AFF C30", "AFF C60", "AFF C80"]
for plat in c_to_remove:
    content = re.sub(r'\s*"' + plat + r'"\s*:\s*\{[^}]*?\},?', '', content, count=1)
    content = re.sub(r'\s*"' + plat + r'"\s*:\s*\{[^}]*?tier[^}]*\},?', '', content)

content = re.sub(r'(export const NETAPP_PLATFORMS = \{)', r'\1' + missing_c_platforms, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
