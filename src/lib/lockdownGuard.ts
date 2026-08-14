import { convexQuery } from "@/lib/convexClient";

export async function isLocked(): Promise<boolean> {
  try {
    const s = await convexQuery<{ locked: boolean }>("settings:getLockdownStatus", {});
    return s.locked === true;
  } catch {
    return false;
  }
}
