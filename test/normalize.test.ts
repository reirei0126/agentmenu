import { describe, it, expect } from "vitest";
import { normalizeResource, usdFromAtomic } from "../src/normalize";

const item = {
  resource: "https://api.example.com/weather",
  type: "http",
  accepts: [{
    scheme: "exact", network: "base", maxAmountRequired: "10000",
    description: "Current weather, per call", payTo: "0xabc",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", extra: { name: "USD Coin" },
  }],
  metadata: { category: "data" },
};

describe("usdFromAtomic", () => {
  it("converts Base USDC atomic units to USD", () => {
    expect(usdFromAtomic("10000", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913")).toEqual({ currency: "USDC", usd: 0.01 });
  });
  it("returns null usd for unknown assets", () => {
    expect(usdFromAtomic("10000", "0xdeadbeef").usd).toBeNull();
  });
});

describe("normalizeResource", () => {
  it("maps a discovery item to ServiceInput", async () => {
    const s = await normalizeResource(item);
    expect(s).toMatchObject({
      endpoint: "https://api.example.com/weather", protocol: "x402", network: "base",
      priceAmount: "10000", priceCurrency: "USDC", usdPerCall: 0.01,
      category: "data", source: '["bazaar"]',
    });
    expect(s!.name).toBe("api.example.com/weather"); // fallback name from URL
  });
  it("rejects malformed items instead of guessing", async () => {
    expect(await normalizeResource({ resource: "not-a-url" })).toBeNull();
    expect(await normalizeResource(null)).toBeNull();
  });
});
