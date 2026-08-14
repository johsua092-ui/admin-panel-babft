import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getLockdownStatus = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "lockdown")).first();
    if (!row) return { locked: false, lockedAt: null };
    return { locked: row.value === true, lockedAt: (row.value === true ? null : null) };
  },
});

export const setLockdown = mutation({
  args: { locked: v.boolean() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("settings").withIndex("by_key", (q) => q.eq("key", "lockdown")).first();
    if (existing) {
      await ctx.db.patch(existing._id, { value: args.locked });
    } else {
      await ctx.db.insert("settings", { key: "lockdown", value: args.locked });
    }
    return { ok: true, locked: args.locked };
  },
});
