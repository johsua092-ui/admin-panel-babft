import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";
import { requireAdmin } from "@/lib/authGuard";

// Helper: convert Firestore Timestamp to ISO string
function tsToISO(v: any): string | null {
  if (!v) return null;
  // Firestore Admin SDK Timestamp has _seconds + _nanoseconds (when serialized)
  // or seconds + nanoseconds (when native)
  if (typeof v === "object") {
    const sec = v._seconds ?? v.seconds ?? 0;
    if (sec) return new Date(sec * 1000).toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  try { return new Date(v).toISOString(); } catch { return null; }
}

// GET /api/coins — list all members with gold + recent gold_log
export async function GET(req: NextRequest) {
  try {
    // Auth check — only admin can access
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    try {
      await requireAdmin(authHeader, cookieHeader);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // ── Lookup user by email ──
    if (action === "lookup-user") {
      const email = url.searchParams.get("email")?.toLowerCase().trim();
      if (!email) return NextResponse.json({ error: "email param required" }, { status: 400 });
      // Search by email field
      let snap = await db.collection("users").where("email", "==", email).limit(1).get();
      if (snap.empty) {
        // Fallback: search by firebase_email field
        snap = await db.collection("users").where("firebase_email", "==", email).limit(1).get();
      }
      if (snap.empty) return NextResponse.json({ found: false });
      const doc = snap.docs[0];
      const d = doc.data();
      return NextResponse.json({
        found: true,
        uid: doc.id,
        email: d.email || d.firebase_email || null,
        displayName: d.displayName || d.display_name || null,
        gold: d.gold || 0,
      });
    }

    // Default: fetch all members + logs
    const usersSnap = await db.collection("users").get();
    const members = usersSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        email: d.email || d.firebase_email || null,
        displayName: d.displayName || d.display_name || null,
        gold: d.gold || 0,
        updatedAt: tsToISO(d.updatedAt),
      };
    });

    // Fetch recent gold_log (last 200)
    let logs: any[] = [];
    try {
      const logSnap = await db.collection("gold_log")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();
      logs = logSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          uid: d.uid || "",
          email: d.email || null,
          type: d.type,
          amount: d.amount,
          balanceAfter: d.balanceAfter,
          createdAt: tsToISO(d.createdAt),
          meta: d.meta || {},
        };
      });
    } catch {
      // Fallback if composite index doesn't exist yet
      const logSnap = await db.collection("gold_log").limit(200).get();
      logs = logSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          uid: d.uid || "",
          email: d.email || null,
          type: d.type,
          amount: d.amount,
          balanceAfter: d.balanceAfter,
          createdAt: tsToISO(d.createdAt),
          meta: d.meta || {},
        };
      }).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    }

    // Summary stats
    const totalGold = members.reduce((sum, m) => sum + m.gold, 0);
    const totalMembers = members.length;

    return NextResponse.json({ members, logs, totalGold, totalMembers });
  } catch (e: any) {
    console.error("[api/coins] GET error:", e?.message || e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/coins — grant/deduct/bulk-grant/bulk-deduct operations
export async function POST(req: NextRequest) {
  try {
    // Auth check — only admin can perform mutations
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    let admin;
    try {
      admin = await requireAdmin(authHeader, cookieHeader);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getAdminDb();
    const body = await req.json();
    const { action, targetUid, targetEmail, amount, note } = body;

    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

    // Resolve targetUid from email if targetEmail is provided
    let resolvedUid = targetUid;
    if (!resolvedUid && targetEmail) {
      const email = targetEmail.toLowerCase().trim();
      let snap = await db.collection("users").where("email", "==", email).limit(1).get();
      if (snap.empty) snap = await db.collection("users").where("firebase_email", "==", email).limit(1).get();
      if (snap.empty) return NextResponse.json({ error: `User dengan email ${targetEmail} tidak ditemukan` }, { status: 404 });
      resolvedUid = snap.docs[0].id;
    }

    // ── Grant gold to a user ──
    if (action === "grant") {
      if (!resolvedUid || !amount || amount <= 0 || amount > 100000)
        return NextResponse.json({ error: "targetUid/targetEmail and amount (1-100000) required" }, { status: 400 });

      const ref = db.collection("users").doc(resolvedUid);
      const doc = await ref.get();
      const docData = doc.exists ? doc.data() : null;
      const current = docData ? (docData.gold || 0) : 0;
      const newBalance = current + amount;
      const now = new Date();

      await ref.set({ gold: newBalance, updatedAt: now }, { merge: true });
      await db.collection("gold_log").add({
        uid: resolvedUid, type: "admin_grant", amount, balanceAfter: newBalance,
        createdAt: now, meta: { note: note || null, source: "admin_panel", adminEmail: admin.email },
      });

      return NextResponse.json({ message: `Granted ${amount} gold`, uid: resolvedUid, newBalance });
    }

    // ── Deduct/Withdraw gold from a user (tarik gold) ──
    if (action === "deduct") {
      if (!resolvedUid || !amount || amount <= 0 || amount > 100000)
        return NextResponse.json({ error: "targetUid/targetEmail and amount (1-100000) required" }, { status: 400 });

      const ref = db.collection("users").doc(resolvedUid);
      const doc = await ref.get();
      if (!doc.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const deductDocData = doc.data();
      const current = deductDocData ? (deductDocData.gold || 0) : 0;
      if (current < amount) return NextResponse.json({ error: "Insufficient gold", currentGold: current }, { status: 402 });

      const newBalance = current - amount;
      const now = new Date();

      await ref.set({ gold: newBalance, updatedAt: now }, { merge: true });
      await db.collection("gold_log").add({
        uid: resolvedUid, type: "admin_deduct", amount: -amount, balanceAfter: newBalance,
        createdAt: now, meta: { note: note || null, source: "admin_panel", adminEmail: admin.email },
      });

      return NextResponse.json({ message: `Deducted ${amount} gold`, uid: resolvedUid, newBalance });
    }

    // ── Bulk grant to all members ──
    if (action === "bulk-grant") {
      if (!amount || amount <= 0 || amount > 100000)
        return NextResponse.json({ error: "amount (1-100000) required" }, { status: 400 });

      const snap = await db.collection("users").get();
      const now = new Date();
      const BATCH_SIZE = 400;
      const results: any[] = [];

      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = snap.docs.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
          const data = doc.data();
          const currentGold = data.gold || 0;
          const newGold = currentGold + amount;
          batch.update(doc.ref, { gold: newGold, updatedAt: now });
          results.push({ uid: doc.id, email: data.email || data.firebase_email || null, oldGold: currentGold, newGold });
        }
        await batch.commit();

        const logBatch = db.batch();
        for (const r of results.slice(results.length - chunk.length)) {
          const logRef = db.collection("gold_log").doc();
          logBatch.set(logRef, {
            uid: r.uid, type: "admin_grant", amount, balanceAfter: r.newGold,
            createdAt: now, meta: { note: note || "Bulk grant", bulkGrant: true, source: "admin_panel", adminEmail: admin.email },
          });
        }
        await logBatch.commit();
      }

      return NextResponse.json({
        message: `Granted ${amount} gold to ${results.length} members`,
        count: results.length,
        totalGranted: results.length * amount,
      });
    }

    // ── Bulk deduct from all members (tarik gold dari semua) ──
    if (action === "bulk-deduct") {
      if (!amount || amount <= 0 || amount > 100000)
        return NextResponse.json({ error: "amount (1-100000) required" }, { status: 400 });

      const snap = await db.collection("users").get();
      const now = new Date();
      const BATCH_SIZE = 400;
      const results: any[] = [];

      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = snap.docs.slice(i, i + BATCH_SIZE);

        for (const doc of chunk) {
          const data = doc.data();
          const currentGold = data.gold || 0;
          // Don't go below 0
          const deductAmount = Math.min(amount, currentGold);
          if (deductAmount <= 0) continue; // Skip members with 0 gold
          const newGold = currentGold - deductAmount;
          batch.update(doc.ref, { gold: newGold, updatedAt: now });
          results.push({ uid: doc.id, email: data.email || data.firebase_email || null, oldGold: currentGold, deducted: deductAmount, newGold });
        }
        await batch.commit();

        const logBatch = db.batch();
        for (const r of results.slice(results.length - chunk.length)) {
          const logRef = db.collection("gold_log").doc();
          logBatch.set(logRef, {
            uid: r.uid, type: "admin_deduct", amount: -r.deducted, balanceAfter: r.newGold,
            createdAt: now, meta: { note: note || "Bulk deduct", bulkDeduct: true, source: "admin_panel", adminEmail: admin.email },
          });
        }
        await logBatch.commit();
      }

      return NextResponse.json({
        message: `Deducted up to ${amount} gold from ${results.length} members`,
        count: results.length,
        totalDeducted: results.reduce((s, r) => s + r.deducted, 0),
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[api/coins] POST error:", e?.message || e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
