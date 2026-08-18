import { describe, it, expect } from "vitest";
import { fetchDiscovery, scanToServices, DISCOVERY_URL } from "../src/scan";

function page(items: unknown[], offset: number, total: number) {
  return new Response(JSON.stringify({ items, pagination: { limit: 2, offset, total }, x402Version: 1 }), {
    headers: { "content-type": "application/json" },
  });
}
const item = (n: number) => ({
  resource: `https://api.example.com/svc${n}`,
  description: `svc ${n}`,
  serviceName: `Service ${n}`,
  tags: ["data"],
  accepts: [{ scheme: "exact", network: "eip155:8453", maxAmountRequired: "10000",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", description: `svc ${n} accept` }],
});

describe("DISCOVERY_URL", () => {
  it("points at the live CDP discovery endpoint", () => {
    expect(DISCOVERY_URL).toBe("https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources");
  });
});

describe("fetchDiscovery", () => {
  it("paginates until total is reached", async () => {
    const calls: string[] = [];
    const mock: typeof fetch = async (input) => {
      const url = new URL(String(input));
      calls.push(url.search);
      const offset = Number(url.searchParams.get("offset") ?? 0);
      return page([item(offset), item(offset + 1)], offset, 3);
    };
    const items = await fetchDiscovery(mock);
    expect(items.length).toBe(3);
    expect(calls.length).toBe(2);
    expect(String(calls[0])).toContain("offset=0");
  });

  it("stops at maxPages to respect the subrequest budget", async () => {
    const mock: typeof fetch = async (input) => {
      const offset = Number(new URL(String(input)).searchParams.get("offset") ?? 0);
      return page([item(offset), item(offset + 1)], offset, 10_000);
    };
    const items = await fetchDiscovery(mock, 3);
    expect(items.length).toBe(6);
  });

  it("throws on non-200 so the caller can keep last-good data", async () => {
    const mock: typeof fetch = async () => new Response("nope", { status: 500 });
    await expect(fetchDiscovery(mock)).rejects.toThrow();
  });
});

describe("scanToServices", () => {
  it("drops malformed items and keeps good ones", async () => {
    const mock: typeof fetch = async () => page([item(1), { resource: "not-a-url" }], 0, 2);
    const services = await scanToServices(mock);
    expect(services.length).toBe(1);
    expect(services[0].endpoint).toBe("https://api.example.com/svc1");
    expect(services[0].network).toBe("base");
    expect(services[0].name).toBe("Service 1");
  });
});
