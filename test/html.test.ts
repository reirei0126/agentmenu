import { describe, it, expect } from "vitest";
import { renderIndex } from "../src/html";
import type { Catalog } from "../src/catalog";

const base: Catalog = {
  schema_version: "1", generated_at: "2026-08-19T06:00:00Z", stale: false,
  services: [{
    id: "a", name: "<b>svc</b>", endpoint: "https://api.example.com/svc", protocol: "x402", network: "base",
    price: { amount: "10000", currency: "USDC", unit: "per_call", usd_per_call: 0.01 },
    category: "data", description: null,
    quality: { uptime_7d: 0.98, latency_p50_ms: 320, last_ok_at: "2026-08-19T06:00:00Z", bazaar_calls_30d: 42, bazaar_payers_30d: 7 },
    source: ["bazaar"], first_seen: "2026-08-19T00:00:00Z", last_seen: "2026-08-19T06:00:00Z",
  }],
};

describe("renderIndex", () => {
  it("escapes HTML and shows price, uptime, freshness", () => {
    const html = renderIndex(base);
    expect(html).toContain("&lt;b&gt;svc&lt;/b&gt;");
    expect(html).not.toContain("<b>svc</b>");
    expect(html).toContain("$0.01");
    expect(html).toContain("98%");
    expect(html).toContain("2026-08-19T06:00:00Z");
    expect(html).not.toContain("stale");
  });
  it("shows the stale banner honestly", () => {
    const html = renderIndex({ ...base, stale: true });
    expect(html).toMatch(/stale|out of date/i);
  });
  it("shows the Calls (30d) column with the bazaar value", () => {
    const html = renderIndex(base);
    expect(html).toContain("Calls (30d)");
    expect(html).toContain("42");
  });
  it("shows an em-dash for a null Calls (30d) value, not 0 or N/A", () => {
    const withNull: Catalog = {
      ...base,
      services: [{
        ...base.services[0],
        quality: { ...base.services[0].quality, bazaar_calls_30d: null, bazaar_payers_30d: null },
      }],
    };
    const html = renderIndex(withNull);
    const row = html.slice(html.indexOf("<tbody>"), html.indexOf("</tbody>"));
    expect(row).not.toContain(">0<");
    expect(row).not.toContain("N/A");
    expect(row).toContain("—");
  });
  it("discloses coverage honestly in the footer", () => {
    const html = renderIndex(base);
    expect(html).toContain(
      "Coverage: the top 1,000 services from the x402 discovery API (15,324 listed in total — the API caps unpaginated reads at 1,000). We'd rather tell you than pretend this is everything."
    );
  });
});
