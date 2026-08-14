"use client";

import { useEffect, useState } from "react";
import type { UserRecord } from "@/lib/types";

const USERS_COLLECTION = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";

function asNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v !== "" && !Number.isNaN(Number(v))) return Number(v);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o._seconds === "number") return o._seconds * 1000;
    if (typeof o.seconds === "number") return o.seconds * 1000;
    if (typeof o.toMillis === "function") {
      try { return (o.toMillis as () => number)(); } catch (_) {}
    }
  }
  return null;
}

function asStr(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.id === "string") return o.id; // timezone map {id: "Asia/Jakarta"}
    if (typeof o.name === "string") return o.name;
    return null;
  }
  return null;
}

function asBool(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

function normalize(id: string, raw: unknown): UserRecord {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id,
    email: asStr(o.email),
    isGuest: asBool(o.isGuest),
    displayName: asStr(o.displayName),
    photoURL: asStr(o.photoURL),
    lastLoginAt: asNum(o.lastLoginAt),
    loginCount: asNum(o.loginCount) ?? 0,
    online: asBool(o.online),
    lastOnlineAt: asNum(o.lastOnlineAt),
    firstLoginAt: asNum(o.firstLoginAt),
    region: asStr(o.region),
    countryCode: asStr(o.countryCode),
    regionName: asStr(o.regionName),
    isp: asStr(o.isp),
    timezone: asStr(o.timezone),
    ipAddress: asStr(o.ipAddress),
    latitude: asNum(o.latitude),
    longitude: asNum(o.longitude),
    accuracy: asNum(o.accuracy),
    address: asStr(o.address),
    city: asStr(o.city),
    postal: asStr(o.postal),
    deviceId: asStr(o.deviceId),
    device: asStr(o.device),
    os: asStr(o.os),
    browser: asStr(o.browser),
    deviceType: asStr(o.deviceType),
    screen: asStr(o.screen),
    language: asStr(o.language),
    userAgent: asStr(o.userAgent),
    previousRegion: asStr(o.previousRegion),
    regionChangedAt: asNum(o.regionChangedAt),
    regionChangeCount: asNum(o.regionChangeCount) ?? 0,
    flaggedAsVpn: asBool(o.flaggedAsVpn),
    isProxy: asBool(o.isProxy),
    isHosting: asBool(o.isHosting),
    vpnProvider: asStr(o.vpnProvider),
    asn: asStr(o.asn),
    banned: asBool(o.banned),
    bannedAt: asNum(o.bannedAt),
    bannedReason: asStr(o.bannedReason),
    unbannedAt: asNum(o.unbannedAt),
    createdAt: asNum(o.createdAt),
    updatedAt: asNum(o.updatedAt),
  };
}

export function useUsers(limitCount: number = 500) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function load() {
      try {
        const r = await fetch(`/api/users?limit=${limitCount}`);
        if (cancelled) return;
        if (!r.ok) {
          setError(`API error ${r.status}`);
          setLoading(false);
          return;
        }
        const json = await r.json();
        if (cancelled) return;
        if (json && Array.isArray(json.users)) {
          setUsers(json.users.map((u: unknown) => normalize(((u as { id?: string })?.id) ?? "", u)));
          setError(null);
        }
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      }
    }

    async function loop() {
      await load();
      if (!cancelled) timer = setTimeout(loop, 5000);
    }
    loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [limitCount]);

  return { users, loading, error };
}


