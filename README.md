# Admin Panel BABFT

Admin panel untuk **BABFT Learning** — dashboard monitoring user dengan security ketat.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend / Auth**: Firebase (Authentication + Firestore)
- **Deploy**: Vercel
- **Icons**: lucide-react (tanpa emoji)

## Fitur

- **Login Google + whitelist admin** — hanya akun Google yang UID-nya terdaftar di koleksi
  `admins` di Firestore (atau `NEXT_PUBLIC_ADMIN_EMAILS`) yang bisa masuk. Tidak ada
  hardcode akun di kode. Saat ini ada **2 admin**: `johsua092@gmail.com` (owner) dan
  `aremakonveksi@gmail.com` (admin).
- **Dashboard**: total user, user online, rentang waktu login, distribusi login per jam,
  top region/negara.
- **Users**: daftar user dengan region, country code, timezone, IP, status online,
  last login, last online, dan flag **VPN** (deteksi perubahan region antar negara).
- **Servers**: inventaris 4 server VPS (statis, bukan koneksi live).
- **Responsive** — mobile & desktop (sidebar collapse, tabel scroll horizontal).
- **Tema gelap** ala nhentai.net — aksen merah, tanpa gradient/neon/warna ungu.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Salin `.env.example` → `.env.local`, lalu isi config Firebase:

   ```bash
   cp .env.example .env.local
   ```

   Isi nilai `NEXT_PUBLIC_FIREBASE_*` dari Firebase Console.

3. Atur whitelist admin di Firestore (lihat `docs/SCHEMA.md`).

4. Jalankan:

   ```bash
   npm run dev
   ```

## Environment Variables

| Variabel | Keterangan |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | API key Firebase |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | App ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Measurement ID |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Daftar email admin (koma-separated), fallback env |
| `NEXT_PUBLIC_ADMINS_COLLECTION` | Nama koleksi admin (default `admins`) |
| `NEXT_PUBLIC_USERS_COLLECTION` | Nama koleksi user (default `users`) |

## Security Considerations

- Verifikasi admin dilakukan **setiap** perubahan auth state, bukan hanya saat login.
- Admin yang `active: false` langsung di-sign-out.
- Kredensial Firebase disimpan di environment variable, bukan hardcode.
- Atur **Firestore Security Rules** agar hanya admin (via service account / rules)
  yang bisa membaca koleksi `admins`.
