# Skema Firestore — Panel Penjual Sayur

Dokumen ini menjelaskan struktur koleksi Firestore yang dibaca panel.
Semua nama koleksi bisa di-override lewat environment variable (lihat `.env.example`),
sehingga tidak ada yang di-hardcode di kode.

## Koleksi 1: `admins` (whitelist anggota)

Ini adalah pintu keamanan panel. Hanya akun Google yang UID-nya ada sebagai
document di koleksi ini yang boleh masuk.

> Ada dua sumber verifikasi yang dipakai panel, berurutan:
> 1. Firestore `admins` (kunci utama, bisa dikelola live) — document id = UID.
> 2. Env `NEXT_PUBLIC_ADMIN_EMAILS` (fallback cepat) — daftar email koma-separated.
>
> Tidak ada email/UID yang di-hardcode di kode. Untuk produksi, andalkan Firestore.

Menggunakan UID Firebase Auth sebagai document ID (bukan email), agar unik & aman.

```
admins/{uid}
{
  "email": "anggota@example.com",
  "role": "owner",
  "active": true,
  "createdAt": 1720000000000
}
```

> Env override: `NEXT_PUBLIC_ADMINS_COLLECTION` (default `admins`).

### Cara mendaftarkan anggota
1. User login Google sekali (ditolak karena belum terdaftar, lalu langsung sign-out).
2. Owner mengambil UID user tersebut (lihat Firebase Auth console).
3. Owner membuat document `admins/{uid}` dengan field di atas.

Atau gunakan `scripts/seed-admins.mjs` (butuh service account).

## Koleksi 2: `users` (data user yang dipantau)

Ini adalah data aktivitas user: riwayat login, region, timezone, IP, deteksi VPN.

```
users/{uid atau id}
{
  "id": "...",
  "email": "user@example.com",
  "displayName": "Nama User",
  "photoURL": "https://...",

  "lastLoginAt": 1720000000000,
  "firstLoginAt": 1710000000000,
  "loginCount": 42,
  "online": true,
  "lastOnlineAt": 1720000000000,

  "region": "Indonesia",
  "countryCode": "ID",
  "timezone": "Asia/Jakarta",
  "ipAddress": "103.x.x.x",

  "previousRegion": "Indonesia",
  "regionChangedAt": 1720000000000,
  "regionChangeCount": 1,
  "flaggedAsVpn": true,

  "createdAt": 1710000000000,
  "updatedAt": 1720000000000
}
```

> Env override: `NEXT_PUBLIC_USERS_COLLECTION` (default `users`).

## Logika Deteksi VPN

Panel (dan logika app) menentukan `flaggedAsVpn` dengan aturan:
- User tercatat `region` = negara A.
- Pada login/aktivitas berikutnya, region berubah ke negara B (berbeda).
- Maka: `previousRegion` diisi region lama, `regionChangeCount` bertambah,
  `regionChangedAt` diisi, dan `flaggedAsVpn = true`.

Ini heuristik sederhana (perubahan region = indikasi VPN). Untuk akurasi lebih tinggi,
kombinasikan dengan deteksi IP (ASN dari IP — apakah milik datacenter/VPN).

## Menjalankan seed (opsional)

Lihat `scripts/` untuk contoh. Seed membutuhkan service account JSON dari
Firebase (Project settings → Service accounts → Generate new private key).

Jangan commit file `service-account.json`.
