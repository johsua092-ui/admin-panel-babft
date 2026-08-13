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

// ALUR SECURITY (tidak ada hardcode):
// 1. User login via Google (Firebase Auth).
// 2. Setelah login, cek document di Firestore: collection "admins", doc = user.uid.
// 3. Hanya jika document itu ADA (dan field active !== false), user dinyatakan admin.
// 4. Kalau tidak ada, langsung sign out + tampilkan pesan "Access denied".

// Nama koleksi admin dibaca dari env agar tidak hardcode:
const ADMINS_COLLECTION = process.env.NEXT_PUBLIC_ADMINS_COLLECTION || "admins";

type AuthStatus = "loading" | "unauthenticated" | "checking" | "authenticated" | "denied";

type AdminRecord = {
  uid: string;
  email: string;
  role?: string;
  active?: boolean;
};

type AuthContextValue = {
  user: User | null;
  admin: AdminRecord | null;
  status: AuthStatus;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<AdminRecord | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const verifyAdmin = useCallback(async (u: User) => {
    setStatus("checking");
    try {
      const ref = doc(db, ADMINS_COLLECTION, u.uid);
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
        setAdmin({ uid: u.uid, email: u.email ?? data.email ?? "", role: data.role, active: true });
        setStatus("authenticated");
      } else {
        // Akun Google valid, tapi tidak terdaftar sebagai admin → tolak.
        await firebaseSignOut(auth);
        setUser(null);
        setAdmin(null);
        setStatus("denied");
      }
    } catch (e) {
      console.error("verifyAdmin error", e);
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
      const res = await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged akan memanggil verifyAdmin otomatis.
      // Kita tidak set status di sini; biarkan listener bekerja.
      void res;
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
