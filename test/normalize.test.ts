import { describe, it, expect } from "vitest";
import { normalizeResource, usdFromAtomic } from "../src/normalize";

const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const item = {
  resource: "https://api.onesource.io/api/chain/erc20-balance",
  type: "http",
  x402Version: 2,
  lastUpdated: "2026-08-18T21:59:12.804Z",
  description: "ERC20 token balance for any Ethereum wallet - USDC, USDT, DAI, or any token - via balanceOf (eth_call) on OneSource live Ethereum RPC",
  quality: { l30DaysTotalCalls: 902, l30DaysUniquePayers: 898, lastCalledAt: "2026-08-18T18:46:28.135Z" },
  accepts: [{
    scheme: "exact", network: "eip155:8453", amount: "3000",
    asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    currency: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    payTo: "0x52E29e0d2Aa49bfBfC548C0A9F2196F4aa51f3ea",
    recipient: "0x52E29e0d2Aa49bfBfC548C0A9F2196F4aa51f3ea",
    maxTimeoutSeconds: 3600, extra: { name: "USD Coin", version: "2" },
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
  it("maps a real observed v2 discovery item to ServiceInput", async () => {
    const s = await normalizeResource(item);
    expect(s).toMatchObject({
      endpoint: "https://api.onesource.io/api/chain/erc20-balance", protocol: "x402",
      usdPerCall: 0.003, network: "base",
      description: "ERC20 token balance for any Ethereum wallet - USDC, USDT, DAI, or any token - via balanceOf (eth_call) on OneSource live Ethereum RPC",
      bazaarCalls30d: 902, bazaarPayers30d: 898, category: "other",
    });
  });

  it("reads price from amount (canonical in v2)", async () => {
    const withMax = { ...item, accepts: [{ ...item.accepts[0], amount: "3000", maxAmountRequired: "999" }] };
    const s = await normalizeResource(withMax);
    expect(s!.priceAmount).toBe("3000");
  });

  it("falls back to maxAmountRequired when amount is absent", async () => {
    const { amount, ...acceptWithoutAmount } = item.accepts[0];
    const withMax = { ...item, accepts: [{ ...acceptWithoutAmount, maxAmountRequired: "3000" }] };
    const s = await normalizeResource(withMax);
    expect(s!.priceAmount).toBe("3000");
  });

  it("falls back to URL host+pathname when serviceName is absent", async () => {
    const s = await normalizeResource(item);
    expect(s!.name).toBe("api.onesource.io/api/chain/erc20-balance");
  });

  it("uses serviceName when present and non-empty", async () => {
    const withName = { ...item, serviceName: "OneSource" };
    const s = await normalizeResource(withName);
    expect(s!.name).toBe("OneSource");
  });

  it("falls back to URL host+pathname when serviceName is an empty string", async () => {
    const withName = { ...item, serviceName: "" };
    const s = await normalizeResource(withName);
    expect(s!.name).toBe("api.onesource.io/api/chain/erc20-balance");
  });

  it("uses the first tag as category when tags is present", async () => {
    const withTags = { ...item, tags: ["chain", "erc20"] };
    const s = await normalizeResource(withTags);
    expect(s!.category).toBe("chain");
  });

  it("falls back to category 'other' when tags is absent", async () => {
    const s = await normalizeResource(item);
    expect(s!.category).toBe("other");
  });

  it("falls back to category 'other' when tags is an empty array", async () => {
    const withTags = { ...item, tags: [] };
    const s = await normalizeResource(withTags);
    expect(s!.category).toBe("other");
  });

  it("normalizes eip155:8453 (Base mainnet) to 'base'", async () => {
    const s = await normalizeResource(item);
    expect(s!.network).toBe("base");
  });

  it("normalizes eip155:1 (Ethereum mainnet) to 'ethereum'", async () => {
    const eth = { ...item, accepts: [{ ...item.accepts[0], network: "eip155:1" }] };
    const s = await normalizeResource(eth);
    expect(s!.network).toBe("ethereum");
  });

  it("keeps unknown CAIP-2 network values raw", async () => {
    const unknown = { ...item, accepts: [{ ...item.accepts[0], network: "eip155:999" }] };
    const s = await normalizeResource(unknown);
    expect(s!.network).toBe("eip155:999");
  });

  it("ingests bazaar quality signals", async () => {
    const s = await normalizeResource(item);
    expect(s!.bazaarCalls30d).toBe(902);
    expect(s!.bazaarPayers30d).toBe(898);
  });

  it("uses null for bazaar quality signals when quality is absent", async () => {
    const { quality, ...withoutQuality } = item;
    const s = await normalizeResource(withoutQuality);
    expect(s!.bazaarCalls30d).toBeNull();
    expect(s!.bazaarPayers30d).toBeNull();
  });

  it("prefers item-level description over accepts[0].description", async () => {
    const withAcceptDescription = { ...item, accepts: [{ ...item.accepts[0], description: "accept-level" }] };
    const s = await normalizeResource(withAcceptDescription);
    expect(s!.description).toBe(item.description);
  });

  it("falls back to accepts[0].description when item-level description is absent", async () => {
    const { description, ...rest } = item;
    const withAcceptDescription = { ...rest, accepts: [{ ...item.accepts[0], description: "accept-level" }] };
    const s = await normalizeResource(withAcceptDescription);
    expect(s!.description).toBe("accept-level");
  });

  it("falls back to null description when neither item nor accepts[0] has one", async () => {
    const { description, ...rest } = item;
    const s = await normalizeResource(rest);
    expect(s!.description).toBeNull();
  });

  it("rejects malformed items instead of guessing", async () => {
    expect(await normalizeResource({ resource: "not-a-url" })).toBeNull();
    expect(await normalizeResource(null)).toBeNull();
  });
});
