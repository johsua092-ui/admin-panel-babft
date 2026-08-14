import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    id: v.optional(v.string()),
    uid: v.optional(v.string()),
    email: v.optional(v.union(v.string(), v.null())),
    isGuest: v.optional(v.boolean()),
    displayName: v.optional(v.union(v.string(), v.null())),
    photoURL: v.optional(v.union(v.string(), v.null())),
    lastLoginAt: v.optional(v.union(v.float64(), v.null())),
    loginCount: v.optional(v.float64()),
    online: v.optional(v.boolean()),
    lastOnlineAt: v.optional(v.union(v.float64(), v.null())),
    firstLoginAt: v.optional(v.union(v.float64(), v.null())),
    region: v.optional(v.union(v.string(), v.null())),
    countryCode: v.optional(v.union(v.string(), v.null())),
    regionName: v.optional(v.union(v.string(), v.null())),
    isp: v.optional(v.union(v.string(), v.null())),
    timezone: v.any(),
    ipAddress: v.optional(v.union(v.string(), v.null())),
    latitude: v.optional(v.union(v.float64(), v.null())),
    longitude: v.optional(v.union(v.float64(), v.null())),
    accuracy: v.optional(v.union(v.float64(), v.null())),
    address: v.optional(v.union(v.string(), v.null())),
    city: v.optional(v.union(v.string(), v.null())),
    postal: v.optional(v.union(v.string(), v.null())),
    deviceId: v.optional(v.union(v.string(), v.null())),
    device: v.optional(v.union(v.string(), v.null())),
    os: v.optional(v.union(v.string(), v.null())),
    browser: v.optional(v.union(v.string(), v.null())),
    deviceType: v.optional(v.union(v.string(), v.null())),
    screen: v.optional(v.union(v.string(), v.null())),
    language: v.optional(v.union(v.string(), v.null())),
    userAgent: v.optional(v.union(v.string(), v.null())),
    previousRegion: v.optional(v.union(v.string(), v.null())),
    regionChangedAt: v.optional(v.union(v.float64(), v.null())),
    regionChangeCount: v.optional(v.float64()),
    flaggedAsVpn: v.optional(v.boolean()),
    createdAt: v.optional(v.union(v.float64(), v.null())),
    updatedAt: v.optional(v.union(v.float64(), v.null())),
  })
    .index("by_lastLoginAt", ["lastLoginAt"])
    .index("by_online", ["online"])
    .index("by_countryCode", ["countryCode"])
    .index("by_region", ["region"])
    .index("by_regionName", ["regionName"])
    .index("by_flaggedAsVpn", ["flaggedAsVpn"])
    .index("by_createdAt", ["createdAt"]),

  history: defineTable({
    uid: v.string(),
    timestamp: v.optional(v.union(v.float64(), v.null())),
    data: v.any(),
  }).index("by_uid", ["uid"]).index("by_timestamp", ["timestamp"]),

  adminLogins: defineTable({
    uid: v.string(),
    email: v.string(),
    role: v.string(),
    timestamp: v.float64(),
  }).index("by_timestamp", ["timestamp"]),

  analytics: defineTable({
    timestamp: v.optional(v.union(v.float64(), v.null())),
    kind: v.optional(v.string()),
    deviceId: v.optional(v.string()),
    data: v.any(),
  }).index("by_timestamp", ["timestamp"]),
});
