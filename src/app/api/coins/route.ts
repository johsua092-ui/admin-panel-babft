import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/adminFirestore";

// GET /api/coins — list all members with gold + recent gold_log
export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();

    // Fetch users
    const usersSnap = await db.collection("users").get();
    const members = usersSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        uid: doc.id,
        email: d.email || d.firebase_email || null,
        displayName: d.displayName || d.display_name || null,
        gold: d.gold || 0,
        updatedAt: d.updatedAt ? new Date(d.updatedAt._seconds * 1000 || d.updatedAt).toISOString() : null,
      };
    });

    // Fetch recent gold_log (last 100)
    let logs: any[] = [];
    try {
      const logSnap = await db.collection("gold_log")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get();
      logs = logSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          uid: d.uid,
          type: d.type,
          amount: d.amount,
          balanceAfter: d.balanceAfter,
          createdAt: d.createdAt ? new Date(d.createdAt._seconds * 1000 || d.createdAt).toISOString() : null,
          meta: d.meta || {},
        };
      });
    } catch {
      // Fallback if index doesn't exist
      const logSnap = await db.collection("gold_log").limit(100).get();
      logs = logSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          uid: d.uid,
          type: d.type,
          amount: d.amount,
          balanceAfter: d.balanceAfter,
          createdAt: d.createdAt ? new Date(d.createdAt._seconds * 1000 || d.createdAt).toISOString() : null,
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

// POST /api/coins — grant/deduct/bulk-grant operations
export async function POST(req: NextRequest) {
  try {
    const db = getAdminDb();
    const body = await req.json();
    const { action, targetUid, amount, note } = body;

    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

    // ── Grant gold to a user ──
    if (action === "grant") {
      if (!targetUid || !amount || amount <= 0 || amount > 10000)
        return NextResponse.json({ error: "targetUid and amount (1-10000) required" }, { status: 400 });

      const ref = db.collection("users").doc(targetUid);
      const doc = await ref.get();
      const current = doc.exists ? (doc.data().gold || 0) : 0;
      const newBalance = current + amount;
      const now = new Date();

      await ref.set({ gold: newBalance, updatedAt: now }, { merge: true });
      await db.collection("gold_log").add({
        uid: targetUid, type: "admin_grant", amount, balanceAfter: newBalance,
        createdAt: now, meta: { note: note || null, source: "admin_panel" },
      });

      return NextResponse.json({ message: `Granted ${amount} gold`, uid: targetUid, newBalance });
    }

    // ── Deduct gold from a user (tarik gold) ──
    if (action === "deduct") {
      if (!targetUid || !amount || amount <= 0 || amount > 10000)
        return NextResponse.json({ error: "targetUid and amount (1-10000) required" }, { status: 400 });

      const ref = db.collection("users").doc(targetUid);
      const doc = await ref.get();
      if (!doc.exists) return NextResponse.json({ error: "User not found" }, { status: 404 });
      const current = doc.data().gold || 0;
      if (current < amount) return NextResponse.json({ error: "Insufficient gold", currentGold: current }, { status: 402 });

      const newBalance = current - amount;
      const now = new Date();

      await ref.set({ gold: newBalance, updatedAt: now }, { merge: true });
      await db.collection("gold_log").add({
        uid: targetUid, type: "admin_deduct", amount: -amount, balanceAfter: newBalance,
        createdAt: now, meta: { note: note || null, source: "admin_panel" },
      });

      return NextResponse.json({ message: `Deducted ${amount} gold`, uid: targetUid, newBalance });
    }

    // ── Bulk grant to all members ──
    if (action === "bulk-grant") {
      if (!amount || amount <= 0 || amount > 10000)
        return NextResponse.json({ error: "amount (1-10000) required" }, { status: 400 });

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
          results.push({ uid: doc.id, email: data.email || null, oldGold: currentGold, newGold });
        }
        await batch.commit();

        const logBatch = db.batch();
        for (const r of results.slice(results.length - chunk.length)) {
          const logRef = db.collection("gold_log").doc();
          logBatch.set(logRef, {
            uid: r.uid, type: "admin_grant", amount, balanceAfter: r.newGold,
            createdAt: now, meta: { note: note || "Bulk grant", bulkGrant: true, source: "admin_panel" },
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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    console.error("[api/coins] POST error:", e?.message || e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
