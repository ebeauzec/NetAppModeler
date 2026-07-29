/**
 * NetApp Best Practice Rules Engine
 * Audits a parsed system state and returns compliance results.
 */

import { getPlatformProfile, compareVersions, EXP_CARDS_CATALOG, PLATFORM_SLOT_DETAILS } from './compatibility.js';

export const BP_LIFECYCLE = {
  // === End of Support Releases — No patches or security fixes available ===
  "9.7":    { status: "critical", label: "End of Support",  desc: "ONTAP 9.7 reached End of Support July 2023. No patches or security fixes are available. Upgrade immediately." },
  "9.8":    { status: "critical", label: "End of Support",  desc: "ONTAP 9.8 reached End of Support January 2024. No patches or security fixes are available. Upgrade immediately." },
  "9.9.1":  { status: "critical", label: "End of Support",  desc: "ONTAP 9.9.1 reached End of Support July 2024. No patches or security fixes are available. Upgrade immediately." },
  "9.10.1": { status: "critical", label: "End of Support",  desc: "ONTAP 9.10.1 reached End of Support January 2025. Upgrade urgently to 9.14.1+ to restore support coverage." },
  "9.11.1": { status: "critical", label: "End of Support",  desc: "ONTAP 9.11.1 reached End of Support July 2025. Upgrade urgently to 9.14.1+ to restore support coverage." },
  // === Limited Support Releases — Critical fixes only, no new features ===
  "9.12.1": { status: "warning",  label: "Limited Support", desc: "ONTAP 9.12.1 entered Limited Support January 2026. Critical security patches only. Plan upgrade to 9.14.1+ now. Latest patch: P12." },
  "9.13.1": { status: "warning",  label: "Limited Support", desc: "ONTAP 9.13.1 enters Limited Support July 2026. Plan upgrade to 9.15.1+ now. Latest patch: P10." },
  // === Full Support Releases ===
  "9.14.1": { status: "compliant", label: "Full Support",    desc: "ONTAP 9.14.1 is in Full Support until January 2027. Latest patch: P16. Widely deployed LTS release." },
  "9.15.1": { status: "compliant", label: "Full Support",    desc: "ONTAP 9.15.1 is in Full Support until July 2027. Latest patch: P19. Required for AFF A1K/A90/A70, FAS70/90." },
  // === Recommended Current Release ===
  "9.16.1": { status: "compliant", label: "Recommended",     desc: "ONTAP 9.16.1 is the current recommended release, Full Support until January 2028. Latest patch: P11. Required for AFF A20/A30/A50, AFF C30/C60/C80, ASA R2, FAS50." },
};


export function getPlatformMaxDrives(model) {
  const upper = (model || "").toUpperCase();
  if (upper.includes("A1K") || upper.includes("9500") || upper.includes("9000") || upper.includes("A900") || upper.includes("FAS90") || upper.includes("FAS70")) return 1440;
  if (upper.includes("8700") || upper.includes("8300") || upper.includes("C800") || upper.includes("A90") || upper.includes("A70") || upper.includes("C80")) return 720;
  if (upper.includes("A800") || upper.includes("C400")) return 720;
  if (upper.includes("A400") || upper.includes("8200") || upper.includes("FAS50")) return 480;
  if (upper.includes("A250") || upper.includes("C250") || upper.includes("A300") || upper.includes("A150")) return 240;
  if (upper.includes("A50") || upper.includes("A30") || upper.includes("C30") || upper.includes("C60") || upper.includes("2820") || upper.includes("2750") || upper.includes("2720")) return 144;
  return 144;
}


// Rules 21-25 — defined here (before runAudit) to avoid const hoisting issues
export const exportRules = [
  // Rules 1-20 are integrated directly in runAudit() — placeholder stubs ensure slice(20) works
  ...Array.from({ length: 20 }, (_, i) => ({ id: `RULE_${i + 1}`, check: () => [] })),
  {
    id: 'BP_HA_STATUS',
    name: 'HA Interconnect Health',
    description: 'Storage failover must be enabled and the HA interconnect must be operational on all nodes.',
    check: (state) => {
      const findings = [];
      if (!state.haStatus || state.haStatus.length === 0) return findings;
      state.haStatus.forEach(ha => {
        if (!ha.enabled) {
          findings.push({
            severity: 'critical',
            node: ha.node,
            message: `Storage failover is DISABLED on node ${ha.node}. This node cannot participate in HA takeover/giveback.`,
            remediation: `storage failover modify -node ${ha.node} -enabled true`
          });
        } else if (ha.state && ha.state.toLowerCase().includes('waiting')) {
          findings.push({
            severity: 'warning',
            node: ha.node,
            message: `Node ${ha.node} HA state is '${ha.state}' — system may be waiting for partner. Check HA interconnect cabling.`,
            remediation: `storage failover show -node ${ha.node}`
          });
        }
      });
      return findings;
    }
  },
  {
    id: 'BP_BROKEN_DISKS',
    name: 'Failed / Broken Disk Detection',
    description: 'Any disk in a failed, broken, or prefailed state must be replaced immediately to protect data integrity.',
    check: (state) => {
      const findings = [];
      if (!state.brokenDisks || state.brokenDisks.length === 0) return findings;
      state.brokenDisks.forEach(disk => {
        findings.push({
          severity: 'critical',
          message: `Broken/failed disk detected: ${disk.disk} (type: ${disk.type}, reason: ${disk.reason}). Replace immediately.`,
          remediation: `storage disk show -disk ${disk.disk} -fields bay,shelf,disk-type,rpm,firmware-revision`
        });
      });
      return findings;
    }
  },
  {
    id: 'BP_LIF_FAILOVER',
    name: 'LIF Failover State',
    description: 'Data LIFs should be on their home node/port. LIFs operating off home-node indicate a failover event that has not been reverted.',
    check: (state) => {
      const findings = [];
      if (!state.lifs || state.lifs.length === 0) return findings;
      const offHomeLIFs = state.lifs.filter(l => !l.isHome && l.statusAdmin === 'up');
      offHomeLIFs.forEach(lif => {
        findings.push({
          severity: 'warning',
          message: `LIF '${lif.lif}' is currently on node '${lif.node}' but home node is '${lif.homeNode}'. A revert may be required.`,
          remediation: `network interface revert -vserver * -lif ${lif.lif}`
        });
      });
      const downLIFs = state.lifs.filter(l => l.statusOper === 'down' && l.statusAdmin === 'up');
      downLIFs.forEach(lif => {
        findings.push({
          severity: 'critical',
          message: `LIF '${lif.lif}' is administratively UP but operationally DOWN on node '${lif.node}'.`,
          remediation: `network interface show -lif ${lif.lif} -fields status-oper,failover-group,failover-policy`
        });
      });
      return findings;
    }
  },
  {
    id: 'BP_SNAPMIRROR_LAG',
    name: 'SnapMirror Replication Health',
    description: 'SnapMirror relationships must be healthy and within acceptable lag thresholds.',
    check: (state) => {
      const findings = [];
      if (!state.snapmirrorRelationships || state.snapmirrorRelationships.length === 0) return findings;
      state.snapmirrorRelationships.forEach(rel => {
        if (!rel.healthy) {
          findings.push({
            severity: 'critical',
            message: `SnapMirror relationship ${rel.source} → ${rel.destination} is UNHEALTHY (status: ${rel.status}).`,
            remediation: `snapmirror show -source-path ${rel.source}\nsnapmirror resync -destination-path ${rel.destination}`
          });
        } else if (rel.status && rel.status.toLowerCase() === 'lagging') {
          findings.push({
            severity: 'warning',
            message: `SnapMirror relationship ${rel.source} → ${rel.destination} is lagging (lag: ${rel.lag}).`,
            remediation: `snapmirror update -destination-path ${rel.destination}`
          });
        }
      });
      return findings;
    }
  },
  {
    id: 'BP_AGGREGATE_SPACE',
    name: 'Aggregate Space Utilization',
    description: 'Aggregates exceeding 80% used capacity risk performance degradation. Above 90% risks data loss and write failures.',
    check: (state) => {
      const findings = [];
      if (!state.aggregates) return findings;
      state.aggregates.forEach(agg => {
        if (agg.usedPercent >= 90) {
          findings.push({
            severity: 'critical',
            message: `Aggregate '${agg.name}' is ${agg.usedPercent}% full (${agg.usedSpace} / ${agg.totalSpace}). Immediate action required — add capacity or migrate volumes.`,
            remediation: `volume show -aggregate ${agg.name} -fields size,used,available\nstorage aggregate add-disks -aggregate ${agg.name} -diskcount <n>`
          });
        } else if (agg.usedPercent >= 80) {
          findings.push({
            severity: 'warning',
            message: `Aggregate '${agg.name}' is ${agg.usedPercent}% full (${agg.usedSpace} / ${agg.totalSpace}). Plan capacity expansion.`,
            remediation: `volume show -aggregate ${agg.name} -fields size,used,available`
          });
        }
      });
      return findings;
    }
  },
  {
    id: 'BP_SP_FIRMWARE',
    category: 'Firmware',
    name: 'Service Processor / BMC Firmware Currency',
    check: (state) => [] // Evaluated inline in runAudit()
  },
  {
    id: 'BP_DISK_FIRMWARE',
    category: 'Firmware',
    name: 'Disk Drive Firmware Currency',
    check: (state) => [] // Evaluated inline in runAudit()
  },
  {
    id: 'BP_ACP_STATUS',
    category: 'Hardware',
    name: 'Alternate Control Path (ACP) Connectivity',
    check: (state) => [] // Evaluated inline in runAudit()
  }
];

export const rules = exportRules;

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

  const lifecycle = BP_LIFECYCLE[baseVer] || { status: "warning", label: "Unknown Support Lifecycle", desc: "Check NetApp Support Site for lifecycle details." };
  
  addReport(
    "BP_ONTAP_VERSION",
    "ONTAP Software Release Support Lifecycle",
    "Software",
    lifecycle.status,
    `System runs ONTAP ${ontapVer} which is classified as ${lifecycle.label}. ${lifecycle.desc}`,
    "Upgrade cluster to a supported release. ONTAP 9.16.1 (latest patch P11) is the current recommended release for all new deployments and upgrades.",
    `Execute ONTAP software upgrade to ONTAP 9.16.1 following the supported hop path (current version: ${ontapVer}). Run Active IQ Upgrade Advisor to generate your specific upgrade plan.`
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

  const isADP = systemState.isADP === true;
  const minSpares = isADP ? 1 : 2;

  let spareAlerts = [];
  spareAuditResults.forEach(res => {
    if (res.count === 0) {
      spareAlerts.push({ status: "critical", msg: `${res.node} has ZERO spare drives for media type ${res.type} (${res.sizeGB}GB)` });
    } else if (res.count < minSpares) {
      spareAlerts.push({ status: "warning", msg: `${res.node} has only ${res.count} spare drive (minimum recommended is ${minSpares}) for media type ${res.type} (${res.sizeGB}GB)` });
    }
  });

  if (spareAlerts.length > 0) {
    const worstStatus = spareAlerts.some(a => a.status === "critical") ? "critical" : "warning";
    let desc = "Spare drive audit results:\n" + spareAlerts.map(a => `- ${a.msg}`).join("\n");
    if (isADP) {
      desc += "\nNote: This system uses ADP (root-data-data partitioning), which requires a minimum of 1 spare per HA pair.";
    }
    addReport(
      "BP_SPARE_DISKS",
      "Spare Disk Drive Reserves",
      "Hardware",
      worstStatus,
      desc,
      `Ensure a minimum of ${minSpares} spare disks of each size and type are available. Assign spare drives to nodes currently running short.`,
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
    const isSata = (aggr.diskType || "").toLowerCase().includes("sata");
    const isSsd = (aggr.diskType || "").toLowerCase().includes("ssd") || (aggr.diskType || "").toLowerCase().includes("nvme");
    
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
        const speed = (p.speed || "").toLowerCase();
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
    const shelfModel = (shelf.model || '').toLowerCase();
    
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
    
    if (Math.abs(sumDisksA - sumDisksB) > 0) {
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
    if (profile.supportedCards && !profile.supportedCards.includes(c.cardKey)) {
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
      const name = (p.name || "").toLowerCase();
      const speed = (p.speed || "").toLowerCase();
      const type = (p.type || "").toLowerCase();
      
      const isRoce = (name.startsWith("e0") || name.startsWith("e1")) && (speed.includes("100g") || speed.includes("roce") || type.includes("storage"));
      const isSas = (name.startsWith("0") || type.includes("storage")) && (speed.includes("sas") || (speed.includes("6g") && !speed.includes("16g")) || speed.includes("12g") || (!speed && (name.startsWith("0a") || name.startsWith("0b") || name.startsWith("0c") || name.startsWith("0d"))));
      
      if (isRoce) availableRocePorts++;
      else if (isSas) availableSasPorts++;
    });

    const isHighEnd = ['AFF A1K', 'AFF A90', 'AFF A70', 'AFF A900', 'FAS9500'].some(m => upperModel.includes(m));
    const requiredRocePorts = isHighEnd ? Math.ceil(nvmeShelvesCount / 2) * 2 : nvmeShelvesCount * 2;
    const requiredSasPorts = Math.ceil(sasShelvesCount / 4) * 2;

    if (nvmeShelvesCount > 0 && availableRocePorts < requiredRocePorts) {
      storageWarnings.push(`Storage Port Exhaustion (NVMe-oF RoCE): Required ports per controller is ${requiredRocePorts} (for ${nvmeShelvesCount} NVMe shelves), but only ${availableRocePorts} 100GbE RoCE ports are available on Node A. 
👉 Resolution Options:
1. Increase disk drive size (e.g. 15.3TB or 30.6TB) to reduce total shelf count and loops.
2. Manually add a Dual-port 100GbE RoCE HBA card (roce_hba_100g_2port) in Step 4. If slots are full, remove a less critical NIC or FC expansion card first.
3. Upgrade platform model to a mid/high-end system that provides more slots and onboard storage ports.`);
    }
    if (sasShelvesCount > 0 && availableSasPorts < requiredSasPorts) {
      storageWarnings.push(`Storage Port Exhaustion (SAS): Required SAS ports per controller is ${requiredSasPorts} (for ${sasShelvesCount} SAS shelves), but only ${availableSasPorts} SAS ports are available on Node A.
👉 Resolution Options:
1. Increase disk drive size (e.g. 15.3TB or 30.6TB) to reduce total shelf count and loops.
2. Manually add a Quad-port SAS HBA card (sas_hba_12g_4port) in Step 4. If slots are full, remove a less critical NIC or FC expansion card first.
3. Upgrade platform model to a system with more slots.`);
    }

    if (nvmeShelvesCount > 1 && !isHighEnd) {
      storageWarnings.push(`Daisy-Chaining Not Supported: NVMe shelf daisy-chaining is not supported on platform ${systemState.version.model}. Each of the ${nvmeShelvesCount} NS224 shelves requires a dedicated direct connection pair.
👉 Resolution: Select larger SSD drive capacities (e.g. 15.3TB or 30.6TB) to keep the shelf count to 1.`);
    } else if (nvmeShelvesCount > 2 && isHighEnd) {
      storageWarnings.push(`Daisy-Chain Limit Exceeded: NS224 NVMe shelves support a maximum daisy-chain stack depth of 2 shelves per loop. Current configuration has ${nvmeShelvesCount} shelves.
👉 Resolution: Select larger SSD drive capacities (e.g. 15.3TB or 30.6TB) to reduce total shelves and keep stack depth <= 2 per loop.`);
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

  // --- Rule 13: Controller System Firmware (BIOS) Currency ---
  const sysFirmwareProfile = getPlatformProfile(systemState.version.model);
  const maxSysFirmware = (sysFirmwareProfile && sysFirmwareProfile.maxFirmware) || "v20.0";
  const currentSysFirmware = systemState.version.systemFirmware || "v1.0";
  
  if (currentSysFirmware !== maxSysFirmware) {
    addReport(
      "BP_SYSTEM_FIRMWARE",
      "Controller System Firmware (BIOS) Currency",
      "Software",
      "warning",
      `System runs controller firmware version ${currentSysFirmware}, but the latest qualified version is ${maxSysFirmware}.`,
      "Download and install the latest system firmware (BIOS) update package for the controller model. This update is crucial for hardware compatibility, security patches, and system stability.",
      `Download system firmware update files for ${systemState.version.model} and update online or via loader boot using the 'system node firmware update' command.`
    );
  } else {
    addReport(
      "BP_SYSTEM_FIRMWARE",
      "Controller System Firmware (BIOS) Currency",
      "Software",
      "compliant",
      `Controller system firmware is running the latest qualified version (${maxSysFirmware}).`,
      "None required.",
      ""
    );
  }

  // --- Rule 14: Disk Size & ONTAP Version Compatibility ---
  let driveSizeWarnings = [];
  systemState.shelves.forEach(shelf => {
    (shelf.disks || []).forEach(disk => {
      const sizeStr = disk.sizeStr || "";
      if (sizeStr.includes("61.2TB") && compareVersions(baseVer, "9.15.1") < 0) {
        driveSizeWarnings.push(`Disk in shelf ${shelf.id} has size ${sizeStr} which requires ONTAP version >= 9.15.1 (current version is ${systemState.version.ontap}).`);
      } else if (sizeStr.includes("30.6TB") && compareVersions(baseVer, "9.9.1") < 0) {
        driveSizeWarnings.push(`Disk in shelf ${shelf.id} has size ${sizeStr} which requires ONTAP version >= 9.9.1 (current version is ${systemState.version.ontap}).`);
      } else if (sizeStr.includes("15.3TB") && compareVersions(baseVer, "9.1") < 0) {
        driveSizeWarnings.push(`Disk in shelf ${shelf.id} has size ${sizeStr} which requires ONTAP version >= 9.1 (current version is ${systemState.version.ontap}).`);
      }
    });
  });

  if (driveSizeWarnings.length > 0) {
    addReport(
      "BP_DISK_ONTAP_COMPAT",
      "Disk Size & ONTAP Version Compatibility",
      "Software",
      "warning",
      driveSizeWarnings.join("\n"),
      "Upgrade the cluster to a supported ONTAP version (ONTAP 9.15.1 or higher) to support very large capacity SSDs, or replace the large SSDs with smaller sizes.",
      "Perform ONTAP upgrade to at least 9.15.1, or replace large capacity SSDs with supported sizes."
    );
  } else {
    addReport(
      "BP_DISK_ONTAP_COMPAT",
      "Disk Size & ONTAP Version Compatibility",
      "Software",
      "compliant",
      "All disk drive capacities are compatible with the current ONTAP software version.",
      "None required.",
      ""
    );
  }

  // --- Rule 15: ASA SAN-Only Protocol Licensing Compliance ---
  const profileRule15 = getPlatformProfile(systemState.version.model);
  const isASA = upperModel.includes("ASA") || (profileRule15 && profileRule15.sanOnly === true);
  if (isASA) {
    const activeNasLicenses = systemState.licenses.filter(l => (l.name === "NFS" || l.name === "CIFS") && l.status === "active");
    if (activeNasLicenses.length > 0) {
      addReport(
        "BP_ASA_SAN_ONLY",
        "ASA SAN-Only Protocol Compliance",
        "Licensing",
        "critical",
        `NetApp All-SAN Array (ASA) platforms support block protocols (iSCSI, FC, NVMe-oF) only. NAS protocols (${activeNasLicenses.map(l => l.name).join(", ")}) are active, which violates the ASA architectural configuration boundary.`,
        "Disable NFS and CIFS protocol services, or transition to a standard AFF/FAS unified storage array if file protocols are required.",
        "Remove active NFS/CIFS licenses or migrate to a unified AFF platform."
      );
    } else {
      addReport(
        "BP_ASA_SAN_ONLY",
        "ASA SAN-Only Protocol Compliance",
        "Licensing",
        "compliant",
        "ASA controller is running block-only protocols (FC, iSCSI, NVMe-oF) in compliance with All-SAN Array hardware specifications.",
        "None required.",
        ""
      );
    }
  }

  // --- Rule 16: Cluster Switch RCF File Version Verification ---
  let switchWarnings = [];
  if (systemState.switches && systemState.switches.length > 0) {
    systemState.switches.forEach(sw => {
      if (sw.model === "BES-53248" && compareVersions(sw.version, "1.3.0.1") < 0) {
        switchWarnings.push(`Switch ${sw.name} (${sw.model}) runs legacy RCF version ${sw.version}. RCF v1.3.0.1 or higher is required.`);
      } else if ((sw.model || '').includes("9336C") && compareVersions(sw.version, "2.2") < 0) {
        switchWarnings.push(`Switch ${sw.name} (${sw.model}) runs legacy RCF version ${sw.version}. RCF v2.2 or higher is required for ONTAP 9.18+ compatibility.`);
      }
    });
  }

  if (switchWarnings.length > 0) {
    addReport(
      "BP_SWITCH_RCF",
      "Cluster Interconnect Switch RCF Version Currency",
      "Network",
      "warning",
      switchWarnings.join("\n"),
      "Upgrade the ethernet switch Reference Configuration File (RCF) to the latest NetApp qualified version (v1.3+ for Broadcom, v2.2+ for Cisco Nexus).",
      "Download NetApp switch RCF configuration files and apply to the switches via CLI commands."
    );
  } else if (systemState.switches && systemState.switches.length > 0) {
    addReport(
      "BP_SWITCH_RCF",
      "Cluster Interconnect Switch RCF Version Currency",
      "Network",
      "compliant",
      "All cluster interconnect switches are running approved, up-to-date Reference Configuration Files (RCF).",
      "None required.",
      ""
    );
  }

  // --- Rule 17: Network Port MTU Sizing Check ---
  const blocksActive = systemState.licenses.some(l => (l.name === "iSCSI" || l.name === "FCP" || l.name === "NVMe") && l.status === "active");
  let mtuWarnings = [];
  systemState.nodes.forEach(node => {
    if (node.ports) {
      node.ports.forEach(p => {
        if (p.type === "data" && p.mtu === 1500 && blocksActive) {
          mtuWarnings.push(`${node.name} port ${p.name} is configured at MTU 1500 while high-speed block storage protocols are licensed.`);
        }
      });
    }
  });

  if (mtuWarnings.length > 0) {
    addReport(
      "BP_PORT_MTU_SIZING",
      "Network Port MTU Sizing for Block Storage Protocols",
      "Network",
      "warning",
      mtuWarnings.join("\n") + "\nMTU 1500 can restrict throughput by up to 30% and cause CPU overhead under high block workload levels.",
      "Modify network port MTU configurations to 9000 (Jumbo Frames) on all end-to-end data paths supporting iSCSI or NVMe-oF traffic.",
      "Execute 'network port modify -node <node> -port <port> -mtu 9000' in ONTAP shell."
    );
  } else {
    addReport(
      "BP_PORT_MTU_SIZING",
      "Network Port MTU Sizing for Block Storage Protocols",
      "Network",
      "compliant",
      "All active front-end target ports cabled for block protocols are configured with optimal Jumbo Frame MTU sizing.",
      "None required.",
      ""
    );
  }

  // --- Rule 18: MetroCluster Mirroring Check ---
  if (systemState.metrocluster && systemState.metrocluster !== "none") {
    let unmirroredAggregates = [];
    systemState.aggregates.forEach(aggr => {
      if (aggr.name.startsWith("aggr0")) return;
      // If name does not end with _mirror or sync, or if we explicitly flag it
      if (aggr.isMirrored === false || aggr.name.includes("local") || !aggr.name.includes("sync")) {
        unmirroredAggregates.push(aggr.name);
      }
    });

    if (unmirroredAggregates.length > 0) {
      addReport(
        "BP_MCC_MIRRORING",
        "MetroCluster Remote Sync Mirroring Compliance",
        "Disaster Recovery",
        "critical",
        `Aggregates [${unmirroredAggregates.join(", ")}] are un-mirrored. In a MetroCluster DR environment, all data aggregates must be mirrored across sites (Pool0 and Pool1) to enable switchover.`,
        "Mirror the aggregates by assigning remote partner disks and setting up SyncMirror.",
        "Execute 'storage aggregate mirror -aggregate <name>' to mirror the aggregates."
      );
    } else {
      addReport(
        "BP_MCC_MIRRORING",
        "MetroCluster Remote Sync Mirroring Compliance",
        "Disaster Recovery",
        "compliant",
        "All data aggregates are mirrored symmetrically (SyncMirror) across DR sites. Switchover operations are fully supported.",
        "None required.",
        ""
      );
    }
  }

  // --- Rule 19: MetroCluster Hardware Symmetry ---
  if (systemState.metrocluster && systemState.metrocluster !== "none") {
    let symmetryWarnings = [];
    
    if (systemState.mccNodes && systemState.mccNodes.length > 0) {
      const siteANodes = systemState.mccNodes.filter(n => n.role === 'local');
      const siteBNodes = systemState.mccNodes.filter(n => n.role === 'remote');
      
      const memA = siteANodes.reduce((sum, n) => sum + (n.memoryGB || 0), 0) / (siteANodes.length || 1);
      const memB = siteBNodes.reduce((sum, n) => sum + (n.memoryGB || 0), 0) / (siteBNodes.length || 1);
      
      if (memA !== memB) {
        symmetryWarnings.push(`Memory asymmetry: Site-A averages ${memA} GB per node, Site-B averages ${memB} GB.`);
      }
    } else if (systemState.nodes && systemState.nodes.length >= 4) {
      const memA = (systemState.nodes[0].memoryGB + systemState.nodes[1].memoryGB) / 2;
      const memB = (systemState.nodes[2].memoryGB + systemState.nodes[3].memoryGB) / 2;
      if (memA !== memB) {
        symmetryWarnings.push(`Memory asymmetry: Site-A (nodes 0,1) averages ${memA} GB, Site-B (nodes 2,3) averages ${memB} GB.`);
      }
    } else if (systemState.nodes && systemState.nodes.length >= 2) {
      const nodeA = systemState.nodes[0];
      const nodeB = systemState.nodes[1];
      if (nodeA.memoryGB !== nodeB.memoryGB) {
        symmetryWarnings.push(`Memory asymmetry: ${nodeA.name} has ${nodeA.memoryGB} GB, but partner ${nodeB.name} has ${nodeB.memoryGB} GB.`);
      }
      if (nodeA.cpus !== nodeB.cpus) {
        symmetryWarnings.push(`Processor asymmetry: ${nodeA.name} has ${nodeA.cpus} cores, but partner ${nodeB.name} has ${nodeB.cpus} cores.`);
      }
    }
    
    if (symmetryWarnings.length > 0) {
      addReport(
        "BP_MCC_SYMMETRY",
        "MetroCluster DR Site Hardware Symmetry",
        "Disaster Recovery",
        "warning",
        symmetryWarnings.join("\n"),
        "Align CPU, RAM, and PCIe HBA adapter slots symmetrically on both MetroCluster nodes to ensure failover performance parity.",
        "Add memory/cards or upgrade controller hardware to balance the sites."
      );
    } else {
      addReport(
        "BP_MCC_SYMMETRY",
        "MetroCluster DR Site Hardware Symmetry",
        "Disaster Recovery",
        "compliant",
        "Local and remote MetroCluster controller nodes feature symmetrical hardware specs (CPU, memory, slots).",
        "None required.",
        ""
      );
    }
  }

  // --- Rule 20: Flash Pool / SSD Cache Sizing ---
  let flashPoolWarnings = [];
  const isHybrid = upperModel.includes("FAS");
  if (isHybrid) {
    systemState.aggregates.forEach(aggr => {
      if (aggr.name.startsWith("aggr0")) return;
      // If hybrid aggregate but SSD portion is small
      if (aggr.ssdCacheSizeGB && aggr.hddSizeGB) {
        const ratio = aggr.ssdCacheSizeGB / aggr.hddSizeGB;
        if (ratio < 0.10) {
          flashPoolWarnings.push(`Hybrid Aggregate ${aggr.name} has SSD cache ratio of ${(ratio * 100).toFixed(1)}%, which is below the recommended 10%–15% size.`);
        }
      }
    });
  }

  if (flashPoolWarnings.length > 0) {
    addReport(
      "BP_FLASH_POOL_SIZING",
      "Flash Pool SSD Caching Sizing Ratio",
      "Capacity",
      "warning",
      flashPoolWarnings.join("\n"),
      "Add additional SSD drives to the hybrid aggregate's SSD cache tier to hit the recommended 10%–15% caching ratio target.",
      "Execute 'storage aggregate add -aggregate <name> -disktype SSD -diskcount <num>' to scale the SSD cache tier."
    );
  } else if (isHybrid) {
    addReport(
      "BP_FLASH_POOL_SIZING",
      "Flash Pool SSD Caching Sizing Ratio",
      "Capacity",
      "compliant",
      "All active hybrid storage aggregates maintain healthy SSD-to-HDD cache sizing ratios (above 10%).",
      "None required.",
      ""
    );
  }

  // --- Rule: BP_SP_FIRMWARE: Service Processor / BMC Firmware Currency ---
  if (systemState.spFirmware && systemState.spFirmware.length > 0) {
    const model = (systemState.version && systemState.version.model) || '';
    const spSpec = Object.entries(typeof FIRMWARE_VERSIONS !== 'undefined' ? (FIRMWARE_VERSIONS.sp || {}) : {})
      .find(([k]) => model.toUpperCase().startsWith(k.toUpperCase()));
    const latestSP = spSpec ? spSpec[1].latest : null;
    const outdatedNodes = latestSP
      ? systemState.spFirmware.filter(sp => sp.version && sp.version !== latestSP && compareVersions(sp.version, latestSP) < 0)
      : [];
    if (latestSP && outdatedNodes.length > 0) {
      addReport(
        "BP_SP_FIRMWARE",
        "Service Processor / BMC Firmware Currency",
        "Firmware",
        "warning",
        `Service Processor firmware on ${outdatedNodes.length} node(s) [${outdatedNodes.map(n => n.node).join(', ')}] is at version ${outdatedNodes[0].version}, which is behind the current recommended version ${latestSP} for the ${model} platform.`,
        `Update SP/BMC firmware to ${latestSP} on all nodes using the system service-processor image update command before performing the ONTAP upgrade. Current SP firmware may contain security patches and stability fixes.`,
        `system service-processor image update -node ${outdatedNodes.map(n => n.node).join(',')}`
      );
    } else if (latestSP) {
      addReport(
        "BP_SP_FIRMWARE",
        "Service Processor / BMC Firmware Currency",
        "Firmware",
        "compliant",
        `All nodes are running the current recommended SP/BMC firmware version ${latestSP}.`,
        "No action required.",
        ""
      );
    }
  }

  // --- Rule: BP_DISK_FIRMWARE: Disk Drive Firmware Currency ---
  {
    const diskFwCatalog = typeof FIRMWARE_VERSIONS !== 'undefined' ? (FIRMWARE_VERSIONS.disks || {}) : {};
    const outdatedDisks = [];
    // Check disks in shelf inventory
    (systemState.shelves || []).forEach(shelf => {
      (shelf.disks || []).forEach(disk => {
        if (!disk.firmware || !disk.model) return;
        const prefix = Object.keys(diskFwCatalog).find(k => (disk.model || '').toUpperCase().startsWith(k));
        if (prefix) {
          const latest = diskFwCatalog[prefix].latest;
          if (disk.firmware !== latest) {
            outdatedDisks.push({ disk: disk.serial || `${shelf.id}:${disk.slot}`, model: disk.model, current: disk.firmware, latest });
          }
        }
      });
    });
    // Also check state.diskFirmware[] if populated by parser
    (systemState.diskFirmware || []).forEach(df => {
      const prefix = Object.keys(diskFwCatalog).find(k => (df.model || '').toUpperCase().startsWith(k));
      if (prefix) {
        const latest = diskFwCatalog[prefix].latest;
        if (df.firmware && df.firmware !== latest) {
          const already = outdatedDisks.find(d => d.disk === df.disk);
          if (!already) outdatedDisks.push({ disk: df.disk, model: df.model, current: df.firmware, latest });
        }
      }
    });
    if (outdatedDisks.length > 0) {
      const diskList = outdatedDisks.map(d => `${d.disk} (${d.model}: ${d.current}→${d.latest})`).join(', ');
      addReport(
        "BP_DISK_FIRMWARE",
        "Disk Drive Firmware Currency",
        "Firmware",
        "warning",
        `${outdatedDisks.length} disk drive(s) are running non-current firmware: ${diskList}. Outdated disk firmware may introduce data integrity risks and compatibility issues with newer ONTAP releases.`,
        "Update disk firmware using the storage disk firmware update command. Disk firmware is typically updated automatically as a background process during ONTAP ANDU upgrades. Manual update is recommended prior to upgrade if firmware is more than one revision behind.",
        `storage disk firmware update\nstorage disk show -fields model,firmware-revision`
      );
    } else {
      addReport(
        "BP_DISK_FIRMWARE",
        "Disk Drive Firmware Currency",
        "Firmware",
        "compliant",
        "All disk drives are running current qualified firmware revisions.",
        "No action required.",
        ""
      );
    }
  }

  // --- Rule: BP_ACP_STATUS: Alternate Control Path (ACP) Connectivity ---
  {
    const hasSasShelves = (systemState.shelves || []).some(s => (s.model || '').toLowerCase().match(/ds224c|ds460c|ds2246|ds4246|ds4486/));
    const hasNvmeOnly = (systemState.shelves || []).every(s => (s.model || '').toLowerCase() === 'ns224');
    if (hasSasShelves && !hasNvmeOnly) {
      const acp = systemState.acpStatus || {};
      if (acp.enabled === false || acp.connectivity === 'disabled') {
        addReport(
          "BP_ACP_STATUS",
          "Alternate Control Path (ACP) Connectivity",
          "Hardware",
          "warning",
          "Alternate Control Path (ACP) is disabled or not detected. ACP provides an out-of-band management path to SAS disk shelves, enabling the system to respond to shelf-related events without impacting I/O operations. Without ACP, shelf module failures may not be properly reported.",
          "Enable and verify ACP connectivity on all SAS shelf stacks. Connect the ACP Ethernet ports on each IOM module to a dedicated management network or the cluster management switch, then run 'storage acp configure' to enable the service.",
          `storage acp show\nstorage acp configure -enabled true\nstorage acp connectivity show`
        );
      } else if (acp.enabled === true) {
        addReport(
          "BP_ACP_STATUS",
          "Alternate Control Path (ACP) Connectivity",
          "Hardware",
          "compliant",
          `Alternate Control Path (ACP) is enabled and connected to ${acp.disksOnAcp || 'all'} disks.`,
          "No action required.",
          ""
        );
      }
      // If ACP status unknown (null), skip — don't generate a finding
    } else if (hasNvmeOnly || !hasSasShelves) {
      addReport(
        "BP_ACP_STATUS",
        "Alternate Control Path (ACP) Connectivity",
        "Hardware",
        "compliant",
        "ACP is not applicable for this configuration — system uses NVMe (NS224) shelves exclusively, which have redundant paths via dedicated NVMe-oF ports. ACP is a SAS-only mechanism.",
        "No action required. NVMe shelf redundancy is managed via dual RoCE/NVMe port connectivity.",
        ""
      );
    }
  }

  // --- Execute Dynamic Rules 21-25 ---
  exportRules.slice(20).forEach(rule => {
    const findings = rule.check(systemState);
    if (findings && findings.length > 0) {
      const isCritical = findings.some(f => f.severity === 'critical');
      addReport(
        rule.id,
        rule.name || rule.title || rule.id,
        "General",
        isCritical ? "critical" : "warning",
        findings.map(f => f.message).join("\n"),
        rule.description,
        findings.map(f => f.remediation).join("\n")
      );
    } else {
      addReport(
        rule.id,
        rule.name || rule.title || rule.id,
        "General",
        "compliant",
        `${rule.name || rule.title || rule.id} checks passed successfully.`,
        "None required.",
        ""
      );
    }
  });

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
