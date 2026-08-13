// GET /api/traffic — data traffic internet dari Vercel Web Analytics.
// Menampilkan pageviews & visitors untuk deteksi lonjakan traffic (DDoS).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const projectId = process.env.VERCEL_PROJECT_ID;

  if (!token || !projectId) {
    return NextResponse.json(
      { error: "VERCEL_TOKEN / VERCEL_PROJECT_ID belum diset." },
      { status: 500 }
    );
  }

  try {
    const now = Date.now();
    const dayAgo = now - 86400000;
    const weekAgo = now - 7 * 86400000;

    const params = new URLSearchParams({ projectId });
    if (teamId) params.set("teamId", teamId);

    // Harian (24 jam terakhir)
    const dayParams = new URLSearchParams(params);
    dayParams.set("since", String(dayAgo));
    dayParams.set("until", String(now));

    // Mingguan (7 hari)
    const weekParams = new URLSearchParams(params);
    weekParams.set("since", String(weekAgo));
    weekParams.set("until", String(now));

    const [dayRes, weekRes] = await Promise.all([
      fetch(`https://api.vercel.com/v1/query/web-analytics/visits/count?${dayParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`https://api.vercel.com/v1/query/web-analytics/visits/count?${weekParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const dayJson = await dayRes.json().catch(() => ({}));
    const weekJson = await weekRes.json().catch(() => ({}));

    const dayData = dayJson.data || { pageviews: 0, visitors: 0 };
    const weekData = weekJson.data || { pageviews: 0, visitors: 0 };

    return NextResponse.json({
      day: dayData,
      week: weekData,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
