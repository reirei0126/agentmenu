export interface ServiceInput {
  id: string;
  name: string;
  endpoint: string;
  protocol: "x402";
  network: string | null;
  priceAmount: string | null;
  priceCurrency: string | null;
  usdPerCall: number | null;
  category: string;
  description: string | null;
  source: string; // JSON array string, e.g. '["bazaar"]'
}

export interface StoredService extends ServiceInput {
  firstSeen: string;
  lastSeen: string;
}
