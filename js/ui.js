import { DEMO_DATA } from './demoData.js';
import { parseASUP, formatGB, parseSizeToGB } from './parser.js';
import { runAudit, calculateComplianceScore, ONTAP_LIFECYCLE, getPlatformMaxDrives } from './bestPractices.js';
import { getPlatformProfile, getUpgradeHopsConsiderations, NETAPP_PLATFORMS, EXP_CARDS_CATALOG, compareVersions, getPlatformSlots } from './compatibility.js';

// --- Application State ---
let currentState = null;
let modeledState = null;
let activeStep = 1;
let uploadedFiles = {};
let isGreenfieldMode = false;

const ALL_SHELVES_CATALOG = {
  "ns224": "NS224 (2U, NVMe SSD Disk Shelf)",
  "ds224c": "DS224C (2U, 12G SAS SFF SSD/HDD Shelf)",
  "ds212c": "DS212C (2U, 12G SAS LFF HDD Shelf)",
  "ds460c": "DS460C (4U, 12G High-Density SAS HDD Shelf)",
  "ds2246": "DS2246 (Legacy 2U, 6G SAS HDD Shelf - EOL)"
};

function getCardPorts(cardKey, slot) {
  const cSpec = EXP_CARDS_CATALOG[cardKey];
  if (!cSpec) return [];
  const isEthernet = cSpec.type === "nic" || cardKey.toLowerCase().includes("roce");
  const prefix = isEthernet ? "e" : "";
  return cSpec.ports.map((_, idx) => {
    const portSuffix = String.fromCharCode(97 + idx); // 'a', 'b', 'c', 'd'
    return `${prefix}${slot}${portSuffix}`;
  });
}

// ONTAP Upgrade paths compatibility including 9.18.1 and 9.19.1
const ONTAP_HOPS = {
  "9.7": {
    "9.7": [],
    "9.8": ["9.8"],
    "9.9.1": ["9.8", "9.9.1"],
    "9.12.1": ["9.8", "9.9.1", "9.12.1"],
    "9.13.1": ["9.8", "9.9.1", "9.12.1", "9.13.1"],
    "9.14.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.14.1"],
    "9.15.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1"],
    "9.16.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.16.1"],
    "9.17.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.16.1", "9.17.1"],
    "9.18.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1", "9.20.1"],
  },
  "9.8": {
    "9.8": [],
    "9.9.1": ["9.9.1"],
    "9.12.1": ["9.9.1", "9.12.1"],
    "9.13.1": ["9.9.1", "9.12.1", "9.13.1"],
    "9.14.1": ["9.9.1", "9.12.1", "9.13.1", "9.14.1"],
    "9.15.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1"],
    "9.16.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.16.1"],
    "9.17.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.16.1", "9.17.1"],
    "9.18.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1", "9.20.1"],
  },
  "9.9.1": {
    "9.9.1": [],
    "9.12.1": ["9.12.1"],
    "9.13.1": ["9.12.1", "9.13.1"],
    "9.14.1": ["9.12.1", "9.13.1", "9.14.1"],
    "9.15.1": ["9.12.1", "9.13.1", "9.15.1"],
    "9.16.1": ["9.12.1", "9.13.1", "9.15.1", "9.16.1"],
    "9.17.1": ["9.12.1", "9.13.1", "9.15.1", "9.16.1", "9.17.1"],
    "9.18.1": ["9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1", "9.20.1"],
  },
  "9.12.1": {
    "9.12.1": [],
    "9.13.1": ["9.13.1"],
    "9.14.1": ["9.13.1", "9.14.1"],
    "9.15.1": ["9.13.1", "9.15.1"],
    "9.16.1": ["9.13.1", "9.15.1", "9.16.1"],
    "9.17.1": ["9.13.1", "9.15.1", "9.16.1", "9.17.1"],
    "9.18.1": ["9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.15.1", "9.17.1", "9.18.1", "9.20.1"],
  },
  "9.13.1": {
    "9.13.1": [],
    "9.14.1": ["9.14.1"],
    "9.15.1": ["9.15.1"],
    "9.16.1": ["9.15.1", "9.16.1"],
    "9.17.1": ["9.15.1", "9.16.1", "9.17.1"],
    "9.18.1": ["9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.15.1", "9.17.1", "9.18.1", "9.20.1"],
  },
  "9.15.1": {
    "9.15.1": [],
    "9.16.1": ["9.16.1"],
    "9.17.1": ["9.16.1", "9.17.1"],
    "9.18.1": ["9.17.1", "9.18.1"],
    "9.19.1": ["9.17.1", "9.19.1"],
    "9.20.1": ["9.17.1", "9.18.1", "9.20.1"],
  },
  "9.16.1": {
    "9.16.1": [],
    "9.17.1": ["9.17.1"],
    "9.18.1": ["9.18.1"],
    "9.19.1": ["9.18.1", "9.19.1"],
    "9.20.1": ["9.18.1", "9.20.1"],
  },
  "9.17.1": {
    "9.17.1": [],
    "9.18.1": ["9.18.1"],
    "9.19.1": ["9.19.1"],
    "9.20.1": ["9.19.1", "9.20.1"],
  },
  "9.18.1": {
    "9.18.1": [],
    "9.19.1": ["9.19.1"],
    "9.20.1": ["9.20.1"],
  },
  "9.19.1": {
    "9.19.1": [],
    "9.20.1": ["9.20.1"],
  },
  "9.20.1": {
    "9.20.1": [],
  },
};

function resolveMediaType(diskSizeStr) {
  if (!diskSizeStr) return "SSD";
  const lower = diskSizeStr.toLowerCase();
  if (lower.includes("nvme")) return "NVMe SSD";
  if (lower.includes("sas ssd")) return "SAS SSD";
  if (lower.includes("sas hdd")) return "SAS HDD";
  if (lower.includes("sata hdd") || lower.includes("sata")) return "SATA HDD";
  if (lower.includes("ssd")) return "SSD";
  if (lower.includes("hdd")) return "HDD";
  return "SSD"; // default
}

const SHELF_SPEC_MAP = {
  ns224: {
    name: "NS224 (2U NVMe SSD Shelf)",
    ru: 2,
    power: 400,
    sizes: ["1.9TB NVMe SSD", "3.8TB NVMe SSD", "7.6TB NVMe SSD", "15.3TB NVMe SSD", "30.6TB NVMe SSD", "61.2TB NVMe SSD"],
    defaultCount: 24,
    maxCount: 24,
    mediaType: "NVMe SSD"
  },
  ds224c: {
    name: "DS224C (2U 12G SAS Shelf)",
    ru: 2,
    power: 300,
    sizes: ["960GB SAS SSD", "3.8TB SAS SSD", "7.6TB SAS SSD", "15.3TB SAS SSD", "30.6TB SAS SSD", "61.2TB SAS SSD", "1.2TB SAS HDD", "1.8TB SAS HDD"],
    defaultCount: 24,
    maxCount: 24,
    mediaType: "SAS SSD"
  },
  ds212c: {
    name: "DS212C (2U 12G SAS Large Form Factor Shelf)",
    ru: 2,
    power: 260,
    sizes: ["4TB SATA HDD", "8TB SATA HDD", "12TB SATA HDD", "16TB SATA HDD"],
    defaultCount: 12,
    maxCount: 12,
    mediaType: "SATA HDD"
  },
  ds460c: {
    name: "DS460C (4U 12G High-Density SAS Shelf)",
    ru: 4,
    power: 800,
    sizes: ["4TB SATA HDD", "8TB SATA HDD", "12TB SATA HDD", "16TB SATA HDD"],
    defaultCount: 60,
    maxCount: 60,
    mediaType: "SATA HDD"
  },
  ds2246: {
    name: "DS2246 (Legacy 2U 6G SAS Shelf - EOL)",
    ru: 2,
    power: 350,
    sizes: ["600GB SAS HDD", "900GB SAS HDD"],
    defaultCount: 24,
    maxCount: 24,
    mediaType: "SAS HDD"
  }
};

// Robust version baseline key resolver
function resolveBaseVersionKey(versionStr) {
  if (!versionStr) return "9.7";
  const m = versionStr.match(/^(\d+\.\d+)/);
  if (!m) return "9.7";
  const base = m[1];
  if (base === "9.7") return "9.7";
  if (base === "9.8") return "9.8";
  if (base === "9.9") return "9.9.1";
  if (base === "9.10" || base === "9.11" || base === "9.12") return "9.12.1";
  if (base === "9.13") return "9.13.1";
  if (base === "9.14" || base === "9.15") return "9.15.1";
  if (base === "9.16") return "9.16.1";
  if (base === "9.17") return "9.17.1";
  if (base === "9.18") return "9.18.1";
  if (base === "9.19") return "9.19.1";
  if (base === "9.20") return "9.20.1";
  if (base === "9.20") return "9.20.1";
  return "9.20.1";
}

// --- DOM References ---
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");
const resetBtn = document.getElementById("reset-btn");
const saveConfigBtn = document.getElementById("save-config-btn");
const loadConfigBtn = document.getElementById("load-config-btn");
const loadConfigInput = document.getElementById("load-config-input");

// Steps UI nodes
const stepNodes = document.querySelectorAll(".step-node");

// --- Initialization ---
function initApp() {
  document.body.setAttribute("data-init", "true");
  setupUploadListeners();
  setupWizardListeners();
  setupModelerListeners();
  populateManualPlatformDropdown();
  setupMetroClusterCheckbox();
  resetState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

function setupMetroClusterCheckbox() {
  const checkbox = document.getElementById("deploy-metrocluster");
  const typeSelect = document.getElementById("metrocluster-type");
  if (!checkbox || !typeSelect) return;
  
  checkbox.addEventListener("change", (e) => {
    if (e.target.checked) {
      typeSelect.style.display = "inline-block";
    } else {
      typeSelect.style.display = "none";
    }
  });
}

function populateManualPlatformDropdown() {
  const select = document.getElementById("manual-platform-select");
  const ontapSelect = document.getElementById("manual-ontap-select");
  if (!select) return;
  select.innerHTML = "";
  
  Object.keys(NETAPP_PLATFORMS).forEach(model => {
    if (model === "Default") return;
    const opt = document.createElement("option");
    opt.value = model;
    opt.textContent = `${model} (${NETAPP_PLATFORMS[model].description})`;
    select.appendChild(opt);
  });

  function updateManualOntapOptions() {
    if (!ontapSelect) return;
    ontapSelect.innerHTML = "";
    const selectedModel = select.value;
    const profile = getPlatformProfile(selectedModel);
    
    const targetOptions = ["9.7", "9.8", "9.9.1", "9.12.1", "9.13.1", "9.14.1", "9.15.1", "9.16.1", "9.17.1", "9.18.1", "9.19.1", "9.20.1"];
    
    targetOptions.forEach(optVal => {
      if (compareVersions(optVal, profile.maxOntap) <= 0) {
        const opt = document.createElement("option");
        opt.value = optVal;
        opt.textContent = optVal;
        // Default to the max (most current) version
        if (optVal === profile.maxOntap) {
          opt.selected = true;
        }
        ontapSelect.appendChild(opt);
      }
    });
  }

  select.addEventListener("change", updateManualOntapOptions);
  updateManualOntapOptions();
}

function resetState() {
  currentState = null;
  modeledState = null;
  activeStep = 1;
  uploadedFiles = {};
  isGreenfieldMode = false;
  updateWizardProgress();
  showPanel(1);
  
  // Clear inputs
  document.getElementById("target-ontap").innerHTML = "";
  document.getElementById("shelf-type").value = "none";
  document.getElementById("shelf-expansion-details").classList.add("hidden");
  document.getElementById("model-upgrade-firmware").checked = true;
  document.getElementById("model-fix-cabling").checked = true;
  document.getElementById("prev-btn").classList.add("hidden");
  document.getElementById("next-btn").classList.add("hidden");

  // Reset Shelf Sizing details
  const shelfCountInput = document.getElementById("shelf-count-input");
  if (shelfCountInput) shelfCountInput.value = "1";
  const fullyPopulateCheckbox = document.getElementById("fully-populate-checkbox");
  if (fullyPopulateCheckbox) fullyPopulateCheckbox.checked = true;
  const diskCountInput = document.getElementById("disk-count");
  if (diskCountInput) diskCountInput.disabled = true;

  // Reset MetroCluster checkboxes
  const mcCheckbox = document.getElementById("deploy-metrocluster");
  if (mcCheckbox) {
    mcCheckbox.checked = false;
    document.getElementById("metrocluster-type").style.display = "none";
  }
}

function saveConfiguration() {
  if (!currentState) {
    alert("No active configuration to save. Please parse an ASUP file or configure a system first.");
    return;
  }

  const inputs = {
    targetOntap: document.getElementById("target-ontap")?.value || "",
    shelfType: document.getElementById("shelf-type")?.value || "",
    diskCount: document.getElementById("disk-count")?.value || "",
    diskSize: document.getElementById("disk-size")?.value || "",
    diskAllocation: document.getElementById("disk-allocation")?.value || "",
    newAggrName: document.getElementById("new-aggr-name")?.value || "",
    newAggrRaid: document.getElementById("new-aggr-raid")?.value || "",
    newAggrRgsize: document.getElementById("new-aggr-rgsize")?.value || ""
  };

  const configObj = {
    version: "v2.5",
    isGreenfieldMode: isGreenfieldMode,
    activeStep: activeStep,
    currentState: currentState,
    modeledState: modeledState,
    inputs: inputs
  };

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(configObj, null, 2));
  const downloadAnchor = document.createElement("a");
  const fileName = `netapp_modeler_config_${currentState.version.model.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.json`;
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function loadConfiguration(configObj) {
  try {
    if (!configObj || !configObj.currentState) {
      throw new Error("Invalid configuration file format.");
    }

    isGreenfieldMode = configObj.isGreenfieldMode;
    currentState = configObj.currentState;
    modeledState = configObj.modeledState || null;

    // Refresh display
    renderCurrentAuditDashboard();

    // Call init inputs to populate option list dropdowns
    if (!isGreenfieldMode) {
      initStep3Inputs();
    }
    initStep4Inputs();

    // Restore UI Inputs if they exist
    if (configObj.inputs) {
      const inputs = configObj.inputs;
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) {
          el.value = val;
          el.dispatchEvent(new Event("change"));
        }
      };
      
      setVal("target-ontap", inputs.targetOntap);
      setVal("shelf-type", inputs.shelfType);
      setVal("disk-count", inputs.diskCount);
      setVal("disk-size", inputs.diskSize);
      setVal("disk-allocation", inputs.diskAllocation);
      setVal("new-aggr-name", inputs.newAggrName);
      setVal("new-aggr-raid", inputs.newAggrRaid);
      setVal("new-aggr-rgsize", inputs.newAggrRgsize);
    }

    const targetStep = configObj.activeStep || (isGreenfieldMode ? 4 : 2);
    activeStep = targetStep;
    
    if (activeStep >= 5) {
      runModelingCalculations();
      renderCompareView();
    }
    if (activeStep >= 6) {
      generateReport();
    }

    showPanel(activeStep);
    updateWizardProgress();
    
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");

    alert("Configuration loaded successfully!");
  } catch (error) {
    console.error(error);
    alert(`Error loading configuration: ${error.message}`);
  }
}

function exportMarkdownPlan() {
  if (!currentState || !modeledState) {
    alert("No active model state. Please complete the sizing first.");
    return;
  }

  const isMetroCluster = currentState.metrocluster && currentState.metrocluster !== "none";
  const targetOntap = document.getElementById("target-ontap").value;
  const curVer = currentState.version.ontap;
  const baseCur = resolveBaseVersionKey(curVer);
  const hops = ONTAP_HOPS[baseCur] ? ONTAP_HOPS[baseCur][targetOntap] : [];
  const hopList = hops.length > 0 ? hops.join(" -> ") : "No upgrade required";

  let md = `# NetApp Storage Upgrade & Implementation Plan\n\n`;
  md += `**Date:** ${new Date().toLocaleDateString()}\n`;
  md += `**Platform Model:** ${currentState.version.model}\n`;
  md += `**Current ONTAP Release:** ${currentState.version.ontap}\n`;
  md += `**Target ONTAP Release:** ${targetOntap}\n`;
  md += `**Upgrade Path:** ${currentState.version.ontap} ➔ ${hopList}\n\n`;

  md += `## 1. Scope of Work\n`;
  md += `- Remediate SAS/NVMe loop cabling single-points-of-failure (SPOF) to achieve Multipath HA.\n`;
  md += `- Upgrade controller BIOS/system firmware and shelf/drive firmware.\n`;
  if (currentState.expansionCards && currentState.expansionCards.length > 0) {
    md += `- Install PCIe expansion HBA/NIC cards to support target ports requirements.\n`;
  }
  const shelfType = document.getElementById("shelf-type").value;
  if (shelfType !== "none") {
    md += `- Rack, cable, and provision additional storage shelf capacity (${shelfType.toUpperCase()}).\n`;
  }
  md += `- Perform non-disruptive ONTAP rolling operating system upgrades.\n\n`;

  md += `## 2. Technical Execution Steps & CLI Commands\n\n`;
  
  let step = 1;
  
  // Phase 1
  md += `### Step ${step++}: Pre-Upgrade Diagnostic Baseline\n`;
  md += `Execute cluster health validation commands and capture a configuration backup:\n`;
  md += `\`\`\`bash\n`;
  md += `cluster show\n`;
  md += `storage failover show\n`;
  if (isMetroCluster) {
    md += `metrocluster check run\n`;
    md += `metrocluster check show\n`;
  }
  md += `system configuration backup create -node * -backup-name pre_upgrade_baseline\n`;
  md += `\`\`\`\n\n`;

  // Phase 2: Cabling
  const originalHadSPOF = currentState.shelves.some(s => s.cabling && (s.cabling.toLowerCase().includes("single-path") || !s.cabling.toLowerCase().includes("multipath")));
  if (originalHadSPOF) {
    md += `### Step ${step++}: Cabling Loop Remediation (SPOF Removal)\n`;
    md += `Connect redundant path loop cables to transition the storage shelves to a Multipath HA cabling layout:\n`;
    md += `\`\`\`bash\n`;
    md += `storage cabling show\n`;
    md += `storage cabinet show\n`;
    md += `\`\`\`\n\n`;
  }

  // Phase 3: Firmware
  md += `### Step ${step++}: Controller BIOS & Device Firmware Upgrades\n`;
  md += `Apply system and shelf firmware packages to ensure hardware currency:\n`;
  md += `\`\`\`bash\n`;
  md += `system node firmware update -node * -package-url http://webserver/fw_package\n`;
  md += `storage shelf firmware update\n`;
  md += `storage disk firmware update\n`;
  md += `\`\`\`\n\n`;

  // Phase 4: Cards
  const cards = currentState.expansionCards || [];
  if (cards.length > 0) {
    md += `### Step ${step++}: PCIe Adapter Expansion Card Mounting\n`;
    md += `Sequentially failover each controller and physically insert PCIe cards:\n`;
    cards.forEach(c => {
      const cKey = typeof c === 'string' ? c : c.cardKey;
      const slotNum = typeof c === 'string' ? '?' : c.slot;
      md += `- Slot ${slotNum}: ${EXP_CARDS_CATALOG[cKey].name}\n`;
    });
    md += `\n\`\`\`bash\n`;
    md += `storage failover takeover -ofnode <node_name>\n`;
    md += `# Power down node, install PCIe card, boot node\n`;
    md += `sysconfig -card\n`;
    md += `storage failover giveback -ofnode <node_name>\n`;
    md += `\`\`\`\n\n`;
  }

  // Phase 5: Hops
  if (hops.length > 0) {
    md += `### Step ${step++}: Execute ONTAP Upgrade Hops\n`;
    md += `Upgrade the operating system using a rolling, non-disruptive sequence:\n`;
    md += `\`\`\`bash\n`;
    if (isMetroCluster) {
      md += `metrocluster switchover -controller-replacement true\n`;
    }
    md += `cluster image package get -url http://webserver/ontap_image.tgz\n`;
    md += `cluster image validate -version <target_version>\n`;
    md += `cluster image update\n`;
    if (isMetroCluster) {
      md += `metrocluster switchback\n`;
    }
    md += `\`\`\`\n\n`;
  }

  // Phase 6: Shelf Additions
  if (shelfType !== "none") {
    md += `### Step ${step++}: Mount & Cable Storage Shelf Expansion\n`;
    md += `Mount the new shelves in the rack. Cable loop paths symmetrically to Node A and Node B storage ports:\n`;
    md += `\`\`\`bash\n`;
    md += `storage shelf show\n`;
    md += `storage cabling show\n`;
    md += `\`\`\`\n\n`;
  }

  // Phase 7: Logical Provisioning
  md += `### Step ${step++}: Logical Aggregates & Spares Provisioning\n`;
  md += `Create aggregates and assign spare disks according to sizing recommendations:\n`;
  md += `\`\`\`bash\n`;
  modeledState.aggregates.forEach(a => {
    if (a.name.startsWith("aggr0")) return;
    md += `storage aggregate create -aggregate ${a.name} -diskcount ${a.disksCount} -raidtype ${a.raidType || "raid_dp"}\n`;
  });
  md += `storage disk show -container-type spare\n`;
  md += `\`\`\`\n\n`;

  md += `## 3. Risks & Mitigations\n`;
  md += `| Risk | Severity | Mitigation Plan |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Controller failover failure during PCIe mounting** | High | Run SFO diagnostics beforehand and verify LIF migrations. |\n`;
  md += `| **Disk capacity ONTAP compatibility error** | Medium | Keep target ONTAP version >= 9.9.1 to support 30.6TB SSDs. |\n`;
  md += `| **Symmetric cabling misalignment** | Medium | Double check loop cabling paths using cabling diagram svg views. |\n\n`;

  md += `## 4. Legal Disclaimer & Indemnification\n`;
  md += `**BY USING THIS REPORT, YOU FULLY INDEMNIFY, DEFEND, AND HOLD HARMLESS THE AUTHORS AND CONTRIBUTORS FROM ANY LIABILITY, DATA LOSS, HARDWARE DAMAGE, SYSTEM DOWNTIME, OR SERVICE DISRUPTION.**\n\n`;
  md += `This document is a configuration estimator/auditing helper only. All recommendations, CLI scripts, and cabling topologies must be validated by certified systems engineers against official NetApp hardware guides and ONTAP release notes before real-world execution. The author assumes no responsibility for any system configuration actions performed by users.\n`;

  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `netapp_upgrade_plan_${currentState.version.model.replace(/\s+/g, "_")}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function exportCliScript() {
  if (!currentState || !modeledState) {
    alert("No active model state. Please complete the sizing first.");
    return;
  }

  const isMetroCluster = currentState.metrocluster && currentState.metrocluster !== "none";
  const targetOntap = document.getElementById("target-ontap").value;
  const curVer = currentState.version.ontap;
  const baseCur = resolveBaseVersionKey(curVer);
  const hops = ONTAP_HOPS[baseCur] ? ONTAP_HOPS[baseCur][targetOntap] : [];

  let script = `#!/bin/bash\n`;
  script += `# ==========================================================================\n`;
  script += `# NetApp ONTAP Upgrade & Sizing Implementation Commands Script\n`;
  script += `# Platform: ${currentState.version.model}\n`;
  script += `# Target ONTAP: ${targetOntap}\n`;
  script += `# Generated: ${new Date().toLocaleDateString()}\n`;
  script += `# ==========================================================================\n\n`;

  script += `# --- Step 1: Pre-Upgrade Diagnostic Baseline ---\n`;
  script += `cluster show\n`;
  script += `storage failover show\n`;
  if (isMetroCluster) {
    script += `metrocluster check run\n`;
    script += `metrocluster check show\n`;
  }
  script += `system configuration backup create -node * -backup-name pre_upgrade_baseline\n\n`;

  const originalHadSPOF = currentState.shelves.some(s => s.cabling && (s.cabling.toLowerCase().includes("single-path") || !s.cabling.toLowerCase().includes("multipath")));
  if (originalHadSPOF) {
    script += `# --- Step 2: Cabling Loop Remediation (SPOF Removal) ---\n`;
    script += `storage cabling show\n`;
    script += `storage cabinet show\n\n`;
  }

  script += `# --- Step 3: Controller BIOS & Device Firmware Upgrades ---\n`;
  script += `system node firmware update -node * -package-url http://webserver/fw_package\n`;
  script += `storage shelf firmware update\n`;
  script += `storage disk firmware update\n\n`;

  const cards = currentState.expansionCards || [];
  if (cards.length > 0) {
    script += `# --- Step 4: PCIe Adapter Expansion Card Mounting ---\n`;
    script += `# Run on controller console sequentially during maintenance window:\n`;
    script += `# storage failover takeover -ofnode <node_name>\n`;
    script += `# sysconfig -card\n`;
    script += `# storage failover giveback -ofnode <node_name>\n\n`;
  }

  if (hops.length > 0) {
    script += `# --- Step 5: Execute ONTAP Upgrade hops ---\n`;
    if (isMetroCluster) {
      script += `# metrocluster switchover -controller-replacement true\n`;
    }
    script += `cluster image package get -url http://webserver/ontap_image.tgz\n`;
    script += `cluster image validate -version <target_version>\n`;
    script += `cluster image update\n`;
    if (isMetroCluster) {
      script += `# metrocluster switchback\n`;
    }
    script += `\n`;
  }

  const shelfType = document.getElementById("shelf-type").value;
  if (shelfType !== "none") {
    script += `# --- Step 6: Mount & Cable Storage Shelf Expansion ---\n`;
    script += `storage shelf show\n`;
    script += `storage cabling show\n\n`;
  }

  script += `# --- Step 7: Logical Aggregates & Spares Provisioning ---\n`;
  modeledState.aggregates.forEach(a => {
    if (a.name.startsWith("aggr0")) return;
    script += `storage aggregate create -aggregate ${a.name} -diskcount ${a.disksCount} -raidtype ${a.raidType || "raid_dp"}\n`;
  });
  script += `storage disk show -container-type spare\n`;

  const blob = new Blob([script], { type: "text/plain;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `netapp_execution_script_${currentState.version.model.replace(/\s+/g, "_")}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// --- Wizard Logic ---
function showPanel(step) {
  for (let i = 1; i <= 6; i++) {
    const panel = document.getElementById(`step${i}`);
    if (panel) {
      if (i === step) {
        panel.classList.remove("hidden");
      } else {
        panel.classList.add("hidden");
      }
    }
  }
  
  // Footer Button states
  if (step === 1) {
    prevBtn.classList.add("hidden");
    nextBtn.classList.add("hidden");
  } else {
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
    
    if (step === 6) {
      nextBtn.innerHTML = `
        Export Plan / Report
        <svg style="width: 18px; height: 18px; fill: #fff; margin-left: 6px;" viewBox="0 0 24 24">
          <path d="M14,2L20,8V20A2,2 0 0,1 18,22H6A2,2 0 0,1 4,20V4A2,2 0 0,1 6,2H14M18,20V9H13V4H6V20H18M12,18L7,13H10V10H14V13H17L12,18Z" />
        </svg>
      `;
      nextBtn.disabled = false;
      nextBtn.style.opacity = "1";
    } else {
      nextBtn.innerHTML = `
        Next
        <svg style="width: 18px; height: 18px; fill: #fff;" viewBox="0 0 24 24">
          <path d="M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z" />
        </svg>
      `;
      nextBtn.disabled = false;
      nextBtn.style.opacity = "1";
    }
  }
}

function updateWizardProgress() {
  stepNodes.forEach(node => {
    const step = parseInt(node.getAttribute("data-step"));
    node.classList.remove("active", "completed");
    
    // Hide/show steps 2 & 3 based on Greenfield mode
    if (isGreenfieldMode && (step === 2 || step === 3)) {
      node.style.display = "none";
    } else {
      node.style.display = ""; // restore default display
    }
    
    // Update step numbers visually in Greenfield mode
    const circle = node.querySelector(".step-circle");
    if (circle) {
      if (isGreenfieldMode) {
        if (step === 4) circle.textContent = "2";
        else if (step === 5) circle.textContent = "3";
        else if (step === 6) circle.textContent = "4";
      } else {
        circle.textContent = step.toString();
      }
    }
    
    if (step === activeStep) {
      node.classList.add("active");
    } else if (step < activeStep) {
      if (isGreenfieldMode && (step === 2 || step === 3)) {
        // do not mark completed or active in Greenfield mode
      } else {
        node.classList.add("completed");
      }
    }
  });
}

function downloadSvgElement(svgContainerId, filename) {
  const container = document.getElementById(svgContainerId);
  if (!container) return;
  const svg = container.querySelector("svg");
  if (!svg) {
    alert("No diagram rendering found to download.");
    return;
  }
  const clonedSvg = svg.cloneNode(true);
  clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  // Embed CSS style rules that apply to the SVG elements to make it standalone-perfect
  let styleText = "";
  try {
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule.selectorText && (
            rule.selectorText.includes("visual") ||
            rule.selectorText.includes("cabling-graph") ||
            rule.selectorText.includes("hop") ||
            rule.selectorText.includes(":root")
          )) {
            styleText += rule.cssText + "\n";
          }
        }
      } catch (e) {
        console.warn("Could not read stylesheet rules", e);
      }
    }
  } catch (e) {
    console.error("Error reading stylesheets", e);
  }

  if (styleText) {
    const styleElement = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleElement.textContent = styleText;
    clonedSvg.insertBefore(styleElement, clonedSvg.firstChild);
  }

  const serializer = new XMLSerializer();
  let svgString = serializer.serializeToString(clonedSvg);
  if (!svgString.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
    svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = blobUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
}

function setupWizardListeners() {
  prevBtn.addEventListener("click", () => {
    if (activeStep > 1) {
      if (isGreenfieldMode && activeStep === 4) {
        activeStep = 1;
      } else {
        activeStep--;
      }
      showPanel(activeStep);
      updateWizardProgress();
    }
  });

  nextBtn.addEventListener("click", () => {
    if (activeStep === 6) {
      const modal = document.getElementById("export-modal");
      if (modal) {
        modal.classList.remove("hidden");
      }
      return;
    }
    if (activeStep < 6) {
      try {
        if (activeStep === 2) {
          initStep3Inputs();
        } else if (activeStep === 3) {
          initStep4Inputs();
        } else if (activeStep === 4) {
          runModelingCalculations();
          renderCompareView();
        } else if (activeStep === 5) {
          generateReport();
        }
        
        activeStep++;
        showPanel(activeStep);
        updateWizardProgress();
      } catch (err) {
        console.error("Wizard next-step transition failed:", err);
        alert("Wizard progression error: " + err.message + "\nPlease verify your configuration fields.");
      }
    }
  });

  // Export options modal listeners
  const closeExportModalBtn = document.getElementById("close-export-modal-btn");
  if (closeExportModalBtn) {
    closeExportModalBtn.addEventListener("click", () => {
      document.getElementById("export-modal").classList.add("hidden");
    });
  }

  const exportPdfOpt = document.getElementById("export-pdf-opt");
  if (exportPdfOpt) {
    exportPdfOpt.addEventListener("click", () => {
      document.getElementById("export-modal").classList.add("hidden");
      window.print();
    });
  }

  const exportMdOpt = document.getElementById("export-md-opt");
  if (exportMdOpt) {
    exportMdOpt.addEventListener("click", () => {
      document.getElementById("export-modal").classList.add("hidden");
      exportMarkdownPlan();
    });
  }

  const exportCliOpt = document.getElementById("export-cli-opt");
  if (exportCliOpt) {
    exportCliOpt.addEventListener("click", () => {
      document.getElementById("export-modal").classList.add("hidden");
      exportCliScript();
    });
  }

  const exportJsonOpt = document.getElementById("export-json-opt");
  if (exportJsonOpt) {
    exportJsonOpt.addEventListener("click", () => {
      document.getElementById("export-modal").classList.add("hidden");
      saveConfiguration();
    });
  }

  if (saveConfigBtn) {
    saveConfigBtn.addEventListener("click", () => {
      saveConfiguration();
    });
  }

  if (loadConfigBtn && loadConfigInput) {
    loadConfigBtn.addEventListener("click", () => {
      loadConfigInput.click();
    });

    loadConfigInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          loadConfiguration(parsed);
        } catch (err) {
          alert("Error reading configuration file: " + err.message);
        }
        loadConfigInput.value = "";
      };
      reader.readAsText(file);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset the current modeling workspace?")) {
        resetState();
      }
    });
  }

  stepNodes.forEach(node => {
    node.addEventListener("click", () => {
      if (!currentState) return;
      const targetStep = parseInt(node.getAttribute("data-step"));
      if (isGreenfieldMode && (targetStep === 2 || targetStep === 3)) return; // block click on hidden nodes
      
      if (targetStep > activeStep) {
        let currentIter = activeStep;
        while (currentIter < targetStep) {
          try {
            if (currentIter === 2) initStep3Inputs();
            else if (currentIter === 3) initStep4Inputs();
            else if (currentIter === 4) {
              runModelingCalculations();
              renderCompareView();
            } else if (currentIter === 5) generateReport();
          } catch (err) {
            console.error(`Wizard navigation transition to step ${currentIter + 1} failed:`, err);
            alert(`Failed transitioning to step ${currentIter + 1}: ` + err.message);
            return; // stop progression
          }
          currentIter++;
        }
      }
      
      activeStep = targetStep;
      showPanel(activeStep);
      updateWizardProgress();
    });
  });

  // Wiring diagram download click event listeners
  const downloadCablingBtn = document.getElementById("download-cabling-btn");
  if (downloadCablingBtn) {
    downloadCablingBtn.addEventListener("click", () => {
      const model = (currentState && currentState.version && currentState.version.model) || "NetApp";
      downloadSvgElement("visualizer-svg-frame", `${model.replace(/\s+/g, "_")}_cabling_topology.svg`);
    });
  }

  const downloadBeforeBtn = document.getElementById("download-before-cabling-btn");
  if (downloadBeforeBtn) {
    downloadBeforeBtn.addEventListener("click", () => {
      const model = (currentState && currentState.version && currentState.version.model) || "NetApp";
      downloadSvgElement("comp-before-cabling", `${model.replace(/\s+/g, "_")}_before_upgrade_cabling.svg`);
    });
  }

  const downloadAfterBtn = document.getElementById("download-after-cabling-btn");
  if (downloadAfterBtn) {
    downloadAfterBtn.addEventListener("click", () => {
      const model = (modeledState && modeledState.version && modeledState.version.model) || "NetApp";
      downloadSvgElement("comp-after-cabling", `${model.replace(/\s+/g, "_")}_after_modeling_cabling.svg`);
    });
  }
}

// --- Upload / Demo Selection ---
function setupUploadListeners() {
  document.getElementById("demo-fas8300-btn").addEventListener("click", () => {
    const state = parseASUP(DEMO_DATA.fas8300.files);
    state.expansionCards = [];
    state.metrocluster = "none";
    loadASUPData(state);
  });

  document.getElementById("demo-affa400-btn").addEventListener("click", () => {
    const state = parseASUP(DEMO_DATA.aff_a400.files);
    state.expansionCards = [];
    state.metrocluster = "none";
    loadASUPData(state);
  });

  document.getElementById("load-manual-platform-btn").addEventListener("click", () => {
    const model = document.getElementById("manual-platform-select").value;
    const ontap = document.getElementById("manual-ontap-select").value;
    const capacityTB = parseFloat(document.getElementById("manual-capacity").value) || 50;
    const nodesCount = parseInt(document.getElementById("manual-nodes-select").value) || 2;
    generatePlatformBaseline(model, ontap, capacityTB, nodesCount, false);
  });

  document.getElementById("load-greenfield-btn").addEventListener("click", () => {
    const model = document.getElementById("manual-platform-select").value;
    const ontap = document.getElementById("manual-ontap-select").value;
    const capacityTB = parseFloat(document.getElementById("manual-capacity").value) || 50;
    const nodesCount = parseInt(document.getElementById("manual-nodes-select").value) || 2;
    generatePlatformBaseline(model, ontap, capacityTB, nodesCount, true);
  });

  dropZone.addEventListener("click", () => fileInput.click());
  
  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    handleFiles(e.dataTransfer.files);
  });
}


// Helper to split a single unified log file containing multiple command segments
function splitUnifiedASUP(text) {
  const sections = {};
  const lines = text.split(/\r?\n/);
  let currentSection = null;
  let currentContent = [];

  const commandPatterns = [
    /sysconfig\s+-a/i,
    /sysconfig\s+-r/i,
    /version/i,
    /license/i,
    /netport/i,
    /network\s+port\s+show/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check for section boundary matching: e.g. "===== sysconfig -a ====="
    const headerMatch = trimmed.match(/^[=\-*#]{3,}\s*([\w\s\-:/]+?)\s*[=\-*#]{3,}$/);
    let isHeader = false;
    let matchedName = "";

    if (headerMatch) {
      matchedName = headerMatch[1].trim();
      isHeader = commandPatterns.some(pat => pat.test(matchedName));
    } else {
      // Check for underlined headers:
      // sysconfig -a
      // ------------
      const isCmdName = commandPatterns.some(pat => pat.test(trimmed)) && trimmed.length < 50;
      if (isCmdName && i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length >= trimmed.length && /^[=\-]+$/.test(nextLine)) {
          isHeader = true;
          matchedName = trimmed;
          i++; // skip the underline line
        }
      }
    }

    if (isHeader) {
      if (currentSection) {
        sections[currentSection] = currentContent.join("\n");
      }
      currentSection = matchedName.toUpperCase();
      currentContent = [];
    } else {
      if (currentSection) {
        currentContent.push(line);
      }
    }
  }

  if (currentSection) {
    sections[currentSection] = currentContent.join("\n");
  }

  return sections;
}

// Custom lightweight client-side TAR archive parser
function untar(arrayBuffer) {
  const files = {};
  const view = new Uint8Array(arrayBuffer);
  let offset = 0;
  
  while (offset < view.length - 512) {
    // Check for null block (end of archive indicator)
    let isNull = true;
    for (let i = 0; i < 512; i++) {
      if (view[offset + i] !== 0) {
        isNull = false;
        break;
      }
    }
    if (isNull) break;
    
    // Read file name (bytes 0 to 99)
    let name = "";
    for (let i = 0; i < 100; i++) {
      const charCode = view[offset + i];
      if (charCode === 0) break;
      name += String.fromCharCode(charCode);
    }
    
    // Read file size (bytes 124 to 135 in octal representation)
    let sizeStr = "";
    for (let i = 124; i < 136; i++) {
      const charCode = view[offset + i];
      if (charCode === 0 || charCode === 32) continue;
      sizeStr += String.fromCharCode(charCode);
    }
    const size = parseInt(sizeStr, 8);
    
    // Read type flag (byte 156)
    const typeFlag = String.fromCharCode(view[offset + 156]);
    
    offset += 512; // Advance past header
    
    // Type flag '0' or '\0' signifies a regular file
    if (typeFlag === '0' || typeFlag === '\\0' || typeFlag === '') {
      if (size > 0 && offset + size <= view.length) {
        const fileBytes = view.subarray(offset, offset + size);
        const decoder = new TextDecoder("utf-8");
        files[name] = decoder.decode(fileBytes);
      }
    }
    
    // Tar pad size is always a multiple of 512
    const paddedSize = Math.ceil(size / 512) * 512;
    offset += paddedSize;
  }
  
  return files;
}

function mapASUPFile(baseName, text) {
  const sections = splitUnifiedASUP(text);
  if (Object.keys(sections).length > 1) {
    Object.keys(sections).forEach(secName => {
      mapASUPFile(secName, sections[secName]);
    });
    return;
  }

  const upper = baseName.toUpperCase();
  const lowerText = text.toLowerCase();

  if (upper.includes("VERSION") || lowerText.includes("netapp release")) {
    if (!lowerText.includes("system id") && !lowerText.includes("slot")) {
      uploadedFiles["VERSION"] = text;
    }
  }
  
  if (upper.includes("SYSCONFIG-A") || upper.includes("SYSCONFIG -A") || upper.includes("SYSCONFIG_A") || 
      (upper.includes("SYSCONFIG") && !upper.includes("-R") && !upper.includes("_R") && !upper.includes("SYSCONFIG-R")) ||
      (lowerText.includes("system id") && (lowerText.includes("slot") || lowerText.includes("adapter") || lowerText.includes("processor") || lowerText.includes("shelf")))) {
    uploadedFiles["SYSCONFIG-A"] = text;
  } 
  
  if (upper.includes("SYSCONFIG-R") || upper.includes("SYSCONFIG -R") || upper.includes("SYSCONFIG_R") ||
      (lowerText.includes("aggregate") && lowerText.includes("raid_dp") && lowerText.includes("spare disks"))) {
    uploadedFiles["SYSCONFIG-R"] = text;
  } 
  
  if (upper.includes("LICENSE") || (lowerText.includes("system serial number") && lowerText.includes("active") && lowerText.includes("cluster"))) {
    uploadedFiles["LICENSE"] = text;
  } 
  
  if (upper.includes("NETPORT") || upper.includes("NETWORK-PORT") || upper.includes("NET-PORT") || 
      (lowerText.includes("port") && lowerText.includes("duplex") && lowerText.includes("cluster-interconnect"))) {
    uploadedFiles["NETPORT"] = text;
  }
}

function processRawFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      mapASUPFile(file.name, e.target.result);
      resolve();
    };
    reader.onerror = () => reject(new Error(`Failed to read raw file: ${file.name}`));
    reader.readAsText(file);
  });
}

async function processZipFile(file) {
  if (!window.JSZip) {
    throw new Error("ZIP decompression library (JSZip) is missing.");
  }
  const zip = await window.JSZip.loadAsync(file);
  const promises = [];
  
  zip.forEach((relativePath, zipEntry) => {
    if (zipEntry.dir) return;
    const baseName = relativePath.split('/').pop();
    const promise = zipEntry.async("text").then(text => {
      mapASUPFile(baseName, text);
    });
    promises.push(promise);
  });
  
  await Promise.all(promises);
}

async function processTarGzFile(file) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Native DecompressionStream not supported in this browser.");
  }
  const ds = new DecompressionStream("gzip");
  const decompressedStream = file.stream().pipeThrough(ds);
  const response = new Response(decompressedStream);
  const tarBuffer = await response.arrayBuffer();
  
  const tarFiles = untar(tarBuffer);
  Object.keys(tarFiles).forEach(path => {
    const baseName = path.split('/').pop();
    mapASUPFile(baseName, tarFiles[path]);
  });
}

async function processTarFile(file) {
  const buffer = await file.arrayBuffer();
  const tarFiles = untar(buffer);
  Object.keys(tarFiles).forEach(path => {
    const baseName = path.split('/').pop();
    mapASUPFile(baseName, tarFiles[path]);
  });
}

async function handleFiles(fileList) {
  if (fileList.length === 0) return;
  uploadedFiles = {};
  
  const dropZoneText = dropZone.querySelector("p");
  const originalText = dropZoneText.textContent;
  dropZoneText.textContent = "Processing and extracting archive bundle...";

  try {
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const name = file.name.toLowerCase();

      if (name.endsWith(".zip")) {
        await processZipFile(file);
      } else if (name.endsWith(".tar.gz") || name.endsWith(".tgz")) {
        await processTarGzFile(file);
      } else if (name.endsWith(".tar")) {
        await processTarFile(file);
      } else {
        await processRawFile(file);
      }
    }
    const state = parseASUP(uploadedFiles);
    state.expansionCards = [];
    state.metrocluster = "none";
    loadASUPData(state);
  } catch (error) {
    console.error(error);
    alert(`Error loading bundle: ${error.message}`);
  } finally {
    dropZoneText.textContent = originalText;
  }
}

function loadASUPData(input, isGreenfield = false) {
  try {
    isGreenfieldMode = isGreenfield;
    if (input && input.version) {
      currentState = input;
      // Populate baseline alerts for manual configurations if not present
      if (!currentState.alerts) {
        currentState.alerts = [];
        if (!isGreenfieldMode) {
          if (currentState.shelves.some(s => s.cabling && (s.cabling.toLowerCase().includes("single-path") || !s.cabling.toLowerCase().includes("multipath")))) {
            currentState.alerts.push({
              id: "ASUP_CABLE_SPOF",
              component: "Cabling",
              severity: "critical",
              message: "Single-Path cabling detected on baseline shelf stack. Redundant path connectivity is offline.",
              sourceFile: "MANUAL-CONFIG",
              resolution: "Cable the storage loops to achieve Multipath HA cabling. Connect both controller SAS/NVMe adapter ports to both shelf IOMs."
            });
          }
          currentState.licenses.forEach(lic => {
            if (lic.status === "expired") {
              currentState.alerts.push({
                id: `ASUP_LIC_EXPIRED_${lic.name.toUpperCase()}`,
                component: "Licensing",
                severity: "warning",
                message: `Feature license '${lic.name}' is expired on cluster model.`,
                sourceFile: "MANUAL-CONFIG",
                resolution: `Renew the '${lic.name}' service protocol license key and install it using the 'system license add' command.`
              });
            }
          });
        }
      }
    } else {
      currentState = parseASUP(input);
      if (!currentState.expansionCards) currentState.expansionCards = [];
      currentState.metrocluster = "none";
      isGreenfieldMode = false;
    }

    // Ensure onboard storage ports are present in node.ports for auditing
    const profile = getPlatformProfile(currentState.version.model);
    if (profile && profile.ports && profile.ports.storage) {
      const isAllNVMe = profile.supportedShelves.includes("ns224") && !profile.supportedShelves.includes("ds224c");
      currentState.nodes.forEach(node => {
        if (!node.ports) node.ports = [];
        profile.ports.storage.forEach(p => {
          const exists = node.ports.find(x => x.name.toLowerCase() === p.toLowerCase());
          if (!exists) {
            node.ports.push({
              name: p,
              status: "up",
              speed: isAllNVMe ? "100GbE" : "12Gb SAS",
              duplex: "full",
              type: "storage"
            });
          }
        });
      });
    }
    
    renderCurrentAuditDashboard();
    
    if (isGreenfieldMode) {
      initStep3Inputs();
      initStep4Inputs();
      activeStep = 4;
      showPanel(4);
    } else {
      activeStep = 2;
      showPanel(2);
    }
    updateWizardProgress();
    
    prevBtn.classList.remove("hidden");
    nextBtn.classList.remove("hidden");
  } catch (error) {
    console.error(error);
    alert(`Error parsing AutoSupport Bundle: ${error.message}`);
  }
}

function allocateHBACardsForState(state) {
  if (!state || !state.shelves || state.shelves.length === 0) return;
  
  // 1. Remove previous auto-allocated cards to avoid duplicates
  if (state.expansionCards) {
    const autoCards = state.expansionCards.filter(c => c.autoAdded);
    autoCards.forEach(c => {
      const dynamicPorts = getCardPorts(c.cardKey, c.slot);
      state.nodes.forEach(node => {
        node.ports = node.ports.filter(p => !dynamicPorts.includes(p.name));
      });
    });
    state.expansionCards = state.expansionCards.filter(c => !c.autoAdded);
  } else {
    state.expansionCards = [];
  }

  const nodeA = state.nodes.find(n => n.name === "node-a" || n.name.endsWith("-a") || n.name === "node-1") || state.nodes[0];
  if (!nodeA) return;

  const nodes = state.nodes || [];
  const haPairsCount = Math.floor(nodes.length / 2) || 1;

  let totalNvmeShelves = 0;
  let totalSasShelves = 0;
  state.shelves.forEach(s => {
    if (s.model && s.model.toLowerCase() === "ns224") totalNvmeShelves++;
    else totalSasShelves++;
  });

  const nvmeShelvesCount = Math.ceil(totalNvmeShelves / haPairsCount);
  const sasShelvesCount = Math.ceil(totalSasShelves / haPairsCount);

  const isHighEnd = ['AFF A1K', 'AFF A90', 'AFF A70', 'AFF A900', 'FAS9500'].some(m => state.version.model.toUpperCase().includes(m));
  const requiredRocePorts = isHighEnd ? Math.ceil(nvmeShelvesCount / 2) * 2 : nvmeShelvesCount * 2;
  const requiredSasPorts = Math.ceil(sasShelvesCount / 4) * 2;

  const countAvailablePorts = () => {
    const ports = nodeA.ports || [];
    let roce = 0;
    let sas = 0;
    ports.forEach(p => {
      const name = p.name.toLowerCase();
      const speed = (p.speed || "").toLowerCase();
      const portType = (p.type || "").toLowerCase();
      
      const isRoce = name.startsWith("e") && (speed.includes("100g") || speed.includes("roce") || portType.includes("storage"));
      const isSas = (name.startsWith("0") || portType.includes("storage")) && (speed.includes("sas") || (speed.includes("6g") && !speed.includes("16g")) || speed.includes("12g") || (!speed && (name.startsWith("0a") || name.startsWith("0b") || name.startsWith("0c") || name.startsWith("0d"))));
      
      if (isRoce) roce++;
      else if (isSas) sas++;
    });
    return { roce, sas };
  };

  let ports = countAvailablePorts();
  const slots = getPlatformSlots(state.version.model);
  const getNextFreeSlot = (cardSpec) => {
    const occupied = new Set(state.expansionCards.map(c => c.slot));
    const cardType = cardSpec.type;
    const is100G = cardSpec.speed && cardSpec.speed.includes("100G");
    
    const isGoodSlot = (s) => {
      if (is100G && s.type.includes("x8")) return false;
      return true;
    };

    // 1. Try to find a slot optimized for this card type AND has no bottleneck
    let slot = slots.find(s => !occupied.has(s.num) && s.recType === cardType && isGoodSlot(s));
    if (slot) return slot;
    
    // 2. Try to find a slot optimized for this card type (even with bottleneck)
    slot = slots.find(s => !occupied.has(s.num) && s.recType === cardType);
    if (slot) return slot;
    
    // 3. Try to find a slot optimized for "any" AND has no bottleneck
    slot = slots.find(s => !occupied.has(s.num) && s.recType === "any" && isGoodSlot(s));
    if (slot) return slot;
    
    // 4. Try to find a slot optimized for "any"
    slot = slots.find(s => !occupied.has(s.num) && s.recType === "any");
    if (slot) return slot;
    
    // 5. Try any free slot with no bottleneck
    slot = slots.find(s => !occupied.has(s.num) && isGoodSlot(s));
    if (slot) return slot;
    
    // 6. Fallback to any free slot
    return slots.find(s => !occupied.has(s.num));
  };

  // Auto-populate RoCE cards if needed
  if (nvmeShelvesCount > 0 && ports.roce < requiredRocePorts) {
    let deficit = requiredRocePorts - ports.roce;
    let cardsNeeded = Math.ceil(deficit / 2);
    for (let k = 0; k < cardsNeeded; k++) {
      const cardKey = "roce_hba_100g_2port";
      const cardSpec = EXP_CARDS_CATALOG[cardKey];
      const freeSlot = getNextFreeSlot(cardSpec);
      if (freeSlot) {
        state.expansionCards.push({ slot: freeSlot.num, cardKey: cardKey, autoAdded: true });
        const dynamicPorts = getCardPorts(cardKey, freeSlot.num);
        state.nodes.forEach(node => {
          dynamicPorts.forEach(pName => {
            const exists = node.ports.find(p => p.name === pName);
            if (!exists) {
              node.ports.push({ name: pName, status: "up", speed: cardSpec.speed, duplex: "full", type: "storage" });
            }
          });
        });
        ports.roce += 2;
      }
    }
  }

  // Auto-populate SAS cards if needed
  if (sasShelvesCount > 0 && ports.sas < requiredSasPorts) {
    let deficit = requiredSasPorts - ports.sas;
    let cardsNeeded = Math.ceil(deficit / 4);
    for (let k = 0; k < cardsNeeded; k++) {
      const cardKey = "sas_hba_12g_4port";
      const cardSpec = EXP_CARDS_CATALOG[cardKey];
      const freeSlot = getNextFreeSlot(cardSpec);
      if (freeSlot) {
        state.expansionCards.push({ slot: freeSlot.num, cardKey: cardKey, autoAdded: true });
        const dynamicPorts = getCardPorts(cardKey, freeSlot.num);
        state.nodes.forEach(node => {
          dynamicPorts.forEach(pName => {
            const exists = node.ports.find(p => p.name === pName);
            if (!exists) {
              node.ports.push({ name: pName, status: "up", speed: cardSpec.speed, duplex: "full", type: "storage" });
            }
          });
        });
        ports.sas += 4;
      }
    }
  }

  // Ensure all expansion card ports (parsed, manual, or auto-allocated) are present in node.ports
  if (state.expansionCards) {
    state.expansionCards.forEach(c => {
      const cSpec = EXP_CARDS_CATALOG[c.cardKey];
      if (cSpec) {
        const dynamicPorts = getCardPorts(c.cardKey, c.slot);
        state.nodes.forEach(node => {
          if (!node.ports) node.ports = [];
          dynamicPorts.forEach(pName => {
            const exists = node.ports.find(p => p.name.toLowerCase() === pName.toLowerCase());
            if (!exists) {
              node.ports.push({
                name: pName,
                status: "up",
                speed: cSpec.speed,
                duplex: "full",
                type: cSpec.type === "storage" ? "storage" : cSpec.type === "san" ? "san" : "data"
              });
            }
          });
        });
      }
    });
  }
}

// Dynamic Disk Sizing helper
function getOptimalDiskSize(model, profile, capacityTB, nodesCount, isGreenfield) {
  const isAllNVMe = profile.supportedShelves.includes("ns224") && (model.toUpperCase().includes("AFF") || model.toUpperCase().includes("ASA") || !profile.supportedShelves.includes("ds224c"));
  const maxDrives = getPlatformMaxDrives(model);
  
  const nvmeSizes = [
    { label: "1.9TB", sizeGB: 1900, model: "X371_S16431T9ATE" },
    { label: "3.8TB", sizeGB: 3800, model: "X372_S16433T8ATE" },
    { label: "7.6TB", sizeGB: 7600, model: "X373_S16437T6ATE" },
    { label: "15.3TB", sizeGB: 15300, model: "X374_S164315TATE" },
    { label: "30.6TB", sizeGB: 30600, model: "X375_S164330TATE" },
    { label: "61.2TB", sizeGB: 61200, model: "X376_S164361TATE" }
  ];
  
  const sasSizes = [
    { label: "960GB", sizeGB: 960, model: "X425_H960G12G15K" },
    { label: "3.8TB", sizeGB: 3800, model: "X427_H3800G12G15K" },
    { label: "7.6TB", sizeGB: 7600, model: "X428_H7600G12G15K" },
    { label: "15.3TB", sizeGB: 15300, model: "X429_H15300G12G15K" },
    { label: "30.6TB", sizeGB: 30600, model: "X430_H30600G12G15K" },
    { label: "61.2TB", sizeGB: 61200, model: "X431_H61200G12G15K" }
  ];
  
  const sizes = isAllNVMe ? nvmeSizes : sasSizes;
  const usableTargetGB = capacityTB * 1000;
  const slots = getPlatformSlots(model);
  const slotsCount = slots.length;
  const isHighEnd = ['AFF A1K', 'AFF A90', 'AFF A70', 'AFF A900', 'FAS9500'].some(m => model.toUpperCase().includes(m));
  
  let bestOption = null;
  let bestPenalty = Infinity;

  // Standard sizing heuristic: we want to avoid putting huge capacities on tiny disks
  let targetMinGB = 960;
  if (capacityTB > 300) targetMinGB = 15300;
  else if (capacityTB > 150) targetMinGB = 7600;
  else if (capacityTB > 50) targetMinGB = 3800;

  for (let option of sizes) {
    const usableGBPerDisk = option.sizeGB * 0.70;
    const totalDataDisksRequired = Math.ceil(usableTargetGB / usableGBPerDisk);
    let dataDisksPerNode = Math.ceil(totalDataDisksRequired / nodesCount);
    dataDisksPerNode = Math.max(6, dataDisksPerNode);
    const sparesPerNode = isGreenfield ? 2 : 1;
    const disksPerNode = dataDisksPerNode + sparesPerNode;
    const totalDisks = disksPerNode * nodesCount;
    
    if (totalDisks > maxDrives) continue; // Hard limit

    const shelfCount = Math.max(Math.ceil(nodesCount / 2), Math.ceil(totalDisks / 24));
    const nvmeShelvesCount = isAllNVMe ? shelfCount : 0;
    const sasShelvesCount = isAllNVMe ? 0 : shelfCount;
    
    const haPairsCount = Math.floor(nodesCount / 2) || 1;
    const nvmeShelvesPerHA = Math.ceil(nvmeShelvesCount / haPairsCount);
    const sasShelvesPerHA = Math.ceil(sasShelvesCount / haPairsCount);
    
    const requiredRocePorts = isHighEnd ? Math.ceil(nvmeShelvesPerHA / 2) * 2 : nvmeShelvesPerHA * 2;
    const requiredSasPorts = Math.ceil(sasShelvesPerHA / 4) * 2;
    
    // Calculate onboard ports
    const pDef = profile.ports || {};
    const onboardRoce = (pDef.storage || []).filter(p => p.startsWith("e")).length || (isAllNVMe ? 2 : 0);
    const onboardSas = (pDef.storage || []).filter(p => !p.startsWith("e")).length || (isAllNVMe ? 0 : 2);
    
    let deficitRoce = Math.max(0, requiredRocePorts - onboardRoce);
    let deficitSas = Math.max(0, requiredSasPorts - onboardSas);
    
    let cardsNeededRoce = Math.ceil(deficitRoce / 2);
    let cardsNeededSas = Math.ceil(deficitSas / 4);
    let totalCardsNeeded = cardsNeededRoce + cardsNeededSas;
    
    let penalty = 0;
    
    // Penalty for too many cards
    if (totalCardsNeeded > slotsCount) {
      penalty += 1000;
    }
    
    // Simulate slot placement bottleneck/warnings
    let occupiedSlots = new Set();
    const simulateGetSlot = (cardSpec) => {
      const is100G = cardSpec.speed && cardSpec.speed.includes("100G");
      const isGoodSlot = (s) => !(is100G && s.type.includes("x8"));
      
      let slot = slots.find(s => !occupiedSlots.has(s.num) && s.recType === cardSpec.type && isGoodSlot(s));
      if (slot) { occupiedSlots.add(slot.num); return { slot, warn: false }; }
      
      slot = slots.find(s => !occupiedSlots.has(s.num) && s.recType === cardSpec.type);
      if (slot) { occupiedSlots.add(slot.num); return { slot, warn: true }; } // bottleneck warning
      
      slot = slots.find(s => !occupiedSlots.has(s.num) && s.recType === "any" && isGoodSlot(s));
      if (slot) { occupiedSlots.add(slot.num); return { slot, warn: false }; }
      
      slot = slots.find(s => !occupiedSlots.has(s.num) && s.recType === "any");
      if (slot) { occupiedSlots.add(slot.num); return { slot, warn: true }; } // bottleneck warning
      
      slot = slots.find(s => !occupiedSlots.has(s.num) && isGoodSlot(s));
      if (slot) { occupiedSlots.add(slot.num); return { slot, warn: true }; } // sub-optimal warning
      
      slot = slots.find(s => !occupiedSlots.has(s.num));
      if (slot) { occupiedSlots.add(slot.num); return { slot, warn: true }; }
      
      return null;
    };
    
    for (let c = 0; c < cardsNeededRoce; c++) {
      const cardSpec = EXP_CARDS_CATALOG["roce_hba_100g_2port"];
      const placement = simulateGetSlot(cardSpec);
      if (!placement) penalty += 200;
      else if (placement.warn) penalty += 50;
    }
    for (let c = 0; c < cardsNeededSas; c++) {
      const cardSpec = EXP_CARDS_CATALOG["sas_hba_12g_4port"];
      const placement = simulateGetSlot(cardSpec);
      if (!placement) penalty += 200;
      else if (placement.warn) penalty += 50;
    }
    
    // Daisy-chain penalty
    if (isAllNVMe) {
      if (nvmeShelvesPerHA > 1 && !isHighEnd) {
        penalty += 100; // Daisy chain not supported warning
      } else if (nvmeShelvesPerHA > 2 && isHighEnd) {
        penalty += 100; // Daisy chain limit exceeded warning
      }
    }
    
    // Penalty for not meeting target size heuristic
    if (option.sizeGB < targetMinGB) {
      penalty += 10;
    }
    
    // Select the option with the absolute lowest penalty
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestOption = option;
    }
  }
  
  const result = bestOption || sizes[sizes.length - 1];
  return {
    sizeStr: result.label,
    sizeGB: result.sizeGB,
    diskModel: result.model,
    diskType: isAllNVMe ? "NVMe SSD" : "SAS SSD"
  };
}

// Manual Baseline Config Generator
function generatePlatformBaseline(model, manualOntap, capacityTB = 50, nodesCount = 2, isGreenfield = false) {
  const profile = getPlatformProfile(model);
  const serial = `MNL${Math.floor(100000 + Math.random() * 900000)}`;
  
  let startingOntap = manualOntap || profile.maxOntap;
  if (isGreenfield) {
    const compliantVersions = ["9.14.1", "9.15.1", "9.16.1", "9.17.1", "9.18.1", "9.19.1", "9.20.1"];
    let bestCompliant = null;
    for (let cv of compliantVersions) {
      if (compareVersions(cv, profile.maxOntap) <= 0) {
        bestCompliant = cv;
      }
    }
    if (bestCompliant) {
      startingOntap = bestCompliant;
    } else {
      startingOntap = profile.maxOntap;
    }
  }
  const ontapSelect = document.getElementById("manual-ontap-select");
  if (ontapSelect) {
    ontapSelect.value = startingOntap;
  }

  const isAllNVMe = profile.supportedShelves.includes("ns224") && (model.toUpperCase().includes("AFF") || model.toUpperCase().includes("ASA") || !profile.supportedShelves.includes("ds224c"));
  const optDisk = getOptimalDiskSize(model, profile, capacityTB, nodesCount, isGreenfield);
  const shelfModel = isAllNVMe ? "NS224" : "DS224C";
  const diskType = optDisk.diskType;
  const diskSizeStr = optDisk.sizeStr;
  const diskSizeGB = optDisk.sizeGB;
  const diskModel = optDisk.diskModel;
  
  // Calculate dynamic disk sizing to meet capacityTB
  // Sizing uses a 70% usable efficiency factor (accounting for RAID-DP parity, WAFL overhead, root partition, spares)
  const usableTargetGB = capacityTB * 1000;
  const usableGBPerDisk = diskSizeGB * 0.70;
  const totalDataDisksRequired = Math.ceil(usableTargetGB / usableGBPerDisk);
  
  // Distribute symmetrically among nodesCount
  let dataDisksPerNode = Math.ceil(totalDataDisksRequired / nodesCount);
  dataDisksPerNode = Math.max(6, dataDisksPerNode); // minimum 6 data disks for a valid RAID group
  
  // Total disks including spares per node (Rule 4 requires >= 2 spares per node for compliance)
  const sparesPerNode = isGreenfield ? 2 : 1;
  const disksPerNode = dataDisksPerNode + sparesPerNode;
  const totalDisks = disksPerNode * nodesCount;
  
  // Calculate shelf count (max 24 disks per shelf)
  let shelfCount = Math.ceil(totalDisks / 24);
  shelfCount = Math.max(Math.ceil(nodesCount / 2), shelfCount); // At least 1 shelf per HA pair
  
  // Generate nodes
  const nodes = [];
  const nodeNames = ["node-a", "node-b", "node-c", "node-d", "node-e", "node-f", "node-g", "node-h"];
  for (let i = 0; i < nodesCount; i++) {
    const nodeName = nodeNames[i] || `node-${String.fromCharCode(97 + i)}`;
    const suffix = i === 0 ? "" : String.fromCharCode(65 + i); // B, C, D...
    nodes.push({
      id: `10000000${i + 1}`,
      name: nodeName,
      serial: i === 0 ? serial : `${serial}${suffix}`,
      ports: (() => {
        const list = [
          { name: "e0a", status: "up", speed: isAllNVMe ? "25GbE" : "10GbE", duplex: "full", type: "cluster-interconnect" },
          { name: "e0b", status: "up", speed: isAllNVMe ? "25GbE" : "10GbE", duplex: "full", type: "cluster-interconnect" },
          { name: "e0c", status: "up", speed: "10GbE", duplex: "full", type: "data" },
          { name: "e0d", status: "up", speed: "10GbE", duplex: "full", type: "data" }
        ];
        if (profile.ports && profile.ports.storage) {
          profile.ports.storage.forEach(p => {
            list.push({ name: p, status: "up", speed: isAllNVMe ? "100GbE" : "12Gb SAS", duplex: "full", type: "storage" });
          });
        }
        return list;
      })()
    });
  }

  // Generate shelves and populate disks
  const shelves = [];
  let diskSerialIndex = 0;
  const shelfLatestFirmware = shelfModel === "NS224" ? "v0130" : "v0224";
  const shelfFirmware = isGreenfield ? shelfLatestFirmware : "v0100";
  for (let s = 0; s < shelfCount; s++) {
    const disksInThisShelf = Math.min(24, totalDisks - s * 24);
    shelves.push({
      id: `${s + 1}`,
      model: shelfModel,
      serial: `SHFL-BASE-${s + 1}`,
      firmware: shelfFirmware,
      latestFirmware: shelfLatestFirmware,
      cabling: isGreenfield ? "Multipath HA" : (s === 0 ? "Single-path (SPOF)" : "Multipath HA"),
      disks: Array.from({ length: disksInThisShelf }, (_, slot) => ({
        slot,
        model: diskModel,
        sizeStr: diskSizeStr,
        sizeGB: diskSizeGB,
        type: diskType,
        firmware: "NA01",
        serial: `BS-${diskSerialIndex++}`
      }))
    });
  }

  // Generate aggregates (symmetrical) and spares
  const aggregates = [];
  const spares = [];
  for (let i = 0; i < nodesCount; i++) {
    const nodeName = nodes[i].name;
    const charCode = nodeName.substring(nodeName.lastIndexOf("-") + 1); // 'a', 'b', 'c', etc.
    
    const usableGB = Math.round((dataDisksPerNode - 2) * diskSizeGB * 0.85);
    // Greenfield defaults to 10% usage to remain compliant (Rule 6 capacity audit triggers warnings if > 85%)
    const usedFraction = isGreenfield ? 0.10 : (i % 2 === 0 ? 0.92 : 0.45);
    
    aggregates.push({
      name: `aggr_data_${charCode}`,
      node: nodeName,
      sizeGB: diskSizeGB * dataDisksPerNode,
      usableGB: usableGB,
      usedGB: Math.round(usableGB * usedFraction),
      freeGB: Math.round(usableGB * (1 - usedFraction)),
      raidType: "raid_dp",
      rgSize: 12,
      disksCount: dataDisksPerNode,
      diskType: diskType,
      diskSizeGB: diskSizeGB
    });

    spares.push({
      node: nodeName,
      model: "Spare drive",
      sizeStr: diskSizeStr,
      sizeGB: diskSizeGB,
      type: diskType,
      count: sparesPerNode
    });
  }

  const state = {
    version: {
      model: model,
      ontap: startingOntap,
      serial: serial,
      systemFirmware: isGreenfield ? (profile.maxFirmware || "v20.0") : "v1.0"
    },
    expansionCards: [],
    metrocluster: document.getElementById("deploy-metrocluster").checked ? document.getElementById("metrocluster-type").value : "none",
    nodes: nodes,
    switches: [
      { name: "CSW-BES-01", model: "BES-53248", version: "1.3.0.1", role: "cluster-switch" },
      { name: "CSW-BES-02", model: "BES-53248", version: "1.3.0.1", role: "cluster-switch" }
    ],
    shelves: shelves,
    aggregates: aggregates,
    spares: spares,
    licenses: [
      { name: "Cluster", status: "active", details: "", serial: serial },
      { name: "NFS", status: "active", details: "", serial: serial },
      { name: "CIFS", status: "active", details: "", serial: serial },
      { name: "FCP", status: isGreenfield ? "active" : "expired", details: isGreenfield ? "" : "Expired: 2024-01-01", serial: serial },
      { name: "iSCSI", status: "active", details: "", serial: serial },
      { name: "SnapMirror", status: isGreenfield ? "active" : "expired", details: isGreenfield ? "" : "Expired: 2024-01-01", serial: serial }
    ].filter(lic => profile.supportedLicenses.includes(lic.name))
  };

  // Add FC ports if platform supports FCP
  if (profile.supportedLicenses.includes("FCP") && profile.ports.san && profile.ports.san.length > 0) {
    state.nodes.forEach(node => {
      profile.ports.san.forEach(p => {
        node.ports.push({ name: p, status: "up", speed: "16Gb FC", duplex: "full", type: "fc" });
      });
    });
  }

  // If MetroCluster is active, enable MC license
  if (state.metrocluster !== "none") {
    state.licenses.push({ name: "MetroCluster", status: "active", details: "", serial: serial });
  }

  allocateHBACardsForState(state);
  loadASUPData(state, isGreenfield);
}

// --- Step 2 rendering ---
function renderCurrentAuditDashboard() {
  document.getElementById("cur-model").textContent = currentState.version.model;
  document.getElementById("cur-version").textContent = currentState.version.ontap;
  document.getElementById("cur-serial").textContent = currentState.version.serial;

  // Render Partial ASUP Parse Warnings Banner
  const warnBanner = document.getElementById("parse-warnings-banner");
  const warnList = document.getElementById("parse-warnings-list");
  if (warnBanner && warnList) {
    if (currentState.parseWarnings && currentState.parseWarnings.length > 0) {
      warnList.innerHTML = currentState.parseWarnings.map(w => 
        `<li style="margin-bottom: 2px;"><strong>${w.section}:</strong> ${w.message}</li>`
      ).join("");
      warnBanner.classList.remove("hidden");
    } else {
      warnBanner.classList.add("hidden");
    }
  }

  // Node Count
  const curNodesElem = document.getElementById("cur-nodes");
  if (curNodesElem) {
    curNodesElem.textContent = `${currentState.nodes.length} Node${currentState.nodes.length !== 1 ? 's' : ''}`;
  }

  // Total Raw Capacity
  const curRawElem = document.getElementById("cur-raw");
  if (curRawElem) {
    let totalRawGB = 0;
    currentState.shelves.forEach(s => {
      (s.disks || []).forEach(d => {
        totalRawGB += (d.sizeGB || 0);
      });
    });
    curRawElem.textContent = formatGB(totalRawGB);
  }

  // Shelves & Drives
  const curShelvesDrivesElem = document.getElementById("cur-shelves-drives");
  if (curShelvesDrivesElem) {
    let totalDrives = 0;
    currentState.shelves.forEach(s => {
      totalDrives += (s.disks || []).length;
    });
    curShelvesDrivesElem.textContent = `${currentState.shelves.length} Shelf${currentState.shelves.length !== 1 ? 's' : ''} (${totalDrives} Drive${totalDrives !== 1 ? 's' : ''})`;
  }

  // Active Licenses
  const curLicsElem = document.getElementById("cur-lics");
  if (curLicsElem) {
    const activeLics = currentState.licenses
      .filter(l => l.status === "active")
      .map(l => l.name);
    curLicsElem.textContent = activeLics.length > 0 ? activeLics.join(", ") : "None";
  }

  // Render SVG Cabling
  drawCablingTopology(currentState, "visualizer-svg-frame");

  // Populate port status table
  renderPortAuditTable(currentState, "port-audit-table-body");

  // Populate storage inventory
  renderStorageInventory(currentState);
  renderAggregateInventory(currentState);

  // Run Best practice audit
  const auditReports = runAudit(currentState);
  const score = calculateComplianceScore(auditReports);

  const scoreNode = document.getElementById("compliance-score");
  scoreNode.textContent = `${score}%`;
  scoreNode.className = "meter-circle";
  if (score >= 85) scoreNode.classList.add("success");
  else if (score >= 60) scoreNode.classList.add("warning");
  else scoreNode.classList.add("danger");

  // Populate Audit Accordion cards
  const auditList = document.getElementById("audit-list");
  auditList.innerHTML = "";

  auditReports.forEach((report, index) => {
    const card = document.createElement("div");
    card.className = "audit-card";
    
    card.innerHTML = `
      <div class="audit-card-summary">
        <div class="audit-meta">
          <span class="status-badge ${report.status}">${report.status}</span>
          <span class="audit-title">${report.title}</span>
        </div>
        <span class="audit-category">${report.category}</span>
      </div>
      <div class="audit-card-details">
        <div class="details-section">
          <div class="section-title">Assessment Rationale</div>
          <div class="section-text">${report.description}</div>
        </div>
        <div class="details-section">
          <div class="section-title">Recommendation Guidance</div>
          <div class="section-text">${report.recommendation}</div>
        </div>
        ${report.remediation ? `
          <div class="details-section">
            <div class="section-title">Technical Action Step</div>
            <div class="section-remediation">${report.remediation}</div>
          </div>
        ` : ''}
      </div>
    `;

    card.querySelector(".audit-card-summary").addEventListener("click", () => {
      card.classList.toggle("open");
    });

    auditList.appendChild(card);
  });

  // Render ASUP Event Alerts Table (NEW)
  renderASUPAlertsTable(currentState);

  // Handle MetroCluster site partitioning visibility and listing
  const mcCard = document.getElementById("mc-partitioning-card");
  if (mcCard) {
    const isMetroCluster = currentState.metrocluster && currentState.metrocluster !== "none";
    if (isMetroCluster) {
      mcCard.classList.remove("hidden");
      
      const siteANodesList = document.getElementById("mc-site-a-nodes");
      const siteBNodesList = document.getElementById("mc-site-b-nodes");
      
      if (siteANodesList && siteBNodesList) {
        siteANodesList.innerHTML = "";
        siteBNodesList.innerHTML = "";
        
        const nodes = currentState.nodes || [];
        const nodesPerSite = Math.floor(nodes.length / 2) || 1;
        
        for (let k = 0; k < nodesPerSite; k++) {
          const nodeA = nodes[2 * k];
          const nodeB = nodes[2 * k + 1];
          
          if (nodeA) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${nodeA.name.toUpperCase()}</strong> (S/N: ${nodeA.serial || "N/A"})`;
            siteANodesList.appendChild(li);
          }
          if (nodeB) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${nodeB.name.toUpperCase()}</strong> (S/N: ${nodeB.serial || "N/A"})`;
            siteBNodesList.appendChild(li);
          }
        }
      }
    } else {
      mcCard.classList.add("hidden");
    }
  }
}

// Populates and draws the AutoSupport Alerts and resolutions dashboard card
function renderASUPAlertsTable(state) {
  const tbody = document.getElementById("asup-alerts-table-body");
  const countBadge = document.getElementById("asup-alerts-count-badge");
  if (!tbody || !countBadge) return;

  tbody.innerHTML = "";
  const alerts = state.alerts || [];

  countBadge.textContent = `${alerts.length} Alert${alerts.length === 1 ? "" : "s"}`;
  
  if (alerts.length === 0) {
    countBadge.className = "status-badge compliant";
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-success); font-weight: 500; font-size: 0.95rem;">
          <svg style="width: 24px; height: 24px; fill: var(--color-success); vertical-align: middle; margin-right: 8px;" viewBox="0 0 24 24">
            <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.8 20 4.4 16.6 4.4 12S7.8 4 12 4 19.6 7.4 19.6 12S16.2 20 12 20M16.6 8.6L18 10L11 17L6 12L7.4 10.6L11 14.2Z" />
          </svg>
          No hardware failures, cabling faults, or critical events detected in this AutoSupport bundle.
        </td>
      </tr>
    `;
    return;
  }

  // Update badge class based on worst severity
  const hasCritical = alerts.some(a => a.severity === "critical" || a.severity === "error");
  countBadge.className = hasCritical ? "status-badge critical" : "status-badge warning";

  alerts.forEach(alert => {
    const tr = document.createElement("tr");
    
    let badgeClass = "warning";
    if (alert.severity === "critical" || alert.severity === "error") {
      badgeClass = "critical";
    } else if (alert.severity === "info") {
      badgeClass = "compliant";
    }

    tr.innerHTML = `
      <td><span class="status-badge ${badgeClass}" style="font-size: 0.7rem; padding: 2px 6px;">${alert.severity.toUpperCase()}</span></td>
      <td style="font-weight: 600;">${alert.component}</td>
      <td style="color: #fff; font-weight: 500;">${alert.message}</td>
      <td style="font-family: var(--font-mono); color: var(--color-info);">${alert.sourceFile}</td>
      <td style="color: var(--color-muted); font-size: 0.8rem; line-height: 1.4;">
        <strong style="color: #fff; display: block; margin-bottom: 2px;">Resolution Guidance:</strong>
        ${alert.resolution}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Helper to resolve storage ports with breakout support for NVMe (NS224) shelves
function resolveStoragePorts(state, shelfType, totalShelvesCount) {
  const profile = getPlatformProfile(state.version.model);
  const pDef = profile.ports || { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], san: ["0e", "0f"], storage: ["0a", "0b"] };
  const onboardStoragePorts = pDef.storage || ["0a", "0b"];
  const hbaStoragePorts = [];
  const addedCards = state.expansionCards || [];
  addedCards.forEach(c => {
    const cSpec = EXP_CARDS_CATALOG[c.cardKey];
    if (cSpec && cSpec.type === "storage") {
      const dynamicPorts = getCardPorts(c.cardKey, c.slot);
      dynamicPorts.forEach(p => hbaStoragePorts.push(p));
    }
  });
  let ports = [...onboardStoragePorts, ...hbaStoragePorts];

  // Apply breakout logic for NVMe shelves (NS224) if ports are exhausted
  const isNVMe = shelfType && shelfType.toLowerCase().includes("ns224");
  const stackLimit = isNVMe ? 1 : 4;
  const numStacks = Math.ceil(totalShelvesCount / stackLimit);
  const portsNeeded = numStacks * 2;

  if (isNVMe && ports.length < portsNeeded) {
    const breakoutPorts = [];
    const channelsCount = portsNeeded > ports.length * 2 ? 4 : 2;
    for (let c = 1; c <= channelsCount; c++) {
      ports.forEach(p => {
        const lowerPort = p.toLowerCase();
        const isBreakoutCapable = lowerPort.startsWith("e") || lowerPort.startsWith("0");
        if (isBreakoutCapable) {
          breakoutPorts.push(`${p}.${c}`);
        } else {
          if (c === 1) {
            breakoutPorts.push(p);
          }
        }
      });
    }
    return breakoutPorts;
  }
  return ports;
}

function getShelfHeight(model) {
  if (!model) return 50;
  const m = model.toLowerCase();
  if (m.includes("ds460c")) return 90;
  return 50;
}

function getShelfVisualSVG(shelfObj, x, y, width, height, isProposed) {
  const model = (shelfObj.model || "").toLowerCase();
  const borderStroke = isProposed ? "var(--color-primary)" : "rgba(255,255,255,0.15)";
  const borderStrokeWidth = isProposed ? 2 : 1;
  const opacity = isProposed ? 1 : 0.95;
  const isNarrow = width < 300;

  let html = `<!-- Shelf Visual: ${shelfObj.model} -->`;
  
  if (model.includes("ds460c")) {
    // 4U 60-Drive Shelf (Thick, drawer-based)
    html += `
      <rect class="visual-shelf-bg" x="${x}" y="${y}" width="${width}" height="${height}" fill="#1e293b" stroke="${borderStroke}" stroke-width="${borderStrokeWidth}" rx="4" opacity="${opacity}"/>
      <!-- Side Handles (4U Rack mount ears) -->
      <rect x="${x}" y="${y}" width="6" height="${height}" fill="#475569" rx="1"/>
      <rect x="${x + width - 6}" y="${y}" width="6" height="${height}" fill="#475569" rx="1"/>
      <circle cx="${x + 3}" cy="${y + 15}" r="1.5" fill="#94a3b8"/>
      <circle cx="${x + 3}" cy="${y + height - 15}" r="1.5" fill="#94a3b8"/>
      <circle cx="${x + width - 3}" cy="${y + 15}" r="1.5" fill="#94a3b8"/>
      <circle cx="${x + width - 3}" cy="${y + height - 15}" r="1.5" fill="#94a3b8"/>
    `;
    
    // Draw 5 drawer fronts
    for (let r = 0; r < 5; r++) {
      const ry = y + 6 + r * 16;
      html += `
        <rect x="${x + 10}" y="${ry}" width="${width - 20}" height="13" fill="#0f172a" stroke="#334155" rx="1"/>
        <line x1="${x + 14}" y1="${ry + 6}" x2="${x + 20}" y2="${ry + 6}" stroke="#475569" stroke-width="1.2"/> <!-- left latch -->
        <line x1="${x + width - 20}" y1="${ry + 6}" x2="${x + width - 14}" y2="${ry + 6}" stroke="#475569" stroke-width="1.2"/> <!-- right latch -->
      `;
      
      // Draw tiny drive slot indicators inside drawer
      const maxDisksRow = 12;
      const tDiskW = Math.floor((width - 50) / maxDisksRow) - 2;
      const tDiskXStart = x + 25;
      
      for (let c = 0; c < maxDisksRow; c++) {
        const tdx = tDiskXStart + c * (tDiskW + 2);
        const diskIdx = r * 12 + c;
        const curDisk = (shelfObj.disks || []).find(d => d.slot === diskIdx);
        let dColor = "#1e293b";
        if (curDisk) {
          dColor = curDisk.type.toLowerCase().includes("ssd") ? "#0284c7" : "#d97706";
        }
        html += `<rect x="${tdx}" y="${ry + 2}" width="${tDiskW}" height="9" fill="${dColor}" rx="0.5"/>`;
      }
    }
    
    // Labels overlay
    const labelFontSize = isNarrow ? 7 : 8.5;
    html += `
      <rect x="${x + 12}" y="${y + height - 18}" width="${isNarrow ? 120 : 180}" height="14" fill="rgba(15,23,42,0.85)" rx="2"/>
      <text x="${x + 16}" y="${y + height - 8}" fill="#fff" font-size="${labelFontSize}" font-weight="700">${shelfObj.model.toUpperCase()} (4U 60-Bay)</text>
    `;
    
  } else if (model.includes("ds212c")) {
    // 2U 12-Drive LFF Shelf (horizontal drawers)
    html += `
      <rect class="visual-shelf-bg" x="${x}" y="${y}" width="${width}" height="${height}" fill="#1e293b" stroke="${borderStroke}" stroke-width="${borderStrokeWidth}" rx="4" opacity="${opacity}"/>
      <!-- Symmetrical Bezel highlight -->
      <rect x="${x + 8}" y="${y + 4}" width="${width - 16}" height="${height - 8}" fill="#0f172a" rx="2"/>
    `;
    
    // Draw 12 large horizontal slots (4 columns of 3 rows)
    const cols = 4;
    const rows = 3;
    const slotW = Math.floor((width - 30) / cols) - 4;
    const slotH = Math.floor((height - 12) / rows) - 2;
    const lffXStart = x + 12;
    const lffYStart = y + 6;
    
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const slotIdx = r * cols + c;
        const curDisk = (shelfObj.disks || []).find(d => d.slot === slotIdx);
        const sx = lffXStart + c * (slotW + 4);
        const sy = lffYStart + r * (slotH + 2);
        
        let slotColor = "#1e293b";
        let strokeColor = "#334155";
        let labelText = `SLOT ${slotIdx}`;
        if (curDisk) {
          slotColor = "#334155";
          strokeColor = "#94a3b8";
          labelText = `${curDisk.sizeStr}`;
        }
        
        html += `
          <rect x="${sx}" y="${sy}" width="${slotW}" height="${slotH}" fill="${slotColor}" stroke="${strokeColor}" rx="1"/>
          <text x="${sx + slotW/2}" y="${sy + slotH - 3}" fill="#64748b" font-size="5" text-anchor="middle">${labelText}</text>
        `;
      }
    }
    
    // Labels overlay
    html += `
      <rect x="${x + 12}" y="${y + height - 16}" width="${isNarrow ? 90 : 130}" height="12" fill="rgba(15,23,42,0.9)" rx="2"/>
      <text x="${x + 16}" y="${y + height - 7}" fill="#fff" font-size="7" font-weight="700">${shelfObj.model.toUpperCase()} LFF</text>
    `;
    
  } else {
    // 2U 24-Drive SFF Shelf (NS224 NVMe or DS224C/DS2246 SAS)
    const isNVMe = model.includes("ns224");
    const activeColor = isNVMe ? "rgba(6,182,212,0.15)" : "rgba(245,158,11,0.1)";
    const highlightColor = isNVMe ? "var(--color-info)" : "var(--color-warning)";
    
    html += `
      <rect class="visual-shelf-bg" x="${x}" y="${y}" width="${width}" height="${height}" fill="#1e293b" stroke="${borderStroke}" stroke-width="${borderStrokeWidth}" rx="4" opacity="${opacity}"/>
      <!-- Outer Bezel accent -->
      <rect x="${x + 8}" y="${y + 4}" width="${width - 16}" height="${height - 8}" fill="#0f172a" rx="2"/>
    `;
    
    // Draw 24 SFF vertical slots in the middle
    const maxDisks = 24;
    const diskWidth = isNarrow ? 3 : 6;
    const diskHeight = 32;
    const diskXStart = isNarrow ? x + 55 : x + 180;
    const diskGap = isNarrow ? 2 : 4;
    const dy = y + 9;
    
    for (let d = 0; d < maxDisks; d++) {
      const diskX = diskXStart + d * (diskWidth + diskGap);
      const curDisk = (shelfObj.disks || []).find(disk => disk.slot === d);
      
      let dColor = "#1e293b";
      let strokeColor = "#334155";
      
      if (curDisk) {
        dColor = isNVMe ? "#0284c7" : "#d97706"; // NVMe Blue or SAS Amber
        strokeColor = isNVMe ? "#38bdf8" : "#fbbf24";
      }
      
      html += `
        <rect x="${diskX}" y="${dy}" width="${diskWidth}" height="${diskHeight}" fill="${dColor}" stroke="${strokeColor}" rx="0.5"/>
      `;
    }
    
    // Labels overlay
    html += `
      <text x="${x + 18}" y="${y + 22}" fill="#fff" font-size="10" font-weight="700">${shelfObj.model.toUpperCase()}</text>
      <text x="${x + 18}" y="${y + 34}" fill="var(--color-muted)" font-size="7">ID: ${shelfObj.id} | Fw: ${shelfObj.firmware}</text>
    `;
  }
  
  return html;
}

// Draw interactive SVG cabling diagram with MetroCluster support
function drawCablingTopology(state, targetFrameId, proposedShelf = null) {
  const container = document.getElementById(targetFrameId);
  if (!container) return;
  container.innerHTML = "";

  const isMetroCluster = state.metrocluster && state.metrocluster !== "none";
  const proposedShelvesArray = proposedShelf ? (Array.isArray(proposedShelf) ? proposedShelf : [proposedShelf]) : [];
  const totalShelvesCount = state.shelves.length + proposedShelvesArray.length;
  
  const width = isMetroCluster ? 750 : 650;

  // Group shelves into stacks based on loop limits (1 for NVMe, 4 for SAS)
  const shelfType = (totalShelvesCount > 0) ? (proposedShelvesArray.length > 0 ? proposedShelvesArray[0].model.toLowerCase() : state.shelves[0].model.toLowerCase()) : "ns224";
  const stackLimit = shelfType.includes("ns224") ? 1 : 4;
  const stacks = [];
  let currentStack = [];
  
  for (let i = 0; i < totalShelvesCount; i++) {
    const isProposed = i >= state.shelves.length;
    const shelfObj = isProposed ? proposedShelvesArray[i - state.shelves.length] : state.shelves[i];
    currentStack.push({ index: i, obj: shelfObj, isProposed });
    if (currentStack.length === stackLimit || i === totalShelvesCount - 1) {
      stacks.push(currentStack);
      currentStack = [];
    }
  }

  let height = 480;
  if (!isMetroCluster) {
    const nodes = state.nodes || [];
    const haPairsCount = Math.floor(nodes.length / 2) || 1;
    let computedHeight = 110;
    for (let pIdx = 0; pIdx < haPairsCount; pIdx++) {
      const pairStacks = [];
      stacks.forEach((stack, idx) => {
        if (idx % haPairsCount === pIdx) pairStacks.push(stack);
      });
      const totalShelvesInPair = pairStacks.reduce((sum, s) => sum + s.length, 0);
      const pairShelvesHeight = totalShelvesInPair > 0 ? (totalShelvesInPair * 80 - 30) : 0;
      computedHeight += 150 + pairShelvesHeight + 70;
    }
    height = Math.max(480, computedHeight);
  } else {
    const nodesPerSite = Math.floor(state.nodes.length / 2) || 1;
    const shelfYStart = 10 + nodesPerSite * 90 + 40;
    height = Math.max(400, shelfYStart + totalShelvesCount * 85 + 20);
  }
  
  let svgStr = `<svg class="cabling-graph" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">`;

  const profile = getPlatformProfile(state.version.model);
  const pDef = profile.ports || { cluster: ["e0a", "e0b"], data: ["e0c", "e0d"], san: ["0e", "0f"], storage: ["0a", "0b"] };

  // Gather all available storage ports with breakout support
  const allStoragePortsA = resolveStoragePorts(state, shelfType, totalShelvesCount);
  const allStoragePortsB = [...allStoragePortsA];

  if (isMetroCluster) {
    // --- METROCLUSTER DUAL SITE DRAWING ---
    const mcType = state.metrocluster.toUpperCase();
    const nodesPerSite = Math.floor(state.nodes.length / 2) || 1;
    const switchY = 10 + (nodesPerSite * 90) / 2 - 12.5;
    const shelfYStart = 10 + nodesPerSite * 90 + 40;
    
    // Draw central DR distance link
    svgStr += `
      <line x1="375" y1="0" x2="375" y2="${shelfYStart - 15}" stroke="rgba(255,255,255,0.15)" stroke-width="2" stroke-dasharray="8 4"/>
      <rect x="300" y="${shelfYStart - 35}" width="150" height="25" fill="#111827" stroke="rgba(255,255,255,0.1)" rx="3"/>
      <text x="375" y="${shelfYStart - 19}" fill="var(--color-muted)" font-size="9" text-anchor="middle" font-weight="700">DR Sync Link (ISL Fabrics)</text>
    `;

    // Draw central switches
    svgStr += `
      <rect class="visual-node" x="310" y="${switchY}" width="50" height="25" rx="3" fill="#111827" stroke="rgba(255,255,255,0.2)"/>
      <text x="335" y="${switchY + 15}" fill="var(--color-info)" font-size="7" text-anchor="middle" font-weight="700">SW-A (${mcType})</text>
      
      <rect class="visual-node" x="390" y="${switchY}" width="50" height="25" rx="3" fill="#111827" stroke="rgba(255,255,255,0.2)"/>
      <text x="415" y="${switchY + 15}" fill="var(--color-info)" font-size="7" text-anchor="middle" font-weight="700">SW-B (${mcType})</text>
      
      <line x1="360" y1="${switchY + 12}" x2="390" y2="${switchY + 12}" stroke="var(--color-info)" stroke-width="2" stroke-dasharray="2 1"/>
    `;

    // Draw the nodes for each site
    for (let k = 0; k < nodesPerSite; k++) {
      const yNode = 10 + k * 90;
      const nodeA = state.nodes[2 * k] || { name: `node-${String.fromCharCode(97 + 2 * k)}`, serial: state.version.serial + (k > 0 ? String.fromCharCode(65 + 2 * k) : "") };
      const nodeB = state.nodes[2 * k + 1] || { name: `node-${String.fromCharCode(97 + 2 * k + 1)}`, serial: state.version.serial + String.fromCharCode(65 + 2 * k + 1) };
      
      const nodeAName = nodeA.name;
      const nodeBName = nodeB.name;
      const serialA = nodeA.serial;
      const serialB = nodeB.serial;

      // Draw Controller A (Site A)
      svgStr += `
        <rect class="visual-node" x="15" y="${yNode}" width="260" height="80" rx="4" />
        <text class="visual-node-label" x="145" y="${yNode + 18}">Site-A Node: ${nodeAName.toUpperCase()}</text>
        <text x="145" y="${yNode + 29}" fill="var(--color-muted)" font-size="7" text-anchor="middle">S/N: ${serialA}</text>
      `;

      // Controller A Cluster/Sync ports
      svgStr += `<rect x="20" y="${yNode + 40}" width="48" height="24" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx="2"/>`;
      svgStr += `<text x="44" y="${yNode + 37}" fill="var(--color-muted)" font-size="6" text-anchor="middle">Cluster/Sync</text>`;
      pDef.cluster.forEach((port, idx) => {
        const x = 24 + idx * 22;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${yNode + 44}" width="18" height="12" rx="1"/>
          <text x="${x + 9}" y="${yNode + 52}" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Controller A Data ports
      svgStr += `<rect x="95" y="${yNode + 40}" width="48" height="24" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx="2"/>`;
      svgStr += `<text x="119" y="${yNode + 37}" fill="var(--color-muted)" font-size="6" text-anchor="middle">Data Target</text>`;
      pDef.data.forEach((port, idx) => {
        const x = 99 + idx * 22;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${yNode + 44}" width="18" height="12" rx="1"/>
          <text x="${x + 9}" y="${yNode + 52}" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Controller A Storage ports (dynamic)
      const blockWidthA = Math.max(56, 8 + allStoragePortsA.length * 24);
      const boxXA = 265 - blockWidthA;
      svgStr += `<rect x="${boxXA}" y="${yNode + 40}" width="${blockWidthA}" height="24" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx="2"/>`;
      svgStr += `<text x="${boxXA + blockWidthA/2}" y="${yNode + 37}" fill="var(--color-info)" font-size="6" text-anchor="middle">Storage Loop</text>`;
      allStoragePortsA.forEach((port, idx) => {
        const x = boxXA + 4 + idx * 24;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${yNode + 44}" width="20" height="12" rx="1"/>
          <text x="${x + 10}" y="${yNode + 52}" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Draw Controller B (Site B)
      svgStr += `
        <rect class="visual-node" x="475" y="${yNode}" width="260" height="80" rx="4" />
        <text class="visual-node-label" x="605" y="${yNode + 18}">Site-B Node: ${nodeBName.toUpperCase()}</text>
        <text x="605" y="${yNode + 29}" fill="var(--color-muted)" font-size="7" text-anchor="middle">S/N: ${serialB}</text>
      `;

      // Controller B Storage ports (dynamic, placed left in Site B Controller)
      const blockWidthB = Math.max(56, 8 + allStoragePortsB.length * 24);
      const boxXB = 485;
      svgStr += `<rect x="${boxXB}" y="${yNode + 40}" width="${blockWidthB}" height="24" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx="2"/>`;
      svgStr += `<text x="${boxXB + blockWidthB/2}" y="${yNode + 37}" fill="var(--color-info)" font-size="6" text-anchor="middle">Storage Loop</text>`;
      allStoragePortsB.forEach((port, idx) => {
        const x = boxXB + 4 + idx * 24;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${yNode + 44}" width="20" height="12" rx="1"/>
          <text x="${x + 10}" y="${yNode + 52}" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Controller B Data ports
      svgStr += `<rect x="605" y="${yNode + 40}" width="48" height="24" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx="2"/>`;
      svgStr += `<text x="629" y="${yNode + 37}" fill="var(--color-muted)" font-size="6" text-anchor="middle">Data Target</text>`;
      pDef.data.forEach((port, idx) => {
        const x = 609 + idx * 22;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${yNode + 44}" width="18" height="12" rx="1"/>
          <text x="${x + 9}" y="${yNode + 52}" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Controller B Cluster/Sync ports
      svgStr += `<rect x="680" y="${yNode + 40}" width="48" height="24" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" rx="2"/>`;
      svgStr += `<text x="704" y="${yNode + 37}" fill="var(--color-muted)" font-size="6" text-anchor="middle">Cluster/Sync</text>`;
      pDef.cluster.forEach((port, idx) => {
        const x = 684 + idx * 22;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${yNode + 44}" width="18" height="12" rx="1"/>
          <text x="${x + 9}" y="${yNode + 52}" fill="#fff" font-size="6" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Peering ISL Switch Cables
      const portY = yNode + 44 + 6;
      svgStr += `<path d="M 33,${portY} C 33,${switchY + 20} 310,${switchY + 5} 310,${switchY + 5}" stroke="var(--color-primary)" fill="none" stroke-width="1.5"/>`;
      svgStr += `<path d="M 55,${portY} C 55,${switchY + 25} 310,${switchY + 10} 310,${switchY + 10}" stroke="var(--color-primary)" fill="none" stroke-width="1.5"/>`;
      svgStr += `<path d="M 693,${portY} C 693,${switchY + 25} 440,${switchY + 10} 440,${switchY + 10}" stroke="var(--color-primary)" fill="none" stroke-width="1.5"/>`;
      svgStr += `<path d="M 715,${portY} C 715,${switchY + 20} 440,${switchY + 5} 440,${switchY + 5}" stroke="var(--color-primary)" fill="none" stroke-width="1.5"/>`;
    }

    // Shelves stacked (MetroCluster)
    const shelfGap = 35;
    
    // Pre-calculate shelf y-positions for MetroCluster
    const shelfYPositions = [];
    let accY = shelfYStart;
    for (let idx = 0; idx < totalShelvesCount; idx++) {
      const isProposed = idx >= state.shelves.length;
      const shelfObj = isProposed ? proposedShelvesArray[idx - state.shelves.length] : state.shelves[idx];
      shelfYPositions.push(accY);
      accY += getShelfHeight(shelfObj.model) + shelfGap;
    }

    for (let sIdx = 0; sIdx < stacks.length; sIdx++) {
      const stack = stacks[sIdx];
      const isPortExhausted = (sIdx * 2 + 1) >= allStoragePortsA.length;
      
      for (let j = 0; j < stack.length; j++) {
        const shelfItem = stack[j];
        const i = shelfItem.index;
        const shelfObj = shelfItem.obj;
        const y = shelfYPositions[i];
        const shelfHeight = getShelfHeight(shelfObj.model);
        const cy = y + Math.floor(shelfHeight / 2);
        
        const isSinglePath = shelfObj.cabling && (shelfObj.cabling.toLowerCase().includes("single-path") || !shelfObj.cabling.toLowerCase().includes("multipath"));
        
        // Site A Shelf
        svgStr += getShelfVisualSVG(shelfObj, 15, y, 260, shelfHeight, shelfItem.isProposed);
        svgStr += `
          <!-- Site A Cable Ports (IN/OUT for IOM-A & IOM-B) -->
          <rect x="20" y="${cy - 12}" width="40" height="24" fill="rgba(6,182,212,0.15)" stroke="var(--color-info)" stroke-width="1" rx="2"/>
          <circle cx="30" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="30" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">IN</text>
          <circle cx="50" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="50" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">OUT</text>
          
          <rect x="230" y="${cy - 12}" width="40" height="24" fill="rgba(236,72,153,0.15)" stroke="var(--color-warning)" stroke-width="1" rx="2"/>
          <circle cx="240" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="240" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">IN</text>
          <circle cx="260" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="260" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">OUT</text>
        `;

        // Site B Shelf
        svgStr += getShelfVisualSVG(shelfObj, 475, y, 260, shelfHeight, shelfItem.isProposed);
        svgStr += `
          <!-- Site B Cable Ports (IN/OUT for IOM-A & IOM-B) -->
          <rect x="480" y="${cy - 12}" width="40" height="24" fill="rgba(6,182,212,0.15)" stroke="var(--color-info)" stroke-width="1" rx="2"/>
          <circle cx="490" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="490" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">IN</text>
          <circle cx="510" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="510" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">OUT</text>
          
          <rect x="690" y="${cy - 12}" width="40" height="24" fill="rgba(236,72,153,0.15)" stroke="var(--color-warning)" stroke-width="1" rx="2"/>
          <circle cx="700" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="700" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">IN</text>
          <circle cx="720" cy="${cy}" r="3.5" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="0.8"/>
          <text x="720" y="${cy + 8}" fill="var(--color-muted)" font-size="5" text-anchor="middle">OUT</text>
        `;

        // Daisy chains within the stack
        if (j > 0) {
          const prevIndex = stack[j-1].index;
          const prevY = shelfYPositions[prevIndex];
          const prevHeight = getShelfHeight(stack[j-1].obj.model);
          const prevCy = prevY + Math.floor(prevHeight / 2);
          
          // Site A Daisy Chains (OUT to IN)
          svgStr += `<path d="M 50,${prevCy} L 30,${cy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;
          svgStr += `<path d="M 260,${prevCy} L 240,${cy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;
          // Site B Daisy Chains (OUT to IN)
          svgStr += `<path d="M 510,${prevCy} L 490,${cy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;
          svgStr += `<path d="M 720,${prevCy} L 700,${cy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;
        }

        // Local & Sync Mirror replication connections from/to controllers
        const blockWidthA = Math.max(56, 8 + allStoragePortsA.length * 24);
        const boxXA = 265 - blockWidthA;
        const blockWidthB = Math.max(56, 8 + allStoragePortsB.length * 24);
        const boxXB = 485;

        // 1. Outbound loops from first shelf in stack
        if (j === 0 && !isPortExhausted) {
          const k = sIdx % nodesPerSite;
          const yNode = 10 + k * 90;
          const localPortPairIdx = Math.floor(sIdx / nodesPerSite) * 2;
          const portY = yNode + 50;

          const pAX = boxXA + 14 + localPortPairIdx * 24;
          const pBX = boxXB + 14 + localPortPairIdx * 24;
          const repAX = boxXA + 14 + (localPortPairIdx + 1) * 24;
          const repBX = boxXB + 14 + (localPortPairIdx + 1) * 24;
          
          const replicationClass = isSinglePath ? "visual-cable singlepath" : "visual-cable multipath";
          const repColor = isSinglePath ? "var(--color-danger)" : "var(--color-success)";

          // Site A local loop outbound: Node A e0a/e1a -> Site A Shelf IOM-A IN
          svgStr += `<path d="M ${pAX},${portY} C ${pAX},${(portY + cy)/2} 30,${(portY + cy)/2} 30,${cy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;
          
          // Site B local loop outbound: Node B e0a/e1a -> Site B Shelf IOM-A IN
          svgStr += `<path d="M ${pBX},${portY} C ${pBX},${(portY + cy)/2} 490,${(portY + cy)/2} 490,${cy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;

          // Site A SyncMirror DR loop outbound: Node A e0b/e1b -> Site B Shelf IOM-B IN
          svgStr += `<path d="M ${repAX},${portY} C ${repAX},${(portY + cy)/2} 700,${(portY + cy)/2} 700,${cy}" class="${replicationClass}" stroke="${repColor}" fill="none" stroke-width="1.5"/>`;

          // Site B SyncMirror DR loop outbound: Node B e0b/e1b -> Site A Shelf IOM-B IN
          if (!isSinglePath) {
            svgStr += `<path d="M ${repBX},${portY} C ${repBX},${(portY + cy)/2} 240,${(portY + cy)/2} 240,${cy}" class="${replicationClass}" stroke="${repColor}" fill="none" stroke-width="1.5"/>`;
          } else {
            svgStr += `<path d="M ${repBX},${portY} C ${repBX},${yNode + 110} 380,105 380,120" class="${replicationClass}" stroke="var(--color-danger)" fill="none" stroke-dasharray="3 3" stroke-width="1.5"/>`;
            svgStr += `<circle cx="380" cy="120" r="4" fill="var(--color-danger)" />`;
            svgStr += `<text x="380" y="115" fill="var(--color-danger)" font-size="7" text-anchor="middle" font-weight="700">Sync Dead</text>`;
          }
        }

        // 2. Return loops from last shelf in stack
        if (j === stack.length - 1 && !isPortExhausted && !isSinglePath) {
          const k = sIdx % nodesPerSite;
          const yNode = 10 + k * 90;
          const localPortPairIdx = Math.floor(sIdx / nodesPerSite) * 2;
          const portY = yNode + 50;

          const rAX = boxXA + 14 + (localPortPairIdx + 1) * 24;
          const rBX = boxXB + 14 + (localPortPairIdx + 1) * 24;

          // Site A local loop return: Site A Shelf IOM-A OUT -> Node A e0b/e1b
          svgStr += `<path d="M 50,${cy} C 50,${(portY + cy)/2} ${rAX},${(portY + cy)/2} ${rAX},${portY}" class="visual-cable multipath" stroke="var(--color-warning)" fill="none" stroke-width="1.5"/>`;
          
          // Site B local loop return: Site B Shelf IOM-A OUT -> Node B e0b/e1b
          svgStr += `<path d="M 510,${cy} C 510,${(portY + cy)/2} ${rBX},${(portY + cy)/2} ${rBX},${portY}" class="visual-cable multipath" stroke="var(--color-warning)" fill="none" stroke-width="1.5"/>`;

          // Site A SyncMirror DR loop return: Site B Shelf IOM-B OUT -> Node A replication return
          svgStr += `<path d="M 720,${cy} C 720,${(portY + cy)/2} ${rAX},${(portY + cy)/2} ${rAX},${portY}" class="visual-cable multipath" stroke="var(--color-success)" fill="none" stroke-width="1.5"/>`;
          
          // Site B SyncMirror DR loop return: Site A Shelf IOM-B OUT -> Node B replication return
          svgStr += `<path d="M 260,${cy} C 260,${(portY + cy)/2} ${rBX},${(portY + cy)/2} ${rBX},${portY}" class="visual-cable multipath" stroke="var(--color-success)" fill="none" stroke-width="1.5"/>`;
        }
      }
    }

  } else {
    const nodes = state.nodes || [];
    const haPairsCount = Math.floor(nodes.length / 2) || 1;

    // Draw host network switches at the top (once)
    svgStr += `
      <!-- IP Data Network Switch -->
      <rect x="40" y="20" width="240" height="25" rx="3" fill="#111827" stroke="rgba(6, 182, 212, 0.3)" stroke-width="1.5" />
      <text x="160" y="36" fill="var(--color-info)" font-size="8" text-anchor="middle" font-weight="700">Client IP Data Switch</text>
      
      <!-- FC SAN Fabric Switch -->
      <rect x="370" y="20" width="240" height="25" rx="3" fill="#111827" stroke="rgba(236, 72, 153, 0.3)" stroke-width="1.5" />
      <text x="490" y="36" fill="var(--color-warning)" font-size="8" text-anchor="middle" font-weight="700">FC SAN Switch</text>
    `;

    const switches = state.switches || [];
    const clusterSwitches = switches.filter(s => s.role === "cluster-switch");
    if (clusterSwitches.length >= 2) {
      const csw1 = clusterSwitches[0];
      const csw2 = clusterSwitches[1];
      svgStr += `
        <!-- Cluster Network Switches -->
        <rect x="235" y="65" width="40" height="20" rx="2" fill="#111827" stroke="rgba(16, 185, 129, 0.5)" stroke-width="1.2" />
        <text x="255" y="75" fill="var(--color-success)" font-size="6" text-anchor="middle" font-weight="700">${csw1.name}</text>
        <text x="255" y="82" fill="var(--color-muted)" font-size="5" text-anchor="middle">Fw: ${csw1.version}</text>
        
        <rect x="375" y="65" width="40" height="20" rx="2" fill="#111827" stroke="rgba(16, 185, 129, 0.5)" stroke-width="1.2" />
        <text x="395" y="75" fill="var(--color-success)" font-size="6" text-anchor="middle" font-weight="700">${csw2.name}</text>
        <text x="395" y="82" fill="var(--color-muted)" font-size="5" text-anchor="middle">Fw: ${csw2.version}</text>
      `;
    }

    let currentY = 110;

    for (let pIdx = 0; pIdx < haPairsCount; pIdx++) {
      const nodeA = nodes[pIdx * 2] || { name: `node-${String.fromCharCode(97 + pIdx * 2)}`, serial: state.version.serial + (pIdx > 0 ? String.fromCharCode(65 + pIdx * 2) : "") };
      const nodeB = nodes[pIdx * 2 + 1] || { name: `node-${String.fromCharCode(97 + pIdx * 2 + 1)}`, serial: state.version.serial + String.fromCharCode(65 + pIdx * 2 + 1) };
      
      const nodeAName = nodeA.name;
      const nodeBName = nodeB.name;
      const serialA = nodeA.serial;
      const serialB = nodeB.serial;

      // Filter stacks belonging to this HA pair
      const pairStacks = [];
      const pairStackIndices = [];
      stacks.forEach((stack, idx) => {
        if (idx % haPairsCount === pIdx) {
          pairStacks.push(stack);
          pairStackIndices.push(idx);
        }
      });

      // Draw HA pair label
      svgStr += `
        <text x="325" y="${currentY - 10}" fill="#fff" font-size="9" font-weight="700" text-anchor="middle" style="letter-spacing: 1px;">HA PAIR ${pIdx + 1}: ${nodeAName.toUpperCase()} & ${nodeBName.toUpperCase()}</text>
      `;

      // Controller A Box
      svgStr += `
        <rect class="visual-node" x="20" y="${currentY}" width="280" height="95" rx="5" />
        <text class="visual-node-label" x="160" y="${currentY + 15}">Controller A: ${nodeAName}</text>
        <text x="160" y="${currentY + 28}" fill="var(--color-muted)" font-size="7" text-anchor="middle" font-family="var(--font-mono)">Serial: ${serialA}</text>
      `;

      // Draw ports inside Controller A
      svgStr += `<rect x="30" y="${currentY + 45}" width="40" height="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" rx="3"/>`;
      svgStr += `<text x="50" y="${currentY + 40}" fill="var(--color-muted)" font-size="7" text-anchor="middle">Cluster</text>`;
      pDef.cluster.forEach((port, idx) => {
        const x = 35 + idx * 18;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${currentY + 48}" width="14" height="12" rx="1"/>
          <text x="${x + 7}" y="${currentY + 56}" fill="#fff" font-size="6" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      svgStr += `<rect x="75" y="${currentY + 45}" width="40" height="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" rx="3"/>`;
      svgStr += `<text x="95" y="${currentY + 40}" fill="var(--color-muted)" font-size="7" text-anchor="middle">Data</text>`;
      pDef.data.forEach((port, idx) => {
        const x = 80 + idx * 18;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${currentY + 48}" width="14" height="12" rx="1"/>
          <text x="${x + 7}" y="${currentY + 56}" fill="#fff" font-size="6" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      const hasSAN = pDef.san && pDef.san.length > 0;
      svgStr += `<rect x="120" y="${currentY + 45}" width="40" height="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" rx="3"/>`;
      svgStr += `<text x="140" y="${currentY + 40}" fill="var(--color-muted)" font-size="7" text-anchor="middle">SAN FC</text>`;
      if (hasSAN) {
        pDef.san.forEach((port, idx) => {
          const x = 125 + idx * 18;
          const isSANLicensed = state.licenses.some(l => l.name === "FCP" && l.status === "active");
          const pClass = isSANLicensed ? "visual-port active" : "visual-port warning";
          svgStr += `
            <rect class="${pClass}" x="${x}" y="${currentY + 48}" width="14" height="12" rx="1"/>
            <text x="${x + 7}" y="${currentY + 56}" fill="#fff" font-size="6" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
          `;
        });
      } else {
        svgStr += `<text x="140" y="${currentY + 63}" fill="var(--color-muted)" font-size="6" text-anchor="middle">N/A</text>`;
      }

      // Node A storage box drawing (dynamic)
      const blockWidthA = Math.max(55, 7 + allStoragePortsA.length * 24);
      const boxXA = 290 - blockWidthA;
      svgStr += `<rect x="${boxXA}" y="${currentY + 45}" width="${blockWidthA}" height="30" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" rx="3"/>`;
      svgStr += `<text x="${boxXA + blockWidthA/2}" y="${currentY + 40}" fill="var(--color-info)" font-size="7" text-anchor="middle">Storage</text>`;
      allStoragePortsA.forEach((port, idx) => {
        const x = boxXA + 5 + idx * 24;
        svgStr += `
          <rect class="visual-port active" id="port-${nodeAName}-${port}" x="${x}" y="${currentY + 48}" width="20" height="14" rx="1"/>
          <text x="${x + 10}" y="${currentY + 57}" fill="#fff" font-size="7" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // Controller B Box
      svgStr += `
        <rect class="visual-node" x="350" y="${currentY}" width="280" height="95" rx="5" />
        <text class="visual-node-label" x="490" y="${currentY + 15}">Controller B: ${nodeBName}</text>
        <text x="490" y="${currentY + 28}" fill="var(--color-muted)" font-size="7" text-anchor="middle" font-family="var(--font-mono)">Serial: ${serialB}</text>
      `;

      svgStr += `<rect x="360" y="${currentY + 45}" width="40" height="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" rx="3"/>`;
      svgStr += `<text x="380" y="${currentY + 40}" fill="var(--color-muted)" font-size="7" text-anchor="middle">Cluster</text>`;
      pDef.cluster.forEach((port, idx) => {
        const x = 365 + idx * 18;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${currentY + 48}" width="14" height="12" rx="1"/>
          <text x="${x + 7}" y="${currentY + 56}" fill="#fff" font-size="6" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      svgStr += `<rect x="405" y="${currentY + 45}" width="40" height="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" rx="3"/>`;
      svgStr += `<text x="425" y="${currentY + 40}" fill="var(--color-muted)" font-size="7" text-anchor="middle">Data</text>`;
      pDef.data.forEach((port, idx) => {
        const x = 410 + idx * 18;
        svgStr += `
          <rect class="visual-port active" x="${x}" y="${currentY + 48}" width="14" height="12" rx="1"/>
          <text x="${x + 7}" y="${currentY + 56}" fill="#fff" font-size="6" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      svgStr += `<rect x="450" y="${currentY + 45}" width="40" height="30" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.1)" rx="3"/>`;
      svgStr += `<text x="470" y="${currentY + 40}" fill="var(--color-muted)" font-size="7" text-anchor="middle">SAN FC</text>`;
      if (hasSAN) {
        pDef.san.forEach((port, idx) => {
          const x = 455 + idx * 18;
          const isSANLicensed = state.licenses.some(l => l.name === "FCP" && l.status === "active");
          const pClass = isSANLicensed ? "visual-port active" : "visual-port warning";
          svgStr += `
            <rect class="${pClass}" x="${x}" y="${currentY + 48}" width="14" height="12" rx="1"/>
            <text x="${x + 7}" y="${currentY + 56}" fill="#fff" font-size="6" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
          `;
        });
      } else {
        svgStr += `<text x="470" y="${currentY + 63}" fill="var(--color-muted)" font-size="6" text-anchor="middle">N/A</text>`;
      }

      // Node B storage box drawing (dynamic)
      const blockWidthB = Math.max(55, 7 + allStoragePortsB.length * 24);
      const boxXB = 620 - blockWidthB;
      svgStr += `<rect x="${boxXB}" y="${currentY + 45}" width="${blockWidthB}" height="30" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.2)" rx="3"/>`;
      svgStr += `<text x="${boxXB + blockWidthB/2}" y="${currentY + 40}" fill="var(--color-info)" font-size="7" text-anchor="middle">Storage</text>`;
      allStoragePortsB.forEach((port, idx) => {
        const x = boxXB + 5 + idx * 24;
        svgStr += `
          <rect class="visual-port active" id="port-${nodeBName}-${port}" x="${x}" y="${currentY + 48}" width="20" height="14" rx="1"/>
          <text x="${x + 10}" y="${currentY + 57}" fill="#fff" font-size="7" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">${port}</text>
        `;
      });

      // --- Connect Cluster Ports to Switches ---
      if (clusterSwitches.length >= 2) {
        svgStr += `<path d="M 42,${currentY + 48} C 42,${currentY - 20} 245,${currentY - 20} 245,85" stroke="var(--color-success)" stroke-width="1.2" fill="none" title="${nodeAName} e0a -> CSW-BES-01"/>`;
        svgStr += `<path d="M 372,${currentY + 48} C 372,${currentY - 20} 265,${currentY - 20} 265,85" stroke="var(--color-success)" stroke-width="1.2" fill="none" title="${nodeBName} e0a -> CSW-BES-01"/>`;
        svgStr += `<path d="M 60,${currentY + 48} C 60,${currentY - 15} 385,${currentY - 15} 385,85" stroke="var(--color-success)" stroke-width="1.2" fill="none" title="${nodeAName} e0b -> CSW-BES-02"/>`;
        svgStr += `<path d="M 390,${currentY + 48} C 390,${currentY - 15} 405,${currentY - 15} 405,85" stroke="var(--color-success)" stroke-width="1.2" fill="none" title="${nodeBName} e0b -> CSW-BES-02"/>`;
      } else {
        svgStr += `<path d="M 42,${currentY + 48} C 42,${currentY - 10} 372,${currentY - 10} 372,${currentY + 48}" stroke="var(--color-primary)" stroke-width="1.5" fill="none" title="Cluster Path 1"/>`;
        svgStr += `<path d="M 60,${currentY + 48} C 60,${currentY - 5} 390,${currentY - 5} 390,${currentY + 48}" stroke="var(--color-primary)" stroke-width="1.5" fill="none" title="Cluster Path 2"/>`;
      }

      // --- Connect Client IP Data Cables to switch ---
      svgStr += `<path d="M 87,${currentY + 48} C 87,${currentY - 30} 100,70 100,45" stroke="var(--color-info)" stroke-width="1.2" stroke-dasharray="1 1" fill="none" />`;
      svgStr += `<path d="M 105,${currentY + 48} C 105,${currentY - 30} 120,70 120,45" stroke="var(--color-info)" stroke-width="1.2" stroke-dasharray="1 1" fill="none" />`;
      svgStr += `<path d="M 417,${currentY + 48} C 417,${currentY - 30} 200,70 200,45" stroke="var(--color-info)" stroke-width="1.2" stroke-dasharray="1 1" fill="none" />`;
      svgStr += `<path d="M 435,${currentY + 48} C 435,${currentY - 30} 220,70 220,45" stroke="var(--color-info)" stroke-width="1.2" stroke-dasharray="1 1" fill="none" />`;

      // --- Connect SAN Target Cables to switch ---
      if (hasSAN) {
        svgStr += `<path d="M 132,${currentY + 48} C 132,${currentY - 30} 410,70 410,45" stroke="var(--color-warning)" stroke-width="1.2" stroke-dasharray="2 1" fill="none" />`;
        svgStr += `<path d="M 150,${currentY + 48} C 150,${currentY - 30} 430,70 430,45" stroke="var(--color-warning)" stroke-width="1.2" stroke-dasharray="2 1" fill="none" />`;
        svgStr += `<path d="M 462,${currentY + 48} C 462,${currentY - 30} 510,70 510,45" stroke="var(--color-warning)" stroke-width="1.2" stroke-dasharray="2 1" fill="none" />`;
        svgStr += `<path d="M 480,${currentY + 48} C 480,${currentY - 30} 530,70 530,45" stroke="var(--color-warning)" stroke-width="1.2" stroke-dasharray="2 1" fill="none" />`;
      }

      // Draw Shelves for this HA pair stacked below (non-MetroCluster)
      const shelfYStart = currentY + 150;
      const shelfGap = 30;

      // Pre-calculate shelf y-positions for this HA pair
      const shelfYPositionsInPair = [];
      let accY = shelfYStart;
      pairStacks.forEach((stack) => {
        stack.forEach((shelfItem) => {
          shelfYPositionsInPair.push(accY);
          accY += getShelfHeight(shelfItem.obj.model) + shelfGap;
        });
      });

      pairStacks.forEach((stack, pairStackIdx) => {
        const stackGlobalIdx = pairStackIndices[pairStackIdx];
        
        // Port indexes on our own HA pair controllers
        const isPortExhausted = (pairStackIdx * 2 + 1) >= allStoragePortsA.length;
        const pAIdx = Math.min(pairStackIdx * 2, allStoragePortsA.length - 2);
        const rAIdx = Math.min(pairStackIdx * 2 + 1, allStoragePortsA.length - 1);
        const pBIdx = Math.min(pairStackIdx * 2, allStoragePortsB.length - 2);
        const rBIdx = Math.min(pairStackIdx * 2 + 1, allStoragePortsB.length - 1);

        const pAX = boxXA + 5 + pAIdx * 24 + 10;
        const rAX = boxXA + 5 + rAIdx * 24 + 10;
        const pBX = boxXB + 5 + pBIdx * 24 + 10;
        const rBX = boxXB + 5 + rBIdx * 24 + 10;

        for (let j = 0; j < stack.length; j++) {
          const shelfItem = stack[j];
          const shelfObj = shelfItem.obj;
          
          let precedingShelvesCount = 0;
          for (let prevStackIdx = 0; prevStackIdx < pairStackIdx; prevStackIdx++) {
            precedingShelvesCount += pairStacks[prevStackIdx].length;
          }
          const shelfIdxInPair = precedingShelvesCount + j;
          const y = shelfYPositionsInPair[shelfIdxInPair];
          const shelfHeight = getShelfHeight(shelfObj.model);
          const iomY = y + Math.floor((shelfHeight - 30) / 2);
          const iomCy = iomY + 15;

          // Draw dynamic high-fidelity shelf visual
          svgStr += getShelfVisualSVG(shelfObj, 60, y, 530, shelfHeight, shelfItem.isProposed);

          // Draw cabling connector boxes overlay on top of high-fidelity bezel
          svgStr += `
            <!-- IOM-A port block -->
            <rect x="70" y="${iomY}" width="45" height="30" fill="rgba(6,182,212,0.2)" stroke="var(--color-info)" stroke-width="1.2" rx="2"/>
            <text x="92.5" y="${iomY + 10}" fill="var(--color-info)" font-size="7.5" text-anchor="middle" font-weight="700">IOM-A</text>
            <circle cx="80" cy="${iomCy}" r="4" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="1"/>
            <text x="80" y="${iomCy + 9}" fill="var(--color-muted)" font-size="6" text-anchor="middle">IN</text>
            <circle cx="105" cy="${iomCy}" r="4" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="1"/>
            <text x="105" y="${iomCy + 9}" fill="var(--color-muted)" font-size="6" text-anchor="middle">OUT</text>
          `;

          svgStr += `
            <!-- IOM-B port block -->
            <rect x="535" y="${iomY}" width="45" height="30" fill="rgba(236,72,153,0.2)" stroke="var(--color-warning)" stroke-width="1.2" rx="2"/>
            <text x="557.5" y="${iomY + 10}" fill="var(--color-warning)" font-size="7.5" text-anchor="middle" font-weight="700">IOM-B</text>
            <circle cx="545" cy="${iomCy}" r="4" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="1"/>
            <text x="545" y="${iomCy + 9}" fill="var(--color-muted)" font-size="6" text-anchor="middle">IN</text>
            <circle cx="570" cy="${iomCy}" r="4" fill="rgba(255,255,255,0.4)" stroke="#fff" stroke-width="1"/>
            <text x="570" y="${iomCy + 9}" fill="var(--color-muted)" font-size="6" text-anchor="middle">OUT</text>
          `;

          // Cabling connections
          const isSinglePath = shelfObj.cabling && (shelfObj.cabling.toLowerCase().includes("single-path") || !shelfObj.cabling.toLowerCase().includes("multipath"));
          const cableClassA = shelfItem.isProposed ? "visual-cable proposed" : "visual-cable multipath";
          const cableClassB = shelfItem.isProposed ? "visual-cable proposed" : (isSinglePath ? "visual-cable singlepath" : "visual-cable multipath");

          // 1. Primary path A
          const srcY = currentY + 62;
          if (j === 0) {
            if (isPortExhausted) {
              svgStr += `<path d="M 80,${iomCy} C 80,${y - 20} 100,${y - 30} 120,${y - 35}" stroke="var(--color-danger)" stroke-width="1.5" stroke-dasharray="3 3" fill="none"/>`;
              svgStr += `<circle cx="120" cy="${y - 35}" r="4" fill="var(--color-danger)" />`;
              svgStr += `<text x="120" y="${y - 40}" fill="var(--color-danger)" font-size="7" font-weight="700">No Storage Port</text>`;
            } else {
              svgStr += `<path d="M ${pAX},${srcY} C ${pAX},${currentY + 100} 80,${currentY + 120} 80,${iomCy}" class="${cableClassA}" stroke="var(--color-info)" fill="none" stroke-width="2"/>`;
            }
          } else {
            const prevShelfIdx = shelfIdxInPair - 1;
            const prevY = shelfYPositionsInPair[prevShelfIdx];
            const prevHeight = getShelfHeight(stack[j-1].obj.model);
            const prevCy = prevY + Math.floor((prevHeight - 30) / 2) + 15;
            svgStr += `<path d="M 105,${prevCy} C 120,${prevCy + 20} 60,${iomY} 80,${iomCy}" class="${cableClassA}" stroke="var(--color-info)" fill="none" stroke-dasharray="2 1" stroke-width="1.5"/>`;
          }
          
          // 2. Primary path B
          if (j === 0) {
            if (isPortExhausted) {
              svgStr += `<circle cx="545" cy="${iomCy}" r="6" fill="var(--color-danger)" />`;
              svgStr += `<text x="545" y="${iomCy + 3}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle">!</text>`;
            } else if (!isSinglePath || shelfItem.isProposed) {
              svgStr += `<path d="M ${pBX},${srcY} C ${pBX},${currentY + 100} 545,${currentY + 120} 545,${iomCy}" class="${cableClassB}" stroke="var(--color-warning)" fill="none" stroke-width="2"/>`;
            } else {
              svgStr += `<path d="M ${pBX},${srcY} C ${pBX},${currentY + 100} 470,${currentY + 110} 470,${currentY + 130}" class="${cableClassB}" stroke="var(--color-danger)" fill="none" stroke-dasharray="3 3" stroke-width="1.5"/>`;
              svgStr += `<circle cx="470" cy="${currentY + 130}" r="5" fill="var(--color-danger)" />`;
              svgStr += `<text x="470" y="${currentY + 127}" fill="var(--color-danger)" font-size="8" font-weight="700" text-anchor="middle">SPOF Link Dead</text>`;
              svgStr += `<circle cx="545" cy="${iomCy}" r="6" fill="var(--color-danger)" />`;
              svgStr += `<text x="545" y="${iomCy + 3}" fill="#fff" font-size="8" font-weight="700" text-anchor="middle">!</text>`;
            }
          } else {
            const prevShelfIdx = shelfIdxInPair - 1;
            const prevY = shelfYPositionsInPair[prevShelfIdx];
            const prevHeight = getShelfHeight(stack[j-1].obj.model);
            const prevCy = prevY + Math.floor((prevHeight - 30) / 2) + 15;
            if (!isSinglePath || shelfItem.isProposed) {
              svgStr += `<path d="M 570,${prevCy} C 590,${prevCy + 20} 520,${iomY} 545,${iomCy}" class="${cableClassB}" stroke="var(--color-warning)" fill="none" stroke-dasharray="2 1" stroke-width="1.5"/>`;
            }
          }
          
          // 3. Return path A & B
          if (j === stack.length - 1 && (!isSinglePath || shelfItem.isProposed)) {
            if (!isPortExhausted) {
              svgStr += `<path d="M ${rAX},${srcY} C ${rAX},${currentY + 120} 590,${currentY + 120} 570,${iomCy}" class="visual-cable multipath" stroke="var(--color-warning)" fill="none" stroke-width="1.5"/>`;
              svgStr += `<path d="M ${rBX},${srcY} C ${rBX},${currentY + 120} 120,${currentY + 120} 105,${iomCy}" class="visual-cable multipath" stroke="var(--color-info)" fill="none" stroke-width="1.5"/>`;
            }
          }
        }
      });

      let pairShelvesHeight = 0;
      pairStacks.forEach(stack => {
        stack.forEach(shelfItem => {
          pairShelvesHeight += getShelfHeight(shelfItem.obj.model) + shelfGap;
        });
      });
      if (pairShelvesHeight > 0) {
        pairShelvesHeight -= shelfGap;
      }
      
      currentY += 150 + pairShelvesHeight + 70;
    }
  }

  svgStr += `</svg>`;
  container.innerHTML = svgStr;
}

function renderStorageInventory(state) {
  const container = document.getElementById("storage-inventory-content");
  if (!container) return;

  if (!state.shelves || state.shelves.length === 0) {
    container.innerHTML = `<div style="color: var(--color-muted); font-size: 0.85rem; padding: 0.5rem 0;">No physical shelves or disks detected.</div>`;
    return;
  }

  let html = "";
  
  state.shelves.forEach((shelf, index) => {
    const diskGroups = {};
    const disks = shelf.disks || [];
    disks.forEach(d => {
      const key = `${d.model}_${d.sizeStr}_${d.type}_${d.firmware || "NA01"}`;
      if (!diskGroups[key]) {
        diskGroups[key] = {
          model: d.model,
          sizeStr: d.sizeStr,
          type: d.type,
          firmware: d.firmware || "NA01",
          count: 0
        };
      }
      diskGroups[key].count++;
    });

    const isSPOF = shelf.cabling && (shelf.cabling.toLowerCase().includes("single-path") || !shelf.cabling.toLowerCase().includes("multipath"));
    const cablingBadge = isSPOF 
      ? `<span class="status-badge critical" style="padding: 2px 6px; font-size: 0.7rem;">SPOF</span>`
      : `<span class="status-badge compliant" style="padding: 2px 6px; font-size: 0.7rem;">Multipath</span>`;

    html += `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
          <div>
            <strong style="color: #fff; font-size: 0.88rem;">Shelf ${shelf.id || index + 1}</strong> 
            <span style="color: var(--color-muted); font-size: 0.8rem; margin-left: 6px;">[Model: ${shelf.model || "Unknown"}, S/N: ${shelf.serial || "N/A"}]</span>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            <span style="font-size: 0.75rem; color: var(--color-muted);">Fw: ${shelf.firmware || "N/A"}</span>
            ${cablingBadge}
          </div>
        </div>
        <div style="font-size: 0.82rem; color: #d1d5db; line-height: 1.5;">
    `;

    if (disks.length === 0) {
      html += `<div style="color: var(--color-muted); font-style: italic;">No disks installed.</div>`;
    } else {
      html += `<ul style="margin: 0; padding-left: 1.1rem; color: #e5e7eb;">`;
      Object.values(diskGroups).forEach(group => {
        let mediaBadgeColor = "#3b82f6"; // default SAS SSD
        if (group.type.toLowerCase().includes("nvme") || group.model.toLowerCase().includes("nvme") || group.type.toLowerCase().includes("ssd")) {
          mediaBadgeColor = group.type.toLowerCase().includes("nvme") ? "#06b6d4" : "#3b82f6";
        } else {
          mediaBadgeColor = "#f59e0b"; // SAS HDD
        }
        
        html += `
          <li style="margin-bottom: 4px;">
            <strong>${group.count}x</strong> drives of 
            <span style="font-family: var(--font-mono); font-size: 0.75rem; background: rgba(255,255,255,0.05); padding: 1px 4px; border-radius: 2px; color: #9ca3af;">${group.model}</span> 
            (Size: <strong>${group.sizeStr}</strong>, Type: <span style="color: ${mediaBadgeColor}; font-weight: 500;">${group.type}</span>, Fw: <strong style="color: #34d399; font-family: var(--font-mono);">${group.firmware || "NA01"}</strong>)
          </li>
        `;
      });
      html += `</ul>`;
    }

    html += `
        </div>
      </div>
    `;
  });

  if (state.spares && state.spares.length > 0) {
    const sparesGroups = {};
    state.spares.forEach(spare => {
      if (spare.count <= 0) return;
      const key = `${spare.node}_${spare.type}_${spare.sizeStr}`;
      if (!sparesGroups[key]) {
        sparesGroups[key] = {
          node: spare.node,
          type: spare.type,
          sizeStr: spare.sizeStr,
          count: 0
        };
      }
      sparesGroups[key].count += spare.count;
    });

    let sparesList = "";
    Object.values(sparesGroups).forEach(spare => {
      sparesList += `<li style="margin-bottom: 4px;">Node <strong>${spare.node.toUpperCase()}</strong>: <strong>${spare.count}x</strong> ${spare.sizeStr} ${spare.type} spare reserves</li>`;
    });
    if (sparesList) {
      html += `
        <div style="margin-top: 1rem; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 0.75rem;">
          <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-info); font-size: 0.88rem; display: flex; align-items: center; gap: 0.25rem;">
            <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
            </svg>
            Active Spare Reserves Summary
          </h4>
          <ul style="margin: 0; padding-left: 1.1rem; font-size: 0.8rem; line-height: 1.5; color: #d1d5db;">
            ${sparesList}
          </ul>
        </div>
      `;
    }
  }

  container.innerHTML = html;
}

function renderAggregateInventory(state) {
  const container = document.getElementById("aggregate-inventory-content");
  if (!container) return;

  if (!state.aggregates || state.aggregates.length === 0) {
    container.innerHTML = `<div style="color: var(--color-muted); font-size: 0.85rem; padding: 0.5rem 0;">No active aggregate volumes detected.</div>`;
    return;
  }

  let html = "";
  state.aggregates.forEach(aggr => {
    const usableGB = aggr.usableGB || 0;
    const usedGB = aggr.usedGB || 0;
    const freeGB = aggr.freeGB || 0;
    const utilPercent = usableGB > 0 ? Math.round((usedGB / usableGB) * 100) : 0;
    
    let badgeClass = "compliant";
    if (utilPercent >= 85) badgeClass = "critical";
    else if (utilPercent >= 70) badgeClass = "warning";

    html += `
      <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 0.75rem; margin-bottom: 0.75rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem; margin-bottom: 0.5rem;">
          <div>
            <strong style="color: #fff; font-size: 0.88rem;">${aggr.name}</strong> 
            <span style="color: var(--color-muted); font-size: 0.8rem; margin-left: 6px;">[Node: ${aggr.node.toUpperCase()}, RAID: ${aggr.raidType.toUpperCase()}]</span>
          </div>
          <div>
            <span class="status-badge ${badgeClass}" style="padding: 2px 6px; font-size: 0.7rem;">${utilPercent}% Used</span>
          </div>
        </div>
        <div style="font-size: 0.82rem; color: #d1d5db; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span>Disks allocated: <strong>${aggr.disksCount}x</strong> ${formatGB(aggr.diskSizeGB)} ${aggr.diskType}</span>
            <span>Usable capacity: <strong>${formatGB(usableGB)}</strong></span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span style="color: var(--color-muted);">Used: ${formatGB(usedGB)}</span>
            <span style="color: var(--color-muted);">Free: ${formatGB(freeGB)}</span>
          </div>
          <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; overflow: hidden; margin-top: 6px;">
            <div style="width: ${utilPercent}%; height: 100%; background: ${utilPercent >= 85 ? 'var(--color-critical)' : utilPercent >= 70 ? 'var(--color-warning)' : 'var(--color-primary)'}; border-radius: 4px;"></div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function generateReportStorageInventoryHtml(state) {
  if (!state.shelves || state.shelves.length === 0) {
    return `<p style="color: var(--color-muted); font-size: 0.85rem;">No physical shelves or disks detected.</p>`;
  }

  let html = `
    <table class="compare-table" style="width: 100%; font-size:0.8rem; margin-bottom: 1.5rem;">
      <thead>
        <tr>
          <th style="width: 80px;">Shelf ID</th>
          <th style="width: 130px;">Shelf Model</th>
          <th style="width: 160px;">Serial / Cabling</th>
          <th style="width: 90px; text-align: center;">Firmware</th>
          <th>Disks Drive Inventory / Size details</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.shelves.forEach((shelf, index) => {
    const diskGroups = {};
    const disks = shelf.disks || [];
    disks.forEach(d => {
      const key = `${d.model}_${d.sizeStr}_${d.type}_${d.firmware || "NA01"}`;
      if (!diskGroups[key]) {
        diskGroups[key] = {
          model: d.model,
          sizeStr: d.sizeStr,
          type: d.type,
          firmware: d.firmware || "NA01",
          count: 0
        };
      }
      diskGroups[key].count++;
    });

    let diskItems = "";
    Object.values(diskGroups).forEach(group => {
      diskItems += `• <strong>${group.count}x</strong> ${group.sizeStr} ${group.type} (Model: ${group.model}, Fw: ${group.firmware})<br>`;
    });

    html += `
      <tr>
        <td style="font-weight:700; color:#fff;">Shelf ${shelf.id || index + 1}</td>
        <td>${shelf.model || "Unknown"}</td>
        <td>
          S/N: ${shelf.serial || "N/A"}<br>
          <span style="font-size:0.75rem; color:var(--color-muted);">${shelf.cabling || "N/A"}</span>
        </td>
        <td style="text-align: center;">${shelf.firmware || "N/A"}</td>
        <td style="line-height: 1.4; color: #e5e7eb;">${diskItems || "No disks installed"}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;
  return html;
}

function generateReportAggregateInventoryHtml(state) {
  if (!state.aggregates || state.aggregates.length === 0) {
    return `<p style="color: var(--color-muted); font-size: 0.85rem;">No active aggregate volumes detected.</p>`;
  }

  let html = `
    <table class="compare-table" style="width: 100%; font-size:0.8rem; margin-bottom: 1.5rem;">
      <thead>
        <tr>
          <th style="width: 140px;">Aggregate Name</th>
          <th style="width: 110px;">Node / RAID Type</th>
          <th style="width: 160px;">Disks Allocated</th>
          <th style="width: 100px; text-align: center;">Utilization</th>
          <th>Usable / Used / Free Capacity</th>
        </tr>
      </thead>
      <tbody>
  `;

  state.aggregates.forEach(aggr => {
    const usableGB = aggr.usableGB || 0;
    const usedGB = aggr.usedGB || 0;
    const freeGB = aggr.freeGB || 0;
    const utilPercent = usableGB > 0 ? Math.round((usedGB / usableGB) * 100) : 0;

    html += `
      <tr>
        <td style="font-weight:700; color:#fff;">${aggr.name}</td>
        <td>
          Node: ${aggr.node.toUpperCase()}<br>
          <span style="font-size:0.75rem; color:var(--color-muted);">${aggr.raidType.toUpperCase()}</span>
        </td>
        <td>
          <strong>${aggr.disksCount}x</strong> ${formatGB(aggr.diskSizeGB)} ${aggr.diskType}
        </td>
        <td style="text-align: center; font-weight: 600; color: ${utilPercent >= 85 ? 'var(--color-critical)' : 'inherit'};">
          ${utilPercent}%
        </td>
        <td>
          Usable: <strong>${formatGB(usableGB)}</strong><br>
          <span style="font-size:0.75rem; color:var(--color-muted);">Used: ${formatGB(usedGB)} | Free: ${formatGB(freeGB)}</span>
        </td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;
  return html;
}

// Generate port status audit list
function renderPortAuditTable(state, tableBodyId) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;
  tbody.innerHTML = "";

  const profile = getPlatformProfile(state.version.model);
  const isSANLicensed = state.licenses.some(l => l.name === "FCP" && l.status === "active");

  state.nodes.forEach(node => {
    if (!node.ports) return;
    node.ports.forEach(port => {
      let role = "Data (NFS/CIFS)";
      let speed = port.speed;
      let statusClass = port.status === "up" ? "compliant" : "critical";
      let statusText = port.status.toUpperCase();
      let recommendation = "Port healthy and online.";

      const portNameLower = port.name.toLowerCase();
      const speedLower = speed.toLowerCase();
      const typeLower = port.type ? port.type.toLowerCase() : "";

      if (typeLower.includes("cluster") || portNameLower === "e0a" || portNameLower === "e0b") {
        role = "Cluster Interconnect";
        recommendation = "Dedicated cluster port. Keep isolated for heartbeat traffic.";
      } else if (typeLower.includes("fc") || portNameLower === "0e" || portNameLower === "0f" || portNameLower === "0g" || portNameLower === "0h" || portNameLower === "0i" || portNameLower === "0j") {
        role = "Fibre Channel (FCP SAN)";
        if (!isSANLicensed) {
          recommendation = "FC port present, but FCP protocol unlicensed. SAN target is idle.";
          statusClass = "warning";
          statusText = "IDLE";
        } else {
          recommendation = "Active SAN target. Sized for blocks datastore traffic.";
        }
      } else if (typeLower.includes("storage") || portNameLower === "0a" || portNameLower === "0b" || portNameLower === "0c" || portNameLower === "0d" || portNameLower === "e0g" || portNameLower === "e0h") {
        role = "Back-End Disk Storage";
        recommendation = "Drives storage shelf loops. Maintain multipath connections.";
      }

      if (port.status === "down") {
        recommendation = "🛑 Port link offline. Verify switch fiber link or SFP parameters.";
      }

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="font-weight:600;">${node.name.toUpperCase()}</td>
        <td style="font-family:var(--font-mono); font-weight:700; color:var(--color-info);">${port.name}</td>
        <td>${role}</td>
        <td>${speed}</td>
        <td><span class="status-badge ${statusClass}" style="padding: 2px 6px; font-size:0.7rem;">${statusText}</span></td>
        <td style="font-size:0.78rem; color:var(--color-muted);">${recommendation}</td>
      `;
      tbody.appendChild(tr);
    });
  });
}

// Generate report ports rows
function generateReportPortsHtml() {
  if (!currentState) return "";
  const isSANLicensed = modeledState.licenses.some(l => l.name === "FCP" && l.status === "active");
  
  let html = "";
  modeledState.nodes.forEach(node => {
    if (!node.ports) return;
    node.ports.forEach(port => {
      let role = "Data (NFS/CIFS)";
      let speed = port.speed;
      let statusClass = port.status === "up" ? "compliant" : "critical";
      let statusText = port.status.toUpperCase();
      let recommendation = "Port healthy and online.";

      const portNameLower = port.name.toLowerCase();
      const typeLower = port.type ? port.type.toLowerCase() : "";

      if (typeLower.includes("cluster") || portNameLower === "e0a" || portNameLower === "e0b") {
        role = "Cluster Interconnect";
        recommendation = "Cluster interconnect link.";
      } else if (typeLower.includes("fc") || portNameLower === "0e" || portNameLower === "0f" || portNameLower === "0g" || portNameLower === "0h" || portNameLower === "0i" || portNameLower === "0j") {
        role = "Fibre Channel (FCP SAN)";
        if (!isSANLicensed) {
          recommendation = "SAN target port idle.";
          statusClass = "warning";
          statusText = "IDLE";
        } else {
          recommendation = "SAN block target active.";
        }
      } else if (typeLower.includes("storage") || portNameLower === "0a" || portNameLower === "0b" || portNameLower === "0c" || portNameLower === "0d" || portNameLower === "e0g" || portNameLower === "e0h") {
        role = "Back-End Disk Storage";
        recommendation = "SAS/RoCE disk storage loops.";
      }

      html += `
        <tr>
          <td style="font-weight:600;">${node.name.toUpperCase()}</td>
          <td style="font-family:var(--font-mono); font-weight:700;">${port.name}</td>
          <td>${role}</td>
          <td>${speed}</td>
          <td><span class="status-badge ${statusClass}">${statusText}</span></td>
          <td style="font-size:0.75rem; color:#d1d5db;">${recommendation}</td>
        </tr>
      `;
    });
  });
  return html;
}

// --- Step 3: Modeler inputs ---
function initStep3Inputs() {
  const ontapSelect = document.getElementById("target-ontap");
  ontapSelect.innerHTML = "";

  const curVer = currentState.version.ontap;
  const profile = getPlatformProfile(currentState.version.model);
  
  const targetOptions = ["9.7", "9.8", "9.9.1", "9.12.1", "9.13.1", "9.14.1", "9.15.1", "9.16.1", "9.17.1", "9.18.1", "9.19.1", "9.20.1"];
  
  targetOptions.forEach(opt => {
    const isDowngrade = compareVersions(opt, curVer) < 0 && !curVer.startsWith(opt);
    if (isDowngrade) return;

    const exceedsPlatformMax = compareVersions(opt, profile.maxOntap) > 0;
    if (exceedsPlatformMax) return;

    const isCurrent = curVer.startsWith(opt);
    const option = document.createElement("option");
    option.value = opt;
    option.textContent = opt + (isCurrent ? " (Current Active)" : "");
    option.selected = isCurrent;
    ontapSelect.appendChild(option);
  });

  ontapSelect.addEventListener("change", () => {
    updateUpgradeHopTimeline();
  });
  
  updateUpgradeHopTimeline();

  // Populate licenses
  const licForm = document.getElementById("license-list-form");
  licForm.innerHTML = "";

  const currentLicenses = {};
  currentState.licenses.forEach(lic => {
    currentLicenses[lic.name] = lic.status;
  });

  const licSuite = [
    { name: "Cluster", label: "Cluster Base Operating System" },
    { name: "NFS", label: "NFS Protocol Datastore Access" },
    { name: "CIFS", label: "CIFS/SMB Windows Shares Access" },
    { name: "FCP", label: "Fibre Channel Protocol (FCP) Block SAN" },
    { name: "iSCSI", label: "iSCSI IP-SAN Block Storage Access" },
    { name: "SnapMirror", label: "SnapMirror DR & Replication Services" },
    { name: "FlexClone", label: "FlexClone Space-Efficient Copies" },
    { name: "FabricPool", label: "FabricPool Cloud Storage Tiering" },
    { name: "MetroCluster", label: "MetroCluster Disaster Recovery License" }
  ];

  licSuite.forEach(lic => {
    const status = currentLicenses[lic.name] || "missing";
    const isActive = status === "active";
    const isExpired = status === "expired";
    const isSupportedLic = profile.supportedLicenses.includes(lic.name);
    
    let pillText = "Inactive";
    let pillClass = "warning";
    if (isActive) { pillText = "Active"; pillClass = "compliant"; }
    else if (isExpired) { pillText = "Expired"; pillClass = "critical"; }

    let checkboxAttrs = `${isActive ? 'checked' : ''}`;
    let cardStyle = "";
    if (!isSupportedLic) {
      checkboxAttrs += " disabled";
      pillText = "Unsupported";
      pillClass = "critical";
      cardStyle = "opacity: 0.5; background: rgba(0,0,0,0.3); border-color: rgba(239, 68, 68, 0.15);";
    }

    const label = document.createElement("label");
    label.className = "checkbox-card";
    label.style = cardStyle;
    label.innerHTML = `
      <input type="checkbox" data-lic="${lic.name}" ${checkboxAttrs}>
      <div class="checkbox-content" style="width:100%;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin-bottom:0; font-size: 0.9rem;">${lic.label} (${lic.name})</h4>
          <span class="status-badge ${pillClass}" style="padding: 2px 6px; font-size:0.65rem;">${pillText}</span>
        </div>
        <p style="font-size:0.75rem;">${isSupportedLic ? "Enable license key entitlement to configure in modeled plan." : `⚠️ Not supported on ${currentState.version.model} platform.`}</p>
      </div>
    `;
    licForm.appendChild(label);
  });
}

function updateUpgradeHopTimeline() {
  const curVer = currentState.version.ontap;
  const baseCur = resolveBaseVersionKey(curVer);
  const target = document.getElementById("target-ontap").value;
  const hops = ONTAP_HOPS[baseCur] ? ONTAP_HOPS[baseCur][target] : [];

  const box = document.getElementById("upgrade-timeline-box");
  const timeline = document.getElementById("hop-timeline");
  
  if (hops && hops.length > 0) {
    box.classList.remove("hidden");
    timeline.innerHTML = `<span class="hop-item active">${baseCur}</span>`;
    
    hops.forEach(hop => {
      timeline.innerHTML += `
        <span class="hop-arrow">➔</span>
        <span class="hop-item">${hop}</span>
      `;
    });
  } else {
    box.classList.add("hidden");
  }

  const considerations = getUpgradeHopsConsiderations(currentState.version.ontap, target, currentState.version.model);
  const list = document.getElementById("hop-considerations-list");
  const compBox = document.getElementById("hop-considerations-box");

  if (considerations.length > 0) {
    compBox.classList.remove("hidden");
    list.innerHTML = "";
    
    considerations.forEach(hop => {
      const card = document.createElement("div");
      card.className = "detail-card";
      card.style.background = "rgba(245, 158, 11, 0.04)";
      card.style.border = "1px solid rgba(245, 158, 11, 0.2)";
      card.style.padding = "0.75rem";
      card.style.textAlign = "left";
      
      const risksHtml = hop.risks.map(r => `<li>${r}</li>`).join("");
      const reqsHtml = hop.preReqs.map(r => `<li>${r}</li>`).join("");
      const cmdsHtml = hop.commands.map(c => `<code>${c}</code>`).join("<br>");
      
      card.innerHTML = `
        <h4 style="margin-top:0; margin-bottom:0.5rem; color:#fde047; font-size:0.9rem; display:flex; align-items:center; gap:0.5rem;">
          <span style="font-size:0.65rem; background:var(--color-warning); color:#000; padding:1px 4px; border-radius:2px; font-weight:700;">
            ${hop.directUpgrade ? "DIRECT" : "MULTI-HOP"}
          </span>
          ${hop.title}
        </h4>
        <div style="font-size:0.78rem; line-height:1.4;">
          <strong>Risks & Considerations:</strong>
          <ul style="margin-top:2px; margin-bottom:6px; padding-left:15px; color:#fca5a5;">
            ${risksHtml}
          </ul>
          <strong>Pre-requisites:</strong>
          <ul style="margin-top:2px; margin-bottom:6px; padding-left:15px; color:#a7f3d0;">
            ${reqsHtml}
          </ul>
          <strong>CLI commands:</strong>
          <pre style="margin-top:2px; margin-bottom:0; background:rgba(0,0,0,0.3); padding:4px; border-radius:2px; font-family:var(--font-mono); color:var(--color-info); font-size:0.7rem; overflow-x:auto;">${cmdsHtml}</pre>
        </div>
      `;
      list.appendChild(card);
    });
  } else {
    compBox.classList.add("hidden");
  }
}

// --- Step 4: Capacity & Hardware expansion ---
function setupModelerListeners() {
  const shelfSelect = document.getElementById("shelf-type");
  shelfSelect.addEventListener("change", (e) => {
    const type = e.target.value;
    const detailsDiv = document.getElementById("shelf-expansion-details");
    const diskSizeSelect = document.getElementById("disk-size");

    if (type === "none") {
      detailsDiv.classList.add("hidden");
      updateCapacityImpactDetails();
      drawCablingTopology(currentState, "visualizer-svg-frame");
      return;
    }

    detailsDiv.classList.remove("hidden");
    diskSizeSelect.innerHTML = "";
    
    const spec = SHELF_SPEC_MAP[type];
    spec.sizes.forEach(size => {
      const opt = document.createElement("option");
      opt.value = size;
      opt.textContent = size;
      diskSizeSelect.appendChild(opt);
    });

    const allowedMax = spec.maxCount * 8;
    document.getElementById("disk-count").max = allowedMax;
    document.getElementById("disk-count-hint").textContent = `Max slot support: ${allowedMax} drives (up to 8 shelves)`;

    const shelfCount = parseInt(document.getElementById("shelf-count-input").value) || 1;
    const fullyPopulate = document.getElementById("fully-populate-checkbox").checked;
    
    if (fullyPopulate) {
      document.getElementById("disk-count").value = shelfCount * spec.maxCount;
      document.getElementById("disk-count").disabled = true;
    } else {
      document.getElementById("disk-count").value = spec.defaultCount;
      document.getElementById("disk-count").disabled = false;
    }

    updateCapacityImpactDetails();
  });

  document.getElementById("disk-size").addEventListener("change", updateCapacityImpactDetails);
  
  document.getElementById("disk-count").addEventListener("input", () => {
    const diskCount = parseInt(document.getElementById("disk-count").value) || 24;
    const countText = document.getElementById("target-disks-count");
    if (countText) countText.textContent = diskCount;

    // Synchronize shelf-count-input if fully-populate is off
    const shelfType = document.getElementById("shelf-type").value;
    if (shelfType !== "none") {
      const spec = SHELF_SPEC_MAP[shelfType];
      const fullyPopulate = document.getElementById("fully-populate-checkbox").checked;
      if (!fullyPopulate) {
        const calculatedShelfCount = Math.ceil(diskCount / spec.maxCount);
        document.getElementById("shelf-count-input").value = calculatedShelfCount;
      }
    }

    document.querySelectorAll(".aggr-alloc-input").forEach(input => {
      input.setAttribute("max", diskCount);
    });
    validateAggrDiskAllocations();
  });

  // Shelf Count Input Change Listener
  document.getElementById("shelf-count-input").addEventListener("input", () => {
    const shelfType = document.getElementById("shelf-type").value;
    if (shelfType === "none") return;
    const spec = SHELF_SPEC_MAP[shelfType];
    const shelfCount = parseInt(document.getElementById("shelf-count-input").value) || 1;
    const fullyPopulate = document.getElementById("fully-populate-checkbox").checked;
    
    if (fullyPopulate) {
      document.getElementById("disk-count").value = shelfCount * spec.maxCount;
      // Trigger disk-count input listener to update allocations
      document.getElementById("disk-count").dispatchEvent(new Event("input"));
    } else {
      updateCapacityImpactDetails();
    }
  });

  // Fully Populate Checkbox Change Listener
  document.getElementById("fully-populate-checkbox").addEventListener("change", (e) => {
    const shelfType = document.getElementById("shelf-type").value;
    if (shelfType === "none") return;
    const spec = SHELF_SPEC_MAP[shelfType];
    const diskCountInput = document.getElementById("disk-count");
    
    if (e.target.checked) {
      diskCountInput.disabled = true;
      const shelfCount = parseInt(document.getElementById("shelf-count-input").value) || 1;
      diskCountInput.value = shelfCount * spec.maxCount;
      diskCountInput.dispatchEvent(new Event("input"));
    } else {
      diskCountInput.disabled = false;
      updateCapacityImpactDetails();
    }
  });

  document.getElementById("disk-allocation").addEventListener("change", (e) => {
    const val = e.target.value;
    const targetGroup = document.getElementById("expand-aggr-select-group");
    if (val === "expand") {
      targetGroup.classList.remove("hidden");
      populateAggregateDistributionList();
    } else {
      targetGroup.classList.add("hidden");
    }
    updateCapacityImpactDetails();
  });

  // PCIe Card Modeler Listeners
  document.getElementById("add-card-btn").addEventListener("click", () => {
    const cardKey = document.getElementById("add-pcie-card").value;
    const slotVal = document.getElementById("add-pcie-slot").value;

    if (cardKey === "none") {
      alert("Please select a supported PCIe expansion card.");
      return;
    }
    if (slotVal === "none") {
      alert("Please select a target physical slot.");
      return;
    }
    
    const targetSlot = parseInt(slotVal);
    const profile = getPlatformProfile(currentState.version.model);
    const targetOntap = document.getElementById("target-ontap").value || currentState.version.ontap;
    const errBox = document.getElementById("pcie-compat-card");
    errBox.classList.add("hidden");

    if (!currentState.expansionCards) currentState.expansionCards = [];
    
    const isOccupied = currentState.expansionCards.some(c => c.slot === targetSlot);
    if (isOccupied) {
      errBox.classList.remove("hidden");
      errBox.style.background = "rgba(239, 68, 68, 0.15)";
      errBox.style.border = "1px solid var(--color-danger)";
      errBox.style.color = "#fca5a5";
      errBox.innerHTML = `<strong>🛑 Slot Occupied:</strong> Slot ${targetSlot} already contains a card.`;
      return;
    }

    const cardSpec = EXP_CARDS_CATALOG[cardKey];
    if (compareVersions(targetOntap, cardSpec.minOntap) < 0) {
      errBox.classList.remove("hidden");
      errBox.style.background = "rgba(239, 68, 68, 0.15)";
      errBox.style.border = "1px solid var(--color-danger)";
      errBox.style.color = "#fca5a5";
      errBox.innerHTML = `<strong>🛑 Version Incompatible:</strong> Card requires ONTAP version >= ${cardSpec.minOntap} (Currently upgrading to ${targetOntap}).`;
      return;
    }

    // Add card
    currentState.expansionCards.push({ slot: targetSlot, cardKey: cardKey });
    
    renderAddedCardsList();
    populatePcieSlotDropdown();
    updateCapacityImpactDetails();
    
    // Dynamically inject expansion card ports into current node configuration
    const dynamicPorts = getCardPorts(cardKey, targetSlot);
    currentState.nodes.forEach(node => {
      dynamicPorts.forEach(pName => {
        const portType = cardSpec.type === "san" ? "fc" : (cardSpec.type === "storage" ? "storage" : "data");
        const exists = node.ports.find(p => p.name === pName);
        if (!exists) {
          node.ports.push({ name: pName, status: "up", speed: cardSpec.speed, duplex: "full", type: portType });
        }
      });
    });

    renderCurrentAuditDashboard();
  });

  // Card Select Change Listener to update slot recommendations dynamically
  document.getElementById("add-pcie-card").addEventListener("change", (e) => {
    populatePcieSlotDropdown(e.target.value);
  });
}

function populatePcieSlotDropdown(selectedCardKey) {
  const slotSelect = document.getElementById("add-pcie-slot");
  if (!slotSelect) return;
  slotSelect.innerHTML = "<option value='none'>-- Target Slot --</option>";
  
  const slots = getPlatformSlots(currentState.version.model);
  const occupiedSlots = new Set((currentState.expansionCards || []).map(c => c.slot));
  
  const resolvedCardKey = selectedCardKey || document.getElementById("add-pcie-card").value || "none";
  const cardSpec = resolvedCardKey !== "none" ? EXP_CARDS_CATALOG[resolvedCardKey] : null;
  const is100G = cardSpec && cardSpec.speed && cardSpec.speed.includes("100G");
  const cardType = cardSpec ? cardSpec.type : null;
  
  slots.forEach(slot => {
    const isOccupied = occupiedSlots.has(slot.num);
    const opt = document.createElement("option");
    opt.value = slot.num;
    
    let labelSuffix = "";
    if (isOccupied) {
      opt.disabled = true;
      labelSuffix = " [Occupied]";
    } else if (cardSpec) {
      // 1. PCIe Bottleneck Check (100G cards require x16 slots)
      const isX8Bottleneck = is100G && slot.type.includes("x8");
      if (isX8Bottleneck) {
        opt.disabled = true;
        labelSuffix = " [Unsupported: x8 Slot Bottleneck]";
      } else {
        // 2. Slot Type Recommendation Alignment check
        const isTypeMatch = slot.recType === "any" || slot.recType === cardType;
        if (!isTypeMatch) {
          // If there is an idle/free slot optimized specifically for this card type, disable this sub-optimal slot
          const hasBetterSlotFree = slots.some(s => !occupiedSlots.has(s.num) && s.recType === cardType && !(is100G && s.type.includes("x8")));
          if (hasBetterSlotFree) {
            opt.disabled = true;
            labelSuffix = ` [Sub-optimal: Use Slot ${slots.find(s => !occupiedSlots.has(s.num) && s.recType === cardType).num}]`;
          } else {
            labelSuffix = " (Sub-optimal slot)";
          }
        } else {
          labelSuffix = " (Recommended slot)";
        }
      }
    }
    
    opt.textContent = `Slot ${slot.num} (${slot.type})${labelSuffix}`;
    slotSelect.appendChild(opt);
  });
}

// Select a slot when clicking the empty slot in visualizer
window.selectChassisSlot = function(slotNum) {
  const slotSelect = document.getElementById("add-pcie-slot");
  if (slotSelect) {
    slotSelect.value = slotNum;
    // Highlight the dropdown
    slotSelect.style.borderColor = "var(--color-primary)";
    setTimeout(() => {
      slotSelect.style.borderColor = "rgba(255,255,255,0.15)";
    }, 1000);
  }
};

function drawOnboardPorts(x, y, w, h) {
  let html = `
    <!-- Onboard Controller Motherboard Block -->
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#0f172a" stroke="#334155" stroke-width="1" rx="3" />
    <text x="${x + w/2}" y="${y + 12}" fill="#64748b" font-size="6.5" font-weight="700" text-anchor="middle">ONBOARD</text>
  `;
  
  // 1. Management Port RJ-45
  const mgtX = x + 10;
  const mgtY = y + 20;
  html += `
    <rect x="${mgtX}" y="${mgtY}" width="15" height="11" fill="#1e293b" stroke="#475569" rx="1"/>
    <rect x="${mgtX + 4}" y="${mgtY - 2}" width="7" height="2" fill="#475569"/>
    <text x="${mgtX + 7.5}" y="${mgtY + 8}" fill="#94a3b8" font-size="5.5" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">e0M</text>
  `;

  // 2. Console Port
  const consX = x + 30;
  const consY = y + 20;
  html += `
    <rect x="${consX}" y="${consY}" width="15" height="11" fill="#1e293b" stroke="#475569" rx="1"/>
    <text x="${consX + 7.5}" y="${consY + 8}" fill="#94a3b8" font-size="5" font-weight="700" text-anchor="middle" font-family="var(--font-mono)">CON</text>
  `;

  // 3. Dual 10G/25G SFP+ Onboard Data/Cluster Ports
  const portY = y + 36;
  const portW = 16;
  const portH = 12;
  
  html += `
    <rect x="${x + 10}" y="${portY}" width="${portW}" height="${portH}" fill="#1e293b" stroke="#10b981" rx="1"/>
    <text x="${x + 10 + portW/2}" y="${portY + 8}" fill="#fff" font-size="5.5" font-family="var(--font-mono)" text-anchor="middle" font-weight="700">e0a</text>
    
    <rect x="${x + 30}" y="${portY}" width="${portW}" height="${portH}" fill="#1e293b" stroke="#10b981" rx="1"/>
    <text x="${x + 30 + portW/2}" y="${portY + 8}" fill="#fff" font-size="5.5" font-family="var(--font-mono)" text-anchor="middle" font-weight="700">e0b</text>
  `;
  
  if (w > 100) {
    // If wider, draw onboard SAS ports 0a, 0b
    html += `
      <rect x="${x + 55}" y="${portY}" width="${portW}" height="${portH}" fill="#1e293b" stroke="#3b82f6" rx="1"/>
      <text x="${x + 55 + portW/2}" y="${portY + 8}" fill="#fff" font-size="5.5" font-family="var(--font-mono)" text-anchor="middle" font-weight="700">0a</text>
      
      <rect x="${x + 75}" y="${portY}" width="${portW}" height="${portH}" fill="#1e293b" stroke="#3b82f6" rx="1"/>
      <text x="${x + 75 + portW/2}" y="${portY + 8}" fill="#fff" font-size="5.5" font-family="var(--font-mono)" text-anchor="middle" font-weight="700">0b</text>
    `;
  }
  
  return html;
}

function drawPCIeChassis(state, targetId) {
  const container = document.getElementById(targetId);
  if (!container) return;
  container.innerHTML = "";

  const model = state.version.model;
  const profile = getPlatformProfile(model);
  const slots = getPlatformSlots(model);
  const cards = state.expansionCards || [];

  const badgeEl = document.getElementById("chassis-model-badge");
  if (badgeEl) badgeEl.textContent = model;

  const N = slots.length;
  const svgWidth = 600;
  
  let layoutType = "vertical";
  const modelUpper = model.toUpperCase();
  if (N === 4 && (modelUpper.includes("A400") || modelUpper.includes("8300") || modelUpper.includes("8700") || modelUpper.includes("8200"))) {
    layoutType = "quad_horizontal";
  } else if (N <= 2 && N > 0) {
    layoutType = "horizontal_stacked";
  }

  let chassisHeight = 130;
  if (layoutType === "vertical") {
    chassisHeight = N >= 8 ? 160 : 130;
  } else if (layoutType === "quad_horizontal") {
    chassisHeight = 135;
  } else if (layoutType === "horizontal_stacked") {
    chassisHeight = 120;
  }

  const svgHeight = chassisHeight + 20;
  
  let svgStr = `<svg width="100%" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" xmlns="http://www.w3.org/2000/svg" style="background:#0f172a; border-radius:6px; overflow:hidden;">`;

  // Draw steel chassis container background
  svgStr += `
    <!-- Chassis Body -->
    <rect x="20" y="10" width="560" height="${chassisHeight}" fill="#1e293b" stroke="#475569" stroke-width="2" rx="4" />
    <rect x="25" y="15" width="550" height="${chassisHeight - 10}" fill="#0f172a" rx="2" />
    
    <!-- Left Rack Ear -->
    <rect x="5" y="10" width="15" height="${chassisHeight}" fill="#334155" rx="2" />
    <rect x="8" y="15" width="9" height="${chassisHeight - 10}" fill="#1e293b" rx="1" />
    <circle cx="12" cy="25" r="3" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
    <circle cx="12" cy="${chassisHeight - 5}" r="3" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
    
    <!-- Right Rack Ear -->
    <rect x="580" y="10" width="15" height="${chassisHeight}" fill="#334155" rx="2" />
    <rect x="583" y="15" width="9" height="${chassisHeight - 10}" fill="#1e293b" rx="1" />
    <circle cx="587" cy="25" r="3" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
    <circle cx="587" cy="${chassisHeight - 5}" r="3" fill="#64748b" stroke="#475569" stroke-width="0.5"/>
    
    <!-- Dual Power Supplies representation (PSU 1 & PSU 2) -->
    <rect x="25" y="20" width="40" height="${chassisHeight - 20}" fill="#1e293b" stroke="#334155" rx="2"/>
    <rect x="30" y="30" width="30" height="20" fill="#020617" rx="1"/> <!-- fan -->
    <circle cx="45" cy="40" r="8" fill="none" stroke="#334155" stroke-width="1"/>
    <circle cx="45" cy="${chassisHeight - 25}" r="4" fill="#10b981" /> <!-- status green led -->
    <text x="45" y="${chassisHeight - 10}" fill="#64748b" font-size="6.5" text-anchor="middle" font-weight="700">PSU 1</text>
    
    <rect x="535" y="20" width="40" height="${chassisHeight - 20}" fill="#1e293b" stroke="#334155" rx="2"/>
    <rect x="540" y="30" width="30" height="20" fill="#020617" rx="1"/> <!-- fan -->
    <circle cx="555" cy="40" r="8" fill="none" stroke="#334155" stroke-width="1"/>
    <circle cx="555" cy="${chassisHeight - 25}" r="4" fill="#10b981" /> <!-- status green led -->
    <text x="555" y="${chassisHeight - 10}" fill="#64748b" font-size="6.5" text-anchor="middle" font-weight="700">PSU 2</text>
  `;

  // Map slots to layout coordinates
  const slotLayouts = [];
  if (layoutType === "quad_horizontal") {
    // 4 horizontal slots: 2 on the left (Slots 1, 2), 2 on the right (Slots 3, 4)
    slots.forEach((slot, index) => {
      let sx, sy;
      const sNum = slot.num;
      if (sNum === 1) { sx = 75; sy = 25; }
      else if (sNum === 2) { sx = 75; sy = 75; }
      else if (sNum === 3) { sx = 385; sy = 25; }
      else if (sNum === 4) { sx = 385; sy = 75; }
      else { sx = 75 + index * 100; sy = 25; }
      slotLayouts.push({
        num: sNum,
        x: sx,
        y: sy,
        w: 140,
        h: 42,
        isHorizontal: true,
        type: slot.type,
        recType: slot.recType
      });
    });
    // Onboard ports centered in the middle
    svgStr += drawOnboardPorts(225, 25, 150, 92);
    
  } else if (layoutType === "horizontal_stacked") {
    // Stacked horizontal slots (e.g. 2 slots for A250)
    slots.forEach((slot, index) => {
      const sNum = slot.num;
      const sy = 25 + index * 45;
      slotLayouts.push({
        num: sNum,
        x: 290,
        y: sy,
        w: 235,
        h: 38,
        isHorizontal: true,
        type: slot.type,
        recType: slot.recType
      });
    });
    // Onboard ports on the left side
    svgStr += drawOnboardPorts(75, 25, 205, 83);
    
  } else {
    // Vertical slots side-by-side
    const startX = 180;
    const endX = 525;
    const availableWidth = endX - startX;
    const slotW = Math.floor(availableWidth / N) - 4;
    slots.forEach((slot, index) => {
      const sx = startX + index * (slotW + 4);
      slotLayouts.push({
        num: slot.num,
        x: sx,
        y: 22,
        w: slotW,
        h: chassisHeight - 24,
        isHorizontal: false,
        type: slot.type,
        recType: slot.recType
      });
    });
    // Onboard ports block on the left next to PSU 1
    svgStr += drawOnboardPorts(75, 22, 95, chassisHeight - 24);
  }

  // Draw Slots
  slotLayouts.forEach(lay => {
    const card = cards.find(c => c.slot === lay.num);
    svgStr += `<!-- Slot ${lay.num} -->`;

    if (card) {
      const cSpec = EXP_CARDS_CATALOG[card.cardKey];
      if (cSpec) {
        const isTypeMatch = lay.recType === "any" || lay.recType === cSpec.type;
        const isBandwidthMatch = !(cSpec.speed.includes("100G") && lay.type.includes("x8"));
        const isBestPractice = isTypeMatch && isBandwidthMatch;
        
        let pcbColor = "#064e3b"; // Forest green PCB for compliant cards
        if (card.autoAdded) {
          pcbColor = "#0c4a6e"; // Cyan-blue for auto-allocated
        } else if (!isBestPractice) {
          pcbColor = "#78350f"; // Amber/brown for sub-optimal
        }

        // Card plate background
        svgStr += `
          <rect x="${lay.x}" y="${lay.y}" width="${lay.w}" height="${lay.h}" fill="${pcbColor}" stroke="#475569" rx="2" style="cursor:pointer;" onclick="selectChassisSlot(${lay.num})"/>
        `;

        // Card Labels and details
        if (lay.isHorizontal) {
          // Horizontal layout card labels
          svgStr += `
            <text x="${lay.x + 8}" y="${lay.y + 14}" fill="#fff" font-size="7.5" font-weight="700">SLOT ${lay.num}</text>
            <text x="${lay.x + 8}" y="${lay.y + 24}" fill="#e2e8f0" font-size="5.5" font-weight="600">${cSpec.speed}</text>
            <text x="${lay.x + 8}" y="${lay.y + 32}" fill="#94a3b8" font-size="5.5">${cSpec.type.toUpperCase()}</text>
          `;

          // Draw ports horizontally
          const cardPorts = getCardPorts(card.cardKey, lay.num);
          const pxStart = lay.x + 75;
          const portW = 16;
          const portH = 11;
          const py = lay.y + (lay.h - portH) / 2;

          cardPorts.forEach((pName, pIdx) => {
            const px = pxStart + pIdx * (portW + 4);
            let portColor = "#1e293b";
            let strokeColor = "#64748b";
            let ledColor = "#10b981";

            if (cSpec.type === "storage") {
              portColor = "#0f172a";
              strokeColor = "#3b82f6";
              ledColor = "#3b82f6";
            } else if (cSpec.type === "san") {
              portColor = "#0f172a";
              strokeColor = "#ec4899";
              ledColor = "#f472b6";
            }

            svgStr += `
              <rect x="${px}" y="${py}" width="${portW}" height="${portH}" fill="${portColor}" stroke="${strokeColor}" rx="1"/>
              <text x="${px + portW/2}" y="${py + 7.5}" fill="#fff" font-size="5" font-family="var(--font-mono)" text-anchor="middle" font-weight="700">${pName}</text>
            `;
          });
        } else {
          // Vertical layout card labels
          svgStr += `
            <text x="${lay.x + lay.w/2}" y="${lay.y + 12}" fill="#fff" font-size="7.5" font-weight="700" text-anchor="middle">SLOT ${lay.num}</text>
            <text x="${lay.x + lay.w/2}" y="${lay.y + 24}" fill="#e2e8f0" font-size="5.5" font-weight="600" text-anchor="middle">${cSpec.speed}</text>
            <text x="${lay.x + lay.w/2}" y="${lay.y + 32}" fill="#94a3b8" font-size="5" text-anchor="middle">${cSpec.type.toUpperCase()}</text>
          `;

          // Draw ports vertically
          const cardPorts = getCardPorts(card.cardKey, lay.num);
          const pyStart = lay.y + 42;
          const portH = 11;
          const portW = Math.min(lay.w - 6, 17);
          const px = lay.x + (lay.w - portW) / 2;

          cardPorts.forEach((pName, pIdx) => {
            const py = pyStart + pIdx * (portH + 3);
            let portColor = "#1e293b";
            let strokeColor = "#64748b";

            if (cSpec.type === "storage") {
              portColor = "#0f172a";
              strokeColor = "#3b82f6";
            } else if (cSpec.type === "san") {
              portColor = "#0f172a";
              strokeColor = "#ec4899";
            }

            svgStr += `
              <rect x="${px}" y="${py}" width="${portW}" height="${portH}" fill="${portColor}" stroke="${strokeColor}" rx="1"/>
              <text x="${px + portW/2}" y="${py + 8}" fill="#fff" font-size="5" font-family="var(--font-mono)" text-anchor="middle" font-weight="700">${pName}</text>
            `;
          });
        }
      }
    } else {
      // Draw Empty slot plate
      svgStr += `
        <rect x="${lay.x}" y="${lay.y}" width="${lay.w}" height="${lay.h}" fill="#1e293b" stroke="#334155" rx="2" style="cursor:pointer;" onclick="selectChassisSlot(${lay.num})"/>
      `;

      if (lay.isHorizontal) {
        // Horizontal empty layout
        svgStr += `
          <text x="${lay.x + 8}" y="${lay.y + 15}" fill="#64748b" font-size="7.5" font-weight="700">SLOT ${lay.num}</text>
          <text x="${lay.x + 8}" y="${lay.y + 24}" fill="#475569" font-size="5.5">${lay.type.split(' ')[0]}</text>
          
          <text x="${lay.x + 95}" y="${lay.y + 15}" fill="#475569" font-size="5" font-weight="700">OPT FOR:</text>
          <text x="${lay.x + 95}" y="${lay.y + 25}" fill="#64748b" font-size="6" font-weight="700">${lay.recType.toUpperCase()}</text>
        `;
      } else {
        // Vertical empty layout
        svgStr += `
          <text x="${lay.x + lay.w/2}" y="${lay.y + 20}" fill="#64748b" font-size="7" font-weight="700" text-anchor="middle">SLOT ${lay.num}</text>
          <text x="${lay.x + lay.w/2}" y="${lay.y + 32}" fill="#475569" font-size="5" text-anchor="middle">${lay.type.split(' ')[0]}</text>
          
          <text x="${lay.x + lay.w/2}" y="${lay.y + 55}" fill="#475569" font-size="5" font-weight="700" text-anchor="middle">OPT FOR:</text>
          <text x="${lay.x + lay.w/2}" y="${lay.y + 65}" fill="#64748b" font-size="5.5" font-weight="700" text-anchor="middle">${lay.recType.toUpperCase()}</text>
        `;
      }
    }
  });

  svgStr += `</svg>`;
  container.innerHTML = svgStr;
}

function renderAddedCardsList() {
  const list = document.getElementById("added-cards-list");
  const countSpan = document.getElementById("pcie-slots-count");
  if (!list) return;
  list.innerHTML = "";

  const profile = getPlatformProfile(currentState.version.model);
  const cards = currentState.expansionCards || [];
  
  countSpan.textContent = `${profile.maxPcieSlots - cards.length} / ${profile.maxPcieSlots}`;

  // Call chassis visualizer
  drawPCIeChassis(currentState, "pcie-chassis-visualizer");

  const slots = getPlatformSlots(currentState.version.model);
  
  slots.forEach(slot => {
    const cardInst = cards.find(c => c.slot === slot.num);
    const cardEl = document.createElement("div");
    
    if (cardInst) {
      const cardSpec = EXP_CARDS_CATALOG[cardInst.cardKey];
      const isTypeMatch = slot.recType === "any" || slot.recType === cardSpec.type;
      const isBandwidthMatch = !(cardSpec.speed.includes("100G") && slot.type.includes("x8"));
      const isBestPractice = isTypeMatch && isBandwidthMatch;
      
      let bpBadge = `<span style="background:rgba(16,185,129,0.15); border:1px solid #10b981; color:#34d399; font-size:0.7rem; padding: 1px 6px; border-radius:10px; margin-left: 8px;">Best Practice Match</span>`;
      if (cardInst.autoAdded) {
        bpBadge = `<span style="background:rgba(6,182,212,0.15); border:1px solid var(--color-info); color:#8ec5fc; font-size:0.7rem; padding: 1px 6px; border-radius:10px; margin-left: 8px;">Auto-allocated</span>`;
      } else if (!isBestPractice) {
        let warnText = !isTypeMatch ? `Optimized for ${slot.recType.toUpperCase()}` : "Degraded (x8 slot)";
        bpBadge = `<span style="background:rgba(245,158,11,0.15); border:1px solid #f59e0b; color:#fbbf24; font-size:0.7rem; padding: 1px 6px; border-radius:10px; margin-left: 8px;">Sub-optimal: ${warnText}</span>`;
      }
      
      const removeBtnHtml = cardInst.autoAdded
        ? `<span style="font-size:0.75rem; color:var(--color-muted); font-style:italic; padding-right: 6px;">Auto-managed</span>`
        : `<button class="btn-secondary" style="padding: 2px 6px; font-size: 0.75rem; border-color:var(--color-danger); color:var(--color-danger);" data-slot="${slot.num}">Remove</button>`;

      cardEl.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(30,58,138,0.1); border:1px solid rgba(59,130,246,0.3); padding: 8px 12px; border-radius: 4px; margin-bottom: 0.5rem;";
      cardEl.innerHTML = `
        <div style="font-size:0.85rem; color:#fff;">
          <div style="display:flex; align-items:center;">
            <strong style="background:var(--color-primary); padding:1px 6px; border-radius:3px; font-size:0.75rem; margin-right:8px; white-space:nowrap;">Slot ${slot.num} (${slot.type})</strong>
            <span style="font-weight:600;">${cardSpec.name}</span>
            ${bpBadge}
          </div>
          <div style="font-size:0.75rem; color:var(--color-muted); margin-top:2px;">
            Optimized for: ${slot.rec}
          </div>
        </div>
        ${removeBtnHtml}
      `;
      
      if (!cardInst.autoAdded) {
        cardEl.querySelector("button").addEventListener("click", () => {
          // Remove ports
          currentState.nodes.forEach(node => {
            node.ports = node.ports.filter(p => !cardSpec.ports.includes(p.name));
          });

          currentState.expansionCards = currentState.expansionCards.filter(c => c.slot !== slot.num);
          renderAddedCardsList();
          populatePcieSlotDropdown();
          updateCapacityImpactDetails();
          renderCurrentAuditDashboard();
        });
      }
    } else {
      cardEl.style = "display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.01); border:1px dashed var(--border-color); padding: 8px 12px; border-radius: 4px; margin-bottom: 0.5rem;";
      cardEl.innerHTML = `
        <div style="font-size:0.85rem; color:var(--color-muted);">
          <div>
            <strong style="background:rgba(255,255,255,0.08); padding:1px 6px; border-radius:3px; font-size:0.75rem; margin-right:8px; color:var(--color-muted); white-space:nowrap;">Slot ${slot.num} (${slot.type})</strong>
            <span style="font-style:italic;">Empty Slot</span>
          </div>
          <div style="font-size:0.75rem; color:var(--color-muted); margin-top:2px;">
            Optimized for: ${slot.rec}
          </div>
        </div>
      `;
    }
    
    list.appendChild(cardEl);
  });
}

function initStep4Inputs() {
  document.getElementById("shelf-type").value = "none";
  document.getElementById("shelf-expansion-details").classList.add("hidden");
  
  const shelfSelect = document.getElementById("shelf-type");
  const profile = getPlatformProfile(currentState.version.model);
  
  // Clear and dynamically populate supported shelves only
  shelfSelect.innerHTML = "<option value='none'>-- No Shelf Added --</option>";
  profile.supportedShelves.forEach(shelfKey => {
    if (ALL_SHELVES_CATALOG[shelfKey]) {
      const opt = document.createElement("option");
      opt.value = shelfKey;
      opt.textContent = ALL_SHELVES_CATALOG[shelfKey];
      shelfSelect.appendChild(opt);
    }
  });

  // Populate unsupported shelf explanatory help panel
  const unsupportedInfo = document.getElementById("unsupported-shelves-info");
  if (unsupportedInfo) {
    unsupportedInfo.innerHTML = "";
    const unsupportedShelves = Object.keys(ALL_SHELVES_CATALOG).filter(s => !profile.supportedShelves.includes(s));
    if (unsupportedShelves.length > 0) {
      let html = `
        <div style="background: rgba(245, 158, 11, 0.08); border: 1px dashed rgba(245, 158, 11, 0.3); padding: 0.75rem; border-radius: var(--radius-md); font-size: 0.8rem; line-height: 1.4; color: var(--color-text);">
          <strong style="color: #fde047; display: block; margin-bottom: 0.4rem; font-size: 0.85rem;">⚠️ Platform Shelf Compatibility Notes:</strong>
          <ul style="margin: 0; padding-left: 1.15rem; display: flex; flex-direction: column; gap: 0.35rem;">
      `;
      unsupportedShelves.forEach(shelf => {
        const name = ALL_SHELVES_CATALOG[shelf].split(" (")[0];
        let reason = profile.shelfErrors[shelf] || profile.shelfWarnings[shelf] || `Platform ${currentState.version.model} does not support ${name} shelves.`;
        let optionsTip = "";
        if (shelf === "ns224") {
          optionsTip = " To add NVMe-oF SSD capacity, switch to an NVMe-native platform (e.g. AFF A-series).";
        } else {
          optionsTip = " To add SAS SSD/HDD capacity, utilize compatible SAS storage HBA adapters on compatible controllers.";
        }
        html += `<li><strong>${name}:</strong> ${reason}${optionsTip}</li>`;
      });
      const supportedNames = profile.supportedShelves.map(s => ALL_SHELVES_CATALOG[s] ? ALL_SHELVES_CATALOG[s].split(" (")[0] : s).join(", ");
      html += `
          </ul>
          <div style="margin-top: 0.5rem; padding-top: 0.4rem; border-top: 1px solid rgba(245, 158, 11, 0.15); font-weight: 500; color: #8ec5fc;">
            ✅ Recommended Capacity Options: Utilize [ ${supportedNames || 'None'} ] shelf types.
          </div>
        </div>
      `;
      unsupportedInfo.innerHTML = html;
    }
  }

  // Populate PCIe Expansion Dropdown
  const cardSelect = document.getElementById("add-pcie-card");
  cardSelect.innerHTML = "<option value='none'>-- Select Supported Card --</option>";
  
  profile.supportedCards.forEach(cardKey => {
    const cardSpec = EXP_CARDS_CATALOG[cardKey];
    const opt = document.createElement("option");
    opt.value = cardKey;
    opt.textContent = `${cardSpec.name} (${cardSpec.speed})`;
    cardSelect.appendChild(opt);
  });

  allocateHBACardsForState(currentState);

  populatePcieSlotDropdown();
  renderAddedCardsList();
  updateCapacityImpactDetails();
}

function getPlatformSpecs(model) {
  const m = model ? model.toUpperCase() : "";
  let ru = 2;
  let power = 600; // watts for HA controller pair

  if (m.includes("A1K") || m.includes("9500") || m.includes("9000") || m.includes("A900")) {
    ru = 4;
    power = 1200;
  } else if (m.includes("A70") || m.includes("A90")) {
    ru = 4;
    power = 1000;
  } else if (m.includes("A800") || m.includes("A400") || m.includes("8700") || m.includes("8300") || m.includes("C400") || m.includes("C800")) {
    ru = 4;
    power = 850;
  } else if (m.includes("A250") || m.includes("A20") || m.includes("2820") || m.includes("2750") || m.includes("2720") || m.includes("A150")) {
    ru = 2;
    power = 500;
  }
  return { ru, power };
}

function getSystemPhysicalFootprint(state) {
  if (!state) return { ru: 0, watts: 0, btu: 0 };
  
  const isMetroCluster = state.metrocluster && state.metrocluster !== "none";
  const mult = isMetroCluster ? 2 : 1;

  // 1. Controller baseline
  const ctrl = getPlatformSpecs(state.version.model);
  let totalRu = ctrl.ru * mult;
  let totalWatts = ctrl.power * mult;

  // 2. Shelves
  (state.shelves || []).forEach(shelf => {
    const sType = (shelf.model || "").toLowerCase();
    const spec = SHELF_SPEC_MAP[sType] || { ru: 2, power: 300 };
    totalRu += spec.ru;
    totalWatts += spec.power;
  });

  // 3. Cards
  (state.expansionCards || []).forEach(c => {
    const cKey = typeof c === 'string' ? c : c.cardKey;
    const cardSpec = EXP_CARDS_CATALOG[cKey] || { power: 15 };
    const nodes = state.nodes || [];
    const count = nodes.length || 2;
    totalWatts += cardSpec.power * count;
  });

  const totalBtu = Math.round(totalWatts * 3.412);
  return { ru: totalRu, watts: totalWatts, btu: totalBtu };
}

function updateCapacityImpactDetails() {
  const type = document.getElementById("shelf-type").value;
  const nextBtn = document.getElementById("next-btn");
  const notesNode = document.getElementById("shelf-notes");

  nextBtn.disabled = false;
  nextBtn.style.opacity = "1";

  // Calculate baseline (Before)
  const footprintBefore = getSystemPhysicalFootprint(currentState);
  let rawCapBeforeGB = 0;
  (currentState.shelves || []).forEach(s => {
    (s.disks || []).forEach(d => {
      rawCapBeforeGB += (d.sizeGB || 0);
    });
  });

  // Calculate target (After)
  const isMetroCluster = currentState.metrocluster && currentState.metrocluster !== "none";
  const mult = isMetroCluster ? 2 : 1;
  
  let shelfCount = 0;
  let rawCapAddedGB = 0;
  let spec = null;
  let diskCount = 0;
  let diskSizeStr = "";
  let diskGB = 0;

  if (type !== "none") {
    spec = SHELF_SPEC_MAP[type];
    diskCount = parseInt(document.getElementById("disk-count").value) || 0;
    diskSizeStr = document.getElementById("disk-size").value;
    
    const match = diskSizeStr.match(/([\d.]+)\s*([GT])B?/i);
    if (match) {
      const val = parseFloat(match[1]);
      diskGB = match[2].toUpperCase() === 'T' ? val * 1000 : val;
    }

    shelfCount = Math.ceil(diskCount / spec.maxCount);
    rawCapAddedGB = diskGB * diskCount * mult;

    const hintNode = document.getElementById("disk-count-hint");
    if (hintNode) {
      hintNode.innerHTML = `Requires <strong>${shelfCount}</strong> shelf/shelves (${spec.maxCount} drives max per shelf).`;
    }
  }

  // Create temporary state for auto-allocated cards calculation
  const tempState = JSON.parse(JSON.stringify(currentState));
  if (type !== "none") {
    for (let s = 0; s < shelfCount * mult; s++) {
      tempState.shelves.push({
        id: `NEW-${s + 1}`,
        model: type,
        disks: Array.from({ length: Math.min(spec.maxCount, diskCount) }, () => ({ type: spec.mediaType }))
      });
    }
  }
  allocateHBACardsForState(tempState);
  
  const footprintAfter = getSystemPhysicalFootprint(tempState);
  const rawCapAfterGB = rawCapBeforeGB + rawCapAddedGB;

  const ruDiff = footprintAfter.ru - footprintBefore.ru;
  const wattsDiff = footprintAfter.watts - footprintBefore.watts;
  const btuDiff = footprintAfter.btu - footprintBefore.btu;
  const capDiff = rawCapAddedGB;

  // Render to DOM
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setEl("footprint-ru-before", `${footprintBefore.ru} U`);
  setEl("footprint-ru-after", `${footprintAfter.ru} U`);
  setEl("footprint-ru-diff", `(+${ruDiff} U)`);

  setEl("footprint-watts-before", `${footprintBefore.watts} W`);
  setEl("footprint-watts-after", `${footprintAfter.watts} W`);
  setEl("footprint-watts-diff", `(+${wattsDiff} W)`);

  setEl("footprint-btu-before", `${footprintBefore.btu} BTU/hr`);
  setEl("footprint-btu-after", `${footprintAfter.btu} BTU/hr`);
  setEl("footprint-btu-diff", `(+${btuDiff} BTU/hr)`);

  setEl("footprint-cap-before", formatGB(rawCapBeforeGB));
  setEl("footprint-cap-after", formatGB(rawCapAfterGB));
  setEl("footprint-cap-diff", `(+${formatGB(capDiff)})`);

  if (type === "none") {
    let cardWatts = 0;
    const cards = currentState.expansionCards || [];
    cards.forEach(c => {
      const cKey = typeof c === 'string' ? c : c.cardKey;
      cardWatts += EXP_CARDS_CATALOG[cKey].power;
    });
    notesNode.innerHTML = `Model expansion PCIe cards or select a disk shelf stack to simulate system physical limits. Installed cards are adding ${cardWatts}W power draw.`;
    notesNode.style.background = "";
    notesNode.style.border = "";
    return;
  }

  const profile = getPlatformProfile(currentState.version.model);
  const targetOntap = document.getElementById("target-ontap").value || currentState.version.ontap;
  
  let isSupported = profile.supportedShelves.includes(type);
  let errorMsg = profile.shelfErrors[type];
  const warningMsg = profile.shelfWarnings[type];

  // Validate shelf version compatibility
  if (type === "ns224" && compareVersions(targetOntap, "9.8") < 0) {
    errorMsg = `NS224 NVMe shelf requires target ONTAP version 9.8 or higher (Current target: ${targetOntap}).`;
    isSupported = false;
  } else if (type === "ds2246" && compareVersions(targetOntap, "9.15.1") >= 0) {
    errorMsg = `Legacy 6G SAS shelf (DS2246) is EOL and not supported on target ONTAP version ${targetOntap}.`;
    isSupported = false;
  }

  // Validate disk size version compatibility
  if (!errorMsg) {
    if (diskSizeStr.includes("30.6TB") && compareVersions(targetOntap, "9.9.1") < 0) {
      errorMsg = `ONTAP Compatibility Warning: 30.6TB SSDs require target ONTAP version 9.9.1 or higher (Current target: ${targetOntap}).`;
      isSupported = false;
    } else if (diskSizeStr.includes("15.3TB") && compareVersions(targetOntap, "9.1") < 0) {
      errorMsg = `ONTAP Compatibility Warning: 15.3TB SSDs require target ONTAP version 9.1 or higher (Current target: ${targetOntap}).`;
      isSupported = false;
    }
  }

  // Validate platform supports MetroCluster if MC is checked
  let mcNoticeHtml = "";
  if (isMetroCluster) {
    if (!profile.supportedLicenses.includes("MetroCluster")) {
      errorMsg = `Platform ${currentState.version.model} is not certified for MetroCluster DR configurations.`;
      isSupported = false;
    } else {
      mcNoticeHtml = `
        <div style="background: rgba(6, 182, 212, 0.1); border: 1px solid var(--color-info); color: #8ec5fc; padding: 0.5rem; border-radius: 4px; margin-top: 0.5rem; font-size: 0.75rem;">
          <strong>🔀 MetroCluster Symmetrical Mode:</strong> Adding shelf and drives symmetrically to Site-A and Site-B.
        </div>
      `;
    }
  }

  // Validate platform drive limit compliance
  if (!errorMsg) {
    const getPlatformMaxDrives = (model) => {
      const upper = (model || "").toUpperCase();
      if (upper.includes("A1K") || upper.includes("9500") || upper.includes("9000") || upper.includes("A900")) return 1440;
      if (upper.includes("8700") || upper.includes("8300") || upper.includes("C80") || upper.includes("A90") || upper.includes("A70")) return 720;
      if (upper.includes("A800") || upper.includes("C400")) return 720;
      if (upper.includes("A400") || upper.includes("8200")) return 480;
      if (upper.includes("A250") || upper.includes("C250") || upper.includes("A300") || upper.includes("A150")) return 240;
      if (upper.includes("A50") || upper.includes("A30") || upper.includes("A20") || upper.includes("C30") || upper.includes("C60") || upper.includes("2820") || upper.includes("2750") || upper.includes("2720")) return 144;
      return 144;
    };

    let existingDrivesCount = 0;
    currentState.shelves.forEach(s => {
      if (s.disks) existingDrivesCount += s.disks.length;
    });
    
    // In MetroCluster, limits apply to local controller pairs
    const localTotalDrives = existingDrivesCount + diskCount;
    const maxDrives = getPlatformMaxDrives(currentState.version.model);
    if (localTotalDrives > maxDrives) {
      errorMsg = `Drive Limit Block: Platform ${currentState.version.model} supports a maximum of ${maxDrives} drives per HA pair. Currently configured: ${existingDrivesCount}, Proposed: ${diskCount} (Total: ${localTotalDrives}).`;
      isSupported = false;
    }
  }

  // Validate storage ports availability & HBA requirements
  if (!errorMsg) {
    // Determine the modeled shelf type and shelf count
    let nvmeShelvesCount = 0;
    let sasShelvesCount = 0;
    currentState.shelves.forEach(s => {
      if (s.model && s.model.toLowerCase() === "ns224") nvmeShelvesCount++;
      else sasShelvesCount++;
    });
    const totalNvmeShelves = nvmeShelvesCount + (type === "ns224" ? shelfCount : 0);
    const totalSasShelves = sasShelvesCount + (type !== "ns224" ? shelfCount : 0);

    // Prepare a temporary representation of shelves for card allocation
    const tempState = {
      version: currentState.version,
      expansionCards: JSON.parse(JSON.stringify(currentState.expansionCards || [])),
      nodes: JSON.parse(JSON.stringify(currentState.nodes)),
      shelves: Array.from({ length: totalNvmeShelves }, () => ({ model: "ns224" }))
        .concat(Array.from({ length: totalSasShelves }, () => ({ model: "ds224c" })))
    };

    // Run allocation on tempState
    allocateHBACardsForState(tempState);

    // If cards were added or removed, update currentState and re-render UI
    const originalCardsStr = JSON.stringify(currentState.expansionCards || []);
    const newCardsStr = JSON.stringify(tempState.expansionCards);
    if (originalCardsStr !== newCardsStr) {
      currentState.expansionCards = tempState.expansionCards;
      currentState.nodes.forEach((node, nodeIdx) => {
        node.ports = tempState.nodes[nodeIdx].ports;
      });
      renderAddedCardsList();
      populatePcieSlotDropdown();
    }

    const nodeA = currentState.nodes.find(n => n.name === "node-a" || n.name.endsWith("-a") || n.name === "node-1") || currentState.nodes[0];
    if (nodeA) {
      // Re-read available ports after auto-allocation
      const countAvailablePorts = () => {
        const ports = nodeA.ports || [];
        let roce = 0;
        let sas = 0;
        ports.forEach(p => {
          const name = p.name.toLowerCase();
          const speed = (p.speed || "").toLowerCase();
          const portType = (p.type || "").toLowerCase();
          
          const isRoce = name.startsWith("e") && (speed.includes("100g") || speed.includes("roce") || portType.includes("storage"));
          const isSas = (name.startsWith("0") || portType.includes("storage")) && (speed.includes("sas") || (speed.includes("6g") && !speed.includes("16g")) || speed.includes("12g") || (!speed && (name.startsWith("0a") || name.startsWith("0b") || name.startsWith("0c") || name.startsWith("0d"))));
          
          if (isRoce) roce++;
          else if (isSas) sas++;
        });
        return { roce, sas };
      };

      const finalPorts = countAvailablePorts();
      const nodes = currentState.nodes || [];
      const haPairsCount = Math.floor(nodes.length / 2) || 1;
      const nvmeShelvesPerHA = Math.ceil(totalNvmeShelves / haPairsCount);
      const sasShelvesPerHA = Math.ceil(totalSasShelves / haPairsCount);

      const isHighEnd = ['AFF A1K', 'AFF A90', 'AFF A70', 'AFF A900', 'FAS9500'].some(m => currentState.version.model.toUpperCase().includes(m));
      const requiredRocePorts = isHighEnd ? Math.ceil(nvmeShelvesPerHA / 2) * 2 : nvmeShelvesPerHA * 2;
      const requiredSasPorts = Math.ceil(sasShelvesPerHA / 4) * 2;

      if (totalNvmeShelves > 0 && finalPorts.roce < requiredRocePorts) {
        errorMsg = `Port Exhaustion (RoCE): Required RoCE ports per controller: ${requiredRocePorts} (for ${nvmeShelvesPerHA} NVMe shelves), but only ${finalPorts.roce} 100G RoCE ports are available and no free PCIe slots remain on Node A.`;
        isSupported = false;
      } else if (totalSasShelves > 0 && finalPorts.sas < requiredSasPorts) {
        errorMsg = `Port Exhaustion (SAS): Required SAS ports per controller: ${requiredSasPorts} (for ${sasShelvesPerHA} SAS shelves), but only ${finalPorts.sas} SAS ports are available and no free PCIe slots remain on Node A.`;
        isSupported = false;
      }

      // Validate daisy chain limits
      const maxShelves = isHighEnd ? finalPorts.roce : Math.floor(finalPorts.roce / 2);
      if (totalNvmeShelves > maxShelves) {
        if (!isHighEnd) {
          errorMsg = `Daisy-Chaining Unsupported: NVMe shelf daisy-chaining is not supported on platform ${currentState.version.model}. Each of the ${totalNvmeShelves} NVMe shelves requires a dedicated direct connection pair. Max shelves supported with current ports: ${maxShelves}.`;
        } else {
          errorMsg = `Daisy-Chain Limit Exceeded: NS224 NVMe shelves support a maximum daisy-chain stack depth of 2 shelves per loop. Max shelves supported with current ports: ${maxShelves}. Current configuration has ${totalNvmeShelves} shelves.`;
        }
        isSupported = false;
      }
    }
  }

  // Validate aggregate disk overallocation if allocation strategy is "expand"
  const allocation = document.getElementById("disk-allocation").value;
  if (!errorMsg && allocation === "expand") {
    const inputs = document.querySelectorAll(".aggr-alloc-input");
    let allocated = 0;
    inputs.forEach(input => {
      allocated += parseInt(input.value) || 0;
    });
    if (allocated > diskCount) {
      errorMsg = `Overallocated disk assignments. Assigned ${allocated} drives, but the expansion shelf only has ${diskCount} drives.`;
      isSupported = false;
    }
  }

  let statusHtml = "";
  if (errorMsg) {
    statusHtml = `
      <div style="background: rgba(239, 68, 68, 0.15); border: 1px solid var(--color-danger); color: #fca5a5; padding: 0.75rem; border-radius: var(--radius-md); margin-top: 1rem; line-height:1.4;">
        <strong>🛑 Critical Support Block:</strong><br>
        ${errorMsg}
      </div>
    `;
    nextBtn.disabled = true;
    nextBtn.style.opacity = "0.4";
  } else if (warningMsg) {
    statusHtml = `
      <div style="background: rgba(245, 158, 11, 0.15); border: 1px solid var(--color-warning); color: #fde047; padding: 0.75rem; border-radius: var(--radius-md); margin-top: 1rem; line-height:1.4;">
        <strong>⚠️ Best Practice Warning:</strong><br>
        ${warningMsg}
      </div>
    `;
  } else if (isSupported) {
    statusHtml = `
      <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid var(--color-success); color: #a7f3d0; padding: 0.75rem; border-radius: var(--radius-md); margin-top: 1rem; line-height:1.4;">
        <strong>✓ Configuration Supported:</strong><br>
        This expansion shelf is verified as a compliant deployment option.
      </div>
    `;
  }

  notesNode.innerHTML = `
    <strong>Physical Footprint Summary:</strong><br>
    - Rack Space Required: <strong>${ruDiff} Rack Units</strong> (${isMetroCluster ? 'Symmetrical Site A+B' : 'Single Site'}) [${shelfCount * mult} shelf/shelves].<br>
    - Thermal Dissipation: <strong>${btuDiff} BTU/hr</strong> (Includes shelves + cards).<br>
    - Loop Cabling: <strong>${shelfCount * 2}x ${type === 'ns224' ? 'NVMe-oF RoCE 100G' : (type === 'ds2246' ? '6Gb SAS' : '12Gb SAS')} Connections</strong> per controller stack.
    ${mcNoticeHtml}
    ${statusHtml}
  `;

  // Build array of mock shelves for step 4 visualizer
  const mockShelves = [];
  let diskSerialIndex = 0;
  for (let s = 0; s < shelfCount; s++) {
    const disksInThisShelf = Math.min(spec.maxCount, diskCount - s * spec.maxCount);
    mockShelves.push({
      id: (currentState.shelves.length + s + 1).toString(),
      model: type.toUpperCase(),
      firmware: "Latest baseline",
      cabling: errorMsg ? "Invalid (Unsupported)" : "Proposed (Multipath HA)",
      disks: Array.from({ length: disksInThisShelf }, (_, idx) => ({
        slot: idx,
        model: "Proposed Expansion Drive",
        sizeStr: diskSizeStr,
        sizeGB: diskGB,
        type: spec.mediaType,
        firmware: "NA01",
        serial: `EXP-${diskSerialIndex++}`
      }))
    });
  }
  drawCablingTopology(currentState, "visualizer-svg-frame", mockShelves);
}

// Populates aggregate disk allocation lists with name, node, size, and number inputs
function populateAggregateDistributionList() {
  const container = document.getElementById("aggr-distribution-list");
  if (!container) return;
  container.innerHTML = "";

  const diskCount = parseInt(document.getElementById("disk-count").value) || 24;
  const targetCountNode = document.getElementById("target-disks-count");
  if (targetCountNode) targetCountNode.textContent = diskCount;

  const isMetroCluster = currentState.metrocluster && currentState.metrocluster !== "none";
  
  currentState.aggregates.forEach(aggr => {
    if (aggr.name.startsWith("aggr0")) return;
    
    // In MetroCluster, only show Site A aggregates to allocate; Site B partner is expanded symmetrically under the hood.
    if (isMetroCluster && aggr.node !== "node-a" && !aggr.node.endsWith("-a") && aggr.node !== "node-c") {
      return;
    }

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.fontSize = "0.85rem";
    row.style.color = "#fff";
    row.style.marginBottom = "0.5rem";
    
    row.innerHTML = `
      <span style="font-weight: 500;">
        ${aggr.name} <span style="color: var(--color-muted); font-size: 0.75rem;">(Node: ${aggr.node}, Usable: ${formatGB(aggr.usableGB)})</span>
      </span>
      <div style="display: flex; align-items: center; gap: 6px;">
        <input type="number" class="aggr-alloc-input form-control" data-aggr="${aggr.name}" min="0" max="${diskCount}" value="0" style="max-width: 70px; background: rgba(0,0,0,0.4); color: #fff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); text-align: center; padding: 4px 6px;">
        <span style="color: var(--color-muted); font-size: 0.75rem;">drives</span>
      </div>
    `;

    row.querySelector(".aggr-alloc-input").addEventListener("input", validateAggrDiskAllocations);
    container.appendChild(row);
  });

  validateAggrDiskAllocations();
}

// Validates disk allocation totals against shelf capacity
function validateAggrDiskAllocations() {
  const diskCount = parseInt(document.getElementById("disk-count").value) || 24;
  const inputs = document.querySelectorAll(".aggr-alloc-input");
  let allocated = 0;
  inputs.forEach(input => {
    allocated += parseInt(input.value) || 0;
  });

  const allocatedCountNode = document.getElementById("allocated-disks-count");
  if (allocatedCountNode) allocatedCountNode.textContent = allocated;

  const statusLabel = document.getElementById("aggr-allocation-status");
  if (statusLabel) {
    if (allocated > diskCount) {
      statusLabel.style.color = "var(--color-danger)";
      statusLabel.innerHTML = `🛑 Overallocated! Assigned: <strong>${allocated}</strong> / <strong>${diskCount}</strong> drives. Please reduce counts to fit shelf size.`;
    } else {
      statusLabel.style.color = "var(--color-info)";
      statusLabel.innerHTML = `Allocated: <strong>${allocated}</strong> / <strong>${diskCount}</strong> drives. (Remaining: <strong>${diskCount - allocated}</strong> will go to Spare Reserves).`;
    }
  }

  updateCapacityImpactDetails();
}

// --- Step 5: Run Calculations & Compare ---
function runModelingCalculations() {
  modeledState = JSON.parse(JSON.stringify(currentState));

  // 1. Apply ONTAP Upgrade
  const targetOntap = document.getElementById("target-ontap").value;
  if (targetOntap !== modeledState.version.ontap) {
    modeledState.version.ontap = targetOntap + " (Target)";
  }

  // 2. Apply Firmware fix
  const fixFw = document.getElementById("model-upgrade-firmware").checked;
  if (fixFw) {
    modeledState.shelves.forEach(s => {
      s.firmware = s.latestFirmware;
    });
  }

  // 3. Apply Cabling fix
  const fixCable = document.getElementById("model-fix-cabling").checked;
  if (fixCable) {
    modeledState.shelves.forEach(s => {
      s.cabling = "Multipath HA";
    });
  }

  // 4. Apply License updates
  const checkboxes = document.querySelectorAll("#license-list-form input[type='checkbox']");
  checkboxes.forEach(box => {
    const licName = box.getAttribute("data-lic");
    const isChecked = box.checked;
    
    const lic = modeledState.licenses.find(l => l.name === licName);
    if (lic) {
      lic.status = isChecked ? "active" : "disabled";
      if (isChecked) lic.details = "";
    } else if (isChecked) {
      modeledState.licenses.push({
        name: licName,
        status: "active",
        details: "",
        serial: modeledState.version.serial
      });
    }
  });

  // 5. Apply Capacity Shelves
  const shelfType = document.getElementById("shelf-type").value;
  if (shelfType !== "none") {
    const spec = { ...SHELF_SPEC_MAP[shelfType] };
    const diskCount = parseInt(document.getElementById("disk-count").value) || 0;
    const diskSizeStr = document.getElementById("disk-size").value;
    spec.mediaType = resolveMediaType(diskSizeStr);
    
    let diskGB = 0;
    const match = diskSizeStr.match(/([\d.]+)\s*([GT])B?/i);
    if (match) {
      const val = parseFloat(match[1]);
      diskGB = match[2].toUpperCase() === 'T' ? val * 1000 : val;
    }

    const shelfCount = Math.ceil(diskCount / spec.maxCount);
    const isMetroCluster = modeledState.metrocluster && modeledState.metrocluster !== "none";
    const allocation = document.getElementById("disk-allocation").value;

    if (isMetroCluster) {
      // Symmetrical Shelf Addition (Site A and Site B)
      let diskSerialIndex = 0;
      for (let s = 0; s < shelfCount; s++) {
        const disksInThisShelf = Math.min(spec.maxCount, diskCount - s * spec.maxCount);
        const shelfId = (modeledState.shelves.length / 2 + 1).toString();
        
        modeledState.shelves.push({
          id: shelfId,
          model: shelfType.toUpperCase(),
          serial: `SHFL-NEW-${shelfId}-A`,
          firmware: "Latest baseline",
          latestFirmware: "Latest baseline",
          cabling: "Multipath HA",
          disks: Array.from({ length: disksInThisShelf }, (_, idx) => ({
            slot: idx,
            model: "Expansion Model",
            sizeStr: diskSizeStr,
            sizeGB: diskGB,
            type: spec.mediaType,
            firmware: "NA01",
            serial: `EXP-${diskSerialIndex}-A`
          }))
        });

        // Add partner shelf to Site B
        modeledState.shelves.push({
          id: shelfId + "B",
          model: shelfType.toUpperCase(),
          serial: `SHFL-NEW-${shelfId}-B`,
          firmware: "Latest baseline",
          latestFirmware: "Latest baseline",
          cabling: "Multipath HA",
          disks: Array.from({ length: disksInThisShelf }, (_, idx) => ({
            slot: idx,
            model: "Expansion Model",
            sizeStr: diskSizeStr,
            sizeGB: diskGB,
            type: spec.mediaType,
            firmware: "NA01",
            serial: `EXP-${diskSerialIndex++}-B`
          }))
        });
      }

      if (allocation === "spare") {
        modeledState.spares.push({
          node: "node-a",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: diskCount
        });
        modeledState.spares.push({
          node: "node-b",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: diskCount
        });
      } else if (allocation === "expand") {
        const inputs = document.querySelectorAll(".aggr-alloc-input");
        let totalAllocatedSiteA = 0;
        inputs.forEach(input => {
          const D = parseInt(input.value) || 0;
          if (D > 0) {
            const aggrName = input.getAttribute("data-aggr");
            const aggrA = modeledState.aggregates.find(a => a.name === aggrName);
            if (aggrA) {
              // Symmetrically find partner aggregate on Node B
              const partnerAggrName = aggrName.replace("_a", "_b").replace("nodea", "nodeb").replace("node-a", "node-b");
              const aggrB = modeledState.aggregates.find(a => a.name === partnerAggrName) || 
                            modeledState.aggregates.find(a => a.node === "node-b" && !a.name.startsWith("aggr0") && a.name.substring(0, aggrName.length - 2) === aggrName.substring(0, aggrName.length - 2));

              totalAllocatedSiteA += D;
              const addedUsableGB = Math.round(D * diskGB * 0.80);

              // Expand Site A Aggregate
              aggrA.disksCount += D;
              aggrA.sizeGB += diskGB * D;
              aggrA.usableGB += addedUsableGB;
              aggrA.freeGB += addedUsableGB;

              // Expand Site B Partner Aggregate Symmetrically
              if (aggrB) {
                aggrB.disksCount += D;
                aggrB.sizeGB += diskGB * D;
                aggrB.usableGB += addedUsableGB;
                aggrB.freeGB += addedUsableGB;
              }
            }
          }
        });

        // Add remaining spares symmetrically to Site A and Site B
        const remainingSpares = Math.max(0, diskCount - totalAllocatedSiteA);
        if (remainingSpares > 0) {
          modeledState.spares.push({
            node: "node-a",
            model: "Expansion Model",
            sizeStr: diskSizeStr,
            sizeGB: diskGB,
            type: spec.mediaType,
            count: remainingSpares
          });
          modeledState.spares.push({
            node: "node-b",
            model: "Expansion Model",
            sizeStr: diskSizeStr,
            sizeGB: diskGB,
            type: spec.mediaType,
            count: remainingSpares
          });
        }
      } else if (allocation === "new") {
        const dataCount = diskCount - 4;
        const usableGB = Math.max(0, Math.round(dataCount * diskGB * 0.82));
        const totalGB = diskCount * diskGB;

        // Create new aggregate on node-a
        modeledState.aggregates.push({
          name: `aggr_expansion_a`,
          node: "node-a",
          sizeGB: totalGB,
          usableGB: usableGB,
          usedGB: 0,
          freeGB: usableGB,
          raidType: "raid_dp",
          rgSize: Math.min(24, diskCount - 2),
          disksCount: diskCount - 2,
          diskType: spec.mediaType,
          diskSizeGB: diskGB
        });

        modeledState.spares.push({
          node: "node-a",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: 2
        });

        // Create new symmetrical aggregate on node-b
        modeledState.aggregates.push({
          name: `aggr_expansion_b`,
          node: "node-b",
          sizeGB: totalGB,
          usableGB: usableGB,
          usedGB: 0,
          freeGB: usableGB,
          raidType: "raid_dp",
          rgSize: Math.min(24, diskCount - 2),
          disksCount: diskCount - 2,
          diskType: spec.mediaType,
          diskSizeGB: diskGB
        });

        modeledState.spares.push({
          node: "node-b",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: 2
        });
      }
    } else {
      // Non-MetroCluster Sizing (Standalone HA)
      let diskSerialIndex = 0;
      for (let s = 0; s < shelfCount; s++) {
        const disksInThisShelf = Math.min(spec.maxCount, diskCount - s * spec.maxCount);
        const shelfId = (modeledState.shelves.length + 1).toString();
        
        modeledState.shelves.push({
          id: shelfId,
          model: shelfType.toUpperCase(),
          serial: `SHFL-NEW-${shelfId}`,
          firmware: "Latest baseline",
          latestFirmware: "Latest baseline",
          cabling: "Multipath HA",
          disks: Array.from({ length: disksInThisShelf }, (_, idx) => ({
            slot: idx,
            model: "Expansion Model",
            sizeStr: diskSizeStr,
            sizeGB: diskGB,
            type: spec.mediaType,
            firmware: "NA01",
            serial: `EXP-${diskSerialIndex++}`
          }))
        });
      }

      if (allocation === "spare") {
        modeledState.spares.push({
          node: "node-a",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: Math.ceil(diskCount / 2)
        });
        modeledState.spares.push({
          node: "node-b",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: Math.floor(diskCount / 2)
        });
      } else if (allocation === "expand") {
        const inputs = document.querySelectorAll(".aggr-alloc-input");
        let totalAllocated = 0;
        inputs.forEach(input => {
          const D = parseInt(input.value) || 0;
          if (D > 0) {
            const aggrName = input.getAttribute("data-aggr");
            const aggr = modeledState.aggregates.find(a => a.name === aggrName);
            if (aggr) {
              totalAllocated += D;
              const addedUsableGB = Math.round(D * diskGB * 0.80);
              aggr.disksCount += D;
              aggr.sizeGB += diskGB * D;
              aggr.usableGB += addedUsableGB;
              aggr.freeGB += addedUsableGB;
            }
          }
        });

        const remainingSpares = Math.max(0, diskCount - totalAllocated);
        if (remainingSpares > 0) {
          const sparesPerNode = Math.floor(remainingSpares / modeledState.nodes.length);
          const spareRemainder = remainingSpares % modeledState.nodes.length;
          modeledState.nodes.forEach((node, idx) => {
            const count = sparesPerNode + (idx < spareRemainder ? 1 : 0);
            if (count > 0) {
              modeledState.spares.push({
                node: node.name,
                model: "Expansion Model",
                sizeStr: diskSizeStr,
                sizeGB: diskGB,
                type: spec.mediaType,
                count: count
              });
            }
          });
        }
      } else if (allocation === "new") {
        const newAggrName = `aggr_expansion_a`;
        const dataCount = diskCount - 4;
        const usableGB = Math.max(0, Math.round(dataCount * diskGB * 0.82));
        const totalGB = diskCount * diskGB;

        modeledState.aggregates.push({
          name: newAggrName,
          node: "node-a",
          sizeGB: totalGB,
          usableGB: usableGB,
          usedGB: 0,
          freeGB: usableGB,
          raidType: "raid_dp",
          rgSize: Math.min(24, diskCount - 2),
          disksCount: diskCount - 2,
          diskType: spec.mediaType,
          diskSizeGB: diskGB
        });

        modeledState.spares.push({
          node: "node-a",
          model: "Expansion Model",
          sizeStr: diskSizeStr,
          sizeGB: diskGB,
          type: spec.mediaType,
          count: 2
        });
      }
    }
  }

  // Auto-allocate recommended storage HBA cards for the modeled target to ensure compliance
  allocateHBACardsForState(modeledState);

  // 6. Connect SAN target ports in Node ports list if SAN license is active in modeled state
  const isSANLicensedModeled = modeledState.licenses.some(l => l.name === "FCP" && l.status === "active");
  if (isSANLicensedModeled) {
    const profile = getPlatformProfile(modeledState.version.model);
    if (profile.ports.san && profile.ports.san.length > 0) {
      modeledState.nodes.forEach(node => {
        profile.ports.san.forEach(p => {
          const exists = node.ports.find(port => port.name === p);
          if (exists) {
            exists.status = "up";
          } else {
            node.ports.push({ name: p, status: "up", speed: "16Gb FC", duplex: "full", type: "fc" });
          }
        });
      });
    }
  }
}

function generateCablingTableHtml(state) {
  const isMetroCluster = state.metrocluster && state.metrocluster !== "none";
  if (!state || !state.shelves || state.shelves.length === 0) {
    return `<div style="color: var(--color-muted); font-size: 0.85rem; font-style: italic; padding: 1rem; text-align: center;">No expansion or existing shelves configured to cable.</div>`;
  }
  
  const shelfType = state.shelves[0].model.toLowerCase();
  const cableType = shelfType.includes("ns224") ? "100GbE copper/optical (RoCE)" : "12Gb SAS (mini-SAS HD)";
  const allStoragePortsA = resolveStoragePorts(state, shelfType, state.shelves.length);
  const stackLimit = shelfType.includes("ns224") ? 1 : 4;
  
  // Group shelves into stacks
  const stacks = [];
  let currentStack = [];
  state.shelves.forEach((s, idx) => {
    currentStack.push(s);
    if (currentStack.length === stackLimit || idx === state.shelves.length - 1) {
      stacks.push(currentStack);
      currentStack = [];
    }
  });

  let html = `
    <table class="compare-table" style="width: 100%; font-size: 0.8rem; border-collapse: collapse; margin-top: 0.5rem; text-align: left;">
      <thead>
        <tr style="border-bottom: 2px solid var(--border-color); background: rgba(255,255,255,0.02);">
          <th style="padding: 10px 12px; font-weight: 700; color: #fff;">Source Device & Port</th>
          <th style="padding: 10px 12px; text-align: center; color: var(--color-muted); width: 40px;">Direction</th>
          <th style="padding: 10px 12px; font-weight: 700; color: #fff;">Destination Device & Port</th>
          <th style="padding: 10px 12px; font-weight: 700; color: #fff; width: 180px;">Cable Type</th>
          <th style="padding: 10px 12px; font-weight: 700; color: #fff;">Stack & Loop Path Info</th>
        </tr>
      </thead>
      <tbody>
  `;

  if (isMetroCluster) {
    stacks.forEach((stack, sIdx) => {
      const isPortExhausted = (sIdx * 2 + 1) >= allStoragePortsA.length;
      const pPort = allStoragePortsA[sIdx * 2] || "HBA port A (Exhausted)";
      const rPort = allStoragePortsA[sIdx * 2 + 1] || "HBA port B (Exhausted)";
      const stackInfo = `<span style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59,130,246,0.3); color: #8ec5fc; font-size: 0.72rem; padding: 2px 6px; border-radius: 3px; font-weight: 700;">Stack ${sIdx + 1} (Loop ${String.fromCharCode(65 + sIdx)})</span>`;

      const firstShelf = stack[0];
      const lastShelf = stack[stack.length - 1];

      // Node A primary
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;"><strong style="color: var(--color-info);">Site-A Controller: Port ${pPort}</strong></td>
          <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
          <td style="padding: 10px 12px;">Shelf ${firstShelf.id} (Site-A): IOM-A IN</td>
          <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
          <td style="padding: 10px 12px;">${stackInfo} - Node A Primary Path</td>
        </tr>
      `;
      // Node B primary
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;"><strong style="color: var(--color-info);">Site-B Controller: Port ${pPort}</strong></td>
          <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
          <td style="padding: 10px 12px;">Shelf ${firstShelf.id}B (Site-B): IOM-A IN</td>
          <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
          <td style="padding: 10px 12px;">${stackInfo} - Node B Primary Path</td>
        </tr>
      `;

      // Daisy chains
      for (let j = 0; j < stack.length - 1; j++) {
        const cur = stack[j];
        const next = stack[j+1];
        // Site A daisy chain
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;">Shelf ${cur.id}: IOM-A OUT</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;">Shelf ${next.id}: IOM-A IN</td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Site-A Daisy Chain (A)</td>
          </tr>
        `;
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;">Shelf ${cur.id}: IOM-B OUT</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;">Shelf ${next.id}: IOM-B IN</td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Site-A Daisy Chain (B)</td>
          </tr>
        `;
        // Site B daisy chain
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;">Shelf ${cur.id}B: IOM-A OUT</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;">Shelf ${next.id}B: IOM-A IN</td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Site-B Daisy Chain (A)</td>
          </tr>
        `;
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;">Shelf ${cur.id}B: IOM-B OUT</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;">Shelf ${next.id}B: IOM-B IN</td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Site-B Daisy Chain (B)</td>
          </tr>
        `;
      }

      // Return connections
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;"><strong style="color: var(--color-warning);">Site-A Controller: Port ${rPort}</strong></td>
          <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
          <td style="padding: 10px 12px;">Shelf ${lastShelf.id} (Site-A): IOM-B OUT</td>
          <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
          <td style="padding: 10px 12px;">${stackInfo} - Node A Return Loop</td>
        </tr>
      `;
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;"><strong style="color: var(--color-warning);">Site-B Controller: Port ${rPort}</strong></td>
          <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
          <td style="padding: 10px 12px;">Shelf ${lastShelf.id}B (Site-B): IOM-B OUT</td>
          <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
          <td style="padding: 10px 12px;">${stackInfo} - Node B Return Loop</td>
        </tr>
      `;

      // Sync cross connections
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;"><strong style="color: var(--color-success);">Site-A Controller: Port ${rPort}</strong></td>
          <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
          <td style="padding: 10px 12px;">Shelf ${firstShelf.id}B (Site-B): IOM-B IN</td>
          <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
          <td style="padding: 10px 12px;">${stackInfo} - DR Sync Cross-Link A</td>
        </tr>
      `;
      html += `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px 12px;"><strong style="color: var(--color-success);">Site-B Controller: Port ${rPort}</strong></td>
          <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
          <td style="padding: 10px 12px;">Shelf ${firstShelf.id} (Site-A): IOM-B IN</td>
          <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
          <td style="padding: 10px 12px;">${stackInfo} - DR Sync Cross-Link B</td>
        </tr>
      `;
    });
  } else {
    const nodes = state.nodes || [];
    const haPairsCount = Math.floor(nodes.length / 2) || 1;

    for (let pIdx = 0; pIdx < haPairsCount; pIdx++) {
      const nodeA = nodes[pIdx * 2] || { name: `node-${String.fromCharCode(97 + pIdx * 2)}` };
      const nodeB = nodes[pIdx * 2 + 1] || { name: `node-${String.fromCharCode(97 + pIdx * 2 + 1)}` };
      
      const nodeAName = nodeA.name;
      const nodeBName = nodeB.name;

      // Filter stacks for this HA pair
      const pairStacks = [];
      const pairStackIndices = [];
      stacks.forEach((stack, idx) => {
        if (idx % haPairsCount === pIdx) {
          pairStacks.push(stack);
          pairStackIndices.push(idx);
        }
      });

      if (pairStacks.length === 0) continue;

      // Group header row
      html += `
        <tr style="background: rgba(255, 255, 255, 0.05); font-weight: 700; border-bottom: 2px solid var(--border-color);">
          <td colspan="5" style="padding: 10px 12px; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">
            HA Pair ${pIdx + 1}: ${nodeAName.toUpperCase()} & ${nodeBName.toUpperCase()}
          </td>
        </tr>
      `;

      pairStacks.forEach((stack, pairStackIdx) => {
        const globalStackIdx = pairStackIndices[pairStackIdx];
        const isPortExhausted = (pairStackIdx * 2 + 1) >= allStoragePortsA.length;
        const pPort = allStoragePortsA[pairStackIdx * 2] || "HBA port A (Exhausted)";
        const rPort = allStoragePortsA[pairStackIdx * 2 + 1] || "HBA port B (Exhausted)";
        
        const stackInfo = `<span style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59,130,246,0.3); color: #8ec5fc; font-size: 0.72rem; padding: 2px 6px; border-radius: 3px; font-weight: 700;">Stack ${globalStackIdx + 1} (Loop ${String.fromCharCode(65 + globalStackIdx)})</span>`;

        const firstShelf = stack[0];
        const lastShelf = stack[stack.length - 1];

        // Path A Primary Link
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;"><strong style="color: var(--color-info);">${nodeAName}: Port ${pPort}</strong></td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;">Shelf ${firstShelf.id}: IOM-A IN</td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Path A Primary Link</td>
          </tr>
        `;
        // Path B Primary Link
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;"><strong style="color: var(--color-warning);">${nodeBName}: Port ${pPort}</strong></td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;">Shelf ${firstShelf.id}: IOM-B IN</td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Path B Primary Link</td>
          </tr>
        `;

        // Daisy chains
        for (let j = 0; j < stack.length - 1; j++) {
          const cur = stack[j];
          const next = stack[j+1];
          html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 10px 12px;">Shelf ${cur.id}: IOM-A OUT</td>
              <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
              <td style="padding: 10px 12px;">Shelf ${next.id}: IOM-A IN</td>
              <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
              <td style="padding: 10px 12px;">${stackInfo} - Daisy Chain Path A</td>
            </tr>
          `;
          html += `
            <tr style="border-bottom: 1px solid var(--border-color);">
              <td style="padding: 10px 12px;">Shelf ${cur.id}: IOM-B OUT</td>
              <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
              <td style="padding: 10px 12px;">Shelf ${next.id}: IOM-B IN</td>
              <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
              <td style="padding: 10px 12px;">${stackInfo} - Daisy Chain Path B</td>
            </tr>
          `;
        }

        // Return paths
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;">Shelf ${lastShelf.id}: IOM-A OUT</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;"><strong style="color: var(--color-info);">${nodeBName}: Port ${rPort}</strong></td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Path A Return Loop</td>
          </tr>
        `;
        html += `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 10px 12px;">Shelf ${lastShelf.id}: IOM-B OUT</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--color-muted);">➔</td>
            <td style="padding: 10px 12px;"><strong style="color: var(--color-warning);">${nodeAName}: Port ${rPort}</strong></td>
            <td style="padding: 10px 12px; color: var(--color-muted); font-size: 0.78rem;">${cableType}</td>
            <td style="padding: 10px 12px;">${stackInfo} - Path B Return Loop</td>
          </tr>
        `;
      });
    }
  }

  html += `
      </tbody>
    </table>
  `;

  return html;
}

function generateScoreBreakdownHtml(curReports, modReports) {
  let html = `
    <table class="compare-table" style="width: 100%; font-size: 0.82rem; border-collapse: collapse; margin-bottom: 0;">
      <thead>
        <tr>
          <th style="text-align: left; width: 200px;">Best Practice Rule</th>
          <th style="text-align: left; width: 220px;">Before (Current Deployment)</th>
          <th style="text-align: left;">Remediation & Action Executed</th>
          <th style="text-align: left; width: 220px;">After (Modelled Target)</th>
        </tr>
      </thead>
      <tbody>
  `;

  // Create a map of modeled reports for fast lookup
  const modMap = {};
  modReports.forEach(r => { modMap[r.id] = r; });

  curReports.forEach(curRule => {
    const modRule = modMap[curRule.id];
    if (!modRule) return;

    // Show rules that were warnings/critical before OR are warnings/critical now
    const isImpacted = curRule.status !== "compliant" || modRule.status !== "compliant";
    if (!isImpacted) return;

    // Determine status badge colors
    const beforeBadge = `<span class="status-badge ${curRule.status}" style="padding: 2px 6px; font-size: 0.75rem;">${curRule.status.toUpperCase()}</span>`;
    const afterBadge = `<span class="status-badge ${modRule.status}" style="padding: 2px 6px; font-size: 0.75rem;">${modRule.status.toUpperCase()}</span>`;

    // Action Taken description
    let actionTaken = "";
    if (curRule.status !== "compliant" && modRule.status === "compliant") {
      if (curRule.id === "BP_ONTAP_VERSION") {
        actionTaken = `Upgraded ONTAP to target release <strong>${modeledState.version.ontap}</strong>, aligning cluster with active vendor support windows.`;
      } else if (curRule.id === "BP_SHELF_CABLING") {
        actionTaken = "Remediated storage shelf connections to Multipath HA, removing single-point-of-failure (SPOF) risks.";
      } else if (curRule.id === "BP_SHELF_FIRMWARE") {
        actionTaken = "Applied latest qualified IOM disk shelf firmware baselines.";
      } else if (curRule.id === "BP_LICENSING") {
        actionTaken = "Installed valid protocol and system licenses to replace expired entitlements.";
      } else if (curRule.id === "BP_AGGR_CAPACITY") {
        actionTaken = "Added shelf and disk expansions, reducing aggregate utilization below the 85% threshold.";
      } else if (curRule.id === "BP_SPARE_DISKS") {
        actionTaken = "Allocated adequate spare drives (minimum 2 per node) to storage pools.";
      } else {
        actionTaken = curRule.remediation || "Configuration corrected to align with best practices.";
      }
    } else if (curRule.status === "compliant" && modRule.status === "compliant") {
      actionTaken = "Already compliant, maintained.";
    } else {
      actionTaken = `<span style="color: var(--color-warning);">No remediation applied.</span> Recommendation: ${modRule.recommendation}`;
    }

    html += `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        <td style="padding: 8px; vertical-align: top;">
          <div style="font-weight: 600; color: #fff;">${curRule.title}</div>
          <div style="font-size: 0.75rem; color: var(--color-muted); margin-top: 2px;">${curRule.category}</div>
        </td>
        <td style="padding: 8px; vertical-align: top; line-height: 1.4;">
          <div style="margin-bottom: 4px;">${beforeBadge}</div>
          <div style="font-size: 0.78rem; color: #d1d5db;">${curRule.description}</div>
        </td>
        <td style="padding: 8px; vertical-align: top; color: #e5e7eb; line-height: 1.4; font-size: 0.8rem;">
          ${actionTaken}
        </td>
        <td style="padding: 8px; vertical-align: top; line-height: 1.4;">
          <div style="margin-bottom: 4px;">${afterBadge}</div>
          <div style="font-size: 0.78rem; color: #d1d5db;">${modRule.description}</div>
        </td>
      </tr>
    `;
  });

  const hasImpacted = curReports.some(r => {
    const m = modMap[r.id];
    return m && (r.status !== "compliant" || m.status !== "compliant");
  });

  if (!hasImpacted) {
    html += `
      <tr>
        <td colspan="4" style="text-align: center; padding: 20px; color: var(--color-muted);">
          All best practices are fully compliant in both current and target states. No remediations required.
        </td>
      </tr>
    `;
  }

  html += `
      </tbody>
    </table>
  `;
  return html;
}

function renderCompareView() {
  const curReports = runAudit(currentState);
  const curScore = calculateComplianceScore(curReports);
  
  const modReports = runAudit(modeledState);
  const modScore = calculateComplianceScore(modReports);

  // Load Compare Panels
  document.getElementById("comp-before-ontap").textContent = currentState.version.ontap;
  document.getElementById("comp-after-ontap").textContent = modeledState.version.ontap;

  const bScoreNode = document.getElementById("comp-before-score");
  bScoreNode.textContent = `${curScore}%`;
  bScoreNode.className = "detail-value";
  bScoreNode.style.color = curScore >= 85 ? "var(--color-success)" : (curScore >= 60 ? "var(--color-warning)" : "var(--color-danger)");

  const aScoreNode = document.getElementById("comp-after-score");
  aScoreNode.textContent = `${modScore}%`;
  aScoreNode.className = "detail-value";
  aScoreNode.style.color = modScore >= 85 ? "var(--color-success)" : (modScore >= 60 ? "var(--color-warning)" : "var(--color-danger)");

  // Usable capacities sums
  const getAggrTotals = (state) => {
    let usable = 0, used = 0;
    state.aggregates.forEach(a => {
      if (a.name.startsWith("aggr0")) return;
      usable += a.usableGB;
      used += a.usedGB;
    });
    return { usable, used, free: usable - used };
  };

  const capBefore = getAggrTotals(currentState);
  const capAfter = getAggrTotals(modeledState);

  const beforeUsedPct = capBefore.usable > 0 ? (capBefore.used / capBefore.usable) * 100 : 0;
  document.getElementById("comp-before-cap-bar").innerHTML = `
    <div class="capacity-segment used" style="width: ${beforeUsedPct}%"></div>
    <div class="capacity-segment free" style="width: ${100 - beforeUsedPct}%"></div>
  `;
  document.getElementById("comp-before-cap-used").textContent = `Used: ${formatGB(capBefore.used)} (${beforeUsedPct.toFixed(1)}%)`;
  document.getElementById("comp-before-cap-free").textContent = `Usable Total: ${formatGB(capBefore.usable)}`;

  const afterUsedPct = capAfter.usable > 0 ? (capAfter.used / capAfter.usable) * 100 : 0;
  document.getElementById("comp-after-cap-bar").innerHTML = `
    <div class="capacity-segment used" style="width: ${afterUsedPct}%"></div>
    <div class="capacity-segment free" style="width: ${100 - afterUsedPct}%"></div>
  `;
  document.getElementById("comp-after-cap-used").textContent = `Used: ${formatGB(capAfter.used)} (${afterUsedPct.toFixed(1)}%)`;
  document.getElementById("comp-after-cap-free").textContent = `Usable Total: ${formatGB(capAfter.usable)}`;

  // Populate compare cabling SVG side-by-side
  drawCablingTopology(currentState, "comp-before-cabling");
  drawCablingTopology(modeledState, "comp-after-cabling");

  // Populate Compare tables
  populateStateTable(currentState, "comp-before-table-body");
  populateStateTable(modeledState, "comp-after-table-body");

  // Populate compare cabling table
  const tableContainer = document.getElementById("compare-cabling-table-container");
  if (tableContainer) {
    tableContainer.innerHTML = generateCablingTableHtml(modeledState);
  }

  // Populate compliance score breakdown
  const scoreBreakdownContainer = document.getElementById("compare-score-breakdown-container");
  if (scoreBreakdownContainer) {
    scoreBreakdownContainer.innerHTML = generateScoreBreakdownHtml(curReports, modReports);
  }
}

function populateStateTable(state, bodyId) {
  const tbody = document.getElementById(bodyId);
  tbody.innerHTML = "";

  let cablingStatus = "Multipath HA";
  state.shelves.forEach(s => {
    if (s.cabling && (s.cabling.toLowerCase().includes("single-path") || !s.cabling.toLowerCase().includes("multipath"))) {
      cablingStatus = "Single-Path HA SPOF";
    }
  });

  let totalSpares = 0;
  state.spares.forEach(sp => totalSpares += sp.count);

  const shelfCount = state.shelves.length;

  const diskTypes = {};
  state.shelves.forEach(s => {
    (s.disks || []).forEach(d => {
      const key = `${d.sizeStr} ${d.type}`;
      diskTypes[key] = (diskTypes[key] || 0) + 1;
    });
  });

  const diskTypeSummary = Object.entries(diskTypes)
    .map(([key, count]) => `${count}x ${key}`)
    .join("<br>") || "No disks detected";

  const aggregateSummary = state.aggregates && state.aggregates.length > 0
    ? `${state.aggregates.length} aggregates`
    : "No aggregates detected";

  const footprint = getSystemPhysicalFootprint(state);

  const rows = [
    { label: "Storage Shelves", val: `${shelfCount} shelves` },
    { label: "Cabling Redundancy", val: cablingStatus },
    { label: "Disk Tiers / Sizes", val: diskTypeSummary },
    { label: "Active Spare Drives", val: `${totalSpares} drives` },
    { label: "Logical Aggregates", val: aggregateSummary },
    { label: "Expired Licenses", val: state.licenses.filter(l => l.status === "expired").length + " licenses" },
    { label: "Rack Footprint (RU)", val: `${footprint.ru} U` },
    { label: "Power Budget (Watts)", val: `${footprint.watts} W` },
    { label: "Thermal Output (BTU/hr)", val: `${footprint.btu} BTU/hr` }
  ];

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.label}</td>
      <td style="font-weight: 500; line-height: 1.3;">${r.val}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Generates the HTML report section for parsed AutoSupport alerts and resolutions
function generateReportASUPAlertsHtml() {
  const alerts = currentState.alerts || [];
  if (alerts.length === 0) {
    return `
      <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid var(--color-success); padding: 1.25rem; border-radius: var(--radius-md); color: var(--color-success); font-weight: 500; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
        <svg style="width: 20px; height: 20px; fill: var(--color-success);" viewBox="0 0 24 24">
          <path d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M12 20C7.8 20 4.4 16.6 4.4 12S7.8 4 12 4 19.6 7.4 19.6 12S16.2 20 12 20M16.6 8.6L18 10L11 17L6 12L7.4 10.6L11 14.2Z" />
        </svg>
        No hardware failures, cabling faults, or critical events detected in this AutoSupport bundle.
      </div>
    `;
  }

  return `
    <table class="compare-table" style="width: 100%; font-size:0.8rem; margin-bottom: 1.5rem;">
      <thead>
        <tr>
          <th style="width: 90px;">Severity</th>
          <th style="width: 110px;">Component</th>
          <th>Issue / Alert Message</th>
          <th style="width: 100px;">Source File</th>
          <th>Recommended Resolution Path</th>
        </tr>
      </thead>
      <tbody>
        ${alerts.map(alert => {
          let badgeColor = "var(--color-warning)";
          if (alert.severity === "critical" || alert.severity === "error") {
            badgeColor = "var(--color-danger)";
          } else if (alert.severity === "info") {
            badgeColor = "var(--color-success)";
          }
          return `
            <tr>
              <td><span class="status-badge" style="background: rgba(255,255,255,0.05); color: ${badgeColor}; border: 1px solid ${badgeColor}; font-size: 0.7rem; padding: 2px 6px;">${alert.severity.toUpperCase()}</span></td>
              <td style="font-weight: 600;">${alert.component}</td>
              <td style="color: #fff; font-weight: 500;">${alert.message}</td>
              <td style="font-family: var(--font-mono); color: var(--color-info);">${alert.sourceFile}</td>
              <td style="color: var(--color-muted); font-size: 0.78rem; line-height: 1.4;">
                <strong style="color: #fff; display: block; margin-bottom: 2px;">Resolution Guidance:</strong>
                ${alert.resolution}
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
}

// --- Step 6: technical PDF report generator ---
function generateReport() {
  const frame = document.getElementById("report-frame");
  
  const curReports = runAudit(currentState);
  const curScore = calculateComplianceScore(curReports);
  
  const modReports = runAudit(modeledState);
  const modScore = calculateComplianceScore(modReports);

  const getTotals = (state) => {
    let usable = 0, used = 0;
    state.aggregates.forEach(a => {
      if (a.name.startsWith("aggr0")) return;
      usable += a.usableGB;
      used += a.usedGB;
    });
    return { usable, used, free: usable - used };
  };
  const capBefore = getTotals(currentState);
  const capAfter = getTotals(modeledState);

  const footprintBefore = getSystemPhysicalFootprint(currentState);
  const footprintAfter = getSystemPhysicalFootprint(modeledState);
  
  let rawCapBeforeGB = 0;
  (currentState.shelves || []).forEach(s => {
    (s.disks || []).forEach(d => {
      rawCapBeforeGB += (d.sizeGB || 0);
    });
  });
  
  let rawCapAfterGB = 0;
  (modeledState.shelves || []).forEach(s => {
    (s.disks || []).forEach(d => {
      rawCapAfterGB += (d.sizeGB || 0);
    });
  });

  const isMetroCluster = currentState.metrocluster && currentState.metrocluster !== "none";
  const mult = isMetroCluster ? 2 : 1;

  // Compute Footprint impacts
  const shelfType = document.getElementById("shelf-type").value;
  let ruAdded = 0;
  let wattsAdded = 0;
  let btuAdded = 0;
  let rawCapAddedGB = 0;
  let shelfCount = 0;

  // Include PCIe cards power draw
  let cardWatts = 0;
  const cards = currentState.expansionCards || [];
  cards.forEach(c => {
    const cKey = typeof c === 'string' ? c : c.cardKey;
    cardWatts += EXP_CARDS_CATALOG[cKey].power;
  });

  if (shelfType !== "none") {
    const spec = SHELF_SPEC_MAP[shelfType];
    const diskCount = parseInt(document.getElementById("disk-count").value) || 0;
    shelfCount = Math.ceil(diskCount / spec.maxCount);
    
    let diskGB = 0;
    const diskSizeStr = document.getElementById("disk-size").value;
    const match = diskSizeStr.match(/([\d.]+)\s*([GT])B?/i);
    if (match) {
      const val = parseFloat(match[1]);
      diskGB = match[2].toUpperCase() === 'T' ? val * 1000 : val;
    }

    ruAdded = spec.ru * mult;
    wattsAdded = (spec.power + cardWatts) * mult;
    btuAdded = Math.round(wattsAdded * 3.412);
    rawCapAddedGB = diskGB * diskCount * mult;
  } else {
    wattsAdded = cardWatts * mult;
    btuAdded = Math.round(cardWatts * 3.412) * mult;
  }

  const targetOntap = document.getElementById("target-ontap").value;
  const curVer = currentState.version.ontap;
  const baseCur = resolveBaseVersionKey(curVer);
  const hops = ONTAP_HOPS[baseCur] ? ONTAP_HOPS[baseCur][targetOntap] : [];
  let hopListText = `${baseCur} ➔ ` + (hops.length > 0 ? hops.join(" ➔ ") : "No upgrade required");

  // Determine Cabling Fix text
  const fixCable = document.getElementById("model-fix-cabling").checked;
  const originalHadSPOF = currentState.shelves.some(s => s.cabling && (s.cabling.toLowerCase().includes("single-path") || !s.cabling.toLowerCase().includes("multipath")));
  const cablingRemediationActive = fixCable && originalHadSPOF;

  // Build Action Steps Technical checklist
  let stepCounter = 1;
  const actionSteps = [];

  // Step 1: Pre-requisites & Cabling (MetroCluster check first)
  if (isMetroCluster) {
    actionSteps.push({
      num: stepCounter++,
      title: "Verify MetroCluster Replication & Sync Health",
      desc: "Perform cluster health verification commands to ensure both Site-A and Site-B replication states are fully synchronized prior to executing upgrades.",
      cmd: "metrocluster check run\nmetrocluster check show\nmc operation show"
    });
  }

  if (cablingRemediationActive) {
    actionSteps.push({
      num: stepCounter++,
      title: "Remediate Storage Shelf Loop Cabling",
      desc: "Connect secondary loop path cables to establish Multipath HA wiring redundancy and remove the single point of failure (SPOF).",
      cmd: "storage cabinet show\nui run -node * -command sasadmin expander_map"
    });
  }

  // Step 2: Shelf / Disk Firmware Updates
  const fixFw = document.getElementById("model-upgrade-firmware").checked;
  const originalHadOutdatedFw = currentState.shelves.some(s => s.firmware !== s.latestFirmware);
  if (fixFw && originalHadOutdatedFw) {
    actionSteps.push({
      num: stepCounter++,
      title: "Apply Storage Shelf & Disk Firmware Upgrades",
      desc: "Download and install the latest qualified firmware to ensure system stability prior to ONTAP operating system modifications.",
      cmd: "storage shelf firmware update\nstorage disk firmware update"
    });
  }

  // Step 3: PCIe Cards Mounting
  if (cards.length > 0) {
    const listText = cards.map(c => {
      const cKey = typeof c === 'string' ? c : c.cardKey;
      const slotNum = typeof c === 'string' ? '?' : c.slot;
      return `Slot ${slotNum}: ${EXP_CARDS_CATALOG[cKey].name}`;
    }).join(", ");
    actionSteps.push({
      num: stepCounter++,
      title: "Physically Mount PCIe Expansion Cards",
      desc: `Shut down controllers sequentially and insert PCIe expansion adapter cards into controller chassis slots: ${listText}.`,
      cmd: "system node halt -node <node_name> -inhibit-takeover false\nsysconfig -card"
    });
  }

  // Step 4: License updates
  const appliedLicenses = [];
  const checkboxes = document.querySelectorAll("#license-list-form input[type='checkbox']");
  checkboxes.forEach(box => {
    const licName = box.getAttribute("data-lic");
    const wasActive = currentState.licenses.some(l => l.name === licName && l.status === "active");
    if (box.checked && !wasActive) {
      appliedLicenses.push(licName);
    }
  });

  if (appliedLicenses.length > 0) {
    actionSteps.push({
      num: stepCounter++,
      title: `Install Active NetApp License Entitlements`,
      desc: `Renew and install license keys for protocol features: ${appliedLicenses.join(", ")}.`,
      cmd: `system license add -license-code <license_key_string>`
    });
  }

  // Step 5: ONTAP Software Hops
  if (hops.length > 0) {
    if (isMetroCluster) {
      actionSteps.push({
        num: stepCounter++,
        title: `Execute Rolling MetroCluster ONTAP Software Upgrade: ${hopListText}`,
        desc: "Upgrade nodes sequentially using negotiated switchover. Perform switchover Site B ➔ Upgrade Node B ➔ Switchback ➔ Repeat for Site A.",
        cmd: "metrocluster switchover -controller-replacement true\ncluster image package get -url http://internal-web/ontap_images/\ncluster image validate -version <target>\nsystem node reboot -node <site_b_node>\nmetrocluster switchback"
      });
    } else {
      actionSteps.push({
        num: stepCounter++,
        title: `Execute Multi-hop ONTAP Software Upgrade: ${hopListText}`,
        desc: "Perform rolling multi-hop updates sequential download. Validate pre-upgrade check outputs at each version upgrade block.",
        cmd: "cluster image package get -url http://internal-webserver/ontap_images/\ncluster image validate -version <target_version>\ncluster image update"
      });
    }
  }

  // Step 6: Hardware shelves
// Gather all available storage ports for LLD commands
    const allStoragePortsA = resolveStoragePorts(currentState, shelfType, shelfCount);

    if (shelfType !== "none") {
      const spec = SHELF_SPEC_MAP[shelfType];
      const stackLimit = shelfType.includes("ns224") ? 1 : 4;
      const numStacks = Math.ceil(shelfCount / stackLimit);
      
      let lldCablingDesc = `Physically mount the ${ruAdded}U shelf capacity stacks in cabinet rack. Run cabling loops according to NetApp Multipath HA best practices:<br>`;
      const nodes = currentState.nodes || [];
      const haPairsCount = Math.floor(nodes.length / 2) || 1;
      
      for (let s = 0; s < numStacks; s++) {
        const pIdx = s % haPairsCount;
        const nodeA = nodes[pIdx * 2] || { name: `node-${String.fromCharCode(97 + pIdx * 2)}` };
        const nodeB = nodes[pIdx * 2 + 1] || { name: `node-${String.fromCharCode(97 + pIdx * 2 + 1)}` };
        
        const nodeAName = nodeA.name;
        const nodeBName = nodeB.name;

        const firstIdx = s * stackLimit;
        const lastIdx = Math.min((s + 1) * stackLimit - 1, shelfCount - 1);
        const stackShelvesNum = lastIdx - firstIdx + 1;
        
        const pairStackIdx = Math.floor(s / haPairsCount);
        const pPort = allStoragePortsA[pairStackIdx * 2] || "HBA port A (Exhausted)";
        const rPort = allStoragePortsA[pairStackIdx * 2 + 1] || "HBA port B (Exhausted)";
        
        lldCablingDesc += `• <strong>Stack ${s + 1}</strong> (${stackShelvesNum} shelf/shelves): Cable to HA Pair <strong>${nodeAName.toUpperCase()} / ${nodeBName.toUpperCase()}</strong>. Connect ${nodeAName} Port <strong>${pPort}</strong> to first shelf IOM-A IN, and ${nodeBName} Port <strong>${pPort}</strong> to first shelf IOM-B IN. Connect return path to last shelf IOM-A OUT using ${nodeBName} Port <strong>${rPort}</strong>, and to last shelf IOM-B OUT using ${nodeAName} Port <strong>${rPort}</strong>.<br>`;
      }
      
      actionSteps.push({
        num: stepCounter++,
        title: `Mount and Cable Storage Shelf Loops (${shelfType.toUpperCase()})`,
        desc: lldCablingDesc,
        cmd: "storage shelf show\nstorage cabling show\nstorage disk show -container-type spare"
      });

      const allocation = document.getElementById("disk-allocation").value;
      if (allocation === "expand") {
        const inputs = document.querySelectorAll(".aggr-alloc-input");
        inputs.forEach(input => {
          const D = parseInt(input.value) || 0;
          if (D > 0) {
            const aggrName = input.getAttribute("data-aggr");
            actionSteps.push({
              num: stepCounter++,
              title: `Extend Storage Usable Aggregate: ${aggrName}`,
              desc: `Add ${D} newly inserted drives to expand aggregate capacity parameters. ONTAP will execute disk additions dynamically.`,
              cmd: `storage aggregate add-disks -aggregate ${aggrName} -diskcount ${D}`
            });
          }
        });
      } else if (allocation === "new") {
        actionSteps.push({
          num: stepCounter++,
          title: "Provision New Storage Aggregate volume",
          desc: "Construct a new RAID-DP layout aggregate pool using the newly mapped shelf drives.",
          cmd: `storage aggregate create -aggregate aggr_expansion_a -diskcount ${document.getElementById("disk-count").value - 2} -raidtype raid_dp`
        });
      }
    }
  
    const upgradeConsiderations = getUpgradeHopsConsiderations(currentState.version.ontap, targetOntap, currentState.version.model);

  let introHtml = "";
  if (isGreenfieldMode) {
    introHtml = `
      <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem; color:#e5e7eb;">
        This document details the design and deployment architecture for a new NetApp storage cluster (Model: <strong>${currentState.version.model}</strong>, Serial: <strong>${currentState.version.serial}</strong>). 
        The proposed configuration runs ONTAP <strong>${targetOntap}</strong>, achieving a Best Practice Compliance Score of <strong>${modScore}%</strong> by default.
      </p>
      <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem; color:#e5e7eb;">
        The system is cabled in a redundant Multipath HA topology with active protocol licenses. This report outlines the cabling, storage, and PCIe host interface card configuration details for the new Greenfield deployment.
      </p>
    `;
  } else {
    introHtml = `
      <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem; color:#e5e7eb;">
        This document details the modernization strategy for the NetApp storage cluster (Model: <strong>${currentState.version.model}</strong>, Serial: <strong>${currentState.version.serial}</strong>). 
        The current deployment runs ONTAP <strong>${currentState.version.ontap}</strong>, yielding a Best Practice Compliance Score of <strong>${curScore}%</strong>. 
        Critical lifecycle support limits, single path vulnerabilities, capacity buffers, and expired licenses represent exposure windows.
      </p>
      <p style="font-size: 1.05rem; line-height: 1.7; margin-bottom: 1.5rem; color:#e5e7eb;">
        Through implementation of this modeling roadmap—upgrading to ONTAP <strong>${targetOntap}</strong>, updating hardware loop pathways, resolving license key deficits, appending storage shelves, and installing PCIe host adapters—the cluster's health and best practice rating increases to <strong>${modScore}%</strong>, establishing a fully compliant storage topology.
      </p>
    `;
  }

  let metaGridHtml = "";
  if (isGreenfieldMode) {
    metaGridHtml = `
      <div class="report-meta-grid">
        <div>
          <div class="detail-label">Compliance Score</div>
          <div style="font-size: 1.4rem; font-weight:700; color:var(--color-success);">${modScore}% (Compliant)</div>
        </div>
        <div>
          <div class="detail-label">Usable Storage Volume</div>
          <div style="font-size: 1.4rem; font-weight:700; color:#fff;">${formatGB(capAfter.usable)}</div>
        </div>
        <div>
          <div class="detail-label">Firmware Alignment</div>
          <div style="font-size: 1.4rem; font-weight:700; color:#fff;">Latest Qualified</div>
        </div>
        <div>
          <div class="detail-label">Path Resiliency</div>
          <div style="font-size: 1.4rem; font-weight:700; color:#fff;">Multipath HA</div>
        </div>
      </div>
    `;
  } else {
    metaGridHtml = `
      <div class="report-meta-grid">
        <div>
          <div class="detail-label">Compliance Gain</div>
          <div style="font-size: 1.4rem; font-weight:700; color:var(--color-success);">${curScore}% ➔ ${modScore}%</div>
        </div>
        <div>
          <div class="detail-label">Usable Storage Delta</div>
          <div style="font-size: 1.4rem; font-weight:700; color:#fff;">${formatGB(capBefore.usable)} ➔ ${formatGB(capAfter.usable)}</div>
        </div>
        <div>
          <div class="detail-label">Firmware Baselines</div>
          <div style="font-size: 1.4rem; font-weight:700; color:#fff;">${fixFw ? 'Aligned' : 'No Action'}</div>
        </div>
        <div>
          <div class="detail-label">Path Resiliency</div>
          <div style="font-size: 1.4rem; font-weight:700; color:#fff;">${fixCable ? 'Multipath HA' : 'Unchanged'}</div>
        </div>
      </div>
    `;
  }

  let metroClusterDetailsHtml = "";
  if (isMetroCluster) {
    const nodes = currentState.nodes || [];
    const nodesPerSite = Math.floor(nodes.length / 2) || 1;
    let siteANodeItems = "";
    let siteBNodeItems = "";
    for (let k = 0; k < nodesPerSite; k++) {
      const nodeA = nodes[2 * k];
      const nodeB = nodes[2 * k + 1];
      if (nodeA) {
        siteANodeItems += `<li><strong>${nodeA.name.toUpperCase()}</strong> (S/N: ${nodeA.serial || "N/A"})</li>`;
      }
      if (nodeB) {
        siteBNodeItems += `<li><strong>${nodeB.name.toUpperCase()}</strong> (S/N: ${nodeB.serial || "N/A"})</li>`;
      }
    }
    metroClusterDetailsHtml = `
      <div style="margin-top: 1.25rem; padding: 1rem; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: var(--radius-md);">
        <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-info); font-size: 0.95rem; display: flex; align-items: center; gap: 0.35rem;">
          <svg style="width: 16px; height: 16px; fill: currentColor;" viewBox="0 0 24 24">
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
          </svg>
          MetroCluster DR Node Site Allocation
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 0.5rem;">
          <div style="background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.03);">
            <strong style="color: var(--color-primary); font-size: 0.85rem;">Local Site (Site-A) Nodes:</strong>
            <ul style="margin: 0.25rem 0 0 0; padding-left: 1.1rem; font-size: 0.8rem; line-height: 1.4; color: #d1d5db;">
              ${siteANodeItems}
            </ul>
          </div>
          <div style="background: rgba(0,0,0,0.15); padding: 0.5rem 0.75rem; border-radius: 4px; border: 1px solid rgba(255,255,255,0.03);">
            <strong style="color: var(--color-info); font-size: 0.85rem;">Remote Partner Site (Site-B) Nodes:</strong>
            <ul style="margin: 0.25rem 0 0 0; padding-left: 1.1rem; font-size: 0.8rem; line-height: 1.4; color: #d1d5db;">
              ${siteBNodeItems}
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  let softwareSectionHtml = "";
  let alertsSectionHtml = "";
  let complianceSectionHtml = "";
  let checklistSectionHeader = "";
  let portSectionHeader = "";
  let cablingSectionHeader = "";

  if (isGreenfieldMode) {
    complianceSectionHtml = `
      <!-- Best Practice Compliance Verification -->
      <div class="report-section">
        <h3>3. Best Practice Compliance Design Verification</h3>
        <p style="margin-bottom: 1rem; color:#e5e7eb;">The proposed design conforms completely to all NetApp hardware, software, cabling, and licensing best-practice metrics:</p>
        ${generateScoreBreakdownHtml(curReports, modReports)}
      </div>
    `;
    checklistSectionHeader = "<h3>4. Technical Execution & Implementation Plan</h3>";
    portSectionHeader = "<h3>5. Front-End Port Sizing & Connectivity Recommendations</h3>";
    cablingSectionHeader = "<h3>6. Detailed Cabling Port-to-Port Connections</h3>";
  } else {
    softwareSectionHtml = `
      <!-- Software Upgrade Hops & Risks -->
      <div class="report-section">
        <h3>3. Software Architecture Pathway</h3>
        <p style="margin-bottom: 1rem; color:#e5e7eb;">To move the cluster safely to the target ONTAP release, execution of the following upgrade path is recommended:</p>
        <div style="background: rgba(255,255,255,0.02); padding: 1.25rem; border-radius: var(--radius-md); border:1px solid var(--border-color); display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.5rem;">
          <div style="color:#fff;"><strong>Current:</strong> ONTAP ${currentState.version.ontap}</div>
          <div style="color:#fff;"><strong>Upgrade Hop Timeline:</strong> <span style="font-family:var(--font-mono); color:var(--color-info);">${hopListText}</span></div>
          <div style="font-size:0.8rem; color:var(--color-muted);">
            * Upgrades beyond 2 major versions require sequential hop installations to protect metadata schema mappings.
          </div>
        </div>

        ${upgradeConsiderations.length > 0 ? `
          <h4 style="color:#fff; font-size:1rem; margin-bottom:0.75rem;">Dynamic Step-by-Step Upgrade Risks & Considerations</h4>
          <div style="display:flex; flex-direction:column; gap:1rem; margin-bottom:1.5rem;">
            ${upgradeConsiderations.map(hop => `
              <div style="border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); background: rgba(0,0,0,0.15);">
                <h5 style="margin-top:0; margin-bottom:0.5rem; color:#fde047; font-size:0.9rem; display:flex; align-items:center; gap:0.5rem;">
                  <span style="font-size:0.6rem; background:var(--color-warning); color:#000; padding:1px 4px; border-radius:2px; font-weight:700;">
                    ${hop.directUpgrade ? "DIRECT" : "MULTI-HOP"}
                  </span>
                  ${hop.title}
                </h5>
                <div style="font-size:0.8rem; line-height:1.4; color:#d1d5db;">
                  <strong style="color:#fca5a5;">Risks:</strong>
                  <ul style="margin-top:2px; margin-bottom:6px; padding-left:15px;">
                    ${hop.risks.map(r => `<li>${r}</li>`).join("")}
                  </ul>
                  <strong style="color:#a7f3d0;">Pre-Requisites:</strong>
                  <ul style="margin-top:2px; margin-bottom:6px; padding-left:15px;">
                    ${hop.preReqs.map(r => `<li>${r}</li>`).join("")}
                  </ul>
                  <strong style="color:var(--color-info);">Verification Commands:</strong>
                  <pre style="margin-top:2px; margin-bottom:0; background:rgba(0,0,0,0.3); padding:6px; border-radius:2px; font-family:var(--font-mono); color:var(--color-info); font-size:0.75rem;">${hop.commands.join("\n")}</pre>
                </div>
              </div>
            `).join("")}
          </div>
        ` : ""}
      </div>
    `;

    alertsSectionHtml = `
      <!-- AutoSupport Event Alerts & Log Warnings -->
      <div class="report-section">
        <h3>4. AutoSupport Event Alerts & Log Warnings</h3>
        <p style="margin-bottom: 1rem; color:#e5e7eb;">The following alerts, hardware faults, and log warnings were parsed from the imported AutoSupport message bundle:</p>
        ${generateReportASUPAlertsHtml()}
      </div>
    `;

    complianceSectionHtml = `
      <!-- Best Practice Compliance Remediation Details -->
      <div class="report-section">
        <h3>5. Best Practice Compliance Remediation Details</h3>
        <p style="margin-bottom: 1rem; color:#e5e7eb;">The following analysis outlines the failing or sub-optimal best practices in the baseline configuration and the corresponding remediation actions modeled in the target design:</p>
        ${generateScoreBreakdownHtml(curReports, modReports)}
      </div>
    `;

    checklistSectionHeader = "<h3>6. Technical Execution & Implementation Plan</h3>";
    portSectionHeader = "<h3>7. Front-End Port Sizing & Connectivity Recommendations</h3>";
    cablingSectionHeader = "<h3>8. Detailed Cabling Port-to-Port Connections</h3>";
  }

  frame.innerHTML = `
    <div class="report-header">
      <h1 style="font-size: 1.8rem; margin-bottom: 0.5rem; color:#fff;">${isGreenfieldMode ? 'NetApp Architecture & Sizing Deployment Design' : 'NetApp Infrastructure Migration & Modernization Plan'}</h1>
      <p style="color: var(--color-muted); font-size: 0.95rem;">Generated on: ${new Date().toLocaleDateString()} | System Reference: ${currentState.version.serial}</p>
    </div>

    <!-- Executive Summary Section -->
    <div class="report-section">
      <h3>1. Executive Summary</h3>
      ${introHtml}
      ${metaGridHtml}
      ${metroClusterDetailsHtml}
    </div>

    <!-- Physical Sizing Impact -->
    <div class="report-section">
      <h3>2. Sizing & Power Considerations</h3>
      <p style="margin-bottom: 1rem; color:#e5e7eb;">The physical implementation details of the modeling additions are captured below:</p>
      <table class="compare-table" style="width:100%; margin-bottom: 1.5rem; font-size:0.85rem;">
        <thead>
          <tr>
            <th>Specification Metric</th>
            <th>Existing (Before)</th>
            <th>Proposed (After)</th>
            <th>Delta (Change)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cabinet Rack Space (RU)</td>
            <td>${footprintBefore.ru} U</td>
            <td>${footprintAfter.ru} U</td>
            <td style="font-weight:600; color:#34d399;">+${footprintAfter.ru - footprintBefore.ru} U ${isMetroCluster ? '(Site A & B Symmetrical)' : ''}</td>
          </tr>
          <tr>
            <td>Power Budget (Watts)</td>
            <td>${footprintBefore.watts} W</td>
            <td>${footprintAfter.watts} W</td>
            <td style="font-weight:600; color:#34d399;">+${footprintAfter.watts - footprintBefore.watts} W ${isMetroCluster ? '(Site A & B Symmetrical)' : ''}</td>
          </tr>
          <tr>
            <td>Thermal Output (BTU/hr)</td>
            <td>${footprintBefore.btu} BTU/hr</td>
            <td>${footprintAfter.btu} BTU/hr</td>
            <td style="font-weight:600; color:#34d399;">+${footprintAfter.btu - footprintBefore.btu} BTU/hr ${isMetroCluster ? '(Site A & B Symmetrical)' : ''}</td>
          </tr>
          <tr>
            <td>Raw Capacity Volume</td>
            <td>${formatGB(rawCapBeforeGB)}</td>
            <td>${formatGB(rawCapAfterGB)}</td>
            <td style="font-weight:600; color:#34d399;">+${formatGB(rawCapAfterGB - rawCapBeforeGB)} ${isMetroCluster ? '(Site A & B Symmetrical)' : ''}</td>
          </tr>
          <tr>
            <td>PCIe Expansion Cards</td>
            <td>-</td>
            <td>${cards.length} cards installed</td>
            <td style="font-weight:600; color:#fff;">Sized Symmetrically</td>
          </tr>
        </tbody>
      </table>
      
      ${!isGreenfieldMode ? `
        <h4 style="color: #fff; font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Parsed Existing Storage & Disk Drive Inventory</h4>
        ${generateReportStorageInventoryHtml(currentState)}
        
        <h4 style="color: #fff; font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Parsed Existing Aggregates & Storage Pools</h4>
        ${generateReportAggregateInventoryHtml(currentState)}
      ` : ''}

      <h4 style="color: #fff; font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Modeled Target Storage & Disk Drive Inventory</h4>
      ${generateReportStorageInventoryHtml(modeledState)}
      
      <h4 style="color: #fff; font-size: 1rem; margin-top: 1.5rem; margin-bottom: 0.75rem;">Modeled Target Aggregates & Storage Pools</h4>
      ${generateReportAggregateInventoryHtml(modeledState)}
    </div>

    ${softwareSectionHtml}
    ${alertsSectionHtml}
    ${complianceSectionHtml}

    <!-- Step-by-Step Technical action checklist -->
    <div class="report-section">
      ${checklistSectionHeader}
      <p style="margin-bottom: 1.5rem; color:#e5e7eb;">Execute these steps sequentially. Run validation commands prior to entering subsequent phases.</p>
      <div class="action-list">
        ${actionSteps.map(step => `
          <div class="action-step">
            <div class="step-num">${step.num}</div>
            <div class="step-details" style="width:100%;">
              <h4 style="color:#fff; margin-top:0;">${step.title}</h4>
              <p style="color:#d1d5db; font-size:0.85rem; margin-bottom:8px;">${step.desc}</p>
              <pre class="step-command" style="font-size:0.75rem;">${step.cmd}</pre>
            </div>
          </div>
        `).join("")}
      </div>
    </div>

    <!-- Front-End Port Sizing & connectivity recommendations -->
    <div class="report-section">
      ${portSectionHeader}
      <p style="margin-bottom: 1rem; color:#e5e7eb;">The physical network and storage Target ports have been audited for host connectivity and license alignment:</p>
      <table class="compare-table" style="width: 100%; font-size:0.8rem; margin-bottom: 1.5rem;">
        <thead>
          <tr>
            <th>Node</th>
            <th>Physical Port</th>
            <th>Assigned Role</th>
            <th>Negotiated Speed</th>
            <th>Link Status</th>
            <th>Configuration Recommendation</th>
          </tr>
        </thead>
        <tbody>
          ${generateReportPortsHtml()}
        </tbody>
      </table>
    </div>

    <!-- Detailed Cabling Port-to-Port Connections -->
    <div class="report-section">
      ${cablingSectionHeader}
      <p style="margin-bottom: 1rem; color:#e5e7eb;">The physical port-to-port connections for all storage shelf loops in the modeled target configuration are detailed below:</p>
      ${generateCablingTableHtml(modeledState)}
    </div>

    <!-- Legal Disclaimer and Indemnification Agreement -->
    <div class="report-section" style="border-top: 2px solid var(--border-color); padding-top: 1.5rem; margin-top: 2rem; page-break-inside: avoid;">
      <h3 style="color:#f87171; font-size:1.15rem; display:flex; align-items:center; gap:8px;">
        <svg style="width:20px; height:20px; fill:#f87171;" viewBox="0 0 24 24">
          <path d="M12,2L1,21H23L12,2M12,6L19.53,19H4.47L12,6M11,10V14H13V10H11M11,16V18H13V16H11Z"/>
        </svg>
        9. Legal Disclaimer & Indemnification Notice
      </h3>
      <p style="font-size: 0.8rem; color: #e5e7eb; line-height: 1.5; margin-bottom: 0.5rem;">
        <strong>NOTICE TO USER:</strong> THIS REPORT IS AN AUTOMATED ESTIMATION AND PROPOSAL AND IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. BY PRINTING, DOWNLOADING, SHARING, OR EXECUTING THIS PLAN, YOU ACKNOWLEDGE AND AGREE TO FULLY INDEMNIFY, DEFEND, AND HOLD HARMLESS THE AUTHORS, CREATORS, AND DISTRIBUTORS OF THIS TOOL FROM ANY AND ALL CLAIMS, LIABILITIES, DAMAGES, COSTS, LOSS OF DATA, DOWNTIME, OR SYSTEM FAILURE RESULTING FROM THE USE OR MISUSE OF THIS MATERIAL.
      </p>
      <p style="font-size: 0.8rem; color: var(--color-muted); line-height: 1.5;">
        All physical rack installations, cable topologies, card slots, aggregate layouts, and ONTAP firmware updates must be manually reviewed and approved by certified NetApp professionals against official hardware and platform documentation.
      </p>
    </div>
  `;

  document.getElementById("print-report-btn").addEventListener("click", () => {
    window.print();
  });
}