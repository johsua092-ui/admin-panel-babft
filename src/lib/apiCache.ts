// Cache in-memory server-side untuk API route (mengurangi baca Firestore).
// Vercel: module scope di-share antar request dalam satu serverless instance.
// TTL pendek — cukup untuk potong polling berulang tanpa bikin data basi.

type Entry = { value: unknown; expires: number };

const store = new Map<string, Entry>();

export function getCached<T>(key: string): T | undefined {
  const e = store.get(key);
  if (!e) return undefined;
  if (Date.now() > e.expires) {
    store.delete(key);
    return undefined;
  }
  return e.value as T;
}

export function setCached(key: string, value: unknown, ttlMs: number): void {
  store.set(key, { value, expires: Date.now() + ttlMs });
  // batasi ukuran memori (hapus entry kedaluwarsa sesekali)
  if (store.size > 100) {
    for (const [k, v] of store) {
      if (Date.now() > v.expires) store.delete(k);
    }
  }
}
