// Mendaftarkan admin ke Firestore koleksi `admins`.
//
// Kebutuhan:
//   - Service account JSON (Generate di Firebase Console -> Project settings ->
//     Service accounts -> Generate new private key). Simpan sebagai file, JANGAN commit.
//
// Cara pakai:
//   node scripts/seed-admins.mjs <service-account.json> <uid1:email1:role1> [uid2:email2:role2 ...]
//
// Contoh (2 admin):
//   node scripts/seed-admins.mjs ./service-account.json \
//     "abc123:johsua092@gmail.com:owner" \
//     "def456:aremakonveksi@gmail.com:admin"
//
// UID Firebase Auth bisa dilihat di Firebase Console -> Authentication -> Users
// (kolom "User UID").

import { readFile } from "node:fs/promises";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const [saPath, ...entries] = process.argv.slice(2);

if (!saPath || entries.length === 0) {
  console.error(
    "Usage: node scripts/seed-admins.mjs <service-account.json> <uid:email:role> [...]"
  );
  process.exit(1);
}

const sa = JSON.parse(await readFile(saPath, "utf8"));
initializeApp({ credential: cert(sa) });
const db = getFirestore();
const now = Date.now();

for (const entry of entries) {
  const [uid, email, role = "admin"] = entry.split(":");
  if (!uid || !email) {
    console.error(`[skip] format salah: "${entry}" — harus uid:email:role`);
    continue;
  }
  await db.collection("admins").doc(uid).set({
    email,
    role,
    active: true,
    createdAt: now,
  });
  console.log(`[done] admin terdaftar -> ${email} (${role})`);
}

console.log("Selesai.");
