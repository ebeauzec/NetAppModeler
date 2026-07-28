# NetApp ASUP Analyzer & Modeler — Data Sources & Verification Registry

> **PURPOSE:** Every value in `compatibility.js` and version-related constants in `ui.js` and `bestPractices.js` must be traceable to an authoritative NetApp source. This document records those sources and must be updated whenever data is refreshed.
>
> **LAST VERIFIED:** July 28, 2026  
> **CURRENT LATEST ONTAP:** 9.19.1 (May 2026)  
> **NEXT EXPECTED RELEASE:** 9.20.1 (Q4 2026)

---

## Authoritative Sources

Always check these sources when updating data in the tool:

| Source | URL | What it covers |
|--------|-----|----------------|
| **NetApp Hardware Universe (HWU)** | https://hwu.netapp.com | Platform min/max ONTAP, shelf compat, slot configs, RAM limits |
| **ONTAP Lifecycle (endoflife.date)** | https://endoflife.date/netapp-ontap | GA dates, Full/Limited Support end dates |
| **ONTAP Release Notes** | https://docs.netapp.com/us-en/ontap/release-notes.html | New platform support per release |
| **NetApp Software Lifecycle Policy** | https://www.netapp.com/us/media/nb-3085.pdf | Lifecycle definitions |
| **NetApp ONTAP Upgrade Advisor** | https://aiq.netapp.com/upgrade | Supported upgrade paths |
| **NetApp IMT** | https://mysupport.netapp.com/matrix | Protocol/switch/shelf interoperability |
| **NetApp Support Site EOL/EOS** | https://mysupport.netapp.com/eol | Hardware EOS announcements |

---

## ONTAP Version Registry (Last verified: July 28, 2026)

Source: endoflife.date/netapp-ontap

| Version | GA Released | End Full Support | End Limited Support | Status (Jul 2026) |
|---------|------------|-----------------|--------------------|--------------------|
| 9.0–9.6 | 2016–2019 | — | — | OBSOLETE |
| 9.7 | Oct 2019 | Oct 2022 | Oct 2024 | Self-Service Only |
| 9.8 | Oct 2020 | Dec 31 2023 | Dec 31 2025 | Self-Service Only |
| 9.9.1 | Jun 2021 | Jun 30 2024 | Jun 30 2026 | Transitioning |
| 9.10.1 | Jan 2022 | Jan 31 2025 | Jan 31 2027 | LIMITED SUPPORT |
| 9.11.1 | Jul 2022 | Jul 31 2025 | Jul 31 2027 | LIMITED SUPPORT |
| 9.12.1 | Feb 2023 | Feb 28 2026 | Feb 28 2028 | LIMITED SUPPORT |
| 9.13.1 | Jun 2023 | Jun 30 2026 | Jun 30 2028 | LIMITED SUPPORT |
| 9.14.1 | Jan 2024 | Jan 31 2027 | Jan 31 2029 | FULL SUPPORT |
| 9.15.1 | May 2024 | Jul 31 2027 | Jul 31 2029 | FULL SUPPORT |
| 9.16.1 | Jan 2025 | Jan 31 2028 | Jan 31 2030 | FULL SUPPORT |
| 9.17.1 | Jan 15 2026 | Sep 30 2028 | Sep 30 2030 | FULL SUPPORT |
| 9.18.1 | Feb 4 2026 | Jan 31 2029 | Jan 31 2031 | FULL SUPPORT |
| **9.19.1** | **May 2026** | **May 31 2029** | **May 31 2031** | **FULL SUPPORT — LATEST GA** |
| 9.20.1 | Q4 2026 (expected) | — | — | NOT RELEASED |

---

## Platform Registry (Last verified: July 28, 2026)

Source: NetApp Hardware Universe (hwu.netapp.com)

### AFF A-Series

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| AFF A200 | 9.4 | 9.11.1 | EOL | Dropped in 9.12.1 |
| AFF A220 | 9.4 | 9.17.1* | EOS Nov 2026 | * confirm final max in HWU |
| AFF A250 | 9.8 | 9.19.1 | ACTIVE | |
| AFF A300 | 9.4 | 9.17.1* | EOS Nov 2026 | * confirm final max in HWU |
| AFF A320 | 9.6 | 9.14.1 | EOS | Dropped in 9.15.1 |
| AFF A400 | 9.7 | 9.19.1 | ACTIVE | |
| AFF A700 | 9.5 | 9.19.1 | ACTIVE | Confirmed still supported |
| AFF A700s | 9.5 | 9.14.1 | EOS | Dropped in 9.15.1 |
| AFF A800 | 9.7 | 9.19.1 | ACTIVE | Confirmed still supported |
| AFF A900 | 9.10.1 | 9.19.1 | ACTIVE | |
| AFF A150 | 9.12.1 | 9.19.1 | ACTIVE | Replaces AFF A220 |
| AFF A20 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A30 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A50 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A70 | 9.15.1 | 9.19.1 | ACTIVE | |
| AFF A90 | 9.15.1 | 9.19.1 | ACTIVE | NVIDIA DGX certified |
| AFF A1K | 9.15.1 | 9.19.1 | ACTIVE | |

### AFF C-Series

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| AFF C190 | 9.6 | 9.19.1 | ACTIVE | |
| AFF C250 | 9.12.1 | 9.19.1 | ACTIVE | |
| AFF C400 | 9.12.1 | 9.19.1 | ACTIVE | |
| AFF C800 | 9.12.1 | 9.19.1 | ACTIVE | |
| AFF C30 | **9.16.1** | 9.19.1 | ACTIVE | CORRECTION: min is 9.16.1 not 9.15.1 |
| AFF C60 | **9.16.1** | 9.19.1 | ACTIVE | CORRECTION: min is 9.16.1 not 9.15.1 |
| AFF C80 | **9.16.1** | 9.19.1 | ACTIVE | CORRECTION: min is 9.16.1 not 9.15.1 |

### ASA A-Series

| Platform | Min ONTAP | Max ONTAP | Status |
|----------|-----------|-----------|--------|
| ASA A150 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A250 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A400 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A800 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A900 | 9.13.1 | 9.19.1 | ACTIVE |
| ASA A1K | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A20 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A30 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A50 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A70 | 9.15.1 | 9.19.1 | ACTIVE |
| ASA A90 | 9.15.1 | 9.19.1 | ACTIVE |

### ASA C-Series / ASA r2

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| ASA C250 | 9.14.1 | 9.19.1 | ACTIVE | |
| ASA C400 | 9.14.1 | 9.19.1 | ACTIVE | |
| ASA C800 | 9.14.1 | 9.19.1 | ACTIVE | |
| ASA C30 | 9.16.1 | 9.19.1 | ACTIVE | |
| ASA r2 | 9.16.1 | 9.19.1 | ACTIVE | New architecture, SAN-only |

### FAS Series

| Platform | Min ONTAP | Max ONTAP | Status | Notes |
|----------|-----------|-----------|--------|-------|
| FAS2520/2552/2554 | 8.x | 9.8 | EOL | |
| FAS8020/8040/8060/8080 | 8.2 | 9.8 | EOL | Confirmed max 9.8 |
| FAS2620/2650 | 9.2 | 9.11.1 | EOL | Dropped in 9.12.1 |
| FAS2720 | 9.7 | 9.14.1 | EOS | |
| FAS2750 | 9.7 | 9.15.1 | EOS | |
| FAS2820 | 9.12.1 | 9.19.1 | ACTIVE | |
| FAS8200 | 9.3 | 9.16.1 | EOS | Dropped in 9.17.1 |
| FAS8300 | 9.7 | 9.19.1 | ACTIVE | |
| FAS8700 | 9.7 | 9.19.1 | ACTIVE | Confirmed still supported |
| FAS9000 | 9.5 | 9.19.1 | ACTIVE | |
| FAS9500 | 9.10.1 | 9.19.1 | ACTIVE | |
| FAS50 | 9.15.1 | 9.19.1 | ACTIVE | |
| FAS70 | 9.15.1 | 9.19.1 | ACTIVE | |
| FAS90 | 9.15.1 | 9.19.1 | ACTIVE | |

### New Platforms (2026)

| Platform | Min ONTAP | Notes |
|----------|-----------|-------|
| AFX 2K | 9.19.1 | Announced July 2026. High-performance NAS/S3/AI. |

---

## Known Data Corrections (History)

| What was wrong | Correct value | Fixed in version | Source |
|----------------|---------------|-----------------|--------|
| All platforms had maxOntap 9.20.1 | 9.20.1 not released | v2.22 | endoflife.date |
| AFF A200 maxOntap was 9.10.1 | 9.11.1 | v2.23 | HWU |
| AFF A300 maxOntap was 9.15.1 | 9.17.1 (EOS Nov 2026) | v2.23 | NetApp EOSL |
| AFF A700/A800 assumed EOS | Both still active on 9.19.1 | v2.23 | HWU |
| FAS8700 assumed EOS at 9.16.1 | Still active on 9.19.1 | v2.23 | HWU |
| AFF C30/C60/C80 minOntap 9.15.1 | Correct: 9.16.1 | v2.24 (pending) | HWU |
| AFX 2K not present | Added in v2.24 (pending) | v2.24 (pending) | NetApp Jul 2026 |

---

## Update Procedure

When a new ONTAP version is released or a platform changes support status:

### 1. Verify release data
- [ ] Check https://endoflife.date/netapp-ontap
- [ ] Check https://docs.netapp.com/us-en/ontap/release-notes.html for new/dropped platforms
- [ ] Check https://hwu.netapp.com for platform max ONTAP changes
- [ ] Update the tables in this document (DATA_SOURCES.md) first

### 2. Update js/compatibility.js
- [ ] `ONTAP_LIFECYCLE` — add new version entry with exact dates from endoflife.date
- [ ] `ONTAP_HOPS` — add upgrade paths FROM and TO the new version
- [ ] `maxOntap` for platforms dropping support (check HWU)
- [ ] `minOntap` for newly introduced platforms
- [ ] Compact profile section (lines ~1383+)
- [ ] Full profile section maxOntap values

### 3. Update js/ui.js
- [ ] `targetOptions` array (lines ~305 and ~3602) — add new version string
- [ ] `ONTAP_HOPS` table (lines ~34-120) — add rows for new version
- [ ] `resolveBaseVersionKey()` (lines ~191-210) — add base version mapping
- [ ] `compliantVersions` (line ~1797) — add if in Full Support

### 4. Update js/bestPractices.js
- [ ] Sync any inline `ONTAP_LIFECYCLE` or compliance thresholds

### 5. Build, commit, tag, push
```
python build_standalone.py
git add -A
git commit -m "Update: ONTAP X.Y.1 data refresh per DATA_SOURCES.md"
git tag -a vX.YY -m "vX.YY - ONTAP X.Y.1 data refresh"
git push origin main && git push origin vX.YY
```

---

## Maintenance Schedule

NetApp releases ONTAP approximately twice per year (Q1 and Q2/Q3):

| When | Action |
|------|--------|
| January | Check for Q4 release. Update lifecycle + hops + maxOntap |
| May/June | Check for Q2 release. Update lifecycle + hops + maxOntap |
| Quarterly | Spot-check endoflife.date for status changes |
| Platform announcement | Add new platform profile to compatibility.js immediately |

---

Copyright (c) 2026 Eugene Beauzec. All Rights Reserved.