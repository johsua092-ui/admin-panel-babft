import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { assertAuthed } from "./_internalAuth";

const PAGE_SIZE = 500;

const tokenArg = { token: v.optional(v.string()) };

export const getUsers = query({
  args: tokenArg,
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    // Ambil SEMUA user lalu sort di memory — lebih robust daripada index order,
    // karena index by_lastLoginAt tidak meng-cover dokumen dengan lastLoginAt null,
    // sehingga user baru (atau field kosong) bisa hilang dari daftar.
    const all = await ctx.db.query("users").collect();
    all.sort((a, b) => ((b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0)));
    const users = all.slice(0, PAGE_SIZE);
    return users.map((u) => ({ ...u, id: u.id ?? u._id }));
  },
});

export const getUser = query({
  args: { id: v.string(), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const users = await ctx.db.query("users").collect();
    const found = users.find((u) => u.id === args.id || u._id === args.id);
    return found ? { ...found, id: found.id ?? found._id } : null;
  },
});

export const getUserHistory = query({
  args: { uid: v.string(), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const rows = await ctx.db.query("history").withIndex("by_uid", (q) => q.eq("uid", args.uid)).take(200);
    rows.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return rows.slice(0, 200).map((h) => ({ ...h.data, id: h._id, uid: h.uid, timestamp: h.timestamp }));
  },
});

export const deleteUser = mutation({
  args: { id: v.string(), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const users = await ctx.db.query("users").collect();
    const target = users.find((u) => u.id === args.id || u._id === args.id);
    if (target) { await ctx.db.delete(target._id); return { ok: true, id: args.id }; }
    return { ok: false, id: args.id, reason: "not_found" };
  },
});

export const upsertUser = mutation({
  args: { id: v.string(), data: v.any(), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const users = await ctx.db.query("users").collect();
    const d = (args.data ?? {}) as Record<string, unknown>;
    const uid = typeof d.uid === "string" && d.uid ? d.uid : null;
    const deviceId = typeof d.deviceId === "string" && d.deviceId ? d.deviceId : null;
    const ipAddress = typeof d.ipAddress === "string" && d.ipAddress ? d.ipAddress : null;
    const region = typeof d.region === "string" && d.region ? d.region : null;

    // Match berurutan: id -> uid -> deviceId+ipAddress+region (dedup anti duplikat)
    let target = users.find((u) => u.id === args.id || u._id === args.id);
    if (!target && uid) target = users.find((u) => u.uid === uid && !u.isGuest);
    if (!target && deviceId && ipAddress && region) {
      target = users.find((u) =>
        u.deviceId === deviceId && u.ipAddress === ipAddress && u.region === region
      );
    }

    if (target) {
      await ctx.db.patch(target._id, { ...args.data, id: target.id ?? args.id });
      return { ok: true, id: target._id, updated: true };
    }
    const newId = await ctx.db.insert("users", { ...args.data, id: args.id });
    return { ok: true, id: newId, updated: false };
  },
});

export const addHistory = mutation({
  args: { uid: v.string(), timestamp: v.optional(v.union(v.float64(), v.null())), data: v.any(), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    await ctx.db.insert("history", { uid: args.uid, timestamp: args.timestamp ?? null, data: args.data });
    return { ok: true };
  },
});

export const setBan = mutation({
  args: { id: v.string(), banned: v.boolean(), reason: v.optional(v.union(v.string(), v.null())), ...tokenArg },
  handler: async (ctx, args) => {
    assertAuthed(args.token);
    const users = await ctx.db.query("users").collect();
    const target = users.find((u) => u.id === args.id || u._id === args.id);
    if (!target) return { ok: false, id: args.id, reason: "not_found" };
    const now = Date.now();
    await ctx.db.patch(target._id, args.banned
      ? { banned: true, bannedAt: now, bannedReason: args.reason ?? null }
      : { banned: false, unbannedAt: now, bannedReason: null });
    return { ok: true, id: args.id, banned: args.banned };
  },
});
