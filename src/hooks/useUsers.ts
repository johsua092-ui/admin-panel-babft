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

// Koleksi user — baca dari database data-user (punya-si-jawa) bila tersedia,
// fallback ke database utama admin (backend-fb691).
const USERS_COLLECTION = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";

function pickDb(): Firestore {
  return userDb ?? db;
}

export function useUsers(limitCount: number = 500) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const target = pickDb();
    const q = query(
      collection(target, USERS_COLLECTION),
      orderBy("lastLoginAt", "desc"),
      limit(limitCount)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: UserRecord[] = snap.docs.map((d) => {
          const raw = d.data() as Record<string, unknown>;
          return {
            id: d.id,
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
        });
        setUsers(rows);
        setLoading(false);
      },
      (err) => {
        console.error("useUsers error", err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [limitCount]);

  return { users, loading, error };
}
