import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { parseRobots, probeBatch, qualityByService } from "../src/probe";
import { upsertServices, stableId } from "../src/store";

describe("parseRobots", () => {
  it("collects Disallow for * and our agent, ignores others", () => {
    const txt = ["User-agent: *", "Disallow: /private", "", "User-agent: googlebot", "Disallow: /", "",
      "User-agent: agentmenu-probe", "Disallow: /svc2"].join("\n");
    expect(parseRobots(txt)).toEqual(["/private", "/svc2"]);
  });
});

describe("probeBatch + qualityByService", () => {
  it("records ok for 402, failure for 500, and skips disallowed paths", async () => {
    const mk = async (ep: string) => ({
      id: await stableId(ep), name: ep, endpoint: ep, protocol: "x402" as const, network: "base",
      priceAmount: "1", priceCurrency: "USDC", usdPerCall: 0.000001, category: "other",
      description: null, source: '["bazaar"]', bazaarCalls30d: null, bazaarPayers30d: null,
    });
    const s1 = await mk("https://h1.example/paid");
    const s2 = await mk("https://h1.example/broken");
    const s3 = await mk("https://h1.example/private/x");
    await upsertServices(env.DB, [s1, s2, s3], "2026-08-19T00:00:00Z");
    await env.DB.prepare("INSERT INTO robots (host, fetched_at, disallow) VALUES (?, ?, ?)")
      .bind("h1.example", "2026-08-19T00:00:00Z", '["/private"]').run();

    const mock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("/paid")) return new Response("pay me", { status: 402 });
      return new Response("boom", { status: 500 });
    };
    await probeBatch(env.DB, mock, "2026-08-19T06:00:00Z", 10);

    const q = await qualityByService(env.DB, "2026-08-12T00:00:00Z");
    expect(q.get(s1.id)!.uptime7d).toBe(1);
    expect(q.get(s1.id)!.lastOkAt).toBe("2026-08-19T06:00:00Z");
    expect(q.get(s2.id)!.uptime7d).toBe(0);
    expect(q.has(s3.id)).toBe(false); // never probed: disallowed
  });

  it("prioritizes services with nonzero bazaar_calls_30d over never-probed unknowns", async () => {
    const mk = async (ep: string, bazaarCalls30d: number | null) => ({
      id: await stableId(ep), name: ep, endpoint: ep, protocol: "x402" as const, network: "base",
      priceAmount: "1", priceCurrency: "USDC", usdPerCall: 0.000001, category: "other",
      description: null, source: '["bazaar"]', bazaarCalls30d, bazaarPayers30d: bazaarCalls30d,
    });
    const unknown = await mk("https://h2.example/unknown", null);
    const active = await mk("https://h2.example/active", 100);
    await upsertServices(env.DB, [unknown, active], "2026-08-19T00:00:00Z");

    const mock: typeof fetch = async () => new Response("pay me", { status: 402 });
    await probeBatch(env.DB, mock, "2026-08-19T06:00:00Z", 1);

    const q = await qualityByService(env.DB, "2026-08-12T00:00:00Z");
    expect(q.has(active.id)).toBe(true);
    expect(q.has(unknown.id)).toBe(false);
  });
});
