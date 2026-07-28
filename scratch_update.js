const fs = require('fs');
let code = fs.readFileSync('g:/My Drive/AntiGravity/NetAppModeler/js/demoData.js', 'utf8');

// B1 - Update ONTAP versions
code = code.replace(/ONTAP 9\.7\)/g, 'ONTAP 9.14.1)');
code = code.replace(/Release 9\.7P12/g, 'Release 9.14.1');
code = code.replace(/ONTAP 9\.9\.1\)/g, 'ONTAP 9.14.1)');
code = code.replace(/Release 9\.9\.1P8/g, 'Release 9.14.1');
code = code.replace(/ONTAP 9\.12\.1\)/g, 'ONTAP 9.14.1)');
code = code.replace(/Release 9\.12\.1P4/g, 'Release 9.14.1');

// B2 - Fix MetroCluster demo
const mcSysConfigROld = `Aggregate aggr0_a1 (online, raid_dp) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1500 GB, Free: 300 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (1.9TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_sync_a1 (online, raid_dp, mirrored) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14750 GB, Free: 23500 GB
    RAID Group rg1 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-a1)

Aggregate aggr_nvme_local_a2 (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 11500 GB, Free: 5600 GB
    RAID Group rg2 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-a2)

Spare Disks (node-a1):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares

Spare Disks (node-a2):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares`;

const mcSysConfigRNew = mcSysConfigROld + `

Aggregate aggr0_b1 (online, raid_dp) (block-checksum)
    Size: 2200 GB, Usable: 1800 GB, Used: 1500 GB, Free: 300 GB
    RAID Group rg0 (dual parity, active)
        Disks: 3 (1.9TB NVMe SSD)
        Spare Disks: 0

Aggregate aggr_nvme_sync_b1 (online, raid_dp, mirrored) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 14750 GB, Free: 23500 GB
    RAID Group rg1 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-b1)

Aggregate aggr_nvme_local_b2 (online, raid_dp) (block-checksum)
    Size: 20900 GB, Usable: 17100 GB, Used: 11500 GB, Free: 5600 GB
    RAID Group rg2 (dual parity, active)
        Disks: 11 (1.9TB NVMe SSD)
        Spare Disks: 1 of size 1.9TB NVMe SSD (node-b2)

Spare Disks (node-b1):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares

Spare Disks (node-b2):
    NETAPP X371_S16431T9ATE (1.9TB, NVMe SSD) - 1 spares`;

code = code.replace(mcSysConfigROld, mcSysConfigRNew);

const mcShowOld = `===== METROCLUSTER SHOW =====
Cluster        Partner Cluster        Configuration State
-------------- ---------------------- -------------------
cluster-a      cluster-b              configured

MetroCluster IP Configuration Status: configured`;

const mcShowNew = mcShowOld + `

metrocluster node show

DR Group ID  Cluster     Node      DR Partner Node
------------ ----------- --------- ---------------
1            local-site  node-a1   node-b1
1            local-site  node-a2   node-b2
1            remote-site node-b1   node-a1
1            remote-site node-b2   node-a2`;

code = code.replace(mcShowOld, mcShowNew);

fs.writeFileSync('g:/My Drive/AntiGravity/NetAppModeler/js/demoData.js', code);
