import sys

def update_compatibility():
    with open('js/compatibility.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    out_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # 1. Update FULL profiles for AFF C30, C60, C80
        if line.strip() in ['"AFF C30": {', '"AFF C60": {', '"AFF C80": {']:
            out_lines.append(line)
            
            # Check next lines
            i += 1
            added_min = False
            while i < len(lines):
                if lines[i].strip() == '},':
                    if not added_min:
                        # Add it just before the closing brace if maxOntap wasn't found (fallback)
                        out_lines.insert(-1, '    minOntap: "9.16.1",\n')
                    out_lines.append(lines[i])
                    break
                elif 'maxOntap:' in lines[i]:
                    out_lines.append('    minOntap: "9.16.1",\n')
                    out_lines.append(lines[i])
                    added_min = True
                elif 'minOntap:' in lines[i]:
                    out_lines.append(lines[i].replace('"9.15.1"', '"9.16.1"'))
                    added_min = True
                else:
                    out_lines.append(lines[i])
                i += 1
        
        # 2. Add C30, C60, C80 to compact profiles if missing (they are not there according to my search)
        elif line.strip() == '// === AFF A-Series (Missing entries) ===':
            out_lines.append('"AFF C30": { tier: "entry", isCapacityFlash: true, minOntap: "9.16.1", maxOntap: "9.19.1", maxRamGB: 256, supportedShelves: ["ns224"], defaultProtocols: ["NFS", "CIFS", "iSCSI", "NVMe/FC", "NVMe/TCP"] },\n')
            out_lines.append('"AFF C60": { tier: "midrange", isCapacityFlash: true, minOntap: "9.16.1", maxOntap: "9.19.1", maxRamGB: 512, supportedShelves: ["ns224"], defaultProtocols: ["NFS", "CIFS", "iSCSI", "NVMe/FC", "NVMe/TCP"] },\n')
            out_lines.append('"AFF C80": { tier: "midrange", isCapacityFlash: true, minOntap: "9.16.1", maxOntap: "9.19.1", maxRamGB: 1024, supportedShelves: ["ns224"], defaultProtocols: ["NFS", "CIFS", "iSCSI", "NVMe/FC", "NVMe/TCP"] },\n')
            out_lines.append(line)
            
        # 3. Add AFX 2K platform
        elif '"FAS8080 EX":' in line:
            if not line.rstrip().endswith(','):
                out_lines.append(line.rstrip() + ',\n')
            else:
                out_lines.append(line)
            out_lines.append('// === AFX (All-Flash Extreme) — New July 2026 ===\n')
            out_lines.append('"AFX 2K": { tier: "enterprise", minOntap: "9.19.1", maxOntap: "9.19.1", maxRamGB: 4096, supportedShelves: ["ns224"], defaultProtocols: ["NFS", "CIFS", "S3", "NVMe/FC", "NVMe/TCP"] }\n')
                
        # 4. Add AFX 2K to getPlatformProfile
        elif 'if (upper.includes("C800"))' in line:
            out_lines.append('  if (upper.includes("AFX") || upper.includes("AFX 2K")) return NETAPP_PLATFORMS["AFX 2K"];\n')
            out_lines.append(line)

        # 5. Fix 9.19.1 releaseDate
        elif '"9.19.1": {' in line and 'status:' in line:
            out_lines.append(line.replace('"2026-05"', '"2026-07"').replace('May 2026', 'July 2026'))
            
        else:
            out_lines.append(line)
            
        i += 1
        
    with open('js/compatibility.js', 'w', encoding='utf-8') as f:
        f.writelines(out_lines)

def update_best_practices():
    with open('js/bestPractices.js', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    for i in range(len(lines)):
        if '"9.19.1": {' in lines[i]:
            lines[i] = lines[i].replace('May 2026', 'July 2026').replace('May 2029', 'July 2029')
            # Wait, the string was "full support until May 2029", so change it to July 2029.
            
    with open('js/bestPractices.js', 'w', encoding='utf-8') as f:
        f.writelines(lines)

update_compatibility()
update_best_practices()
print("Updates applied.")
