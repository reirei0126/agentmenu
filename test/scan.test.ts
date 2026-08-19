import { describe, it, expect } from "vitest";
import { fetchDiscovery, scanToServices, DISCOVERY_URL, DISCOVERY_LIMIT } from "../src/scan";

function page(items: unknown[]) {
  return new Response(JSON.stringify({ items, pagination: { limit: 1000, offset: 0, total: 15324 }, x402Version: 2 }), {
    headers: { "content-type": "application/json" },
  });
}
const item = (n: number) => ({
  resource: `https://api.example.com/svc${n}`,
  description: `svc ${n}`,
  serviceName: `Service ${n}`,
  tags: ["data"],
  quality: { l30DaysTotalCalls: n, l30DaysUniquePayers: n },
  accepts: [{ scheme: "exact", network: "eip155:8453", amount: "10000",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", description: `svc ${n} accept` }],
});

describe("DISCOVERY_URL", () => {
  it("points at the live CDP discovery endpoint", () => {
    expect(DISCOVERY_URL).toBe("https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources");
  });
});

describe("fetchDiscovery", () => {
  it("makes a single request with limit=1000 and the probe UA header", async () => {
    const calls: { url: string; ua: string | undefined }[] = [];
    const mock: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, ua: (init?.headers as Record<string, string> | undefined)?.["user-agent"] });
      return page([item(1), item(2)]);
    };
    const items = await fetchDiscovery(mock);
    expect(items.length).toBe(2);
    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe(`${DISCOVERY_URL}?limit=${DISCOVERY_LIMIT}`);
    expect(calls[0].ua).toBe("agentmenu-probe (+https://agentmenu.dev)");
  });

  it("throws on non-200 so the caller can keep last-good data", async () => {
    const mock: typeof fetch = async () => new Response("nope", { status: 500 });
    await expect(fetchDiscovery(mock)).rejects.toThrow();
  });
});

describe("scanToServices", () => {
  it("drops malformed items and keeps good ones", async () => {
    const mock: typeof fetch = async () => page([item(1), { resource: "not-a-url" }]);
    const services = await scanToServices(mock);
    expect(services.length).toBe(1);
    expect(services[0].endpoint).toBe("https://api.example.com/svc1");
    expect(services[0].network).toBe("base");
    expect(services[0].name).toBe("Service 1");
  });
});
