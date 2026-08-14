import { NextResponse } from "next/server";
import { guard, isResponse } from "@/lib/apiGuard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (isResponse(g)) return g;
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return NextResponse.json({ error: "VERCEL_TOKEN / VERCEL_PROJECT_ID belum diset." }, { status: 500 });
  }

  try {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 7 * 86400000;

    const params = new URLSearchParams({ projectId });
    if (teamId) params.set("teamId", teamId);

    const dayParams = new URLSearchParams(params);
    dayParams.set("since", String(dayAgo));
    dayParams.set("until", String(now));

    const weekParams = new URLSearchParams(params);
    weekParams.set("since", String(weekAgo));
    weekParams.set("until", String(now));

    const [dayRes, weekRes] = await Promise.all([
      fetch(`https://api.vercel.com/v1/query/web-analytics/visits/count?${dayParams}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`https://api.vercel.com/v1/query/web-analytics/visits/count?${weekParams}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const dayJson = await dayRes.json().catch(() => ({}));
    const weekJson = await weekRes.json().catch(() => ({}));

    return NextResponse.json({
      day: dayJson.data || { pageviews: 0, visitors: 0 },
      week: weekJson.data || { pageviews: 0, visitors: 0 },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
