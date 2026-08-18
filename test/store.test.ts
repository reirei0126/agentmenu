import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { stableId, upsertServices, loadServices } from "../src/store";
import type { ServiceInput } from "../src/types";

function svc(endpoint: string, over: Partial<ServiceInput> = {}): Promise<ServiceInput> {
  return stableId(endpoint).then((id) => ({
    id, name: "Weather API", endpoint, protocol: "x402", network: "base",
    priceAmount: "10000", priceCurrency: "USDC", usdPerCall: 0.01,
    category: "data", description: "per-call weather", source: '["bazaar"]', ...over,
  }));
}

describe("store", () => {
  it("stableId is deterministic, 16 hex chars", async () => {
    expect(await stableId("https://a.example/x")).toBe(await stableId("https://a.example/x"));
    expect(await stableId("https://a.example/x")).toMatch(/^[0-9a-f]{16}$/);
  });

  it("upsert inserts then updates, preserving first_seen", async () => {
    const s = await svc("https://a.example/one");
    await upsertServices(env.DB, [s], "2026-08-19T00:00:00Z");
    await upsertServices(env.DB, [{ ...s, usdPerCall: 0.02 }], "2026-08-20T00:00:00Z");
    const rows = await loadServices(env.DB);
    const row = rows.find((r) => r.endpoint === "https://a.example/one")!;
    expect(row.usdPerCall).toBe(0.02);
    expect(row.firstSeen).toBe("2026-08-19T00:00:00Z");
    expect(row.lastSeen).toBe("2026-08-20T00:00:00Z");
  });
});
