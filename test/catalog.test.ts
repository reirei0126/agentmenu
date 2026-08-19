import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { buildCatalog, validateCatalog } from "../src/catalog";
import { upsertServices, stableId } from "../src/store";

describe("buildCatalog", () => {
  it("emits schema v1 with quality and stale flag", async () => {
    const ep = "https://api.example.com/svc";
    await upsertServices(env.DB, [{
      id: await stableId(ep), name: "svc", endpoint: ep, protocol: "x402", network: "base",
      priceAmount: "10000", priceCurrency: "USDC", usdPerCall: 0.01, category: "data",
      description: "d", source: '["bazaar"]', bazaarCalls30d: 42, bazaarPayers30d: 7,
    }], "2026-08-19T00:00:00Z");
    await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('last_scan_success_at', '2026-08-19T00:00:00Z')").run();

    const fresh = await buildCatalog(env.DB, "2026-08-19T06:00:00Z");
    expect(fresh.schema_version).toBe("1");
    expect(fresh.stale).toBe(false);
    expect(fresh.services[0].price).toEqual({ amount: "10000", currency: "USDC", unit: "per_call", usd_per_call: 0.01 });
    expect(fresh.services[0].source).toEqual(["bazaar"]);
    expect(fresh.services[0].quality.bazaar_calls_30d).toBe(42);
    expect(fresh.services[0].quality.bazaar_payers_30d).toBe(7);
    expect(validateCatalog(fresh)).toEqual([]);

    const old = await buildCatalog(env.DB, "2026-08-21T06:00:00Z");
    expect(old.stale).toBe(true);
  });

  it("validateCatalog reports what is wrong, kindly", () => {
    const errs = validateCatalog({ schema_version: "2", services: "nope" });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/schema_version/);
  });
});
