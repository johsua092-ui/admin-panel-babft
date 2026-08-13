"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "@/lib/firebase";

// ---------------------------------------------------------------------------
// ALUR SECURITY (tidak ada akun/email yang di-hardcode di sini):
//
// 1. User login via Google (Firebase Auth).
// 2. Verifikasi admin dari DUA sumber, berurutan:
//    a. Firestore  → koleksi "admins", document id = user.uid.
//    b. Env var    → NEXT_PUBLIC_ADMIN_EMAILS (daftar email admin koma-separated).
// 3. Jika TIDAK ada di kedua sumber (atau doc Firestore `active: false`),
//    user langsung di-sign-out dan ditolak.
//
// Catatan: sumber env dipakai supaya panel cepat jalan sebelum Firestore
// terisi. Untuk produksi, andalkan Firestore (lebih ketat & bisa dikelola
// live). UID-nya sendiri TIDAK PERNAH di-hardcode.
// ---------------------------------------------------------------------------

const ADMINS_COLLECTION = process.env.NEXT_PUBLIC_ADMINS_COLLECTION || "admins";

// Daftar email admin dari env (koma-separated), di-normalisasi lowercase.
// Aman: nilai aktual tinggal di Environment Variables Vercel, bukan di repo.
const ENV_ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

type AuthStatus = "loading" | "unauthenticated" | "checking" | "authenticated" | "denied";

type AdminRecord = {
  uid: string;
  email: string;
  role?: string;
  active?: boolean;
};

type AuthContextValue = {
  user: User | null;
  admin: { email: string; role: string } | null;
  status: AuthStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<{ email: string; role: string } | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const verifyAdmin = useCallback(async (u: User) => {
    setStatus("checking");
    const email = (u.email ?? "").toLowerCase();
    const uid = u.uid;

    try {
      // --- Sumber 1: Firestore `admins/{uid}` (kunci utama) ---
      const ref = doc(db, ADMINS_COLLECTION, uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data() as AdminRecord;
        if (data.active === false) {
          await firebaseSignOut(auth);
          setUser(null);
          setAdmin(null);
          setStatus("denied");
          return;
        }
        setAdmin({ email: data.email ?? email, role: data.role ?? "admin" });
        setStatus("authenticated");
        return;
      }

      // --- Sumber 2: env fallback ------------
      if (ENV_ADMIN_EMAILS.includes(email)) {
        setAdmin({ email, role: "owner" });
        setStatus("authenticated");
        return;
      }

      // Tidak terdaftar di mana pun → tolak.
      await firebaseSignOut(auth);
      setUser(null);
      setAdmin(null);
      setStatus("denied");
    } catch (e) {
      console.error("verifyAdmin error", e);
      // Jangan panic: jangan biarkan error malah meloloskan. Tolak.
      await firebaseSignOut(auth);
      setUser(null);
      setAdmin(null);
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (!u) {
        setAdmin(null);
        setStatus("unauthenticated");
        return;
      }
      await verifyAdmin(u);
    });
    return () => unsub();
  }, [verifyAdmin]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged akan memanggil verifyAdmin otomatis.
    } catch (e) {
      console.error("signInWithGoogle error", e);
      setStatus("unauthenticated");
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
    setUser(null);
    setAdmin(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <AuthContext.Provider value={{ user, admin, status, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
