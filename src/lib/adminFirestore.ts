// Server-only: membaca koleksi `users` (punya-si-jawa) via Firebase Admin SDK.
// Aman & tidak membuka data user ke publik (dipakai oleh API route, bukan client).
// NAMED APP "userdb-admin" agar tidak bentrok dengan authGuard ("auth-admin")
// yang menarget project backend-fb691.

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const APP_NAME = "userdb-admin";

function getAdminApp(): App {
  const existing = getApps().find((a) => a.name === APP_NAME);
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp(
      { credential: cert({ projectId, clientEmail, privateKey }) },
      APP_NAME
    );
  }

  // Fallback: gunakan Application Default Credentials (Vercel env / GCP).
  // Kalau tidak ada juga, throw di sini supaya jelas errornya.
  if (projectId) {
    return initializeApp({ projectId }, APP_NAME);
  }

  throw new Error(
    "Firebase Admin (userdb) belum dikonfigurasi. Isi FIREBASE_ADMIN_CLIENT_EMAIL / " +
      "FIREBASE_ADMIN_PRIVATE_KEY / FIREBASE_ADMIN_PROJECT_ID di env Vercel."
  );
}

export function getAdminDb() {
  const app = getAdminApp();
  return getFirestore(app);
}
