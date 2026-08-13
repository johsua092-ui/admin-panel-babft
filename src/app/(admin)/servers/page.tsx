"use client";

import { Cpu, MemoryStick, HardDrive, MonitorCog, Server, MapPin, CpuIcon } from "lucide-react";
import { SERVERS, type ServerSpec } from "@/lib/servers";
import { Badge } from "@/components/ui";

const TIER_LABEL: Record<ServerSpec["tier"], { label: string; tone: "default" | "ok" | "warn" | "info" | "danger" }> = {
  standard: { label: "Standard", tone: "default" },
  compute: { label: "Compute", tone: "info" },
  gpu: { label: "GPU", tone: "warn" },
  flagship: { label: "Flagship", tone: "danger" },
};

export default function ServersPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">Servers</h1>
        <p className="text-xs text-fg-dim">
          {SERVERS.length} server VPS terdaftar · daftar statis (bukan koneksi live).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SERVERS.map((s) => (
          <ServerCard key={s.id} s={s} />
        ))}
      </div>

      <div className="rounded-lg border border-bg-border bg-bg-panel p-4 text-2xs text-fg-dim">
        Server-server ini ditampilkan sebagai inventaris statis. Untuk menghubungkan
        pemantauan live (CPU/RAM real-time) nanti, ganti bagian ini dengan polling endpoint
        atau agen di masing-masing VPS.
      </div>
    </div>
  );
}

function ServerCard({ s }: { s: ServerSpec }) {
  const tier = TIER_LABEL[s.tier];
  return (
    <div className="flex flex-col rounded-lg border border-bg-border bg-bg-panel p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-bg-panel2 text-fg-muted">
            <Server className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{s.name}</div>
            <div className="text-2xs text-fg-dim">{s.role}</div>
          </div>
        </div>
        <Badge tone={tier.tone}>{tier.label}</Badge>
      </div>

      <div className="flex flex-col gap-2 text-xs">
        <SpecRow icon={Cpu} label="CPU" value={s.cpu} />
        <SpecRow icon={MemoryStick} label="RAM" value={s.ram} />
        <SpecRow icon={HardDrive} label="Storage" value={s.storage} />
        {s.gpu && <SpecRow icon={CpuIcon} label="GPU" value={s.gpu} />}
        <SpecRow icon={MonitorCog} label="OS" value={s.os} />
        <SpecRow icon={MapPin} label="Location" value={s.location} />
      </div>
    </div>
  );
}

function SpecRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 border-b border-bg-panel2 pb-2 last:border-0 last:pb-0">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fg-dim" />
      <div className="w-14 shrink-0 text-2xs uppercase tracking-wide text-fg-dim">
        {label}
      </div>
      <div className="min-w-0 break-words text-fg-primary">{value}</div>
    </div>
  );
}
