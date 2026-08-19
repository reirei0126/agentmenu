import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { runScheduled } from "../src/run";
import { upsertServices, stableId } from "../src/store";

const discoveryPage = (items: unknown[]) =>
  new Response(JSON.stringify({ items, pagination: { limit: 100, offset: 0, total: items.length } }));
const goodItem = {
  resource: "https://api.example.com/svc",
  accepts: [{ scheme: "exact", network: "base", maxAmountRequired: "10000",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", description: "svc" }],
};

describe("runScheduled", () => {
  it("scans, upserts and records success", async () => {
    const mock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/discovery/")) return discoveryPage([goodItem]);
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response("pay", { status: 402 });
    };
    const out = await runScheduled(env.DB, mock, "2026-08-19T00:00:00Z");
    expect(out).toEqual({ scanned: 1, scanOk: true });
    const meta = await env.DB.prepare("SELECT value FROM meta WHERE key='last_scan_success_at'").first<{ value: string }>();
    expect(meta!.value).toBe("2026-08-19T00:00:00Z");
  });

  it("keeps last-good data and records the error when discovery is down", async () => {
    // Self-contained setup: storage is isolated per test, so seed our own last-good state.
    const ep = "https://api.example.com/seed";
    await upsertServices(env.DB, [{
      id: await stableId(ep), name: "seed", endpoint: ep, protocol: "x402", network: "base",
      priceAmount: "1", priceCurrency: "USDC", usdPerCall: 0.000001, category: "other",
      description: null, source: '["bazaar"]', bazaarCalls30d: 1, bazaarPayers30d: 1,
    }], "2026-08-19T00:00:00Z");
    await env.DB.prepare("INSERT INTO meta (key, value) VALUES ('last_scan_success_at', '2026-08-19T00:00:00Z')").run();

    const mock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/discovery/")) return new Response("down", { status: 503 });
      if (url.endsWith("/robots.txt")) return new Response("", { status: 404 });
      return new Response("pay", { status: 402 });
    };
    const out = await runScheduled(env.DB, mock, "2026-08-19T06:00:00Z");
    expect(out.scanOk).toBe(false);
    const services = await env.DB.prepare("SELECT COUNT(*) AS n FROM services").first<{ n: number }>();
    expect(services!.n).toBe(1); // previous data intact
    const meta = await env.DB.prepare("SELECT value FROM meta WHERE key='last_scan_success_at'").first<{ value: string }>();
    expect(meta!.value).toBe("2026-08-19T00:00:00Z"); // unchanged
  });
});
