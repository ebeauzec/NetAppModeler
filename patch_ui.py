import re

with open(r'g:\My Drive\AntiGravity\NetAppModeler\js\ui.js', 'r', encoding='utf-8') as f:
    content = f.read()

# B1
content = content.replace('version: "v2.5",', 'version: "v2.20",')

# B2
content = content.replace('if (base === "9.10" || base === "9.11" || base === "9.12") return "9.12.1";', 
'''if (base === "9.10") return "9.10.1";
  if (base === "9.11") return "9.11.1";
  if (base === "9.12") return "9.12.1";''')

# B3
content = content.replace('const nodeRAMs = currentState.nodes.map(n => `${n.name}: ${n.memoryGB || 128} GB RAM`);',
"const nodeRAMs = currentState.nodes.map(n => `${n.name}: ${n.memoryGB ? n.memoryGB + ' GB' : 'N/A (parse error)'} RAM`);")

# B4
model_repl = """const modelText = (currentState.version && currentState.version.model) || 'Unknown';
  const profile = typeof getPlatformProfile !== 'undefined' ? getPlatformProfile(modelText) : null;
  let badges = '';
  if (modelText.toUpperCase().includes('ASA') || (profile && profile.sanOnly)) {
    badges += '<span class="badge-san-only">SAN-Only Array</span>';
  }
  if (modelText.toUpperCase().includes('AFF C') || (profile && profile.isCapacityFlash)) {
    badges += '<span class="badge-capacity-flash">Capacity Flash</span>';
  }
  const modelEl = document.getElementById("cur-model");
  if (modelEl) modelEl.innerHTML = modelText + badges;"""
content = content.replace('document.getElementById("cur-model").textContent = currentState.version.model;', model_repl)

# B5
metro_orig = """        const nodes = currentState.nodes || [];
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
        }"""

metro_repl = """        // Use mccNodes DR group data from parser if available
        let siteANodes, siteBNodes;
        if (currentState.mccNodes && currentState.mccNodes.length > 0) {
          siteANodes = currentState.nodes.filter(n => {
            const mccInfo = currentState.mccNodes.find(m => m.node === n.name);
            return mccInfo && mccInfo.role === 'local';
          });
          siteBNodes = currentState.nodes.filter(n => {
            const mccInfo = currentState.mccNodes.find(m => m.node === n.name);
            return mccInfo && mccInfo.role === 'remote';
          });
        } else {
          // Fallback: split by name suffix (nodes ending in 1/2 = site A, 3/4 = site B or a/b suffix)
          const allNodes = currentState.nodes || [];
          const midpoint = Math.floor(allNodes.length / 2);
          siteANodes = allNodes.slice(0, midpoint);
          siteBNodes = allNodes.slice(midpoint);
        }

        siteANodes.forEach(nodeA => {
          if (nodeA) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${nodeA.name.toUpperCase()}</strong> (S/N: ${nodeA.serial || "N/A"})`;
            siteANodesList.appendChild(li);
          }
        });
        siteBNodes.forEach(nodeB => {
          if (nodeB) {
            const li = document.createElement("li");
            li.innerHTML = `<strong>${nodeB.name.toUpperCase()}</strong> (S/N: ${nodeB.serial || "N/A"})`;
            siteBNodesList.appendChild(li);
          }
        });"""
content = content.replace(metro_orig, metro_repl)

# B6 and B7 inside renderCurrentAuditDashboard
audit_orig = """  // Render ASUP Event Alerts Table (NEW)
  renderASUPAlertsTable(currentState);"""

audit_repl = """  // Render ASUP Event Alerts Table (NEW)
  renderASUPAlertsTable(currentState);

  if (currentState.brokenDisks && currentState.brokenDisks.length > 0) {
    const badgeEl = document.getElementById('broken-disk-badge');
    if (badgeEl) {
      badgeEl.textContent = `${currentState.brokenDisks.length} Broken Disk(s) Detected`;
      badgeEl.classList.remove('hidden');
    }
  }

  if (currentState.lifs && currentState.lifs.some(l => !l.isHome)) {
    const offHome = currentState.lifs.filter(l => !l.isHome && l.statusAdmin === 'up');
    if (offHome.length > 0) {
      const card = document.createElement("div");
      card.className = "audit-card";
      card.innerHTML = `
        <div class="audit-card-summary">
          <div class="audit-meta">
            <span class="status-badge warning">WARNING</span>
            <span class="audit-title">LIF Failover State</span>
          </div>
          <span class="audit-category">HA</span>
        </div>
        <div class="audit-card-details">
          <div class="details-section">
            <div class="section-title">Assessment Rationale</div>
            <div class="section-text">Found ${offHome.length} LIF(s) not on their home port. This usually means a failover occurred and has not been reverted.</div>
          </div>
          <div class="details-section">
            <div class="section-title">Recommendation Guidance</div>
            <div class="section-text">Revert LIFs to their home ports once the underlying issue is resolved.</div>
          </div>
          <div class="details-section">
            <div class="section-title">Technical Action Step</div>
            <div class="section-remediation">network interface revert *</div>
          </div>
        </div>
      `;
      card.querySelector(".audit-card-summary").addEventListener("click", () => card.classList.toggle("open"));
      auditList.appendChild(card);
    }
  }"""
content = content.replace(audit_orig, audit_repl)

# B8 inside generateReport
report_end_orig = """  document.getElementById("print-report-btn").addEventListener("click", () => {
    window.print();
  });"""

report_end_repl = """  if (currentState.snapmirrorRelationships && currentState.snapmirrorRelationships.length > 0) {
    let smHTML = '<h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">SnapMirror Replication Relationships</h3>';
    smHTML += '<table class="compare-table" style="width:100%;font-size:0.85rem;"><thead><tr><th>Source</th><th>Destination</th><th>Status</th><th>Lag</th><th>Healthy</th></tr></thead><tbody>';
    currentState.snapmirrorRelationships.forEach(rel => {
      const healthIcon = rel.healthy ? '✅' : '❌';
      smHTML += `<tr><td>${rel.source}</td><td>${rel.destination}</td><td>${rel.status}</td><td>${rel.lag}</td><td>${healthIcon}</td></tr>`;
    });
    smHTML += '</tbody></table>';
    const smSection = document.getElementById("snapmirror-section");
    const smTableContainer = document.getElementById("snapmirror-table-container");
    if (smSection && smTableContainer) {
      smTableContainer.innerHTML = smHTML;
      smSection.classList.remove("hidden");
    }
  }

  document.getElementById("print-report-btn").addEventListener("click", () => {
    window.print();
  });"""
content = content.replace(report_end_orig, report_end_repl)

with open(r'g:\My Drive\AntiGravity\NetAppModeler\js\ui.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
