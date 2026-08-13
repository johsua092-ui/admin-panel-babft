// Server-only: membaca koleksi `users` (punya-si-jawa) via Firebase Admin SDK.
// Aman & tidak membuka data user ke publik (dipakai oleh API route, bukan client).

import { cert, getApps, getApp, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  const existing = getApps();
  if (existing.length) return existing[0];

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }

  // Fallback: gunakan Application Default Credentials (Vercel env / GCP).
  // Kalau tidak ada juga, throw di sini supaya jelas errornya.
  if (projectId) {
    return initializeApp({ projectId });
  }

  throw new Error(
    "Firebase Admin belum dikonfigurasi. Isi FIREBASE_ADMIN_CLIENT_EMAIL / " +
      "FIREBASE_ADMIN_PRIVATE_KEY / FIREBASE_ADMIN_PROJECT_ID di env Vercel."
  );
}

export function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app);
}
