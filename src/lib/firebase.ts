import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// ===========================================================================
// 1) APP UTAMA (ADMIN PANEL) — untuk auth admin.
//    Config dari env (NEXT_PUBLIC_FIREBASE_*), project = backend-fb691.
// ===========================================================================
const mainConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// ===========================================================================
// 2) APP DATA USER — Firestore `punya-si-jawa` (database utama website teman).
//    Ini tempat koleksi `users` berada. Config publik (bukan rahasia).
// ===========================================================================
const usersConfig = {
  apiKey: process.env.NEXT_PUBLIC_USERDB_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_USERDB_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_USERDB_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_USERDB_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_USERDB_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_USERDB_APP_ID,
};

function isComplete(cfg: Record<string, string | undefined>): boolean {
  return Object.values(cfg).every((v) => !!v);
}

function initApp(name: string, cfg: Record<string, string | undefined>): FirebaseApp {
  const existing = getApps().find((a) => a.name === name);
  if (existing) return existing;
  return initializeApp(cfg, name);
}

// Auth + Firestore utama (admin) — WAJIB lengkap, kalau kosong throw di build.
const mainApp = (() => {
  if (!isComplete(mainConfig)) {
    // Saat import modul sisi client, env NEXT_PUBLIC_* sudah di-inline.
    // Throw hanya jika benar-benar kosong (harusnya diisi di Vercel).
    throw new Error(
      "Firebase config utama belum lengkap. Isi NEXT_PUBLIC_FIREBASE_* di env."
    );
  }
  const existing = getApps().find((a) => a.name === "[DEFAULT]");
  return existing ?? initializeApp(mainConfig);
})();

export const auth = getAuth(mainApp);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(mainApp);

// Firestore data user (punya-si-jawa). Guard: hanya init kalau config tersedia.
export const userDb: Firestore | null = isComplete(usersConfig)
  ? getFirestore(initApp("userdb", usersConfig))
  : null;

export { mainApp as app };
