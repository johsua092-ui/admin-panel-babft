import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const PAGE_SIZE = 500;

export const logAdminLogin = mutation({
  args: { uid: v.string(), email: v.string(), role: v.string(), timestamp: v.float64() },
  handler: async (ctx, args) => {
    await ctx.db.insert("adminLogins", { uid: args.uid, email: args.email, role: args.role, timestamp: args.timestamp });
    return { ok: true };
  },
});

export const getAdminLogins = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("adminLogins").withIndex("by_timestamp").order("desc").take(PAGE_SIZE);
    const byEmail = new Map<string, { email: string; role: string; count: number; last: number; first: number }>();
    for (const l of logs) {
      const key = l.email.toLowerCase();
      const e = byEmail.get(key);
      if (!e) byEmail.set(key, { email: l.email, role: l.role, count: 1, last: l.timestamp, first: l.timestamp });
      else { e.count += 1; if (l.timestamp > e.last) e.last = l.timestamp; if (l.timestamp < e.first) e.first = l.timestamp; }
    }
    const admins = Array.from(byEmail.values()).sort((a, b) => b.last - a.last);
    return { logs: logs.map((l) => ({ id: l._id, ...l })), admins };
  },
});
