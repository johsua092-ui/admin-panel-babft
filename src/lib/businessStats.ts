// ============================================================================
// Business stats — agregasi data Firestore (punya-si-jawa) untuk dashboard
// "Bisnis / Analitik AI": % user topup, durasi pakai AI, dipakai buat apa,
// dan time-series harian (grafik naik/turun).
//
// Server-only (dipanggil dari API route). Baca direct pakai Firebase Admin SDK.
// ============================================================================

import { getAdminDb } from "@/lib/adminFirestore";

const USERS_COLLECTION = () => process.env.NEXT_PUBLIC_USERS_COLLECTION || "users";

type FireTs = { _seconds?: number; seconds?: number };

function toMillis(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (v instanceof Date && !isNaN(v.getTime())) return v.getTime();
  const o = v as FireTs;
  if (o && typeof o === "object") {
    if (typeof o._seconds === "number") return o._seconds * 1000;
    if (typeof o.seconds === "number") return o.seconds * 1000;
  }
  const n = Number(v);
  if (!isNaN(n)) return n < 1e12 ? n * 1000 : n;
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

export async function getBusinessStats(): Promise<BusinessStats> {
  const db = getAdminDb();

  const [usersSnap, aiSnap, goldLogSnap, chatSnap] = await Promise.all([
    db.collection(USERS_COLLECTION()).get(),
    db.collection("ai_access").get(),
    db.collection("gold_log").get(),
    db.collection("ai_chat_log").get(),
  ]);

  const totalUsers = usersSnap.size;

  // ---- Topup: dari gold_log ----
  const buyerUids = new Set<string>();
  const buyDays = new Map<string, number>();
  let totalBuyTransactions = 0;
  let totalGoldSpent = 0;

  goldLogSnap.docs.forEach((d) => {
    const x = d.data();
    const type = String(x.type || "");
    const isPurchase = type === "spend_ai" || type === "topup" || type === "topup_member" || type === "buy";
    if (!isPurchase) return;
    if (x.uid) buyerUids.add(String(x.uid));
    totalBuyTransactions++;
    const amt = Math.max(0, Number(x.amount) || 0);
    if (type === "spend_ai") totalGoldSpent += amt;
    const dk = dayKey(toMillis(x.createdAt));
    if (dk) buyDays.set(dk, (buyDays.get(dk) || 0) + 1);
  });

  // ---- Durasi AI: dari ai_access ----
  let aiAccessUsers = 0;
  let activeTimersNow = 0;
  let totalRemainingMinutes = 0;
  let totalTimerMinutesPurchased = 0;
  const now = Date.now();
  const activeDays = new Map<string, number>();

  aiSnap.docs.forEach((d) => {
    const x = d.data();
    aiAccessUsers++;
    totalRemainingMinutes += Math.max(0, Number(x.remainingMinutes) || 0);
    totalTimerMinutesPurchased += Math.max(0, Number(x.totalMinutesPurchased) || 0);

    const startedMs = toMillis(x.timerStartedAt);
    const expiresMs = toMillis(x.timerExpiresAt);

    if (startedMs && expiresMs && startedMs <= now && now < expiresMs) {
      activeTimersNow++;
      const dk = dayKey(startedMs);
      if (dk) activeDays.set(dk, (activeDays.get(dk) || 0) + 1);
    }
    const lastBuyMs = toMillis(x.lastBuyAt);
    if (lastBuyMs) {
      const dk = dayKey(lastBuyMs);
      if (dk) activeDays.set(dk, (activeDays.get(dk) || 0) + 1);
    }
  });

  const percentTopup = totalUsers > 0 ? +((buyerUids.size / totalUsers) * 100).toFixed(2) : 0;
  const avgMinutesPerUser = aiAccessUsers > 0 ? +(totalTimerMinutesPurchased / aiAccessUsers).toFixed(1) : 0;

  // ---- Topik (dipakai buat apa) ----
  const topicMap = new Map<string, number>();
  chatSnap.docs.forEach((d) => {
    const x = d.data();
    const cat = classifyTopic(x.message || x.question || "");
    topicMap.set(cat, (topicMap.get(cat) || 0) + 1);
  });
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
