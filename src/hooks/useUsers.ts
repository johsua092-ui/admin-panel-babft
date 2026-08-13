"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  type Firestore,
} from "firebase/firestore";
import { db, userDb } from "@/lib/firebase";
import type { UserRecord } from "@/lib/types";

const USERS_COLLECTION = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";

function pickDb(): Firestore {
  return userDb ?? db;
}

// Normalisasi dari dokumen Firestore (baik client SDK maupun API response).
function normalize(id: string, raw: Record<string, unknown>): UserRecord {
  return {
    id,
    email: (raw.email as string) ?? null,
    displayName: (raw.displayName as string) ?? null,
    photoURL: (raw.photoURL as string) ?? null,
    lastLoginAt: (raw.lastLoginAt as number) ?? null,
    loginCount: (raw.loginCount as number) ?? 0,
    online: (raw.online as boolean) ?? false,
    lastOnlineAt: (raw.lastOnlineAt as number) ?? null,
    firstLoginAt: (raw.firstLoginAt as number) ?? null,
    region: (raw.region as string) ?? null,
    countryCode: (raw.countryCode as string) ?? null,
    timezone: (raw.timezone as string) ?? null,
    ipAddress: (raw.ipAddress as string) ?? null,
    previousRegion: (raw.previousRegion as string) ?? null,
    regionChangedAt: (raw.regionChangedAt as number) ?? null,
    regionChangeCount: (raw.regionChangeCount as number) ?? 0,
    flaggedAsVpn: (raw.flaggedAsVpn as boolean) ?? false,
    createdAt: (raw.createdAt as number) ?? null,
    updatedAt: (raw.updatedAt as number) ?? null,
  };
}

export function useUsers(limitCount: number = 500) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sumber 1: API route (Admin SDK) — aman & bisa baca semua user.
  // Polling tiap 5 detik untuk memberi efek "real-time".
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function loadViaApi() {
      try {
        const r = await fetch(`/api/users?limit=${limitCount}`);
        if (!r.ok) throw new Error(`API ${r.status}`);
        const json = await r.json();
        if (cancelled) return;
        if (json.users && Array.isArray(json.users)) {
          setUsers(json.users.map((u: Record<string, unknown> & { id: string }) => normalize(u.id, u)));
          setLoading(false);
          setError(null);
        }
      } catch (_) {
        // API belum siap (service account belum dipasang) → fallback ke client SDK.
        // Abaikan; client SDK di bawah akan mengambil alih.
      }
    }

    async function loop() {
      await loadViaApi();
      if (!cancelled) timer = setTimeout(loop, 5000);
    }
    loop();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [limitCount]);

  // Sumber 2 (fallback): client SDK (onSnapshot real-time) bila API tidak aktif.
  useEffect(() => {
    if (!loading) return; // hanya fallback saat API belum ngasih data
    const target = pickDb();
    const q = query(
      collection(target, USERS_COLLECTION),
      orderBy("lastLoginAt", "desc"),
      limit(limitCount)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => normalize(d.id, d.data() as Record<string, unknown>));
        setUsers(rows);
        setLoading(false);
      },
      (err) => {
        console.error("useUsers client error", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [limitCount, loading]);

  return { users, loading, error };
}
