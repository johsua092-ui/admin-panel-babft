import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function adminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];
  const projectId = process.env.FIREBASE_AUTH_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_AUTH_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_AUTH_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (projectId && clientEmail && privateKey) {
    return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  throw new Error("Firebase auth admin belum dikonfigurasi (FIREBASE_AUTH_ADMIN_*).");
}

const whitelist = () =>
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

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
