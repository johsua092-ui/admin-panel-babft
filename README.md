# Panel "Penjual Sayur" (BABFT)

Panel monitoring user dengan security ketat. Branding samaran tidak menampilkan istilah internal di UI.

## Tech Stack

- Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- Auth: Firebase Authentication (Google Sign-In + whitelist)
- Data: Firestore (default) atau Convex (migrasi bertahap, lihat docs/MIGRASI-CONVEX.md)
- Deploy: Vercel

## Fitur

- Login Google + whitelist (via koleksi admins / env), tidak ada akun hardcode
- Dashboard: total user, online, rentang login, distribusi per jam, top region
- Users: region, country code, timezone, IP, online, last login, flag VPN
- Servers: inventaris 4 server VPS (statis)
- Responsive, tema gelap aksen merah

## Setup

1. `npm install`
2. Salin .env.example ke .env.local, isi config Firebase + Convex
3. Atur whitelist di Firestore (lihat docs/SCHEMA.md)
4. Opsional: `npx convex deploy` lalu `npm run export` untuk sinkron data
5. `npm run dev`

## Environment Variables

| Variabel | Keterangan |
| --- | --- |
| NEXT_PUBLIC_FIREBASE_* | Config Firebase (api key, auth domain, project id, dll) |
| NEXT_PUBLIC_ADMIN_EMAILS | Daftar email anggota (koma-separated), fallback env |
| NEXT_PUBLIC_ADMINS_COLLECTION | Koleksi whitelist (default admins) |
| NEXT_PUBLIC_USERS_COLLECTION | Koleksi user (default users) |
| CONVEX_URL | Deployment URL Convex |
| DATA_BACKEND | FIREBASE (default) atau CONVEX |
| MIRROR_WRITES | true untuk tulis ganda selama transisi |

## Security

- Verifikasi whitelist setiap perubahan auth state
- Akun aktif false langsung sign-out
- Kredensial via env, tidak hardcode
- Failover sumber data: backend utama gagal otomatis fallback
Fri Aug 14 11:23:49 UTC 2026
Fri Aug 14 11:27:49 UTC 2026
