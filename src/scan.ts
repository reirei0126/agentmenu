import type { ServiceInput } from "./types";
import { normalizeResource } from "./normalize";

export const DISCOVERY_URL = "https://x402.org/facilitator/discovery/resources";
const PAGE_LIMIT = 100;

export async function fetchDiscovery(fetchFn: typeof fetch, maxPages = 8): Promise<unknown[]> {
  const items: unknown[] = [];
  for (let pageNo = 0; pageNo < maxPages; pageNo++) {
    const offset = pageNo * PAGE_LIMIT;
    const res = await fetchFn(`${DISCOVERY_URL}?limit=${PAGE_LIMIT}&offset=${offset}`, {
      headers: { accept: "application/json", "user-agent": "agentmenu-probe (+https://agentmenu.dev)" },
    });
    if (!res.ok) throw new Error(`discovery fetch failed: HTTP ${res.status}`);
    const body = (await res.json()) as { items?: unknown[]; pagination?: { total?: number } };
    const got = Array.isArray(body.items) ? body.items : [];
    const total = body.pagination?.total ?? items.length + got.length;
    items.push(...got.slice(0, Math.max(0, total - items.length)));
    if (got.length === 0 || items.length >= total) break;
  }
  return items;
}

export async function scanToServices(fetchFn: typeof fetch): Promise<ServiceInput[]> {
  const raw = await fetchDiscovery(fetchFn);
  const out: ServiceInput[] = [];
  for (const item of raw) {
    const s = await normalizeResource(item);
    if (s) out.push(s);
  }
  return out;
}
