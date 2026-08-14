import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { assertAuthed } from "./_internalAuth";

const PAGE_SIZE = 500;
const tokenArg = { token: v.optional(v.string()) };

export const getAnalyticsEvents = query({
  args: tokenArg,
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const rows = (await ctx.db.query("analytics").withIndex("by_timestamp").order("desc").take(PAGE_SIZE)) as unknown as Array<Record<string, any>>;
    const events = rows.map((r) => ({ id: r._id, ...r.data, ...r })) as Array<Record<string, any>>;
    const now = Date.now();
    const lastMin = events.filter((e) => now - (e.timestamp ?? 0) < 60000);
    const last10min = events.filter((e) => now - (e.timestamp ?? 0) < 600000);
    const failedLogins = events.filter((e) => e.kind === "login_failed");
    const errors = events.filter((e) => e.kind === "error");
    const heartbeats = events.filter((e) => e.kind === "heartbeat");
    const suspicious: Array<{ id: string; level: string; title: string; detail: string }> = [];
    const recentFailed = failedLogins.filter((e) => now - (e.timestamp ?? 0) < 300000);
    if (recentFailed.length >= 5) suspicious.push({ id: "brute_force", level: "danger", title: "Kemungkinan brute-force login", detail: `${recentFailed.length} login gagal dalam 5 menit terakhir.` });
    const hbLastMin = heartbeats.filter((e) => now - (e.timestamp ?? 0) < 60000);
    if (hbLastMin.length >= 30) suspicious.push({ id: "flood", level: "warn", title: "Lonjakan traffic (kemungkinan flood)", detail: `${hbLastMin.length} heartbeat dalam 1 menit terakhir.` });
    const errLast5min = errors.filter((e) => now - (e.timestamp ?? 0) < 300000);
    if (errLast5min.length >= 10) suspicious.push({ id: "error_burst", level: "warn", title: "Lonjakan error", detail: `${errLast5min.length} error JS/promise dalam 5 menit.` });
    const uniqueAnon = new Set(last10min.map((e) => e.deviceId).filter(Boolean)).size;
    if (uniqueAnon >= 50) suspicious.push({ id: "many_clients", level: "warn", title: "Banyak klien unik", detail: `${uniqueAnon} perangkat unik dalam 10 menit.` });
    return {
      events,
      summary: { total: events.length, errors: errors.length, failedLogins: failedLogins.length, heartbeats: heartbeats.length, lastMin: lastMin.length, last10min: last10min.length, uniqueDevices: uniqueAnon },
      suspicious,
    };
  },
});

export const upsertAnalyticsEvent = mutation({
  args: { eventId: v.string(), timestamp: v.optional(v.union(v.float64(), v.null())), kind: v.optional(v.string()), deviceId: v.optional(v.string()), data: v.any(), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const existing = await ctx.db.query("analytics").collect().then((rows) => rows.find((r) => (r.data as any)?.eventId === args.eventId));
    if (existing) { await ctx.db.patch(existing._id, { timestamp: args.timestamp ?? null, kind: args.kind, deviceId: args.deviceId, data: args.data }); return { ok: true, updated: true }; }
    await ctx.db.insert("analytics", { timestamp: args.timestamp ?? null, kind: args.kind, deviceId: args.deviceId, data: args.data });
    return { ok: true, updated: false };
  },
});
