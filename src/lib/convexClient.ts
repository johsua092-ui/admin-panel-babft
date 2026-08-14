type ConvexResponse<T> = { status: string; value?: T; errorMessage?: string; errorData?: unknown };

function url(): string {
  const u = process.env.CONVEX_URL;
  if (!u) throw new Error("CONVEX_URL belum diset.");
  return u.replace(/\/$/, "");
}

function token(): string | undefined {
  return process.env.CONVEX_INTERNAL_SECRET?.trim() || undefined;
}

function withToken(args: Record<string, unknown>): Record<string, unknown> {
  const t = token();
  return t ? { ...args, token: t } : args;
}

export async function convexQuery<T>(path: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${url()}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args: withToken(args), format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex query gagal (${res.status}): ${path}`);
  const data = (await res.json()) as ConvexResponse<T>;
  if (data.status !== "success" || data.value === undefined) {
    throw new Error(data.errorMessage ?? `Convex query error: ${path}`);
  }
  return data.value;
}

export async function convexMutation<T>(path: string, args: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${url()}/api/mutation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, args: withToken(args), format: "json" }),
  });
  if (!res.ok) throw new Error(`Convex mutation gagal (${res.status}): ${path}`);
  const data = (await res.json()) as ConvexResponse<T>;
  if (data.status !== "success") throw new Error(data.errorMessage ?? `Convex mutation error: ${path}`);
  return data.value as T;
}
