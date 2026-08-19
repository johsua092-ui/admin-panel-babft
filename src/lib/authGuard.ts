import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const AUTH_APP_NAME = "auth-admin";

// ── PERMANENT ADMINS — hardcoded fallback, survive env var deletion/DB swap ──
// These emails ALWAYS have admin access to the admin panel regardless of
// NEXT_PUBLIC_ADMIN_EMAILS env config.
// Owner: johsua092@gmail.com, Co-admin: aremakonveksi@gmail.com
const PERMANENT_ADMIN_EMAILS = [
  "johsua092@gmail.com",
  "aremakonveksi@gmail.com",
];

function adminApp(): App {
  const existing = getApps().find((a) => a.name === AUTH_APP_NAME);
  if (existing) return existing;
  const projectId = process.env.FIREBASE_AUTH_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_AUTH_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_AUTH_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) }, AUTH_APP_NAME);
  }
  throw new Error("Firebase auth admin belum dikonfigurasi (FIREBASE_AUTH_ADMIN_*).");
}

const whitelist = () => {
  const envList = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  // Union of env list + hardcoded permanent admins
  return [...new Set([...envList, ...PERMANENT_ADMIN_EMAILS])];
};

export type AuthedAdmin = { uid: string; email: string };

function tokenFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).trim();
    if (key === "__token") return part.slice(eq + 1).trim();
  }
  return null;
}

export async function requireAdmin(authorization: string | null, cookieHeader?: string | null): Promise<AuthedAdmin> {
  let token: string;
  if (authorization && authorization.startsWith("Bearer ")) {
    token = authorization.slice("Bearer ".length).trim();
  } else {
    token = tokenFromCookie(cookieHeader ?? null) ?? "";
  }
  if (!token) throw new Error("UNAUTHORIZED");
  let decoded;
  try {
    decoded = await getAuth(adminApp()).verifyIdToken(token, true);
  } catch {
    throw new Error("UNAUTHORIZED");
  }
  const email = (decoded.email ?? "").toLowerCase();
  if (!email || !decoded.uid) throw new Error("UNAUTHORIZED");
  if (!whitelist().includes(email)) throw new Error("FORBIDDEN");
  return { uid: decoded.uid, email };
}
