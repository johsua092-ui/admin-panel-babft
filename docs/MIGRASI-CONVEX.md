# Migrasi Backend → Convex (Catatan + Rollback)

Migrasi **jalur data** panel dari Firestore (`punya-si-jawa`) ke Convex (`backend-admin`).
**Auth tetap Firebase** (Google Sign-In + whitelist) — tidak ada perubahan di auth.

## Arsitektur
```
Browser → API route → DataSource (adapter) → { FIREBASE | CONVEX }  (+ failover otomatis)
```

- `src/lib/dataSource.ts` — interface.
- `src/lib/firestoreDataSource.ts` / `convexDataSource.ts` — implementasi.
- `src/lib/data.ts` — orkestrator: baca failover, tulis mirror opsional.
- `convex/*` — schema + query/mutation.

### Tabel Convex
| Tabel | Asal Firestore |
|---|---|
| `users` | `users` (doc id = UID) |
| `history` | `users/{uid}/history` |
| `adminLogins` | `admin_logins` |
| `analytics` | `analytics` |

## Env baru
`CONVEX_URL`, `DATA_BACKEND` (default `FIREBASE`), `MIRROR_WRITES`, `CONVEX_DEPLOY_KEY` (CLI only).

## Alur migrasi
1. `npx convex deploy`
2. `export CONVEX_URL=... && npm run export` (butuh `FIREBASE_ADMIN_*`)
3. Uji: `MIRROR_WRITES=true` + `DATA_BACKEND=FIREBASE`
4. Cutover: `DATA_BACKEND=CONVEX` (jangan hapus Firestore)

## Rollback
`DATA_BACKEND=FIREBASE` → deploy ulang. Data Firestore tidak dihapus.

## Keamanan
Jangan commit kredensial. Rotate deploy key + service account setelah selesai.
Field `history`/`analytics` masih `v.any()` — sempurnakan setelah field final dikonfirmasi.
