// Seed script: daftarkan admin + contoh data user ke Firestore.
//
// Kebutuhan:
//   - File service account JSON dari Firebase Console
//     (Project settings -> Service accounts -> Generate new private key).
//   - Simpan sebagai ./service-account.json (JANGAN di-commit).
//
// Jalankan:
//   node scripts/seed.mjs <path-service-account.json> <admin-uid> <admin-email>
//
// Contoh:
//   node scripts/seed.mjs ./service-account.json "abc123uid" "owner@gmail.com"

import { readFile } from "node:fs/promises";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [saPath, adminUid, adminEmail, adminRole = "owner"] = process.argv.slice(2);

if (!saPath || !adminUid || !adminEmail) {
  console.error(
    "Usage: node scripts/seed.mjs <service-account.json> <adminUid> <adminEmail> [role]"
  );
  process.exit(1);
}

const sa = JSON.parse(await readFile(saPath, "utf8"));

initializeApp({ credential: cert(sa) });

const db = getFirestore();
const now = Date.now();

// 1) Daftarkan admin
await db.collection("admins").doc(adminUid).set({
  email: adminEmail,
  role: adminRole,
  active: true,
  createdAt: now,
});
console.log(`[done] admin terdaftar: ${adminEmail} (${adminRole})`);

// 2) Contoh data user (opsional — hapus jika tidak perlu)
const sampleUsers = [
  {
    id: "seed-user-1",
    email: "budi@example.com",
    displayName: "Budi Santoso",
    region: "Indonesia",
    countryCode: "ID",
    timezone: "Asia/Jakarta",
    ipAddress: "103.94.66.12",
    lastLoginAt: now - 1000 * 60 * 30,
    firstLoginAt: now - 1000 * 60 * 60 * 24 * 90,
    loginCount: 87,
    online: true,
    lastOnlineAt: now - 1000 * 60 * 5,
    flaggedAsVpn: false,
    previousRegion: null,
    regionChangeCount: 0,
    regionChangedAt: null,
    createdAt: now - 1000 * 60 * 60 * 24 * 90,
    updatedAt: now,
  },
  {
    id: "seed-user-2",
    email: "sara@example.com",
    displayName: "Sara Lee",
    region: "United States",
    countryCode: "US",
    timezone: "America/New_York",
    ipAddress: "104.28.11.45",
    lastLoginAt: now - 1000 * 60 * 60 * 5,
    firstLoginAt: now - 1000 * 60 * 60 * 24 * 45,
    loginCount: 35,
    online: false,
    lastOnlineAt: now - 1000 * 60 * 60 * 5,
    flaggedAsVpn: true,
    previousRegion: "Germany",
    regionChangeCount: 2,
    regionChangedAt: now - 1000 * 60 * 60 * 24 * 2,
    createdAt: now - 1000 * 60 * 60 * 24 * 45,
    updatedAt: now,
  },
];

for (const u of sampleUsers) {
  await db
    .collection("users")
    .doc(u.id)
    .set({
      ...u,
      photoURL: null,
    });
  console.log(`[done] sample user: ${u.email}`);
}

console.log("Selesai.");
