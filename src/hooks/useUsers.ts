"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { UserRecord } from "@/lib/types";

// Nama koleksi user — baca dari env, fallback "users".
const USERS_COLLECTION = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";

export function useUsers(limitCount: number = 500) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, USERS_COLLECTION),
      orderBy("lastLoginAt", "desc"),
      limit(limitCount)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: UserRecord[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<UserRecord, "id">),
        }));
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
