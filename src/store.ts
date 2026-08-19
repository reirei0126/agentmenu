import type { ServiceInput, StoredService } from "./types";

export async function stableId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export async function upsertServices(db: D1Database, services: ServiceInput[], nowIso: string): Promise<number> {
  const stmt = db.prepare(
    `INSERT INTO services (id, name, endpoint, protocol, network, price_amount, price_currency,
       usd_per_call, category, description, source, bazaar_calls_30d, bazaar_payers_30d, first_seen, last_seen)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)
     ON CONFLICT(endpoint) DO UPDATE SET
       name=?2, network=?5, price_amount=?6, price_currency=?7, usd_per_call=?8,
       category=?9, description=?10, source=?11, bazaar_calls_30d=?12, bazaar_payers_30d=?13, last_seen=?14`,
  );
  const batch = services.map((s) =>
    stmt.bind(s.id, s.name, s.endpoint, s.protocol, s.network, s.priceAmount, s.priceCurrency,
      s.usdPerCall, s.category, s.description, s.source, s.bazaarCalls30d, s.bazaarPayers30d, nowIso),
  );
  if (batch.length > 0) await db.batch(batch);
  return batch.length;
}

export async function loadServices(db: D1Database): Promise<StoredService[]> {
  const { results } = await db.prepare("SELECT * FROM services ORDER BY category, usd_per_call").all();
  return (results as Record<string, unknown>[]).map((r) => ({
    id: r.id as string, name: r.name as string, endpoint: r.endpoint as string,
    protocol: "x402", network: r.network as string | null,
    priceAmount: r.price_amount as string | null, priceCurrency: r.price_currency as string | null,
    usdPerCall: r.usd_per_call as number | null, category: r.category as string,
    description: r.description as string | null, source: r.source as string,
    bazaarCalls30d: r.bazaar_calls_30d as number | null, bazaarPayers30d: r.bazaar_payers_30d as number | null,
    firstSeen: r.first_seen as string, lastSeen: r.last_seen as string,
  }));
}
