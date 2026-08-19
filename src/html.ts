import type { Catalog } from "./catalog";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
const dash = "—";
const pct = (v: number | null) => (v === null ? dash : `${Math.round(v * 100)}%`);
const usd = (v: number | null) => (v === null ? dash : `$${v}`);
const ms = (v: number | null) => (v === null ? dash : `${v} ms`);
const count = (v: number | null) => (v === null ? dash : `${v}`);

export function renderIndex(catalog: Catalog): string {
  const rows = catalog.services.map((s) => `<tr>
    <td><a href="${esc(s.endpoint)}" rel="nofollow">${esc(s.name)}</a></td>
    <td>${esc(s.category)}</td>
    <td class="num">${usd(s.price.usd_per_call)}</td>
    <td class="num">${pct(s.quality.uptime_7d)}</td>
    <td class="num">${ms(s.quality.latency_p50_ms)}</td>
    <td class="num">${count(s.quality.bazaar_calls_30d)}</td>
    <td>${esc(s.network ?? dash)}</td>
  </tr>`).join("\n");

  const staleBanner = catalog.stale
    ? `<p class="freshness-warning">Heads up: our last scan is out of date (data may be stale). We show the last good data rather than guessing.</p>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>agentmenu — compare x402 services before you pay</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: system-ui, sans-serif; max-width: 64rem; margin: 2rem auto; padding: 0 1rem; line-height: 1.5; }
  table { border-collapse: collapse; width: 100%; } th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid #8884; }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .freshness-warning { background: #fde68a; color: #422; padding: .6rem 1rem; border-radius: .4rem; }
  footer { margin-top: 2rem; font-size: .9rem; opacity: .8; }
</style></head><body>
<h1>agentmenu</h1>
<p>The menu agents read before they order: x402 paid endpoints with normalized prices and independently measured uptime &amp; latency. No payment happens here — just honest comparison.</p>
${staleBanner}
<p>Last successful scan: ${esc(catalog.generated_at ?? "never (first scan pending)")} · ${catalog.services.length} services · <a href="/catalog.json">catalog.json</a> · <a href="/llms.txt">llms.txt</a></p>
<table><thead><tr><th>Name</th><th>Category</th><th class="num">Price/call</th><th class="num">Uptime 7d</th><th class="num">p50</th><th class="num">Calls (30d)</th><th>Network</th></tr></thead>
<tbody>${rows}</tbody></table>
<footer><p>Data sources: x402 discovery API. Prices are read from 402 payment requirements — we never pay on your behalf.
Coverage: the top 1,000 services from the x402 discovery API (15,324 listed in total — the API caps unpaginated reads at 1,000). We'd rather tell you than pretend this is everything.
Run a paid endpoint? <a href="https://github.com/REPLACE_GH_USER/agentmenu/issues/new/choose">Add your service</a> — we'd love to list you.</p></footer>
</body></html>`;
}
