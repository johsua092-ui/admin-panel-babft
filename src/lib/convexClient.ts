import { ConvexHttpClient } from "convex/browser";

let _client: ConvexHttpClient | null = null;

export function getConvexClient(): ConvexHttpClient {
  if (_client) return _client;
  const url = process.env.CONVEX_URL;
  if (!url) throw new Error("CONVEX_URL belum diset.");
  _client = new ConvexHttpClient(url);
  return _client;
}

export function resetConvexClient() {
  _client = null;
}
