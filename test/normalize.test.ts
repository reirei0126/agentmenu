import { describe, it, expect } from "vitest";
import { normalizeResource, usdFromAtomic } from "../src/normalize";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const fullItem = {
  resource: "https://api.example.com/weather",
  type: "http",
  x402Version: 1,
  description: "Weather data API",
  serviceName: "Weather Co",
  tags: ["weather", "data"],
  lastUpdated: "2026-08-19T00:00:00Z",
  quality: { score: 0.9 },
  extensions: {},
  accepts: [{
    scheme: "exact", network: "eip155:8453", maxAmountRequired: "10000", amount: "10000",
    description: "Current weather, per call", payTo: "0xabc",
    asset: BASE_USDC, extra: { name: "USD Coin" },
  }],
};

describe("usdFromAtomic", () => {
  it("converts Base USDC atomic units to USD", () => {
    expect(usdFromAtomic("10000", BASE_USDC)).toEqual({ currency: "USDC", usd: 0.01 });
  });
  it("returns null usd for unknown assets", () => {
    expect(usdFromAtomic("10000", "0xdeadbeef").usd).toBeNull();
  });
});

describe("normalizeResource", () => {
  it("maps a discovery item to ServiceInput using observed CDP shape", async () => {
    const s = await normalizeResource(fullItem);
    expect(s).toMatchObject({
      endpoint: "https://api.example.com/weather", protocol: "x402", network: "base",
      priceAmount: "10000", priceCurrency: "USDC", usdPerCall: 0.01,
      name: "Weather Co", category: "weather", description: "Weather data API",
      source: '["bazaar"]',
    });
  });

  it("reads price from maxAmountRequired when present", async () => {
    const item = { ...fullItem, accepts: [{ ...fullItem.accepts[0], maxAmountRequired: "20000", amount: "999" }] };
    const s = await normalizeResource(item);
    expect(s!.priceAmount).toBe("20000");
  });

  it("falls back to amount when maxAmountRequired is absent", async () => {
    const { maxAmountRequired, ...acceptWithoutMax } = fullItem.accepts[0];
    const item = { ...fullItem, accepts: [acceptWithoutMax] };
    const s = await normalizeResource(item);
    expect(s!.priceAmount).toBe("10000");
  });

  it("falls back to URL host+pathname when serviceName is absent", async () => {
    const { serviceName, ...itemWithoutName } = fullItem;
    const s = await normalizeResource(itemWithoutName);
    expect(s!.name).toBe("api.example.com/weather");
  });

  it("falls back to URL host+pathname when serviceName is an empty string", async () => {
    const item = { ...fullItem, serviceName: "" };
    const s = await normalizeResource(item);
    expect(s!.name).toBe("api.example.com/weather");
  });

  it("uses the first tag as category when tags is present", async () => {
    const s = await normalizeResource(fullItem);
    expect(s!.category).toBe("weather");
  });

  it("falls back to category 'other' when tags is absent", async () => {
    const { tags, ...itemWithoutTags } = fullItem;
    const s = await normalizeResource(itemWithoutTags);
    expect(s!.category).toBe("other");
  });

  it("falls back to category 'other' when tags is an empty array", async () => {
    const item = { ...fullItem, tags: [] };
    const s = await normalizeResource(item);
    expect(s!.category).toBe("other");
  });

  it("normalizes eip155:8453 (Base mainnet) to 'base'", async () => {
    const s = await normalizeResource(fullItem);
    expect(s!.network).toBe("base");
  });

  it("keeps other CAIP-2 network values raw", async () => {
    const polygon = { ...fullItem, accepts: [{ ...fullItem.accepts[0], network: "eip155:137" }] };
    const solana = { ...fullItem, accepts: [{ ...fullItem.accepts[0], network: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" }] };
    expect((await normalizeResource(polygon))!.network).toBe("eip155:137");
    expect((await normalizeResource(solana))!.network).toBe("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp");
  });

  it("prefers item-level description over accepts[0].description", async () => {
    const s = await normalizeResource(fullItem);
    expect(s!.description).toBe("Weather data API");
  });

  it("falls back to accepts[0].description when item-level description is absent", async () => {
    const { description, ...itemWithoutDescription } = fullItem;
    const s = await normalizeResource(itemWithoutDescription);
    expect(s!.description).toBe("Current weather, per call");
  });

  it("falls back to null description when neither item nor accepts[0] has one", async () => {
    const { description, ...rest } = fullItem;
    const { description: acceptDescription, ...acceptRest } = rest.accepts[0];
    const item = { ...rest, accepts: [acceptRest] };
    const s = await normalizeResource(item);
    expect(s!.description).toBeNull();
  });

  it("rejects malformed items instead of guessing", async () => {
    expect(await normalizeResource({ resource: "not-a-url" })).toBeNull();
    expect(await normalizeResource(null)).toBeNull();
  });
});
