# Skema Firestore — Admin Panel BABFT

Dokumen ini menjelaskan struktur koleksi Firestore yang dibaca oleh admin panel.
Semua nama koleksi bisa di-override lewat environment variable (lihat `.env.example`),
sehingga tidak ada yang di-hardcode di kode.

## Koleksi 1: `admins` (whitelist admin)

Ini adalah **pintu keamanan** panel. Hanya akun Google yang UID-nya ada sebagai
document di koleksi ini yang boleh masuk.

Menggunakan **UID Firebase Auth** sebagai document ID (bukan email), agar unik & aman.

```
admins/{uid}
{
  "email": "admin@example.com",   // email Google owner/admin
  "role": "owner",                // "owner" | "admin" | "moderator"
  "active": true,                 // false = nonaktif (ditolak masuk)
  "createdAt": 1720000000000      // epoch ms (opsional)
}
```

> Env override: `NEXT_PUBLIC_ADMINS_COLLECTION` (default `admins`).

### Cara mendaftarkan admin
1. User login Google sekali (akan ditolak, karena belum terdaftar — ini aman, dia langsung sign-out).
2. Owner mengambil UID user tersebut (lihat di Firebase Auth console).
3. Owner membuat document `admins/{uid}` dengan field di atas.

Atau gunakan `scripts/seed-admin.mjs` (butuh service account — lihat bawah).

## Koleksi 2: `users` (data user yang dipantau)

Ini adalah data aktivitas user: login history, region, timezone, IP, deteksi VPN.

```
users/{uid atau id}
{
  "id": "...",
  "email": "user@example.com",
  "displayName": "Nama User",
  "photoURL": "https://...",

  // login / online
  "lastLoginAt": 1720000000000,   // epoch ms — login terakhir
  "firstLoginAt": 1710000000000,  // epoch ms — login pertama
  "loginCount": 42,               // total login
  "online": true,                 // sedang online (true/false)
  "lastOnlineAt": 1720000000000,  // epoch ms — terakhir terlihat online

  // geo / network
  "region": "Indonesia",          // nama negara/region
  "countryCode": "ID",            // ISO 3166-1 alpha-2
  "timezone": "Asia/Jakarta",     // timezone negara
  "ipAddress": "103.x.x.x",       // alamat IP

  // VPN detection
  "previousRegion": "Indonesia",  // region sebelumnya
  "regionChangedAt": 1720000000000, // kapan region berubah
  "regionChangeCount": 1,         // berapa kali ganti region
  "flaggedAsVpn": true            // otomatis true jika region berubah negara

  // meta
  "createdAt": 1710000000000,
  "updatedAt": 1720000000000
}
```

> Env override: `NEXT_PUBLIC_USERS_COLLECTION` (default `users`).

## Logika Deteksi VPN

Panel (dan logika app-mu) menentukan `flaggedAsVpn` dengan aturan:
- User tercatat `region` = negara A.
- Pada login/aktivitas berikutnya, region berubah ke negara B (berbeda).
- Maka: `previousRegion` diisi region lama, `regionChangeCount` bertambah,
  `regionChangedAt` diisi, dan `flaggedAsVpn = true`.

Ini adalah **heuristik sederhana** (perubahan region = indikasi VPN). Untuk akurasi
lebih tinggi, kombinasikan dengan deteksi IP (ASN dari IP — apakah milik datacenter/VPN),
yang bisa ditambahkan lewat Cloud Function.

## Menjalankan seed (opsional)

Lihat `scripts/` untuk contoh. Seed membutuhkan service account JSON dari
Firebase (Project settings → Service accounts → Generate new private key).

Jangan commit file `service-account.json`.
