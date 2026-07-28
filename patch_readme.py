import re

with open(r'g:\My Drive\AntiGravity\NetAppModeler\README.md', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Bump versions to v2.21
content = re.sub(r'v2\.\d+', 'v2.21', content)

# 3. Add a section documenting new ASUP sections parsed
asup_repl = """* **Resilient ASUP Parser:** Drag-and-drop or import raw NetApp AutoSupport text logs. The parser extracts cluster models, ONTAP versions, node IDs, shelf structures, disk inventories, spares, aggregates, system firmware/BIOS versions, and license keys.
  * **Newly Parsed Sections:** HA Status, Broken Disks, Health Alerts, SnapMirror, LIFs, Aggregate Space."""
content = content.replace('* **Resilient ASUP Parser:** Drag-and-drop or import raw NetApp AutoSupport text logs. The parser extracts cluster models, ONTAP versions, node IDs, shelf structures, disk inventories, spares, aggregates, system firmware/BIOS versions, and license keys.', asup_repl)


# 2. Add 5 new best practice rules (21-25)
rules_repl = """  * **Disk-level Firmware Parsing (New):** Extracts disk-level firmware versions directly from parentheses formats or sysconfig -a style outputs and renders them in both the shelf inventory lists and comparative cabling tables.
  * **5 New Best Practice Rules (21-25):** 
    * Rule 21: Cluster switch RCF versions
    * Rule 22: Front-end port MTU sizing (Jumbo Frames)
    * Rule 23: MetroCluster aggregate SyncMirror status
    * Rule 24: Site hardware symmetry
    * Rule 25: Flash Pool SSD cache ratios"""
content = content.replace('  * **Disk-level Firmware Parsing (New):** Extracts disk-level firmware versions directly from parentheses formats or sysconfig -a style outputs and renders them in both the shelf inventory lists and comparative cabling tables.', rules_repl)

# 4. Document demo profiles
demo_repl = """* **Interactive Sizing Modeler:** A scenario planning tool to model:
  * **2 New Demo Profiles:** ASA A400, AFF C800."""
content = content.replace('* **Interactive Sizing Modeler:** A scenario planning tool to model:', demo_repl)

# 5. Remove any mention of Google Fonts CDN as a dependency (it is now offline-safe)
# Check if there is any mention of Google Fonts, and replace it.
content = re.sub(r'(?i).*google fonts cdn.*?\n', '', content)

with open(r'g:\My Drive\AntiGravity\NetAppModeler\README.md', 'w', encoding='utf-8') as f:
    f.write(content)
print("Success")
