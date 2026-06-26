/**
 * NetApp Best Practice Rules Engine
 * Audits a parsed system state and returns compliance results.
 */

import { getPlatformProfile, compareVersions, EXP_CARDS_CATALOG, PLATFORM_SLOT_DETAILS } from './compatibility.js';

export const ONTAP_LIFECYCLE = {
  "9.7": { status: "critical", label: "End of Support", desc: "ONTAP 9.7 entered End of Support in October 2022. No security patches or bug fixes are provided. Immediate upgrade is critical." },
  "9.8": { status: "warning", label: "Limited Support", desc: "ONTAP 9.8 is in Limited Support. Only critical security fixes are provided." },
  "9.9.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.9.1 is in Limited Support. Only critical security fixes are provided." },
  "9.10.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.10.1 is in Limited Support." },
  "9.11.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.11.1 is in Limited Support." },
  "9.12.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.12.1 is in Limited Support." },
  "9.13.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.13.1 entered Limited Support in early 2026." },
  "9.14.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.14.1 is in General Support." },
  "9.15.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.15.1 is in General Support (GA)." },
  "9.16.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.16.1 is in General Support (GA) and is a stable recommended baseline." },
  "9.17.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.17.1 is in General Support (GA)." },
  "9.18.1": { status: "compliant", label: "Active Support (Latest Stable)", desc: "ONTAP 9.18.1 is in General Support (GA) and is a modern recommended baseline." },
  "9.19.1": { status: "compliant", label: "Active Support (Latest Release)", desc: "ONTAP 9.19.1 is the latest General Support (GA) release, delivering NVMe-oF and AI optimizations." },
  "9.20.1": { status: "compliant", label: "Active Support (New Release)", desc: "ONTAP 9.20.1 is a modern General Support (GA) release delivering cyber vault and cyber resiliency features." },
  "9.21.1": { status: "compliant", label: "Active Support (Planned Release)", desc: "ONTAP 9.21.1 is the planned General Support (GA) release for late 2026." },
  "9.20.1": { status: "compliant", label: "Active Support (New Release)", desc: "ONTAP 9.20.1 is a modern General Support (GA) release delivering cyber vault and cyber resiliency features." },
  "9.21.1": { status: "compliant", label: "Active Support (Planned Release)", desc: "ONTAP 9.21.1 is the planned General Support (GA) release for late 2026." },
  "9.20.1": { status: "compliant", label: "Active Support (New Release)", desc: "ONTAP 9.20.1 is a modern General Support (GA) release delivering cyber vault and advanced file security controls." },
  "9.21.1": { status: "compliant", label: "Active Support (Planned Release)", desc: "ONTAP 9.21.1 is the planned General Support (GA) release for late 2026." }
};

function getPlatformMaxDrives(model) {
  const upper = (model || "").toUpperCase();
  if (upper.includes("A1K") || upper.includes("9500") || upper.includes("9000") || upper.includes("A900")) return 1440;
  if (upper.includes("8700") || upper.includes("8300") || upper.includes("C800") || upper.includes("A90") || upper.includes("A70")) return 720;
  if (upper.includes("A800") || upper.includes("C400")) return 720;
  if (upper.includes("A400") || upper.includes("8200")) return 480;
  if (upper.includes("A250") || upper.includes("C250") || upper.includes("A300") || upper.includes("A150")) return 240;
  if (upper.includes("A50") || upper.includes("A30") || upper.includes("C30") || upper.includes("C60") || upper.includes("2820") || upper.includes("2750") || upper.includes("2720")) return 144;
  return 144;
}

export function runAudit(systemState) {
  const reports = [];
  
  // Helper to add reports
  const addReport = (id, title, category, status, description, recommendation, remediation) => {
    reports.push({ id, title, category, status, description, recommendation, remediation });
  };

  // --- Rule 1: ONTAP Lifecycle Support ---
  const ontapVer = systemState.version.ontap;
  let baseVer = "Unknown";
  const verMatch = ontapVer.match(/^(\d+\.\d+(\.\d+)?)/);
  if (verMatch) baseVer = verMatch[1];

  const lifecycle = ONTAP_LIFECYCLE[baseVer] || { status: "warning", label: "Unknown Support Lifecycle", desc: "Check NetApp Support Site for lifecycle details." };
  
  addReport(
    "BP_ONTAP_VERSION",
    "ONTAP Software Release Support Lifecycle",
    "Software",
    lifecycle.status,
    `System runs ONTAP ${ontapVer} which is classified as ${lifecycle.label}. ${lifecycle.desc}`,
    "Upgrade cluster to a supported release (ONTAP 9.18.1 is recommended for modern hybrid and all-flash deployments).",
    `Execute ONTAP software upgrade to ONTAP 9.18.1 following the hop path (current version: ${ontapVer}).`
  );

  // --- Rule 2: Shelf Cabling (Multipath HA) ---
  let singlePathShelves = [];
  systemState.shelves.forEach(shelf => {
    if (shelf.cabling && (shelf.cabling.toLowerCase().includes("single-path") || !shelf.cabling.toLowerCase().includes("multipath"))) {
      singlePathShelves.push(shelf.id);
    }
  });

  if (singlePathShelves.length > 0) {
    addReport(
      "BP_SHELF_CABLING",
      "Multipath Storage Shelf Connectivity",
      "Hardware",
      "critical",
      `Shelf/shelves [${singlePathShelves.join(", ")}] are cabled using Single-Path HA, which represents a single point of failure (SPOF) for SAS/NVMe controller connections.`,
      "Re-cable the storage loops to achieve Multipath HA cabling. Connect both controller SAS/NVMe adapter ports to both SAS/NVMe shelf I/O Modules (IOMs).",
      `Verify cabling path, shut down SAS loops sequentially, and connect secondary path cables from Controller slots to Shelf ${singlePathShelves.join(", ")} IOM-B ports.`
    );
  } else {
    addReport(
      "BP_SHELF_CABLING",
      "Multipath Storage Shelf Connectivity",
      "Hardware",
      "compliant",
      "All shelf stacks are cabled using redundant Multipath HA paths. No cabling SPOF detected.",
      "None required.",
      ""
    );
  }

  // --- Rule 3: Shelf Firmware Matching ---
  let outdatedShelves = [];
  systemState.shelves.forEach(shelf => {
    if (shelf.firmware && shelf.latestFirmware && shelf.firmware !== shelf.latestFirmware) {
      outdatedShelves.push({ id: shelf.id, cur: shelf.firmware, latest: shelf.latestFirmware });
    }
  });

  if (outdatedShelves.length > 0) {
    const list = outdatedShelves.map(s => `Shelf ${s.id} (${s.cur} vs latest ${s.latest})`).join(", ");
    addReport(
      "BP_SHELF_FIRMWARE",
      "Storage Shelf IOM Firmware Currency",
      "Software",
      "warning",
      `Storage shelf I/O module firmware is outdated on: ${list}.`,
      "Download and install the latest shelf firmware (v0224 for DS224C, v0130 for NS224). This can be done non-disruptively.",
      `Download shelf firmware update files and install online using the 'storage shelf firmware update' command.`
    );
  } else {
    addReport(
      "BP_SHELF_FIRMWARE",
      "Storage Shelf IOM Firmware Currency",
      "Software",
      "compliant",
      "All storage shelves are running the latest qualified firmware versions.",
      "None required.",
      ""
    );
  }

  // --- Rule 4: Spare Disk Availability ---
  const activeDiskTypes = {};
  systemState.aggregates.forEach(aggr => {
    if (aggr.name.startsWith("aggr0")) return;
    const key = `${aggr.node}_${aggr.diskType}_${aggr.diskSizeGB}`;
    activeDiskTypes[key] = {
      node: aggr.node,
      type: aggr.diskType,
      sizeGB: aggr.diskSizeGB
    };
  });

  const spareAuditResults = [];
  Object.keys(activeDiskTypes).forEach(key => {
    const active = activeDiskTypes[key];
    const matchingSpares = systemState.spares.filter(s => 
      s.node === active.node && 
      s.type === active.type && 
      Math.abs(s.sizeGB - active.sizeGB) < 50
    );
    const count = matchingSpares.reduce((sum, s) => sum + s.count, 0);
    spareAuditResults.push({ ...active, count });
  });

  let spareAlerts = [];
  spareAuditResults.forEach(res => {
    if (res.count === 0) {
      spareAlerts.push({ status: "critical", msg: `${res.node} has ZERO spare drives for media type ${res.type} (${res.sizeGB}GB)` });
    } else if (res.count < 2) {
      spareAlerts.push({ status: "warning", msg: `${res.node} has only ${res.count} spare drive (minimum recommended is 2) for media type ${res.type} (${res.sizeGB}GB)` });
    }
  });

  if (spareAlerts.length > 0) {
    const worstStatus = spareAlerts.some(a => a.status === "critical") ? "critical" : "warning";
    const desc = "Spare drive audit results:\n" + spareAlerts.map(a => `- ${a.msg}`).join("\n");
    addReport(
      "BP_SPARE_DISKS",
      "Spare Disk Drive Reserves",
      "Hardware",
      worstStatus,
      desc,
      "Ensure a minimum of 2 spare disks of each size and type are available on each node in the cluster. Assign spare drives to nodes currently running short.",
      "Provision additional drives or re-allocate spares to resolve spare disk shortages."
    );
  } else {
    addReport(
      "BP_SPARE_DISKS",
      "Spare Disk Drive Reserves",
      "Hardware",
      "compliant",
      "Cluster has adequate spare disk reserves (at least 2 spares for each active media type and size per node).",
      "None required.",
      ""
    );
  }

  // --- Rule 5: RAID Group Sizes ---
  let raidGroupWarnings = [];
  systemState.aggregates.forEach(aggr => {
    if (aggr.name.startsWith("aggr0")) return;
    const isSata = aggr.diskType.toLowerCase().includes("sata");
    const isSsd = aggr.diskType.toLowerCase().includes("ssd") || aggr.diskType.toLowerCase().includes("nvme");
    
    if (isSata && aggr.rgSize > 20) {
      raidGroupWarnings.push(`Aggregate ${aggr.name} has RAID group size of ${aggr.rgSize} which exceeds the best-practice limit of 20 disks for SATA media.`);
    } else if (isSsd && aggr.rgSize > 28) {
      raidGroupWarnings.push(`Aggregate ${aggr.name} has RAID group size of ${aggr.rgSize} which exceeds the best-practice limit of 28 disks for SSD/NVMe media.`);
    } else if (!isSata && !isSsd && aggr.rgSize > 26) {
      raidGroupWarnings.push(`Aggregate ${aggr.name} has RAID group size of ${aggr.rgSize} which exceeds the best-practice limit of 26 disks for SAS HDD media.`);
    }
  });

  if (raidGroupWarnings.length > 0) {
    addReport(
      "BP_RAID_GROUP_SIZE",
      "RAID Group Sizing Boundaries",
      "Hardware",
      "warning",
      raidGroupWarnings.join("\n"),
      "Modify the maximum RAID group size for future allocations to fit within NetApp guidelines (SATA <= 20, SAS <= 26, SSD/NVMe <= 28).",
      "Modify aggregate options using the command 'storage aggregate modify -aggregate <name> -maxraidsize <limit>' to enforce recommended boundaries."
    );
  } else {
    addReport(
      "BP_RAID_GROUP_SIZE",
      "RAID Group Sizing Boundaries",
      "Hardware",
      "compliant",
      "All active aggregate RAID groups conform to sizing limits (SATA <= 20, SAS <= 26, SSD/NVMe <= 28).",
      "None required.",
      ""
    );
  }

  // --- Rule 6: Aggregate Space / Capacity ---
  let capacityAlerts = [];
  systemState.aggregates.forEach(aggr => {
    if (aggr.usableGB > 0) {
      const pct = (aggr.usedGB / aggr.usableGB) * 100;
      if (pct > 90) {
        capacityAlerts.push({ name: aggr.name, pct: pct, status: "critical" });
      } else if (pct > 85) {
        capacityAlerts.push({ name: aggr.name, pct: pct, status: "warning" });
      }
    }
  });

  if (capacityAlerts.length > 0) {
    const worstCapStatus = capacityAlerts.some(a => a.status === "critical") ? "critical" : "warning";
    const desc = "Capacity thresholds exceeded:\n" + capacityAlerts.map(a => `- Aggregate ${a.name} is ${a.pct.toFixed(1)}% full`).join("\n");
    addReport(
      "BP_AGGR_CAPACITY",
      "Storage Aggregate Usable Capacity Thresholds",
      "Capacity",
      worstCapStatus,
      desc,
      "Perform storage expansion by adding disk drives/shelves, migrate volumes to less loaded aggregates, delete unused snapshots, or enable storage efficiency features (deduplication, compression).",
      "Add additional shelf capacity or disks and assign them to the affected aggregates, or execute volume migration steps."
    );
  } else {
    addReport(
      "BP_AGGR_CAPACITY",
      "Storage Aggregate Usable Capacity Thresholds",
      "Capacity",
      "compliant",
      "All aggregates have healthy capacity buffers (all active aggregates are under 85% full).",
      "None required.",
      ""
    );
  }

  // --- Rule 7: License Expiration / Health ---
  let expiredLic = [];
  systemState.licenses.forEach(lic => {
    if (lic.status === "expired" || lic.status === "disabled") {
      expiredLic.push(`${lic.name} (${lic.status})`);
    }
  });

  if (expiredLic.length > 0) {
    addReport(
      "BP_LICENSING",
      "Feature License Currency and Validity",
      "Licensing",
      "critical",
      `Critical system licenses are expired or inactive: ${expiredLic.join(", ")}. This may cause replication failure or block crucial storage services.`,
      "Contact NetApp account team to renew license entitlements and install new active license keys.",
      "Obtain valid NetApp license keys and apply them using the 'system license add -license-code <code>' command."
    );
  } else {
    addReport(
      "BP_LICENSING",
      "Feature License Currency and Validity",
      "Licensing",
      "compliant",
      "All installed license entitlements (NFS, CIFS, SAN Protocols, SnapMirror) are active and valid.",
      "None required.",
      ""
    );
  }

  // --- Rule 8: Front-End Port Assignments vs Licensed Protocols ---
  const activeFcp = systemState.licenses.some(l => l.name === "FCP" && l.status === "active");
  
  let portsDown = [];
  let hasFcPorts = false;
  
  systemState.nodes.forEach(node => {
    if (node.ports) {
      node.ports.forEach(p => {
        const speed = p.speed.toLowerCase();
        const type = p.type ? p.type.toLowerCase() : "";
        const isFc = speed.includes("fc") || speed.includes("gbps") || type.includes("fc") || type.includes("fcp");
        if (isFc) hasFcPorts = true;
        
        if (p.status === "down" && (type.includes("data") || type.includes("fc"))) {
          portsDown.push(`${node.name} port ${p.name}`);
        }
      });
    }
  });

  if (activeFcp && !hasFcPorts) {
    addReport(
      "BP_PORT_ASSIGNMENT",
      "Front-End SAN Port Validation",
      "Network",
      "critical",
      "Fibre Channel Protocol (FCP) block licensing is enabled, but no physical SAN Target ports (HBAs) were detected in system configuration.",
      "Install physical FC host adapter expansion cards (e.g. UT2 16Gb/32Gb cards) to configure FCP Target LUN ports.",
      "Physically install HBA expansion cards, verify ports are configured in target mode via 'fcp port modify', and connect to SAN fabric switches."
    );
  } else if (portsDown.length > 0) {
    addReport(
      "BP_PORT_ASSIGNMENT",
      "Front-End Target Port Link Status",
      "Network",
      "warning",
      `The following configured data target ports are in offline/DOWN state: ${portsDown.join(", ")}. This represents degraded host path redundancy.`,
      "Verify switch cabling connections. Check physical SFPs, transceiver modules, and host switch port configurations.",
      "Check cabling connections and execute 'network port show -link' to verify status changes."
    );
  } else {
    addReport(
      "BP_PORT_ASSIGNMENT",
      "Front-End Port Assignment Validation",
      "Network",
      "compliant",
      "Front-end port assignments align with active licensing. All target ports are online and active.",
      "None required.",
      ""
    );
  }

  // --- Rule 9: Back-End Storage Loop Speed & Protocol Check ---
  let backendIssues = [];
  const modelUpper = systemState.version.model.toUpperCase();
  
  systemState.shelves.forEach(shelf => {
    const shelfModel = shelf.model.toLowerCase();
    
    if (shelfModel === "ns224") {
      const isSasOnly = modelUpper.includes("A220") || modelUpper.includes("C190") || modelUpper.includes("FAS8200") || modelUpper.includes("FAS27") || modelUpper.includes("FAS25");
      if (isSasOnly) {
        backendIssues.push(`High-speed NVMe NS224 shelf connected to ${systemState.version.model} which only supports 12G/6G SAS loops. This is a critical protocol mismatch.`);
      }
    }
    
    if (shelfModel === "ds2246") {
      const isModernFas = modelUpper.includes("8300") || modelUpper.includes("8700") || modelUpper.includes("9500") || modelUpper.includes("A400") || modelUpper.includes("A900") || modelUpper.includes("C400");
      if (isModernFas) {
        backendIssues.push(`Legacy 6G SAS Shelf (DS2246) cabled to a high-speed 12G SAS loop. This forces the entire loop to degrade to 6G SAS speeds, cutting bandwidth by 50%.`);
      }
    }
  });

  if (backendIssues.length > 0) {
    const worstBackendStatus = backendIssues.some(msg => msg.includes("protocol mismatch")) ? "critical" : "warning";
    addReport(
      "BP_BACKEND_PORT_SPEED",
      "Back-End Storage Loop Speed & Protocol Alignment",
      "Hardware",
      worstBackendStatus,
      backendIssues.join("\n"),
      "Replace mismatched shelves or isolate them on dedicated PCIe expansion adapter loop ports. Avoid mixing 6G SAS-2 and 12G SAS-3 shelves on the same controller loop stack.",
      "Identify the affected adapter stacks using 'storage cabling show' and isolate legacy shelves on separate host loops."
    );
  } else {
    addReport(
      "BP_BACKEND_PORT_SPEED",
      "Back-End Storage Loop Speed & Protocol Alignment",
      "Hardware",
      "compliant",
      "Back-end SAS/NVMe loops are operating at maximum supported speed profiles with no speed degradation or protocol mismatches.",
      "None required.",
      ""
    );
  }

  // --- Rule 10: MetroCluster Health & Symmetrical Configuration (NEW) ---
  if (systemState.metrocluster && systemState.metrocluster !== "none") {
    const activeMcLicense = systemState.licenses.some(l => l.name === "MetroCluster" && l.status === "active");
    let mcWarnings = [];
    
    if (!activeMcLicense) {
      mcWarnings.push("MetroCluster replication is enabled, but the MetroCluster protocol license key is missing or expired.");
    }
    
    const dataAggrsA = systemState.aggregates.filter(a => a.node === "node-a" && !a.name.startsWith("aggr0"));
    const dataAggrsB = systemState.aggregates.filter(a => a.node === "node-b" && !a.name.startsWith("aggr0"));
    
    let sumDisksA = 0;
    let sumDisksB = 0;
    dataAggrsA.forEach(a => sumDisksA += a.disksCount);
    dataAggrsB.forEach(a => sumDisksB += a.disksCount);
    
    if (Math.abs(sumDisksA - sumDisksB) > 4) {
      mcWarnings.push(`Asymmetrical storage layout: Site-A has ${sumDisksA} disks in aggregates, while Site-B has ${sumDisksB} disks. Symmetrical sizes are required for disaster recovery failovers.`);
    }

    if (mcWarnings.length > 0) {
      const mcStatus = !activeMcLicense ? "critical" : "warning";
      addReport(
        "BP_METROCLUSTER",
        `MetroCluster ${systemState.metrocluster.toUpperCase()} DR Configuration Health`,
        "Disaster Recovery",
        mcStatus,
        mcWarnings.join("\n"),
        "Renew license keys if expired. Balance aggregate layouts symmetrically across nodes by configuring identical disk pools and spare reserves.",
        "Add valid 'MetroCluster' license keys via 'system license add' and balance remote storage pools."
      );
    } else {
      addReport(
        "BP_METROCLUSTER",
        `MetroCluster ${systemState.metrocluster.toUpperCase()} DR Configuration Health`,
        "Disaster Recovery",
        "compliant",
        `Symmetrical MetroCluster DR cluster configuration detected. Remote sync mirroring loops are fully redundant.`,
        "None required.",
        ""
      );
    }
  }

  // --- Rule 11: PCIe Card Slots and Recommendations ---
  const cards = systemState.expansionCards || [];
  const profile = getPlatformProfile(systemState.version.model);
  const slotCount = profile.maxPcieSlots || 2;
  const slotDetails = PLATFORM_SLOT_DETAILS[slotCount] || PLATFORM_SLOT_DETAILS[2];
  
  let cardWarnings = [];
  let cardCount = cards.length;
  
  if (cardCount > slotCount) {
    cardWarnings.push(`Physical PCIe slot limit exceeded: System has ${cardCount} cards configured but only supports up to ${slotCount} slots.`);
  }
  
  cards.forEach(c => {
    const cardSpec = EXP_CARDS_CATALOG[c.cardKey];
    if (!cardSpec) return;
    
    // Check if card is supported on the platform
    if (!profile.supportedCards.includes(c.cardKey)) {
      cardWarnings.push(`Card ${cardSpec.name} is NOT officially supported on platform ${systemState.version.model}.`);
    }
    
    // Check version compatibility
    if (compareVersions(systemState.version.ontap, cardSpec.minOntap) < 0) {
      cardWarnings.push(`Card ${cardSpec.name} requires ONTAP version >= ${cardSpec.minOntap} but the system is running ${systemState.version.ontap}.`);
    }
    
    // Find slot info
    const slotInfo = slotDetails.find(s => s.num === c.slot);
    if (slotInfo) {
      // Check bandwidth constraint (100G in x8 slot)
      if (cardSpec.speed.includes("100G") && slotInfo.type.includes("x8")) {
        cardWarnings.push(`Bandwidth bottleneck: ${cardSpec.name} in Slot ${c.slot} (${slotInfo.type}) will operate at degraded speeds. x16 slots are recommended.`);
      }
      
      // Check category match
      if (slotInfo.recType !== "any" && slotInfo.recType !== cardSpec.type) {
        cardWarnings.push(`Sub-optimal slot placement: ${cardSpec.name} in Slot ${c.slot} deviates from best practice (slot is optimized for ${slotInfo.recType.toUpperCase()} adapters).`);
      }
    } else {
      cardWarnings.push(`Invalid slot assignment: Slot ${c.slot} does not exist on platform ${systemState.version.model}.`);
    }
  });

  if (cardWarnings.length > 0) {
    addReport(
      "BP_PCIE_SLOTS",
      "PCIe Interface Expansion Card Configuration",
      "Hardware",
      "warning",
      cardWarnings.join("\n"),
      "Re-allocate PCIe cards to optimal slots matching best practices, or upgrade ONTAP/platform to a compatible configuration.",
      "Adjust slot placements or platform models to resolve card incompatibilities."
    );
  } else if (cardCount > 0) {
    addReport(
      "BP_PCIE_SLOTS",
      "PCIe Interface Expansion Card Configuration",
      "Hardware",
      "compliant",
      "All PCIe cards are fully supported, meet version prerequisites, and are placed in recommended optimal slots.",
      "None required.",
      ""
    );
  }

  // --- Rule 12: Storage Platform Limits & Storage Adapter Ports ---
  const upperModel = (systemState.version.model || "").toUpperCase();
  const maxDrives = getPlatformMaxDrives(systemState.version.model);
  
  let totalDrives = 0;
  systemState.shelves.forEach(s => {
    if (s.disks) totalDrives += s.disks.length;
  });
  
  let storageWarnings = [];
  if (totalDrives > maxDrives) {
    storageWarnings.push(`Total drive limit exceeded: System has ${totalDrives} drives configured, but the ${systemState.version.model} platform supports a maximum of ${maxDrives} drives.`);
  }

  // Count available storage ports on Node A
  const nodeA = systemState.nodes.find(n => n.name === "node-a" || n.name.endsWith("-a") || n.name === "node-1") || systemState.nodes[0];
  if (nodeA) {
    const nodes = systemState.nodes || [];
    const haPairsCount = Math.floor(nodes.length / 2) || 1;

    let totalNvmeShelves = 0;
    let totalSasShelves = 0;
    systemState.shelves.forEach(s => {
      if (s.model && s.model.toLowerCase() === "ns224") totalNvmeShelves++;
      else totalSasShelves++;
    });

    const nvmeShelvesCount = Math.ceil(totalNvmeShelves / haPairsCount);
    const sasShelvesCount = Math.ceil(totalSasShelves / haPairsCount);

    const ports = nodeA.ports || [];
    let availableRocePorts = 0;
    let availableSasPorts = 0;
    
    ports.forEach(p => {
      const name = p.name.toLowerCase();
      const speed = (p.speed || "").toLowerCase();
      const type = (p.type || "").toLowerCase();
      
      const isRoce = (name.startsWith("e0") || name.startsWith("e1")) && (speed.includes("100g") || speed.includes("roce") || type.includes("storage"));
      const isSas = (name.startsWith("0") || type.includes("storage")) && (speed.includes("sas") || speed.includes("6g") || speed.includes("12g") || (!speed && (name.startsWith("0a") || name.startsWith("0b") || name.startsWith("0c") || name.startsWith("0d"))));
      
      if (isRoce) availableRocePorts++;
      else if (isSas) availableSasPorts++;
    });

    const isHighEnd = ['AFF A1K', 'AFF A90', 'AFF A70', 'AFF A900', 'FAS9500'].some(m => upperModel.includes(m));
    const requiredRocePorts = isHighEnd ? Math.ceil(nvmeShelvesCount / 2) * 2 : nvmeShelvesCount * 2;
    const requiredSasPorts = Math.ceil(sasShelvesCount / 4) * 2;

    if (nvmeShelvesCount > 0 && availableRocePorts < requiredRocePorts) {
      storageWarnings.push(`Storage Port Exhaustion (NVMe-oF RoCE): Required ports per controller is ${requiredRocePorts} (for ${nvmeShelvesCount} NVMe shelves), but only ${availableRocePorts} 100GbE RoCE ports are available on Node A. Please add a RoCE HBA adapter card.`);
    }
    if (sasShelvesCount > 0 && availableSasPorts < requiredSasPorts) {
      storageWarnings.push(`Storage Port Exhaustion (SAS): Required SAS ports per controller is ${requiredSasPorts} (for ${sasShelvesCount} SAS shelves), but only ${availableSasPorts} SAS ports are available on Node A. Please add a SAS HBA adapter card.`);
    }

    if (nvmeShelvesCount > 1 && !isHighEnd) {
      storageWarnings.push(`Daisy-Chaining Not Supported: NVMe shelf daisy-chaining is not supported on platform ${systemState.version.model}. Each of the ${nvmeShelvesCount} NS224 shelves requires a dedicated direct connection pair.`);
    } else if (nvmeShelvesCount > 2 && isHighEnd) {
      storageWarnings.push(`Daisy-Chain Limit Exceeded: NS224 NVMe shelves support a maximum daisy-chain stack depth of 2 shelves per loop. Current configuration has ${nvmeShelvesCount} shelves.`);
    }
  }

  if (storageWarnings.length > 0) {
    addReport(
      "BP_STORAGE_LIMITS",
      "Storage Sizing and Backend Controller Ports Validation",
      "Hardware",
      "warning",
      storageWarnings.join("\n"),
      "Add SAS HBA (sas_hba_12g_4port) or RoCE HBA (roce_hba_100g_2port) expansion cards to support additional shelves, or reduce drive count to fit platform limits.",
      "Check platform specs and add appropriate HBA interface cards to available slots."
    );
  } else if (totalDrives > 0) {
    addReport(
      "BP_STORAGE_LIMITS",
      "Storage Sizing and Backend Controller Ports Validation",
      "Hardware",
      "compliant",
      "All storage shelves and drive capacities reside within platform hardware limits, and controllers have adequate ports to cable the loops.",
      "None required.",
      ""
    );
  }

  return reports;
}

// Calculate an overall compliance score (0 - 100)
export function calculateComplianceScore(auditReports) {
  if (auditReports.length === 0) return 100;
  
  let totalScore = 0;
  let maxScore = auditReports.length * 10;
  
  auditReports.forEach(r => {
    if (r.status === "compliant") {
      totalScore += 10;
    } else if (r.status === "warning") {
      totalScore += 5;
    } else if (r.status === "critical") {
      totalScore += 0;
    }
  });
  
  return Math.round((totalScore / maxScore) * 100);
}
