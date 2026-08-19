import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authGuard";
import {
  getCoinMembers,
  lookupCoinUser,
  getGoldLogs,
  grantGold,
  deductGold,
  bulkGrantGold,
  bulkDeductGold,
} from "@/lib/tursoCoins";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function auth(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cookieHeader = req.headers.get("cookie");
  return requireAdmin(authHeader, cookieHeader);
}

export async function GET(req: NextRequest) {
  try {
    let admin;
    try {
      admin = await auth(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "lookup-user") {
      const email = url.searchParams.get("email")?.toLowerCase().trim();
      if (!email) return NextResponse.json({ error: "email param required" }, { status: 400 });
      const result = await lookupCoinUser(email);
      return NextResponse.json(result);
    }

    const { members, totalGold, totalMembers } = await getCoinMembers();
    let logs: Awaited<ReturnType<typeof getGoldLogs>> = [];
    try {
      logs = await getGoldLogs(200);
    } catch (e) {
      console.warn("[api/coins] getGoldLogs gagal:", e instanceof Error ? e.message : e);
    }

    return NextResponse.json({ members, logs, totalGold, totalMembers });
  } catch (e: unknown) {
    console.error("[api/coins] GET error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let admin;
    try {
      admin = await auth(req);
    } catch {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, targetUid, targetEmail, amount, note } = body as {
      action?: string;
      targetUid?: string;
      targetEmail?: string;
      amount?: number;
      note?: string;
    };

    if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

    let resolvedUid = targetUid ?? null;
    if (!resolvedUid && targetEmail) {
      const email = targetEmail.toLowerCase().trim();
      const lookup = await lookupCoinUser(email);
      if (!lookup.found || !lookup.uid) {
        return NextResponse.json({ error: `User dengan email ${targetEmail} tidak ditemukan` }, { status: 404 });
      }
      resolvedUid = lookup.uid;
    }

    if (action === "grant") {
      if (!resolvedUid || !amount || amount <= 0 || amount > 100000) {
        return NextResponse.json({ error: "targetUid/targetEmail and amount (1-100000) required" }, { status: 400 });
      }
      try {
        const { newBalance } = await grantGold(resolvedUid, amount, note ?? null, admin.email);
        return NextResponse.json({ message: `Granted ${amount} gold`, uid: resolvedUid, newBalance });
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 402) {
          return NextResponse.json({ error: "Insufficient gold", currentGold: (e as { currentGold?: number }).currentGold ?? 0 }, { status: 402 });
        }
        throw e;
      }
    }

    if (action === "deduct") {
      if (!resolvedUid || !amount || amount <= 0 || amount > 100000) {
        return NextResponse.json({ error: "targetUid/targetEmail and amount (1-100000) required" }, { status: 400 });
      }
      try {
        const { newBalance } = await deductGold(resolvedUid, amount, note ?? null, admin.email);
        return NextResponse.json({ message: `Deducted ${amount} gold`, uid: resolvedUid, newBalance });
      } catch (e: unknown) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 402) {
          return NextResponse.json({ error: "Insufficient gold", currentGold: (e as { currentGold?: number }).currentGold ?? 0 }, { status: 402 });
        }
        throw e;
      }
    }

    if (action === "bulk-grant") {
      if (!amount || amount <= 0 || amount > 100000) {
        return NextResponse.json({ error: "amount (1-100000) required" }, { status: 400 });
      }
      const r = await bulkGrantGold(amount, note ?? null, admin.email, admin.uid);
      return NextResponse.json({
        message: `Granted ${amount} gold to ${r.count} members`,
        count: r.count,
        totalGranted: r.totalGranted,
      });
    }

    if (action === "bulk-deduct") {
      if (!amount || amount <= 0 || amount > 100000) {
        return NextResponse.json({ error: "amount (1-100000) required" }, { status: 400 });
      }
      const r = await bulkDeductGold(amount, note ?? null, admin.email, admin.uid);
      return NextResponse.json({
        message: `Deducted up to ${amount} gold from ${r.count} members`,
        count: r.count,
        totalDeducted: r.totalDeducted,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    console.error("[api/coins] POST error:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
