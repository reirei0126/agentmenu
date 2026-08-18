import type { ServiceInput } from "./types";
import { stableId } from "./store";

const KNOWN_ASSETS: Record<string, { symbol: string; decimals: number; usdPegged: boolean }> = {
  // Base mainnet USDC
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": { symbol: "USDC", decimals: 6, usdPegged: true },
};

export function usdFromAtomic(amount: string, asset: string): { currency: string; usd: number | null } {
  const known = KNOWN_ASSETS[asset.toLowerCase()];
  if (!known || !/^\d+$/.test(amount)) return { currency: known?.symbol ?? "UNKNOWN", usd: null };
  const usd = Number(amount) / 10 ** known.decimals;
  return { currency: known.symbol, usd: known.usdPegged ? usd : null };
}

export async function normalizeResource(item: unknown): Promise<ServiceInput | null> {
  if (typeof item !== "object" || item === null) return null;
  const o = item as Record<string, unknown>;
  const endpoint = typeof o.resource === "string" ? o.resource : "";
  let url: URL;
  try { url = new URL(endpoint); } catch { return null; }
  if (url.protocol !== "https:") return null;

  const accepts = Array.isArray(o.accepts) ? (o.accepts as Record<string, unknown>[]) : [];
  const first = accepts[0] ?? {};
  const amount =
    typeof first.maxAmountRequired === "string"
      ? first.maxAmountRequired
      : typeof first.amount === "string"
        ? first.amount
        : null;
  const asset = typeof first.asset === "string" ? first.asset : "";
  const price = amount ? usdFromAtomic(amount, asset) : { currency: null as string | null, usd: null };
  const rawNetwork = typeof first.network === "string" ? first.network : null;
  const network = rawNetwork === "eip155:8453" ? "base" : rawNetwork;
  const tags = Array.isArray(o.tags) ? (o.tags as unknown[]) : [];
  const firstTag = typeof tags[0] === "string" ? (tags[0] as string) : null;

  return {
    id: await stableId(endpoint),
    name:
      typeof o.serviceName === "string" && o.serviceName !== ""
        ? o.serviceName
        : url.host + url.pathname.replace(/\/$/, ""),
    endpoint,
    protocol: "x402",
    network,
    priceAmount: amount,
    priceCurrency: price.currency,
    usdPerCall: price.usd,
    category: firstTag ?? "other",
    description:
      typeof o.description === "string"
        ? o.description
        : typeof first.description === "string"
          ? first.description
          : null,
    source: '["bazaar"]',
  };
}
