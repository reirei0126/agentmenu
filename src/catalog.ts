import { loadServices } from "./store";
import { qualityByService } from "./probe";

export interface CatalogService {
  id: string; name: string; endpoint: string; protocol: string; network: string | null;
  price: { amount: string | null; currency: string | null; unit: "per_call"; usd_per_call: number | null };
  category: string; description: string | null;
  quality: {
    uptime_7d: number | null; latency_p50_ms: number | null; last_ok_at: string | null;
    bazaar_calls_30d: number | null; bazaar_payers_30d: number | null;
  };
  source: string[]; first_seen: string; last_seen: string;
}
export interface Catalog {
  schema_version: "1"; generated_at: string | null; stale: boolean; services: CatalogService[];
}

const STALE_AFTER_MS = 24 * 3600_000;

export async function buildCatalog(db: D1Database, nowIso: string): Promise<Catalog> {
  const meta = await db.prepare("SELECT value FROM meta WHERE key='last_scan_success_at'").first<{ value: string }>();
  const generatedAt = meta?.value ?? null;
  const stale = !generatedAt || Date.parse(nowIso) - Date.parse(generatedAt) > STALE_AFTER_MS;
  const since = new Date(Date.parse(nowIso) - 7 * 86400_000).toISOString();
  const [services, quality] = await Promise.all([loadServices(db), qualityByService(db, since)]);
  return {
    schema_version: "1",
    generated_at: generatedAt,
    stale,
    services: services.map((s) => ({
      id: s.id, name: s.name, endpoint: s.endpoint, protocol: s.protocol, network: s.network,
      price: { amount: s.priceAmount, currency: s.priceCurrency, unit: "per_call", usd_per_call: s.usdPerCall },
      category: s.category, description: s.description,
      quality: {
        ...(quality.get(s.id)
          ? { uptime_7d: quality.get(s.id)!.uptime7d, latency_p50_ms: quality.get(s.id)!.latencyP50Ms, last_ok_at: quality.get(s.id)!.lastOkAt }
          : { uptime_7d: null, latency_p50_ms: null, last_ok_at: null }),
        bazaar_calls_30d: s.bazaarCalls30d, bazaar_payers_30d: s.bazaarPayers30d,
      },
      source: JSON.parse(s.source) as string[],
      first_seen: s.firstSeen, last_seen: s.lastSeen,
    })),
  };
}

export function validateCatalog(c: unknown): string[] {
  const errs: string[] = [];
  const o = (typeof c === "object" && c !== null ? c : {}) as Record<string, unknown>;
  if (o.schema_version !== "1") errs.push('schema_version must be "1"');
  if (typeof o.stale !== "boolean") errs.push("stale must be a boolean");
  if (!Array.isArray(o.services)) { errs.push("services must be an array"); return errs; }
  o.services.forEach((s, i) => {
    const sv = (typeof s === "object" && s !== null ? s : {}) as Record<string, unknown>;
    if (typeof sv.endpoint !== "string" || !sv.endpoint.startsWith("https://")) errs.push(`services[${i}].endpoint must be an https URL`);
    if (typeof sv.name !== "string" || sv.name.length === 0) errs.push(`services[${i}].name must be non-empty`);
    const price = (sv.price ?? {}) as Record<string, unknown>;
    if (price.unit !== "per_call") errs.push(`services[${i}].price.unit must be "per_call"`);
    if (price.usd_per_call !== null && typeof price.usd_per_call !== "number") errs.push(`services[${i}].price.usd_per_call must be number or null`);
  });
  return errs;
}
