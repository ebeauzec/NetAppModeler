import re
import os

def update_compatibility():
    with open('js/compatibility.js', 'r', encoding='utf-8') as f:
        comp_data = f.read()

    new_lifecycle = """export const ONTAP_LIFECYCLE = {
  "9.7":    { status: "self_service",    releaseDate: "2019-09", endDate: "2024-10", notes: "End of Limited Support Oct 2024." },
  "9.8":    { status: "self_service",    releaseDate: "2020-10", endDate: "2025-12", notes: "End of Limited Support Dec 2025." },
  "9.9.1":  { status: "self_service",    releaseDate: "2021-04", endDate: "2026-06", notes: "Limited Support ends Jun 2026." },
  "9.10.1": { status: "limited_support", releaseDate: "2021-10", endDate: "2027-01", notes: "Limited Support ends Jan 2027." },
  "9.11.1": { status: "limited_support", releaseDate: "2022-04", endDate: "2027-07", notes: "Limited Support ends Jul 2027." },
  "9.12.1": { status: "limited_support", releaseDate: "2022-10", endDate: "2028-02", notes: "Limited Support ends Feb 2028." },
  "9.13.1": { status: "limited_support", releaseDate: "2023-06", endDate: "2028-06", notes: "Limited Support ends Jun 2028." },
  "9.14.1": { status: "active",          releaseDate: "2024-01", endDate: "2027-01", notes: "Full Support through Jan 2027." },
  "9.15.1": { status: "active",          releaseDate: "2024-05", endDate: "2027-07", notes: "Full Support through Jul 2027." },
  "9.16.1": { status: "active",          releaseDate: "2025-01", endDate: "2028-01", notes: "Full Support through Jan 2028." },
  "9.17.1": { status: "active",          releaseDate: "2026-01", endDate: "2028-09", notes: "Full Support through Sep 2028. Released Jan 2026." },
  "9.18.1": { status: "active",          releaseDate: "2026-02", endDate: "2029-01", notes: "Full Support through Jan 2029." },
  "9.19.1": { status: "active",          releaseDate: "2026-05", endDate: "2029-05", notes: "Latest GA Release (May 2026). Full Support through May 2029." },
  "9.20.1": { status: "planned",         releaseDate: "2026-Q4", endDate: "2029-Q4", notes: "Planned release Q4 2026. Use for forward planning only." }
};"""

    comp_data = re.sub(r'export const ONTAP_LIFECYCLE = \{.*?\};', new_lifecycle, comp_data, flags=re.DOTALL)
    
    new_hops = """export const ONTAP_HOPS = {
  "9.7":    { "9.8": [], "9.9.1": ["9.8"], "9.12.1": ["9.8","9.9.1"], "9.14.1": ["9.8","9.9.1","9.12.1"], "9.16.1": ["9.8","9.9.1","9.12.1","9.15.1"], "9.17.1": ["9.9.1","9.12.1","9.15.1","9.17.1"], "9.18.1": ["9.9.1","9.12.1","9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.9.1","9.12.1","9.15.1","9.17.1","9.19.1"] },
  "9.8":    { "9.9.1": [], "9.12.1": ["9.9.1"], "9.13.1": ["9.9.1","9.12.1"], "9.14.1": ["9.9.1","9.12.1","9.13.1"], "9.15.1": ["9.9.1","9.12.1","9.13.1"], "9.16.1": ["9.9.1","9.12.1","9.15.1"], "9.17.1": ["9.9.1","9.12.1","9.15.1","9.17.1"], "9.18.1": ["9.9.1","9.12.1","9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.9.1","9.12.1","9.15.1","9.17.1","9.19.1"], "9.20.1": ["9.9.1","9.12.1","9.15.1","9.17.1","9.18.1","9.20.1"] },
  "9.9.1":  { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1","9.13.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"], "9.17.1": ["9.12.1","9.15.1","9.17.1"], "9.18.1": ["9.12.1","9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.12.1","9.15.1","9.17.1","9.19.1"], "9.20.1": ["9.12.1","9.15.1","9.17.1","9.18.1","9.20.1"] },
  "9.10.1": { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1","9.13.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"], "9.17.1": ["9.12.1","9.15.1","9.17.1"], "9.18.1": ["9.12.1","9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.12.1","9.15.1","9.17.1","9.19.1"] },
  "9.11.1": { "9.12.1": [], "9.13.1": ["9.12.1"], "9.14.1": ["9.12.1","9.13.1"], "9.15.1": ["9.12.1","9.13.1"], "9.16.1": ["9.12.1","9.15.1"], "9.17.1": ["9.12.1","9.15.1","9.17.1"], "9.18.1": ["9.12.1","9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.12.1","9.15.1","9.17.1","9.19.1"] },
  "9.12.1": { "9.13.1": [], "9.14.1": ["9.13.1"], "9.15.1": ["9.13.1"], "9.16.1": ["9.13.1","9.15.1"], "9.17.1": ["9.15.1","9.17.1"], "9.18.1": ["9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.15.1","9.17.1","9.19.1"], "9.20.1": ["9.15.1","9.17.1","9.18.1","9.20.1"] },
  "9.13.1": { "9.14.1": [], "9.15.1": [], "9.16.1": ["9.15.1"], "9.17.1": ["9.15.1","9.17.1"], "9.18.1": ["9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.15.1","9.17.1","9.19.1"], "9.20.1": ["9.15.1","9.17.1","9.18.1","9.20.1"] },
  "9.14.1": { "9.15.1": [], "9.16.1": ["9.15.1"], "9.17.1": ["9.15.1","9.17.1"], "9.18.1": ["9.15.1","9.17.1","9.18.1"], "9.19.1": ["9.15.1","9.17.1","9.19.1"], "9.20.1": ["9.15.1","9.17.1","9.18.1","9.20.1"] },
  "9.15.1": { "9.16.1": [], "9.17.1": ["9.16.1"], "9.18.1": ["9.17.1"], "9.19.1": ["9.17.1","9.18.1"], "9.20.1": ["9.17.1","9.18.1","9.20.1"] },
  "9.16.1": { "9.17.1": [], "9.18.1": ["9.17.1"], "9.19.1": ["9.17.1","9.18.1"], "9.20.1": ["9.17.1","9.18.1","9.20.1"] },
  "9.17.1": { "9.18.1": [], "9.19.1": ["9.18.1"], "9.20.1": ["9.18.1","9.20.1"] },
  "9.18.1": { "9.19.1": [], "9.20.1": ["9.20.1"] },
  "9.19.1": { "9.20.1": [] }
};"""
    comp_data = re.sub(r'export const ONTAP_HOPS = \{.*?\};', new_hops, comp_data, flags=re.DOTALL)

    # Updates based on SYSTEM_MESSAGE corrections
    platforms_19 = [
        "AFF A150", "AFF A250", "AFF A400", "AFF A700", "AFF A800", "AFF A900",
        "AFF A20", "AFF A30", "AFF A50", "AFF A70", "AFF A90", "AFF A1K",
        "AFF C190", "AFF C250", "AFF C400", "AFF C800", "AFF C30", "AFF C60", "AFF C80",
        "FAS2720", "FAS2750", "FAS2820", "FAS8300", "FAS8700", "FAS9000", "FAS9500", "FAS50", "FAS70", "FAS90",
        "ASA A1K", "ASA A90", "ASA A70", "ASA A50", "ASA A30", "ASA A20",
        "ASA A400", "ASA A900", "ASA A800",
        "ASA C800", "ASA C400", "ASA C250", "ASA C30",
        "Cloud Volumes ONTAP"
    ]
    
    platforms_16 = ["AFF A300", "FAS8200"]
    platforms_14 = ["AFF A320", "AFF A700s"]
    platforms_11 = ["AFF A200", "FAS2620", "FAS2650"]
    
    def update_max(data, plats, new_ver):
        for p in plats:
            # We want to match exactly the object key for the platform
            # like "AFF A150": {
            pattern = r'("' + re.escape(p) + r'"\s*:\s*\{[^}]*?maxOntap\s*:\s*")[^"]+(")'
            data = re.sub(pattern, r'\g<1>' + new_ver + r'\g<2>', data, count=1)
        return data

    comp_data = update_max(comp_data, platforms_19, "9.19.1")
    comp_data = update_max(comp_data, platforms_16, "9.16.1")
    comp_data = update_max(comp_data, platforms_14, "9.14.1")
    comp_data = update_max(comp_data, platforms_11, "9.11.1")
    
    # Check compact profiles as well for ASA A-series, ASA C-series, etc.
    # We will search for all maxOntap occurrences in compact profiles and update them
    comp_data = re.sub(r'("asa-a-series"\s*:\s*\{[^}]*?maxOntap\s*:\s*")[^"]+(")', r'\g<1>9.19.1\g<2>', comp_data)
    comp_data = re.sub(r'("asa-c-series"\s*:\s*\{[^}]*?maxOntap\s*:\s*")[^"]+(")', r'\g<1>9.19.1\g<2>', comp_data)
    comp_data = re.sub(r'("asa-r2"\s*:\s*\{[^}]*?maxOntap\s*:\s*")[^"]+(")', r'\g<1>9.19.1\g<2>', comp_data)
    comp_data = re.sub(r'("aff-c-series"\s*:\s*\{[^}]*?maxOntap\s*:\s*")[^"]+(")', r'\g<1>9.19.1\g<2>', comp_data)
    comp_data = re.sub(r'("aff-a-series-nextgen"\s*:\s*\{[^}]*?maxOntap\s*:\s*")[^"]+(")', r'\g<1>9.19.1\g<2>', comp_data)

    with open('js/compatibility.js', 'w', encoding='utf-8') as f:
        f.write(comp_data)

def update_ui():
    with open('js/ui.js', 'r', encoding='utf-8') as f:
        ui_data = f.read()
    
    ui_data = re.sub(
        r'const targetOptions = \[[^\]]+\];',
        'const targetOptions = ["9.7", "9.8", "9.9.1", "9.10.1", "9.11.1", "9.12.1", "9.13.1", "9.14.1", "9.15.1", "9.16.1", "9.17.1", "9.18.1", "9.19.1", "9.20.1"];',
        ui_data
    )
    
    ui_data = re.sub(
        r'if\s*\(base\s*===\s*"9\.19"\)\s*return\s*"9\.19\.1";',
        'if (base === "9.19") return "9.19.1";\n  if (base === "9.20") return "9.20.1";',
        ui_data
    )
    
    ui_data = re.sub(
        r'const compliantVersions = \[[^\]]+\];',
        'const compliantVersions = ["9.14.1", "9.15.1", "9.16.1", "9.17.1", "9.18.1", "9.19.1", "9.20.1"];',
        ui_data
    )
    
    # ONTAP_HOPS inside ui.js
    new_hops = """const ONTAP_HOPS = {
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
    "9.20.1": ["9.8", "9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1", "9.20.1"]
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
    "9.20.1": ["9.9.1", "9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1", "9.20.1"]
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
    "9.20.1": ["9.12.1", "9.13.1", "9.15.1", "9.17.1", "9.18.1", "9.20.1"]
  },
  "9.12.1": {
    "9.12.1": [],
    "9.13.1": ["9.13.1"],
    "9.14.1": ["9.13.1", "9.14.1"],
    "9.15.1": ["9.13.1", "9.15.1"],
    "9.16.1": ["9.13.1", "9.15.1", "9.16.1"],
    "9.17.1": ["9.15.1", "9.17.1"],
    "9.18.1": ["9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.15.1", "9.17.1", "9.18.1", "9.20.1"]
  },
  "9.13.1": {
    "9.13.1": [],
    "9.14.1": ["9.14.1"],
    "9.15.1": [],
    "9.16.1": ["9.15.1", "9.16.1"],
    "9.17.1": ["9.15.1", "9.17.1"],
    "9.18.1": ["9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.15.1", "9.17.1", "9.18.1", "9.20.1"]
  },
  "9.14.1": {
    "9.14.1": [],
    "9.15.1": [],
    "9.16.1": ["9.15.1", "9.16.1"],
    "9.17.1": ["9.15.1", "9.17.1"],
    "9.18.1": ["9.15.1", "9.17.1", "9.18.1"],
    "9.19.1": ["9.15.1", "9.17.1", "9.19.1"],
    "9.20.1": ["9.15.1", "9.17.1", "9.18.1", "9.20.1"]
  },
  "9.15.1": {
    "9.15.1": [],
    "9.16.1": ["9.16.1"],
    "9.17.1": ["9.16.1", "9.17.1"],
    "9.18.1": ["9.17.1", "9.18.1"],
    "9.19.1": ["9.17.1", "9.19.1"],
    "9.20.1": ["9.17.1", "9.18.1", "9.20.1"]
  },
  "9.16.1": {
    "9.16.1": [],
    "9.17.1": ["9.17.1"],
    "9.18.1": ["9.17.1", "9.18.1"],
    "9.19.1": ["9.17.1", "9.19.1"],
    "9.20.1": ["9.17.1", "9.18.1", "9.20.1"]
  },
  "9.17.1": {
    "9.17.1": [],
    "9.18.1": ["9.18.1"],
    "9.19.1": ["9.18.1", "9.19.1"],
    "9.20.1": ["9.18.1", "9.20.1"]
  },
  "9.18.1": {
    "9.18.1": [],
    "9.19.1": ["9.19.1"],
    "9.20.1": ["9.20.1"]
  },
  "9.19.1": {
    "9.19.1": [],
    "9.20.1": ["9.20.1"]
  },
  "9.20.1": {
    "9.20.1": []
  }
};"""
    ui_data = re.sub(r'const ONTAP_HOPS = \{.*?\n\};', new_hops, ui_data, flags=re.DOTALL)

    with open('js/ui.js', 'w', encoding='utf-8') as f:
        f.write(ui_data)

def update_best_practices():
    with open('js/bestPractices.js', 'r', encoding='utf-8') as f:
        bp_data = f.read()

    new_lifecycle = """export const ONTAP_LIFECYCLE = {
  "9.7": { status: "warning", label: "Self Service", desc: "ONTAP 9.7 is in Self Service. End of Limited Support was Oct 2024." },
  "9.8": { status: "warning", label: "Self Service", desc: "ONTAP 9.8 is in Self Service. End of Limited Support was Dec 2025." },
  "9.9.1": { status: "warning", label: "Self Service", desc: "ONTAP 9.9.1 is in Self Service. Limited Support ends Jun 2026." },
  "9.10.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.10.1 is in Limited Support. Support ends Jan 2027." },
  "9.11.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.11.1 is in Limited Support. Support ends Jul 2027." },
  "9.12.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.12.1 is in Limited Support. Support ends Feb 2028." },
  "9.13.1": { status: "warning", label: "Limited Support", desc: "ONTAP 9.13.1 is in Limited Support. Support ends Jun 2028." },
  "9.14.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.14.1 is in General Support until Jan 2027." },
  "9.15.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.15.1 is in General Support until Jul 2027." },
  "9.16.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.16.1 is in General Support until Jan 2028." },
  "9.17.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.17.1 is in General Support until Sep 2028." },
  "9.18.1": { status: "compliant", label: "Active Support", desc: "ONTAP 9.18.1 is in General Support until Jan 2029." },
  "9.19.1": { status: "compliant", label: "Active Support (Latest Release)", desc: "ONTAP 9.19.1 is the latest General Support (GA) release, full support until May 2029." },
  "9.20.1": { status: "compliant", label: "Active Support (Planned Release)", desc: "ONTAP 9.20.1 is a planned release expected Q4 2026." }
};"""
    bp_data = re.sub(r'export const ONTAP_LIFECYCLE = \{.*?\n\};', new_lifecycle, bp_data, flags=re.DOTALL)
    
    with open('js/bestPractices.js', 'w', encoding='utf-8') as f:
        f.write(bp_data)

def update_demo_data():
    with open('js/demoData.js', 'r', encoding='utf-8') as f:
        demo_data = f.read()

    # demoASA_A400 -> 9.16.1
    # demoAFF_C800 -> 9.16.1
    # aff_a400 -> 9.16.1
    # fas8300 -> 9.14.1 (keep)
    # metrocluster_ip -> 9.14.1 (keep)
    
    # We can just match the objects by their identifiers or general search.
    # It's safer to just replace 'NetApp Release 9.14.1' or whatever it is inside the specific variables.
    # I'll just use simple regex for the ones needing 9.16.1.
    
    demo_data = re.sub(r'(export const demoASA_A400 =.*?VERSION:\s*")NetApp Release [^"]+(")', r'\g<1>NetApp Release 9.16.1\g<2>', demo_data, flags=re.DOTALL)
    demo_data = re.sub(r'(export const demoAFF_C800 =.*?VERSION:\s*")NetApp Release [^"]+(")', r'\g<1>NetApp Release 9.16.1\g<2>', demo_data, flags=re.DOTALL)
    
    # For aff_a400, it's inside an array maybe or dict
    # Let's just find "NetApp Release" around the A400 demo.
    demo_data = re.sub(r'("aff_a400"\s*:\s*\{.*?VERSION:\s*")NetApp Release [^"]+(")', r'\g<1>NetApp Release 9.16.1\g<2>', demo_data, flags=re.DOTALL)

    with open('js/demoData.js', 'w', encoding='utf-8') as f:
        f.write(demo_data)

if __name__ == '__main__':
    update_compatibility()
    update_ui()
    update_best_practices()
    update_demo_data()
