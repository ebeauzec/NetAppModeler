import re

with open(r'g:\My Drive\AntiGravity\NetAppModeler\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# C1
c1_orig = """                <select id="disk-allocation" class="form-control">
                  <option value="spare">Add as Spare Reserves (No capacity change)</option>
                  <option value="expand">Expand Existing Active Aggregate</option>
                  <option value="new">Create New RAID-DP Aggregate</option>
                </select>"""
c1_repl = """                <select id="disk-allocation" class="form-control">
                  <option value="spare">Add as Spare Reserves (No capacity change)</option>
                  <option value="expand">Expand Existing Active Aggregate</option>
                  <option value="new">Create New RAID-DP Aggregate</option>
                </select>
                <div id="new-aggr-fields" class="hidden" style="display: flex; flex-direction: column; gap: 8px; margin-top: 8px;">
                  <input type="text" id="new-aggr-name" placeholder="New aggregate name (e.g. aggr1_node1)" class="form-control" style="background: rgba(0,0,0,0.4); color: #fff; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: var(--radius-md);">
                  <select id="new-aggr-raid" class="form-control" style="background: rgba(0,0,0,0.4); color: #fff; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: var(--radius-md);">
                    <option value="raid_dp">RAID-DP (Default)</option>
                    <option value="raid_tec">RAID-TEC (Triple Parity)</option>
                    <option value="raid4">RAID-4 (Legacy)</option>
                  </select>
                  <input type="number" id="new-aggr-rgsize" placeholder="RAID group size (e.g. 16)" min="8" max="28" class="form-control" style="background: rgba(0,0,0,0.4); color: #fff; border: 1px solid var(--border-color); padding: 8px 12px; border-radius: var(--radius-md);">
                </div>"""
content = content.replace(c1_orig, c1_repl)

# C2
c2_orig = """          <!-- Best Practice Assessment -->
          <div>
            <div class="audit-header">"""
c2_repl = """          <!-- Best Practice Assessment -->
          <div>
            <!-- HA & Failover Status Card -->
            <div class="glass-panel" style="padding: 1.25rem;">
              <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
                <svg style="width:18px;height:18px;fill:var(--color-primary);" viewBox="0 0 24 24"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,9 10.4,10V11H13.6V10C13.6,9 12.8,8.2 12,8.2Z"/></svg>
                HA & Failover Status
              </h3>
              <div id="ha-status-list" style="font-size: 0.82rem; color: var(--color-muted);">
                <span style="color: var(--color-muted); font-style: italic;">Upload an ASUP to view HA status.</span>
              </div>
              <div id="broken-disk-badge" class="badge-broken-disk hidden" style="margin-top: 0.75rem;"></div>
            </div>

            <div class="audit-header">"""
content = content.replace(c2_orig, c2_repl)

# C3
c3_orig = """        <div id="report-frame" class="report-body">
          <!-- Full Technical Report generated dynamically in UI.js -->
        </div>

        <div id="cli-script-container\""""
c3_repl = """        <div id="report-frame" class="report-body">
          <!-- Full Technical Report generated dynamically in UI.js -->
        </div>

        <!-- SnapMirror Relationships (populated by ui.js if data available) -->
        <div id="snapmirror-section" class="hidden" style="margin-top: 1.5rem;">
          <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.75rem;">SnapMirror Replication Relationships</h3>
          <div id="snapmirror-table-container"></div>
        </div>

        <div id="cli-script-container\""""
content = content.replace(c3_orig, c3_repl)

# C4
content = content.replace(">v2.20<", ">v2.21<")
content = content.replace("v2.20</span>", "v2.21</span>")

with open(r'g:\My Drive\AntiGravity\NetAppModeler\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
print("Success")
