import type { ServiceInput } from "./types";
import { normalizeResource } from "./normalize";

export const DISCOVERY_URL = "https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources";
// Verified 2026-08-19: `limit` clamps at 1000. Pagination does work (offset is honored
// when it is at least the page size), but we deliberately take only the top 1000: at
// PROBES_PER_RUN=36 that is a ~7-day probe cycle, which is what makes uptime_7d honest.
// Coverage is disclosed on the page and in the README.
export const DISCOVERY_LIMIT = 1000;

export async function fetchDiscovery(fetchFn: typeof fetch): Promise<unknown[]> {
  const res = await fetchFn(`${DISCOVERY_URL}?limit=${DISCOVERY_LIMIT}`, {
    headers: { accept: "application/json", "user-agent": "agentmenu-probe (+https://agentmenu.dev)" },
  });
  if (!res.ok) throw new Error(`discovery fetch failed: HTTP ${res.status}`);
  const body = (await res.json()) as { items?: unknown[] };
  return Array.isArray(body.items) ? body.items : [];
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
