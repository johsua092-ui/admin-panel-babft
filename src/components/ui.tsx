"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CountUp } from "@/components/anim";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "ok" | "warn" | "danger";
}) {
  const toneColor: Record<string, string> = {
    default: "text-fg-muted",
    accent: "text-accent",
    ok: "text-ok",
    warn: "text-warn",
    danger: "text-danger",
  };
  const iconBg: Record<string, string> = {
    default: "bg-bg-panel2 text-fg-muted",
    accent: "bg-accent-soft text-accent",
    ok: "bg-[#14331f] text-ok",
    warn: "bg-[#33280f] text-warn",
    danger: "bg-[#331414] text-danger",
  };

  // Jika value berupa angka, animasikan dengan CountUp.
  const numeric = typeof value === "number";
  const display = numeric ? <CountUp value={value as number} /> : value;

  return (
    <div className="anim-fade-up group rounded-lg border border-bg-border bg-bg-panel p-4 transition-all hover:border-fg-dim hover:shadow-[0_0_20px_-6px_rgba(192,57,43,0.25)]">
      <div className="flex items-center gap-2">
        <div className={`${iconBg[tone]} h-7 w-7 rounded-md flex items-center justify-center transition-transform group-hover:scale-110`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-2xs font-medium uppercase tracking-wide text-fg-dim">{label}</span>
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${toneColor[tone]}`}>{display}</div>
      {hint && <div className="mt-1 text-2xs text-fg-dim">{hint}</div>}
    </div>
  );
}

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "ok" | "warn" | "danger" | "info";
}) {
  const map: Record<string, string> = {
    default: "bg-bg-panel2 text-fg-muted border-bg-border",
    ok: "bg-[#14331f] text-ok border-[#1f5b35]",
    warn: "bg-[#33280f] text-warn border-[#5b4a1f]",
    danger: "bg-[#331414] text-danger border-[#5b1f1f]",
    info: "bg-[#0f2633] text-info border-[#1f4c5b]",
  };
  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-medium " +
        map[tone]
      }
    >
      {children}
    </span>
  );
}

export function Card({
  title,
  children,
  className,
  action,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}) {
  return (
    <section className={"anim-fade-up rounded-lg border border-bg-border bg-bg-panel " + (className ?? "")}>
      {title && (
        <div className="flex items-center justify-between border-b border-bg-border px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
