/**
 * NetApp AutoSupport Mock Data bundles.
 * This file contains raw text representing standard outputs of ASUP files.
 * The parser will parse these files client-side.
 */

export const DEMO_DATA = {
  fas8300: {
    name: "FAS8300 HA Cluster (Hybrid SAS/SSD - ONTAP 9.7)",
    files: {
      "VERSION": `NetApp Release 9.7P12: Thu Nov 12 18:22:45 UTC 2020
Model Name: FAS8300
System Serial Number: 700000111111`,
      
      "SYSCONFIG-A": `NetApp Release 9.7P12: Thu Nov 12 18:22:45 UTC 2020
System ID: 536870912 (node-a); System Serial Number: 700000111111 (node-a)
System ID: 536870913 (node-b); System Serial Number: 700000222222 (node-b)

slot 0: M.2 SATA SSD
slot 1: Dual-port 10GbE SFP+
slot 2: Quad-port 12G SAS Adapter (PMC-Sierra PM8068)
        cabling: loop 1a cabled to Shelf 1 (DS224C) Multipath HA
        cabling: loop 2a cabled to Shelf 2 (DS224C) Single-Path HA [WARNING]
slot 3: Dual-port 100GbE NIC

Shelf 1: DS224C (S/N: SHFL-000001) v0212 (Latest: v0224)
    Disk 0: NETAPP X343_S163A960ATE (960GB, SSD, FW: NA04, S/N: SSD0001)
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
      
      "NETPORT": `node-a:
    port e0a  up  10GbE  full-duplex  cluster-interconnect
    port e0b  up  10GbE  full-duplex  cluster-interconnect
    port e0c  up  10GbE  full-duplex  data
    port e0d  up  10GbE  full-duplex  data
node-b:
    port e0a  up  10GbE  full-duplex  cluster-interconnect
    port e0b  up  10GbE  full-duplex  cluster-interconnect
    port e0c  up  10GbE  full-duplex  data
    port e0d  up  10GbE  full-duplex  data`
    }
  },
  
  aff_a400: {
    name: "AFF A400 HA Cluster (All-Flash NVMe - ONTAP 9.9.1)",
    files: {
      "VERSION": `NetApp Release 9.9.1P8: Thu Dec 16 22:15:10 UTC 2021
Model Name: AFF A400
System Serial Number: 800000111111`,
      
      "SYSCONFIG-A": `NetApp Release 9.9.1P8: Thu Dec 16 22:15:10 UTC 2021
System ID: 838860800 (node-a); System Serial Number: 800000111111 (node-a)
System ID: 838860801 (node-b); System Serial Number: 800000222222 (node-b)

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
  FlexClone   active
System Serial Number: 800000222222 (node-b)
  Cluster     active
  NFS         active
  CIFS        active
  FCP         active
  iSCSI       active
  SnapMirror  active
  FlexClone   active`,
      
      "NETPORT": `node-a:
    port e0a  up  25GbE  full-duplex  cluster-interconnect
    port e0b  up  25GbE  full-duplex  cluster-interconnect
    port e0c  up  25GbE  full-duplex  data
    port e0d  up  25GbE  full-duplex  data
node-b:
    port e0a  up  25GbE  full-duplex  cluster-interconnect
    port e0b  up  25GbE  full-duplex  cluster-interconnect
    port e0c  up  25GbE  full-duplex  data
    port e0d  up  25GbE  full-duplex  data`
    }
  }
};
