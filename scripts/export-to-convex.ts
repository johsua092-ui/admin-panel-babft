import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { ConvexHttpClient } from "convex/browser";

function initFirestore() {
  if (getApps().length === 0) {
    const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    if (projectId && clientEmail && privateKey) initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
    else if (projectId) initializeApp({ projectId });
    else throw new Error("Firebase Admin env belum diset (FIREBASE_ADMIN_*).");
  }
  return getFirestore();
}

function initConvex() {
  const url = process.env.CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL belum diset.");
  return new ConvexHttpClient(url);
}

function sanitize(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v.getTime();
  if (typeof v === "object") {
    const o = v as any;
    if (typeof o.toMillis === "function") return o.toMillis();
    if (typeof o._seconds === "number") return o._seconds * 1000;
    if (Array.isArray(v)) return v.map(sanitize);
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) out[k] = sanitize(val);
    return out;
  }
  if (typeof v === "number" && !Number.isFinite(v)) return null;
  return v;
}

const USERS = process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";
const ANALYTICS = process.env.NEXT_PUBLIC_ANALYTICS_COLLECTION || "analytics";

async function main() {
  const db = initFirestore();
  const convex = initConvex();
  let usersCount = 0, historyCount = 0, adminCount = 0, analyticsCount = 0;

  const usersSnap = await db.collection(USERS).get();
  for (const doc of usersSnap.docs) {
    const uid = doc.id;
    const data = sanitize(doc.data()) as Record<string, unknown>;
    await convex.mutation("users:upsertUser" as any, { id: uid, data: { ...data, id: uid } });
    usersCount++;
    const histSnap = await doc.ref.collection("history").get();
    for (const h of histSnap.docs) {
      const hd = sanitize(h.data()) as Record<string, unknown>;
      const timestamp = (hd.timestamp as number) ?? null;
      await convex.mutation("users:addHistory" as any, { uid, timestamp, data: hd });
      historyCount++;
    }
  }

  const adminSnap = await db.collection("admin_logins").get();
  for (const doc of adminSnap.docs) {
    const d = doc.data() as Record<string, any>;
    const ts = sanitize(d.timestamp);
    await convex.mutation("adminLogins:logAdminLogin" as any, {
      uid: d.uid ?? "",
      email: d.email ?? "",
      role: d.role ?? "anggota",
      timestamp: typeof ts === "number" ? ts : Date.now(),
    });
    adminCount++;
  }

  const analyticsSnap = await db.collection(ANALYTICS).get();
  for (const doc of analyticsSnap.docs) {
    const d = doc.data() as Record<string, any>;
    const ts = sanitize(d.timestamp);
    await convex.mutation("analytics:upsertAnalyticsEvent" as any, {
      eventId: doc.id,
      timestamp: typeof ts === "number" ? ts : null,
      kind: typeof d.kind === "string" ? d.kind : undefined,
      deviceId: typeof d.deviceId === "string" ? d.deviceId : undefined,
      data: { ...(sanitize(d) as Record<string, unknown>), eventId: doc.id },
    });
    analyticsCount++;
  }

  console.log("=== EKSPOR SELESAI ===");
  console.log(`users       : ${usersCount}`);
  console.log(`history     : ${historyCount}`);
  console.log(`admin_logins: ${adminCount}`);
  console.log(`analytics   : ${analyticsCount}`);
}

main().catch((e) => {
  console.error("EKSPOR GAGAL:", e);
  process.exit(1);
});
