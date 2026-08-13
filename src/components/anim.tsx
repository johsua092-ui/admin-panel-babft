"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// CountUp — angka naik dari 0 ke target saat pertama terlihat / mount.
export function CountUp({
  value,
  duration = 900,
  suffix = "",
}: {
  value: number;
  duration?: number;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>();

  useEffect(() => {
    const start = performance.now();
    startRef.current = start;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(eased * value));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <span className="tabular-nums">
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

// PulseDot — titik hidup yang berkedip (status online/live).
export function PulseDot({
  color = "ok",
  className,
}: {
  color?: "ok" | "danger" | "warn" | "accent";
  className?: string;
}) {
  const map: Record<string, string> = {
    ok: "bg-ok",
    danger: "bg-danger",
    warn: "bg-warn",
    accent: "bg-accent",
  };
  return (
    <span className={cn("relative inline-flex h-2 w-2", className)}>
      <span
        className={cn(
          "absolute inline-flex h-full w-full rounded-full opacity-75 anim-ping-ring",
          map[color]
        )}
      />
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", map[color])} />
    </span>
  );
}

// StatReveal — bungkus konten supaya muncul dengan animasi stagger fade-up.
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("anim-fade-up", className)}>{children}</div>;
}
