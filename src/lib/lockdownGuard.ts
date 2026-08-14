import { convexQuery } from "@/lib/convexClient";

let cache: { value: boolean; expires: number } | null = null;
const TTL = 2000;

export async function isLocked(): Promise<boolean> {
  if (cache && Date.now() < cache.expires) return cache.value;
  try {
    const s = await convexQuery<{ locked: boolean }>("settings:getLockdownStatus", {});
    const locked = s.locked === true;
    cache = { value: locked, expires: Date.now() + TTL };
    return locked;
  } catch {
    return cache?.value ?? false;
  }
}
