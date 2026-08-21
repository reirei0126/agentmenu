# agentmenu

The menu agents read before they order: a machine-readable catalog of x402 paid endpoints, with normalized per-call prices and independently measured uptime/latency, so an AI agent (or its developer) can compare services *before* paying. No payment ever happens here — agentmenu only reads what a 402 response already discloses and records what its own probes observe.

## URLs

- `https://agentmenu.rei-uesugi.workers.dev/` — human-readable comparison page
- `https://agentmenu.rei-uesugi.workers.dev/catalog.json` — the machine-readable catalog (see schema below)
- `https://agentmenu.rei-uesugi.workers.dev/llms.txt` — a short pointer for LLMs/agents to the catalog

## Schema (`/catalog.json`)

```jsonc
{
  "schema_version": "1",
  "generated_at": "2026-08-19T00:00:00.000Z",  // last successful scan
  "stale": false,                              // true if the last scan failed and this is old data
  "services": [
    {
      "id": "a1b2c3...",                        // stable id, derived from the endpoint URL
      "name": "OneSource ERC20 Balance",
      "endpoint": "https://api.onesource.io/api/chain/erc20-balance",
      "protocol": "x402",                       // protocol-agnostic field; l402/paid-MCP may join later
      "network": "base",                        // settlement network
      "price": { "amount": "3000", "currency": "USDC", "unit": "per_call", "usd_per_call": 0.003 },
      "category": "other",
      "description": "ERC20 token balance for any Ethereum wallet ...",
      "quality": {
        "uptime_7d": 0.99,
        "latency_p50_ms": 320,
        "last_ok_at": "2026-08-19T00:00:00.000Z",
        "bazaar_calls_30d": 902,                // Bazaar's own usage signal, not ours — see below
        "bazaar_payers_30d": 898
      },
      "source": ["bazaar"],
      "first_seen": "2026-08-01T00:00:00.000Z",
      "last_seen": "2026-08-19T00:00:00.000Z"
    }
  ]
}
```

Every response is validated against this shape before it is served — if validation fails, agentmenu returns a `500` rather than serve bad data.

## How prices and quality are measured

- **Price**: read directly from each endpoint's x402 payment-requirements listing (the `amount`/`currency` a 402 response discloses). We never pay on your behalf — no call is ever actually made to complete a transaction.
- **Quality**: `uptime_7d` and `latency_p50_ms` come from agentmenu's own periodic probes (see below), not from the listing service. `bazaar_calls_30d` / `bazaar_payers_30d` are usage signals reported by the x402 Bazaar discovery API itself — included for comparison, clearly attributed, not something agentmenu measured.

## A note on the address

agentmenu currently serves from `agentmenu.rei-uesugi.workers.dev`. The `agentmenu.dev` domain is
intended but not registered yet, so nothing here points at it — an identifier that resolves to
nothing is worse than none, especially the one our probes present to the endpoints they contact.
When the domain is attached, these URLs and the probe User-Agent move with it, and the
`agentmenu-probe` token stays the same so any robots.txt rule you have already written keeps working.

## Coverage

agentmenu currently lists the top **1,000** services from the x402 discovery API, out of **15,324** listed there in total. We take the top 1,000 because that's what we can probe often enough to make `uptime_7d` mean something honestly — not because the API forces a cap. We'd rather tell you than pretend this is everything.

## How to get listed

Run a paid x402 endpoint? Open an issue: [Add your service](https://github.com/reirei0126/agentmenu/issues/new/choose) — it takes about a minute, and agentmenu also picks up new listings automatically from the x402 discovery API on its next scan.

## Probing — and how to opt out

Every 6 hours, agentmenu fetches the x402 discovery API and does a lightweight liveness check against each listed endpoint. Probes identify themselves with:

```
User-Agent: agentmenu-probe (+https://agentmenu.rei-uesugi.workers.dev)
```

No endpoint is probed more than once every 6 hours, and `robots.txt` is checked and respected before probing. If you'd rather agentmenu not probe your endpoint, add this to your `robots.txt`:

```
User-agent: agentmenu-probe
Disallow: /
```

(or `Disallow: /path` to exclude specific paths only).

## Local development

```bash
npm install
npm test
npx wrangler dev
```

## 日本語

**agentmenu** は、AIエージェント(とその開発者)が**支払い前に**、x402系の有料エンドポイントを価格・品質で比較できる機械可読カタログです。決済の代行はいっさい行いません。

- `https://agentmenu.rei-uesugi.workers.dev/` — 人間向けの一覧・比較ページ
- `https://agentmenu.rei-uesugi.workers.dev/catalog.json` — エージェント向けの本体データ(スキーマは上記参照)
- `https://agentmenu.rei-uesugi.workers.dev/llms.txt` — LLM/エージェント向けの案内

**価格**は各エンドポイントの402レスポンスが提示する支払い条件からそのまま読み取ります。支払いを実際に行うことはありません。**品質**(`uptime_7d` / `latency_p50_ms`)は agentmenu 自身が6時間ごとに行う軽量プローブの観測結果です。`bazaar_calls_30d` / `bazaar_payers_30d` は x402 Bazaar discovery API 自身が公開している利用実績シグナルで、agentmenu の計測ではありません(出典を明示して併記しています)。

**掲載件数について**: 現在は x402 discovery API 上位 **1,000** 件を掲載しています(API全体には合計 **15,324** 件が登録されています)。`uptime_7d` の計測を正直な数字にできる範囲として上位1,000件を選んでおり、隠さずここに明記します。

**掲載申請**: 有料の x402 エンドポイントを運用している方は、[Add your service](https://github.com/reirei0126/agentmenu/issues/new/choose) からご連絡ください。1分程度で完了します。discovery API からの自動検出でも次回スキャン時に拾われます。

**プローブとオプトアウト**: agentmenu は6時間ごとに `User-Agent: agentmenu-probe (+https://agentmenu.rei-uesugi.workers.dev)` を名乗って軽量な生存確認を行います。1エンドポイントあたり6時間に1回まで、`robots.txt` の指示は尊重します。プローブを拒否したい場合は、対象サイトの `robots.txt` に以下を追加してください。

```
User-agent: agentmenu-probe
Disallow: /
```
