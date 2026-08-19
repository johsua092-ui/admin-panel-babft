// ============================================================================
// Business stats — agregasi data Turso untuk dashboard "Bisnis / Analitik AI":
// % user topup, durasi pakai AI, dipakai buat apa, dan time-series harian
// (grafik naik/turun).
//
// Server-only (dipanggil dari API route). Baca direct pakai @libsql/client.
// ============================================================================

import { createClient } from "@libsql/client";

function client() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_AUTH_TOKEN;
  if (!url) throw new Error("TURSO_DATABASE_URL belum diset.");
  return createClient({ url, authToken: token });
}

function toMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (typeof v === "string") {
    const n = Number(v);
    if (!isNaN(n)) return n < 1e12 ? n * 1000 : n;
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.getTime();
    return null;
  }
  if (typeof v === "object") {
    const o = v as { _seconds?: number; seconds?: number };
    if (typeof o._seconds === "number") return o._seconds * 1000;
    if (typeof o.seconds === "number") return o.seconds * 1000;
  }
  return null;
}

function dayKey(ts: number | null): string | null {
  if (ts == null) return null;
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const TOPIC_LABEL: Record<string, string> = {
  "logic-gates": "Logic Gates",
  gears: "Gears / Mekanik",
  quiz: "Quiz / Latihan",
  coding: "Coding",
  belajar: "Belajar / Tutorial",
  "gold/topup": "Gold / Topup",
  lainnya: "Lainnya",
};

function classifyTopic(text: unknown): string {
  if (!text) return "lainnya";
  const t = String(text).toLowerCase();
  if (/(logic gate|gerbang logika|\band\b|\bor\b|\bnot\b|nand|nor|xor|xnor|rangkaian|circuit|sirkuit|truth table|tabel kebenaran)/.test(t)) return "logic-gates";
  if (/(gear|gigi|roda gigi|mekanik|mesin|motor)/.test(t)) return "gears";
  if (/(quiz|kuis|soal|latihan|ujian|tes)/.test(t)) return "quiz";
  if (/(kode|coding|script|program|python|javascript|html|css|website|bot|app|aplikasi)/.test(t)) return "coding";
  if (/(materi|pelajaran|belajar|tutorial|cara|gimana|bagaimana|jelasin|jelaskan)/.test(t)) return "belajar";
  if (/(gold|koin|topup|top up|beli|paket|timer|waktu ai|harga)/.test(t)) return "gold/topup";
  return "lainnya";
}

export type BusinessStats = {
  generatedAt: number;
  totals: {
    totalUsers: number;
    paidUsers: number;
    percentTopup: number;
    totalBuyTransactions: number;
    totalGoldSpent: number;
    aiAccessUsers: number;
    activeTimersNow: number;
    totalRemainingMinutes: number;
    totalTimerMinutesPurchased: number;
    avgMinutesPerUser: number;
  };
  topics: Array<{ topic: string; label: string; count: number }>;
  timeSeries: Array<{ date: string; purchases: number; activeAI: number }>;
};

async function safeQuery<T>(fn: () => Promise<T>, label: string): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    console.error(`[businessStats] gagal baca ${label}:`, e instanceof Error ? e.message : e);
    return null;
  }
}

export async function getBusinessStats(): Promise<BusinessStats> {
  const c = client();

  const [userRows, goldLogRows, aiAccessRows, aiChatLogRows] = await Promise.all([
    safeQuery(() => c.execute("SELECT id, email, gold, lastLoginAt FROM users WHERE deleted = 0").then(r => r.rows), "users"),
    safeQuery(() => c.execute("SELECT uid, email, type, amount, createdAt FROM gold_log ORDER BY COALESCE(createdAt, 0) DESC LIMIT 1000").then(r => r.rows), "gold_log"),
    safeQuery(() => c.execute("SELECT uid, email, remainingMinutes, totalMinutesPurchased, timerStartedAt, timerExpiresAt, lastBuyAt FROM ai_access").then(r => r.rows), "ai_access"),
    safeQuery(() => c.execute("SELECT message, response FROM ai_chat_log ORDER BY COALESCE(createdAt, 0) DESC LIMIT 1000").then(r => r.rows), "ai_chat_log"),
  ]);

  const totalUsers = userRows ? userRows.length : 0;

  // ---- Topup: dari gold_log ----
  const buyerUids = new Set<string>();
  const buyDays = new Map<string, number>();
  let totalBuyTransactions = 0;
  let totalGoldSpent = 0;

  if (goldLogRows) {
    for (const row of goldLogRows) {
      const type = String(row.type || "");
      const isPurchase = type === "spend_ai" || type === "topup" || type === "topup_member" || type === "buy";
      if (!isPurchase) continue;
      if (row.uid) buyerUids.add(String(row.uid));
      totalBuyTransactions++;
      const amt = Math.max(0, typeof row.amount === "number" ? row.amount : Number(row.amount) || 0);
      if (type === "spend_ai") totalGoldSpent += amt;
      const dk = dayKey(toMillis(row.createdAt));
      if (dk) buyDays.set(dk, (buyDays.get(dk) || 0) + 1);
    }
  }

  // ---- Durasi AI: dari ai_access ----
  let aiAccessUsers = 0;
  let activeTimersNow = 0;
  let totalRemainingMinutes = 0;
  let totalTimerMinutesPurchased = 0;
  const now = Date.now();
  const activeDays = new Map<string, number>();

  if (aiAccessRows) {
    aiAccessUsers = aiAccessRows.length;
    for (const row of aiAccessRows) {
      totalRemainingMinutes += Math.max(0, typeof row.remainingMinutes === "number" ? row.remainingMinutes : Number(row.remainingMinutes) || 0);
      totalTimerMinutesPurchased += Math.max(0, typeof row.totalMinutesPurchased === "number" ? row.totalMinutesPurchased : Number(row.totalMinutesPurchased) || 0);

      const startedMs = toMillis(row.timerStartedAt);
      const expiresMs = toMillis(row.timerExpiresAt);

      if (startedMs && expiresMs && startedMs <= now && now < expiresMs) {
        activeTimersNow++;
        const dk = dayKey(startedMs);
        if (dk) activeDays.set(dk, (activeDays.get(dk) || 0) + 1);
      }
      const lastBuyMs = toMillis(row.lastBuyAt);
      if (lastBuyMs) {
        const dk = dayKey(lastBuyMs);
        if (dk) activeDays.set(dk, (activeDays.get(dk) || 0) + 1);
      }
    }
  }

  const percentTopup = totalUsers > 0 ? +((buyerUids.size / totalUsers) * 100).toFixed(2) : 0;
  const avgMinutesPerUser = aiAccessUsers > 0 ? +(totalTimerMinutesPurchased / aiAccessUsers).toFixed(1) : 0;

  // ---- Topik (dipakai buat apa) ----
  const topicMap = new Map<string, number>();
  if (aiChatLogRows) {
    for (const row of aiChatLogRows) {
      const cat = classifyTopic(row.message || row.response);
      topicMap.set(cat, (topicMap.get(cat) || 0) + 1);
    }
  }
  const topics = Array.from(topicMap.entries())
    .map(([topic, count]) => ({ topic, label: TOPIC_LABEL[topic] || topic, count }))
    .sort((a, b) => b.count - a.count);

  // ---- Time-series ----
  const seriesMap = new Map<string, { date: string; purchases: number; activeAI: number }>();
  buyDays.forEach((count, dk) => {
    const row = seriesMap.get(dk) || { date: dk, purchases: 0, activeAI: 0 };
    row.purchases += count;
    seriesMap.set(dk, row);
  });
  activeDays.forEach((count, dk) => {
    const row = seriesMap.get(dk) || { date: dk, purchases: 0, activeAI: 0 };
    row.activeAI += count;
    seriesMap.set(dk, row);
  });
  const timeSeries = Array.from(seriesMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, r]) => r);

  return {
    generatedAt: Date.now(),
    totals: {
      totalUsers,
      paidUsers: buyerUids.size,
      percentTopup,
      totalBuyTransactions,
      totalGoldSpent,
      aiAccessUsers,
      activeTimersNow,
      totalRemainingMinutes,
      totalTimerMinutesPurchased,
      avgMinutesPerUser,
    },
    topics,
    timeSeries,
  };
}
