"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Cpu, MemoryStick, HardDrive, MonitorCog, Server, MapPin, CpuIcon,
  Activity, Gauge, Network, Thermometer,
} from "lucide-react";
import { SERVERS, type ServerSpec } from "@/lib/servers";
import { Badge } from "@/components/ui";
import { PulseDot } from "@/components/anim";

const TIER_LABEL: Record<ServerSpec["tier"], { label: string; tone: "default" | "ok" | "warn" | "info" | "danger" }> = {
  standard: { label: "Standard", tone: "default" },
  compute: { label: "Compute", tone: "info" },
  gpu: { label: "GPU", tone: "warn" },
  flagship: { label: "Flagship", tone: "danger" },
};

type LiveMetric = {
  cpu: number;      // %
  ram: number;      // %
  network: number;  // Mbps
  temp: number;     // C
  history: number[]; // cpu history for sparkline
};

// Simulasi real-time: metrik bergerak tiap detik (akan diganti polling agen/
// endpoint ketika ada koneksi live ke VPS nanti).
function useLiveMetrics(seed: number): LiveMetric {
  const [m, setM] = useState<LiveMetric>(() => {
    const cpu = 20 + (seed % 60);
    return {
      cpu,
      ram: 30 + ((seed * 7) % 45),
      network: 40 + ((seed * 13) % 900),
      temp: 38 + ((seed * 3) % 30),
      history: Array.from({ length: 30 }, (_, i) => cpu + Math.sin(i / 3) * 8 + (seed % 5)),
    };
  });

  useEffect(() => {
    const id = setInterval(() => {
      setM((prev) => {
        const drift = Math.sin(Date.now() / 3000 + seed) * 10;
        const nextCpu = Math.max(2, Math.min(98, prev.cpu + (Math.random() - 0.5) * 14 + drift * 0.3));
        const nextRam = Math.max(5, Math.min(96, prev.ram + (Math.random() - 0.5) * 3));
        const nextNet = Math.max(0, Math.min(950, prev.network + (Math.random() - 0.5) * 120));
        const nextTemp = Math.max(30, Math.min(88, prev.temp + (Math.random() - 0.5) * 2 + drift * 0.1));
        return {
          cpu: nextCpu,
          ram: nextRam,
          network: nextNet,
          temp: nextTemp,
          history: [...prev.history.slice(-29), nextCpu],
        };
      });
    }, 1100);
    return () => clearInterval(id);
  }, [seed]);

  return m;
}

export default function ServersPage() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <div className="anim-fade-up flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            Servers
            <PulseDot color="ok" />
          </h1>
          <p className="text-xs text-fg-dim">
            {SERVERS.length} server VPS · pemantauan real-time (simulasi live metrik)
          </p>
        </div>
        <Badge tone="ok">● Live</Badge>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SERVERS.map((s, i) => (
          <ServerCard key={s.id} s={s} seed={i * 13 + 7} />
        ))}
      </div>

    </div>
  );
}

function ServerCard({ s, seed }: { s: ServerSpec; seed: number }) {
  const tier = TIER_LABEL[s.tier];
  const m = useLiveMetrics(seed);
  const maxHistory = Math.max(1, ...m.history);
  const online = m.cpu !== undefined;

  return (
    <div className="anim-fade-up flex flex-col rounded-lg border border-bg-border bg-bg-panel p-4 transition-colors hover:border-fg-dim">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-bg-panel2 text-fg-muted">
            <Server className="anim-spin-slow h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2 text-sm font-semibold">
              {s.name}
            </div>
            <div className="flex items-center gap-1.5 text-2xs text-fg-dim">
              <PulseDot color={online ? "ok" : "danger"} />
              {online ? "Online" : "Offline"} · {s.role}
            </div>
          </div>
        </div>
        <Badge tone={tier.tone}>{tier.label}</Badge>
      </div>

      {/* Live gauges */}
      <div className="mb-3 grid grid-cols-2 gap-3">
        <GaugeBlock icon={Cpu} label="CPU" value={Math.round(m.cpu)} unit="%" color={m.cpu > 85 ? "bg-danger" : m.cpu > 65 ? "bg-warn" : "bg-ok"} />
        <GaugeBlock icon={MemoryStick} label="RAM" value={Math.round(m.ram)} unit="%" color={m.ram > 85 ? "bg-danger" : m.ram > 65 ? "bg-warn" : "bg-ok"} />
        <GaugeBlock icon={Network} label="Net" value={Math.round(m.network)} unit="Mbps" color="bg-info" hideBar />
        <GaugeBlock icon={Thermometer} label="Temp" value={Math.round(m.temp)} unit="°C" color={m.temp > 75 ? "bg-danger" : "bg-warn"} hideBar />
      </div>

      {/* Sparkline CPU */}
      <div className="mb-2 flex items-end gap-[2px]" style={{ height: 40 }}>
        {m.history.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm transition-all duration-500"
            style={{
              height: `${(v / maxHistory) * 100}%`,
              background: v > 85 ? "#e74c3c" : v > 65 ? "#f39c12" : "#2ecc71",
              opacity: 0.5 + 0.5 * (i / m.history.length),
            }}
          />
        ))}
      </div>
      <div className="mb-3 flex items-center justify-between text-2xs text-fg-dim">
        <span className="flex items-center gap-1">
          <Activity className="h-3 w-3" /> CPU history (30s)
        </span>
        <span>{Math.round(m.cpu)}%</span>
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

function GaugeBlock({
  icon: Icon,
  label,
  value,
  unit,
  color,
  hideBar,
}: {
  icon: typeof Cpu;
  label: string;
  value: number;
  unit: string;
  color: string;
  hideBar?: boolean;
}) {
  return (
    <div className="rounded border border-bg-panel2 bg-bg-base p-2">
      <div className="flex items-center gap-1.5 text-2xs text-fg-dim">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-base font-bold tabular-nums">{value}</span>
        <span className="text-2xs text-fg-dim">{unit}</span>
      </div>
      {!hideBar && (
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-bg-panel2">
          <div
            className={`h-full rounded ${color} transition-all duration-700`}
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
      )}
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
      <div className="w-14 shrink-0 text-2xs uppercase tracking-wide text-fg-dim">{label}</div>
      <div className="min-w-0 break-words text-fg-primary">{value}</div>
    </div>
  );
}
