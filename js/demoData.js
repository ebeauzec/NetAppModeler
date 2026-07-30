/**
 * NetApp AutoSupport Mock Data bundles.
 * This file contains raw text representing standard outputs of ASUP files.
 * The parser will parse these files client-side.
 */

export const DEMO_DATA = {
  fas8300: {
    name: "FAS8300 HA Cluster (Hybrid SAS/SSD - ONTAP 9.14.1)",
    files: {
      "VERSION": `NetApp Release 9.14.1: Thu Nov 12 18:22:45 UTC 2020
Model Name: FAS8300
System Serial Number: 700000111111`,
      
      "SYSCONFIG-A": `NetApp Release 9.14.1: Thu Nov 12 18:22:45 UTC 2020
System ID: 536870912 (node-a); System Serial Number: 700000111111 (node-a)
System ID: 536870913 (node-b); System Serial Number: 700000222222 (node-b)

Memory Size: 131072 MB
Number of Processors: 16

slot 0: M.2 SATA SSD
slot 1: Dual-port 10GbE SFP+
slot 2: Quad-port 12G SAS Adapter (PMC-Sierra PM8068)
        cabling: loop 1a cabled to Shelf 1 (DS224C) Multipath HA
        cabling: loop 2a cabled to Shelf 2 (DS224C) Single-Path HA [WARNING]
slot 3: Dual-port 100GbE NIC

Shelf 1: DS224C (S/N: SHFL-000001) v0212 (Latest: v0224)
    Disk 0: NETAPP X343_S163A960ATE (960GB, SSD, FW: NA02, S/N: SSD0001)
    Disk 1: NETAPP X343_S163A960ATE (960GB, SSD, FW: NA04, S/N: SSD0002)
    Disk 2: NETAPP X343_S163A960ATE (960GB, SSD, FW: NA04, S/N: SSD0003)
    Disk 3: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0004)
    Disk 4: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0005)
    Disk 5: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0006)
    Disk 6: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0007)
    Disk 7: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0008)
    Disk 8: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0009)
    Disk 9: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0010)
    Disk 10: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0011)
    Disk 11: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0012)
    Disk 12: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0013)
    Disk 13: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0014)
    Disk 14: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0015)
    Disk 15: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0016)
    Disk 16: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0017)
    Disk 17: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0018)
    Disk 18: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0019)
    Disk 19: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0020)
    Disk 20: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0021)
    Disk 21: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0022)
    Disk 22: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0023)
    Disk 23: NETAPP X343_S163A960ATE (960GB, SSD, S/N: SSD0024)

Shelf 2: DS224C (S/N: SHFL-000002) v0212 (Latest: v0224)
    Disk 0: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0001)
    Disk 1: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0002)
    Disk 2: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0003)
    Disk 3: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0004)
    Disk 4: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0005)
    Disk 5: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0006)
    Disk 6: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0007)
    Disk 7: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0008)
    Disk 8: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0009)
    Disk 9: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0010)
    Disk 10: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0011)
    Disk 11: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0012)
    Disk 12: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0013)
    Disk 13: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0014)
    Disk 14: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0015)
    Disk 15: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0016)
    Disk 16: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0017)
    Disk 17: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0018)
    Disk 18: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0019)
    Disk 19: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0020)
    Disk 20: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0021)
    Disk 21: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0022)
    Disk 22: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0023)
    Disk 23: NETAPP X425_H960G12G15K (1.2TB, SAS HDD, S/N: HDD0024)`,
      
      "SYSCONFIG-R": `Aggregate aggr0_a (online, raid_dp) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1400 GB, Free: 400 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (1.2TB SAS HDD)
        Spare Disks: 0 of size 1.2TB SSD

Aggregate aggr_ssd_a (online, raid_dp) (block-checksum)
    Size: 21120 GB, Usable: 17200 GB, Used: 11000 GB, Free: 6200 GB
    RAID Group rg1 (dual parity, active)
        Disks: 22 (960GB SSD)
        Spare Disks: 2 of size 960GB SSD (node-a)

Aggregate aggr_hdd_b (online, raid_dp) (block-checksum)
    Size: 26400 GB, Usable: 22800 GB, Used: 21500 GB, Free: 13000 GB
    RAID Group rg2 (dual parity, active)
        Disks: 22 (1.2TB SAS HDD)
        Spare Disks: 2 of size 1.2TB SAS HDD (node-b)

Spare Disks (node-a):
    NETAPP X343_S163A960ATE (960GB, SSD) - 2 spares

Spare Disks (node-b):
    NETAPP X425_H960G12G15K (1.2TB, SAS HDD) - 2 spares`,
      
      "LICENSE": `Base Licenses:
System Serial Number: 700000111111 (node-a)
  Cluster     active
  NFS         active
  CIFS        active
  FCP         active
  iSCSI       active
  SnapMirror  expired  [Expired: 2023-10-10]
  FlexClone   active
System Serial Number: 700000222222 (node-b)
  Cluster     active
  NFS         active
  CIFS        active
  FCP         active
  iSCSI       active
  SnapMirror  expired  [Expired: 2023-10-10]
  FlexClone   active`,
      
      "NETPORT": `Node   Port   IPspace   Broadcast Domain   Link   MTU   Admin/Oper
node-a e0a    Default   Cluster            up     9000  auto/10000
node-a e0b    Default   Cluster            up     9000  auto/10000
node-a e0c    Default   Default            up     1500  auto/10000
node-a e0d    Default   Default            up     1500  auto/10000
node-b e0a    Default   Cluster            up     9000  auto/10000
node-b e0b    Default   Cluster            up     9000  auto/10000
node-b e0c    Default   Default            up     1500  auto/10000
node-b e0d    Default   Default            up     1500  auto/10000`,

      "SWITCHES": `===== Ethernet Switch Show =====
Switch Name: CSW-BES-01 Model: BES-53248 Version: 1.2.0.1
Switch Name: CSW-BES-02 Model: BES-53248 Version: 1.2.0.1`,
      
      "SP-FIRMWARE": `System Service Processor show

Node               IP-Address      Firmware Version  Status
-----              ----------      ----------------  ------
fas8300-01         192.168.10.100  11.7              online
fas8300-02         192.168.10.101  11.7              online`
    }
  },
  
  aff_a400: {
    name: "AFF A400 HA Cluster (All-Flash NVMe - ONTAP 9.14.1)",
    files: {
      "VERSION": `NetApp Release 9.14.1: Thu Dec 16 22:15:10 UTC 2021
Model Name: AFF A400
System Serial Number: 800000111111`,
      
      "SYSCONFIG-A": `NetApp Release 9.14.1: Thu Dec 16 22:15:10 UTC 2021
System ID: 838860800 (node-a); System Serial Number: 800000111111 (node-a)
System ID: 838860801 (node-b); System Serial Number: 800000222222 (node-b)

Memory Size: 262144 MB
Number of Processors: 32

slot 0: M.2 NVMe SSD
slot 1: Quad-port 25GbE SFP28 Adapter
slot 2: Dual-port 100GbE NVMe-oF Shelf Adapter
        cabling: loop 1a cabled to Shelf 1 (NS224) Multipath HA
slot 3: Dual-port 32Gb FC Adapter

Shelf 1: NS224 (S/N: NS224-000001) v0130 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0001)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0002)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0003)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0004)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0005)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0006)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0007)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0008)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0009)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0010)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0011)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0012)
    Disk 12: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0013)
    Disk 13: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0014)
    Disk 14: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0015)
    Disk 15: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0016)
    Disk 16: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0017)
    Disk 17: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0018)
    Disk 18: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0019)
    Disk 19: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0020)
    Disk 20: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0021)
    Disk 21: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0022)
    Disk 22: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0023)
    Disk 23: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0024)`,
      
      "SYSCONFIG-R": `Aggregate aggr0_a (online, raid_dp) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1500 GB, Free: 300 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (1.9TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_a (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14750 GB, Free: 23500 GB
    RAID Group rg1 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-a)

Aggregate aggr_nvme_b (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 11500 GB, Free: 5600 GB
    RAID Group rg2 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-b)

Spare Disks (node-a):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares

Spare Disks (node-b):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares`,
      
      "LICENSE": `Base Licenses:
System Serial Number: 800000111111 (node-a)
  Cluster     active
  NFS         active
  CIFS        active
  FCP         active
  iSCSI       active
  SnapMirror  active
  FlexClone   active`,
      
      "NETPORT": `Node   Port   IPspace   Broadcast Domain   Link   MTU   Admin/Oper
node-a e0a    Default   Cluster            up     9000  auto/25000
node-a e0b    Default   Cluster            up     9000  auto/25000
node-a e0c    Default   Default            up     9000  auto/25000
node-a e0d    Default   Default            up     9000  auto/25000
node-b e0a    Default   Cluster            up     9000  auto/25000
node-b e0b    Default   Cluster            up     9000  auto/25000
node-b e0c    Default   Default            up     9000  auto/25000
node-b e0d    Default   Default            up     9000  auto/25000`,

      "SWITCHES": `===== Ethernet Switch Show =====
Switch Name: CSW-NEXUS-01 Model: Nexus 9336C-FX2 Version: 9.3(8)
Switch Name: CSW-NEXUS-02 Model: Nexus 9336C-FX2 Version: 9.3(8)`
    }
  },

  metrocluster_ip: {
    name: "AFF A400 MetroCluster IP DR System (ONTAP 9.14.1)",
    files: {
      "VERSION": `NetApp Release 9.14.1: Thu Feb 16 14:22:45 UTC 2023
Model Name: AFF A400
System Serial Number: 900000111111`,

      "SYSCONFIG-A": `NetApp Release 9.14.1: Thu Feb 16 14:22:45 UTC 2023
System ID: 936870912 (node-a1); System Serial Number: 900000111111 (node-a1)
System ID: 936870913 (node-a2); System Serial Number: 900000111112 (node-a2)
System ID: 936870914 (node-b1); System Serial Number: 900000222221 (node-b1)
System ID: 936870915 (node-b2); System Serial Number: 900000222222 (node-b2)

Memory Size: 262144 MB
Number of Processors: 32

slot 0: M.2 NVMe Boot Device
slot 1: Quad-port 25GbE SFP28 Adapter
slot 2: Dual-port 100GbE NVMe-oF RoCE Adapter (X91148A)
         cabling: e2a cabled to Shelf 1 (NS224) NSM-A port e0a Multipath HA
         cabling: e2b cabled to Shelf 1 (NS224) NSM-B port e0a Multipath HA
slot 3: Dual-port 100GbE NVMe-oF RoCE Adapter (X91148A)
         cabling: e3a cabled to Shelf 2 (NS224) NSM-A port e0a Multipath HA
         cabling: e3b cabled to Shelf 2 (NS224) NSM-B port e0a Multipath HA
slot 3: Dual-port 32Gb FC Adapter

Shelf 1: NS224 (S/N: NS224-STA0001) v0120 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0001)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0002)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0003)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0004)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0005)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0006)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0007)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0008)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0009)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0010)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0011)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0012)
    Disk 12: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0013)
    Disk 13: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0014)
    Disk 14: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0015)
    Disk 15: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0016)
    Disk 16: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0017)
    Disk 17: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0018)
    Disk 18: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0019)
    Disk 19: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0020)
    Disk 20: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0021)
    Disk 21: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0022)
    Disk 22: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0023)
    Disk 23: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0024)

Shelf 2: NS224 (S/N: NS224-STA0002) v0130 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0101)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0102)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0103)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0104)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0105)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0106)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0107)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0108)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0109)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0110)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0111)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0112)
    Disk 12: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0113)
    Disk 13: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0114)
    Disk 14: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0115)
    Disk 15: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0116)
    Disk 16: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0117)
    Disk 17: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0118)
    Disk 18: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0119)
    Disk 19: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0120)
    Disk 20: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0121)
    Disk 21: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0122)
    Disk 22: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0123)
    Disk 23: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0124)

Shelf 3: NS224 (S/N: NS224-STB0001) v0120 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0201)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0202)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0203)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0204)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0205)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0206)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0207)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0208)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0209)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0210)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0211)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0212)
    Disk 12: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0213)
    Disk 13: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0214)
    Disk 14: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0215)
    Disk 15: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0216)
    Disk 16: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0217)
    Disk 17: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0218)
    Disk 18: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0219)
    Disk 19: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0220)
    Disk 20: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0221)
    Disk 21: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0222)
    Disk 22: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0223)
    Disk 23: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0224)

Shelf 4: NS224 (S/N: NS224-STB0002) v0130 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0301)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0302)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0303)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0304)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0305)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0306)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0307)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0308)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0309)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0310)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0311)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0312)
    Disk 12: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0313)
    Disk 13: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0314)
    Disk 14: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0315)
    Disk 15: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0316)
    Disk 16: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0317)
    Disk 17: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0318)
    Disk 18: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0319)
    Disk 19: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0320)
    Disk 20: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0321)
    Disk 21: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0322)
    Disk 22: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0323)
    Disk 23: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA01, S/N: NVM0324)`,

      "SYSCONFIG-R": `Aggregate aggr0_a1 (online, raid_dp) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1500 GB, Free: 300 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (1.9TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_sync_a1 (online, raid_dp, mirrored) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14750 GB, Free: 2350 GB
    RAID Group rg1 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-a1)

Aggregate aggr_nvme_local_a2 (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 11500 GB, Free: 5600 GB
    RAID Group rg2 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-a2)

Aggregate aggr0_b1 (online, raid_dp) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1500 GB, Free: 300 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (1.9TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_sync_b1 (online, raid_dp, mirrored) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14750 GB, Free: 2350 GB
    RAID Group rg1 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-b1)

Aggregate aggr_nvme_local_b2 (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 11500 GB, Free: 5600 GB
    RAID Group rg2 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-b2)`,

      "LICENSE": `Base Licenses:
System Serial Number: 900000111111 (node-a1)
  Cluster     active
  NFS         active
  CIFS        active
  FCP         active
  iSCSI       active
  SnapMirror  active
  FlexClone   active
  MetroCluster active`,

      "NETPORT": `Node   Port   IPspace   Broadcast Domain   Link   MTU   Admin/Oper
node-a1 e0a    Default   Cluster            up     9000  auto/25000
node-a1 e0b    Default   Cluster            up     9000  auto/25000
node-a1 e0c    Default   Default            up     9000  auto/25000
node-a1 e0d    Default   Default            up     9000  auto/25000
node-a2 e0a    Default   Cluster            up     9000  auto/25000
node-a2 e0b    Default   Cluster            up     9000  auto/25000
node-b1 e0a    Default   Cluster            up     9000  auto/25000
node-b1 e0b    Default   Cluster            up     9000  auto/25000
node-b2 e0a    Default   Cluster            up     9000  auto/25000
node-b2 e0b    Default   Cluster            up     9000  auto/25000`,

      "SWITCHES": `system switch ethernet show

Switch                      Type                  Address         Model
--------------------------- --------------------- --------------- --------
cs1                         cluster-network       192.168.10.1    N9K-C9336C-FX2
cs2                         cluster-network       192.168.10.2    N9K-C9336C-FX2

Switch Name: cs1  Model: Nexus 9336C-FX2  Version: 9.3(8)
Switch Name: cs2  Model: Nexus 9336C-FX2  Version: 9.3(8)
RCF Version: 1.10`,

      "SP-INFO": `system service-processor show
Node      Type   Firmware Version  Status
--------- ------ ----------------  ------
node-a1   SP     11.9              online
node-a2   SP     11.7              online
node-b1   SP     11.9              online
node-b2   SP     11.7              online`,

      "METROCLUSTER-SHOW": `===== METROCLUSTER SHOW =====
Cluster        Partner Cluster        Configuration State
-------------- ---------------------- -------------------
cluster-a      cluster-b              configured

MetroCluster IP Configuration Status: configured (metrocluster show)

metrocluster node show

DR Group ID  Cluster     Node      DR Partner Node
------------ ----------- --------- ---------------
1            local-site  node-a1   node-b1
1            local-site  node-a2   node-b2
1            remote-site node-b1   node-a1
1            remote-site node-b2   node-a2`
    }
  },

  metrocluster_a1k: {
    name: "AFF A1K MetroCluster IP (4-Node, ~505TB Usable - ONTAP 9.15.1)",
    files: {
      "VERSION": `NetApp Release 9.15.1: Mon Jun 10 08:00:00 UTC 2024
Model Name: AFF A1K
System Serial Number: 1000000111111`,

      "SYSCONFIG-A": `NetApp Release 9.15.1: Mon Jun 10 08:00:00 UTC 2024
System ID: 1036870912 (a1k-node-a1); System Serial Number: 1000000111111 (a1k-node-a1)
System ID: 1036870913 (a1k-node-a2); System Serial Number: 1000000111112 (a1k-node-a2)
System ID: 1036870914 (a1k-node-b1); System Serial Number: 1000000222221 (a1k-node-b1)
System ID: 1036870915 (a1k-node-b2); System Serial Number: 1000000222222 (a1k-node-b2)

Memory Size: 524288 MB
Number of Processors: 64

slot 0: M.2 NVMe Boot Device
slot 1: Dual-port 100GbE Cluster Interconnect (RoCE)
slot 2: Dual-port 100GbE NVMe-oF Shelf Adapter (RoCE)
         cabling: e2a cabled to Shelf 1 NSM-A port e0a (NS224) Multipath HA
         cabling: e2b cabled to Shelf 1 NSM-B port e0a (NS224) Multipath HA
         cabling: e2a cabled to Shelf 2 NSM-A port e0b (NS224) Multipath HA
         cabling: e2b cabled to Shelf 2 NSM-B port e0b (NS224) Multipath HA
slot 3: Dual-port 100GbE NVMe-oF Shelf Adapter (RoCE)
         cabling: e3a cabled to Shelf 3 NSM-A port e0a (NS224) Multipath HA
         cabling: e3b cabled to Shelf 3 NSM-B port e0a (NS224) Multipath HA
slot 4: Quad-port 32Gb FC Adapter
slot 5: Dual-port 100GbE Data NIC

Shelf 1: NS224 (S/N: NS224-A1K-STA001) v1.1.2X0 (Latest: v1.1.3X0)
    Disk 0: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0001)
    Disk 1: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0002)
    Disk 2: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0003)
    Disk 3: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0004)
    Disk 4: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0005)
    Disk 5: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0006)
    Disk 6: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0007)
    Disk 7: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0008)
    Disk 8: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0009)
    Disk 9: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0010)
    Disk 10: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0011)
    Disk 11: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0012)
    Disk 12: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0013)
    Disk 13: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0014)
    Disk 14: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0015)
    Disk 15: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0016)
    Disk 16: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0017)
    Disk 17: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0018)
    Disk 18: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0019)
    Disk 19: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0020)
    Disk 20: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0021)
    Disk 21: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0022)
    Disk 22: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0023)
    Disk 23: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0024)

Shelf 2: NS224 (S/N: NS224-A1K-STA002) v1.1.3X0 (Latest: v1.1.3X0)
    Disk 0: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0101)
    Disk 1: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0102)
    Disk 2: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0103)
    Disk 3: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0104)
    Disk 4: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0105)
    Disk 5: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0106)
    Disk 6: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0107)
    Disk 7: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0108)
    Disk 8: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0109)
    Disk 9: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0110)
    Disk 10: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0111)
    Disk 11: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0112)
    Disk 12: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0113)
    Disk 13: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0114)
    Disk 14: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0115)
    Disk 15: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0116)
    Disk 16: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0117)
    Disk 17: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0118)
    Disk 18: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0119)
    Disk 19: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0120)
    Disk 20: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0121)
    Disk 21: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0122)
    Disk 22: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0123)
    Disk 23: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0124)

Shelf 3: NS224 (S/N: NS224-A1K-STA003) v1.1.3X0 (Latest: v1.1.3X0)
    Disk 0: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0201)
    Disk 1: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0202)
    Disk 2: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0203)
    Disk 3: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0204)
    Disk 4: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0205)
    Disk 5: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0206)
    Disk 6: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0207)
    Disk 7: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0208)
    Disk 8: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0209)
    Disk 9: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0210)
    Disk 10: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0211)
    Disk 11: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0212)
    Disk 12: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0213)
    Disk 13: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0214)
    Disk 14: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0215)
    Disk 15: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0216)
    Disk 16: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0217)
    Disk 17: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0218)
    Disk 18: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0219)
    Disk 19: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0220)
    Disk 20: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0221)
    Disk 21: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0222)
    Disk 22: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0223)
    Disk 23: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0224)

Shelf 4: NS224 (S/N: NS224-A1K-STB001) v1.1.2X0 (Latest: v1.1.3X0)
    Disk 0: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0301)
    Disk 1: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0302)
    Disk 2: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0303)
    Disk 3: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0304)
    Disk 4: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0305)
    Disk 5: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0306)
    Disk 6: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0307)
    Disk 7: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0308)
    Disk 8: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0309)
    Disk 9: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0310)
    Disk 10: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0311)
    Disk 11: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0312)
    Disk 12: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0313)
    Disk 13: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0314)
    Disk 14: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0315)
    Disk 15: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0316)
    Disk 16: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0317)
    Disk 17: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0318)
    Disk 18: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0319)
    Disk 19: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0320)
    Disk 20: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0321)
    Disk 21: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0322)
    Disk 22: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0323)
    Disk 23: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0324)

Shelf 5: NS224 (S/N: NS224-A1K-STB002) v1.1.3X0 (Latest: v1.1.3X0)
    Disk 0: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0401)
    Disk 1: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0402)
    Disk 2: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0403)
    Disk 3: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0404)
    Disk 4: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0405)
    Disk 5: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0406)
    Disk 6: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0407)
    Disk 7: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0408)
    Disk 8: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0409)
    Disk 9: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0410)
    Disk 10: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0411)
    Disk 11: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0412)
    Disk 12: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0413)
    Disk 13: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0414)
    Disk 14: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0415)
    Disk 15: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0416)
    Disk 16: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0417)
    Disk 17: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0418)
    Disk 18: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0419)
    Disk 19: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0420)
    Disk 20: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0421)
    Disk 21: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0422)
    Disk 22: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0423)
    Disk 23: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0424)

Shelf 6: NS224 (S/N: NS224-A1K-STB003) v1.1.3X0 (Latest: v1.1.3X0)
    Disk 0: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0501)
    Disk 1: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0502)
    Disk 2: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0503)
    Disk 3: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0504)
    Disk 4: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0505)
    Disk 5: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0506)
    Disk 6: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0507)
    Disk 7: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0508)
    Disk 8: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0509)
    Disk 9: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0510)
    Disk 10: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0511)
    Disk 11: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0512)
    Disk 12: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0513)
    Disk 13: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0514)
    Disk 14: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0515)
    Disk 15: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0516)
    Disk 16: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0517)
    Disk 17: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0518)
    Disk 18: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0519)
    Disk 19: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0520)
    Disk 20: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0521)
    Disk 21: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0522)
    Disk 22: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0523)
    Disk 23: NETAPP X908A (15.3TB, NVMe SSD, FW: NA02, S/N: A1K0524)`,

      "SYSCONFIG-R": `Aggregate aggr0_a1 (online, raid_dp) (block-checksum)
    Size: 2000 GB, Usable: 1600 GB, Used: 1200 GB, Free: 400 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (15.3TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_sync_a1 (online, raid_dp, mirrored) (block-checksum)
    Size: 336600 GB, Usable: 168300 GB, Used: 126225 GB, Free: 42075 GB
    RAID Group rg1 (dual parity, active)
        Disks: 22 (15.3TB NVMe SSD)
        Spare Disks: 1 of size 15.3TB NVMe SSD (a1k-node-a1)

Aggregate aggr_nvme_local_a2 (online, raid_dp, mirrored) (block-checksum)
    Size: 336600 GB, Usable: 168300 GB, Used: 84150 GB, Free: 84150 GB
    RAID Group rg2 (dual parity, active)
        Disks: 22 (15.3TB NVMe SSD)
        Spare Disks: 1 of size 15.3TB NVMe SSD (a1k-node-a2)

Aggregate aggr0_b1 (online, raid_dp) (block-checksum)
    Size: 2000 GB, Usable: 1600 GB, Used: 1200 GB, Free: 400 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (15.3TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_sync_b1 (online, raid_dp, mirrored) (block-checksum)
    Size: 336600 GB, Usable: 168300 GB, Used: 126225 GB, Free: 42075 GB
    RAID Group rg1 (dual parity, active)
        Disks: 22 (15.3TB NVMe SSD)
        Spare Disks: 1 of size 15.3TB NVMe SSD (a1k-node-b1)

Aggregate aggr_nvme_local_b2 (online, raid_dp, mirrored) (block-checksum)
    Size: 336600 GB, Usable: 168300 GB, Used: 84150 GB, Free: 84150 GB
    RAID Group rg2 (dual parity, active)
        Disks: 22 (15.3TB NVMe SSD)
        Spare Disks: 1 of size 15.3TB NVMe SSD (a1k-node-b2)

Spare Disks (a1k-node-a1):
    NETAPP X908A (15.3TB, NVMe SSD) - 1 spares

Spare Disks (a1k-node-a2):
    NETAPP X908A (15.3TB, NVMe SSD) - 1 spares

Spare Disks (a1k-node-b1):
    NETAPP X908A (15.3TB, NVMe SSD) - 1 spares

Spare Disks (a1k-node-b2):
    NETAPP X908A (15.3TB, NVMe SSD) - 1 spares`,

      "LICENSE": `Base Licenses:
System Serial Number: 1000000111111 (a1k-node-a1)
  Cluster      active
  NFS          active
  CIFS         active
  FCP          active
  iSCSI        active
  NVMe/FC      active
  SnapMirror   active
  FlexClone    active
  FabricPool   active
  MetroCluster active`,

      "SWITCHES": `system switch ethernet show

Switch                      Type                  Address         Model
--------------------------- --------------------- --------------- --------
mcc-ip-sw1                  cluster-network       192.168.20.1    N9K-C9336C-FX2
mcc-ip-sw2                  cluster-network       192.168.20.2    N9K-C9336C-FX2

Switch Name: mcc-ip-sw1  Model: Nexus 9336C-FX2  Version: 10.3(2)
Switch Name: mcc-ip-sw2  Model: Nexus 9336C-FX2  Version: 10.3(2)
RCF Version: 2.1`,

      "SP-INFO": `system service-processor show
Node           Type  Firmware Version  Status
-------------- ----- ----------------  ------
a1k-node-a1    BMC   24.05             online
a1k-node-a2    BMC   24.05             online
a1k-node-b1    BMC   23.11             online
a1k-node-b2    BMC   23.11             online`,

      "METROCLUSTER-SHOW": `===== METROCLUSTER SHOW =====
Cluster           Partner Cluster        Configuration State
----------------- ---------------------- -------------------
a1k-cluster-a     a1k-cluster-b          configured

MetroCluster IP Configuration Status: configured (metrocluster show)

metrocluster node show

DR Group ID  Cluster        Node            DR Partner Node
------------ -------------- --------------- ---------------
1            local-site     a1k-node-a1     a1k-node-b1
1            local-site     a1k-node-a2     a1k-node-b2
1            remote-site    a1k-node-b1     a1k-node-a1
1            remote-site    a1k-node-b2     a1k-node-a2`
    }
  }
};


export const demoASA_A400 = {
  name: "ASA A400 HA Cluster (All-SAN NVMe - ONTAP 9.14.1)",
  files: {
    "VERSION": `NetApp Release 9.14.1: Thu Dec 16 22:15:10 UTC 2023
Model Name: ASA A400
System Serial Number: 800000111111`,
    "SYSCONFIG-A": `NetApp Release 9.14.1: Thu Dec 16 22:15:10 UTC 2023
System ID: 838860800 (node-a); System Serial Number: 800000111111 (node-a)
System ID: 838860801 (node-b); System Serial Number: 800000222222 (node-b)

Memory Size: 262144 MB
Number of Processors: 32

slot 0: M.2 NVMe SSD
slot 1: Quad-port 25GbE SFP28 Adapter
slot 2: Dual-port 100GbE NVMe-oF Shelf Adapter
        cabling: loop 1a cabled to Shelf 1 (NS224) Multipath HA
        cabling: loop 1b cabled to Shelf 2 (NS224) Multipath HA
slot 3: Dual-port 32Gb FC Adapter

Shelf 1: NS224 (S/N: NS224-000001) v0130 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0001)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0002)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0003)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0004)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0005)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0006)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0007)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0008)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0009)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0010)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0011)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0012)

Shelf 2: NS224 (S/N: NS224-000002) v0130 (Latest: v0130)
    Disk 0: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0101)
    Disk 1: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0102)
    Disk 2: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, FW: NA02, S/N: NVM0103)
    Disk 3: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0104)
    Disk 4: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0105)
    Disk 5: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0106)
    Disk 6: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0107)
    Disk 7: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0108)
    Disk 8: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0109)
    Disk 9: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0110)
    Disk 10: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0111)
    Disk 11: NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD, S/N: NVM0112)`,
    "SYSCONFIG-R": `Aggregate aggr0_a (online, raid_tec) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1500 GB, Free: 300 GB
    RAID Group rg0 (triple parity, active)
        Disks: 4 (1.9TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_a (online, raid_tec) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14750 GB, Free: 23500 GB
    RAID Group rg1 (triple parity, active)
        Disks: 8 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-a)

Aggregate aggr_nvme_b (online, raid_tec) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 11500 GB, Free: 5600 GB
    RAID Group rg2 (triple parity, active)
        Disks: 8 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-b)

Spare Disks (node-a):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares

Spare Disks (node-b):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares

Broken Disks:
    disk NVM0112 (type NVMe SSD) prefailed`,
    "LICENSE": `Base Licenses:
System Serial Number: 800000111111 (node-a)
  Cluster     active
  FCP         active
  iSCSI       active
  NVMe        active
  SnapMirror  active`,
    "FAILOVER": `node-a   true   true  connected to node-b
node-b   true   true  connected to node-a`
  }
};

export const demoAFF_C800 = {
  name: "AFF C800 HA Cluster (Capacity Flash - ONTAP 9.14.1)",
  files: {
    "VERSION": `NetApp Release 9.14.1: Thu Dec 16 22:15:10 UTC 2023
Model Name: AFF C800
System Serial Number: 800000111111`,
    "SYSCONFIG-A": `NetApp Release 9.14.1: Thu Dec 16 22:15:10 UTC 2023
System ID: 838860800 (node-a); System Serial Number: 800000111111 (node-a)
System ID: 838860801 (node-b); System Serial Number: 800000222222 (node-b)

Memory Size: 262144 MB
Number of Processors: 32

Shelf 1: NS224 (S/N: NS224-000001) v0130 (Latest: v0130)
Shelf 2: NS224 (S/N: NS224-000002) v0130 (Latest: v0130)
Shelf 3: NS224 (S/N: NS224-000003) v0130 (Latest: v0130)
Shelf 4: NS224 (S/N: NS224-000004) v0130 (Latest: v0130)
`,
    "SYSCONFIG-R": `Aggregate aggr_nvme_a (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14877 GB, Free: 2223 GB
    RAID Group rg1 (dual parity, active)
        Disks: 11 (15.3TB NVMe QLC)
        Spare Disks: 1 of size 15.3TB NVMe QLC (node-a)`,
    "LICENSE": `Base Licenses:
System Serial Number: 800000111111 (node-a)
  Cluster     active
  NFS         active
  CIFS        active
  FCP         active
  iSCSI       active
  SnapMirror  active`,
    "SNAPMIRROR": `Source            Destination       State        Status      Lag Time
vol1              backup_vol1       Snapmirrored Idle        -
vol2              backup_vol2       Snapmirrored Lagging     12:30:00`
  }
};
