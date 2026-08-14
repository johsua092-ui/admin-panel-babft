import { ConvexError } from "convex/values";

function expected(): string | undefined {
  return process.env.CONVEX_INTERNAL_SECRET?.trim() || undefined;
}

function safeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function assertAuthed(token: string | undefined | null): void {
  const exp = expected();
  if (!exp) {
    throw new ConvexError("server not configured: CONVEX_INTERNAL_SECRET missing");
  }
  if (!token || !safeEq(token, exp)) {
    throw new ConvexError("unauthorized");
  }
}
