// Data 4 server VPS milik owner.
// Ini data STATIS (bukan live connection) — sesuai permintaan:
// server-nya real, tapi panel tidak melakukan koneksi real-time ke VPS.
// Tampil sebagai kartu status. Untuk keperluan upgrade ke live monitoring
// nanti, struktur ini tinggal diganti ke endpoint/SSH polling.

export type ServerSpec = {
  id: string;
  name: string;
  cpu: string;
  ram: string;
  storage: string;
  gpu?: string;
  os: string;
  // label tambahan untuk filter / badge
  tier: "standard" | "compute" | "gpu" | "flagship";
  location: string;
  role: string;
};

export const SERVERS: ServerSpec[] = [
  {
    id: "vps-01",
    name: "Server 01",
    cpu: "2 vCPU Intel Xeon Platinum 8358 @ 2.60GHz",
    ram: "16 GB",
    storage: "155 GB SSD",
    os: "Ubuntu 22.04.5 LTS",
    tier: "standard",
    location: "Jakarta / SG",
    role: "API & Auth",
  },
  {
    id: "vps-02",
    name: "Server 02",
    cpu: "AMD EPYC 9654P — 96 Cores / 192 Threads",
    ram: "512 GB DDR5 ECC",
    storage: "4 TB NVMe SSD",
    gpu: "NVIDIA H100 80 GB HBM3",
    os: "Ubuntu 24.04 LTS",
    tier: "compute",
    location: "US / EU",
    role: "Training Compute",
  },
  {
    id: "vps-03",
    name: "Server 03",
    cpu: "Intel Xeon Platinum 8592+ — 64 Cores / 128 Threads",
    ram: "512 GB DDR5 ECC",
    storage: "4 TB NVMe SSD",
    gpu: "NVIDIA H100 80 GB HBM3",
    os: "Ubuntu 24.04 LTS",
    tier: "gpu",
    location: "US / EU",
    role: "Inference & Batch",
  },
  {
    id: "vps-04",
    name: "Server 04",
    cpu: "AMD EPYC 9754 — 128 Cores / 256 Threads",
    ram: "1 TB DDR5 ECC",
    storage: "8 TB NVMe SSD",
    gpu: "NVIDIA H200 141 GB HBM3e",
    os: "Debian 13 (Trixie)",
    tier: "flagship",
    location: "US / EU",
    role: "Main GPU Cluster",
  },
];
