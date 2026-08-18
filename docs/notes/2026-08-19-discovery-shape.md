# 実discoveryシェイプの是正(T4)

計画が前提にしていたdiscovery APIのシェイプは実在しなかった。設計者が2026-08-19に実地取得した観測事実(唯一の正)と、それに合わせたT3/T4コード・フィクスチャの是正内容を記録する。

## 観測事実

1. 計画に書かれた `https://x402.org/facilitator/discovery/resources` は **HTTP 404**(Next.jsのHTMLを返す)。このURLは死んでいる。
2. 生きているdiscoveryエンドポイントは `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`。
   - APIキー不要(T0のToS確認記録と整合: "Bazaar discovery is public. You do not need a CDP API key to use the discovery APIs")
   - `?limit=100&offset=0` で HTTP 200 / `application/json` / items 100件を返す
   - レスポンス最上位キー: `items`, `pagination`, `x402Version`
   - `pagination` は `{ "limit": 100, "offset": 0, "total": 15329 }`(limit=100は受理される)
3. `items[]` の各要素で観測されたキー(100件標本): `accepts`(必須), `description`(100/100), `resource`(100/100, 全てhttps), `type`, `x402Version`, `lastUpdated`, `quality`, `extensions`, `serviceName`(55/100), `tags`(55/100), `iconUrl`, `curated`, `bundleSlugs`。
   - `metadata` キーは**存在しない**(計画が前提にしていた `metadata.name` / `metadata.category` は取れない)。
   - `serviceName` は文字列または欠落。`tags` は文字列配列または欠落(例: `["crypto"]`, `["search"]`, `["ai"]`)。
4. `items[].accepts[]` の各要素で観測されたキー: `amount`(100/100), `maxAmountRequired`(12/100のみ), `asset`, `currency`, `network`, `payTo`, `recipient`, `scheme`, `extra`, `maxTimeoutSeconds`, `description`(一部), `mimeType`, `outputSchema`, `resource`, `extensions`。
   - 価格の原子単位は**`maxAmountRequired` があればそれ、無ければ `amount`**から読む。
5. `network` はCAIP-2形式。観測値: `eip155:8453`(=Base mainnet), `eip155:137`, `eip155:143`, `eip155:42161`, `eip155:480`, `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`, `aws:base`。
6. assetの出現上位(100件標本): `0x833589fcd6edb6e08f4c7c32d4f71b54bda02913`(135回, Base USDC), `epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v`(31回), `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359`(24回), `0xaf88d065e77c8cc2239327c5edb3a432268e5831`(3回), `iso4217:usd`(1回)。

## 計画からの差分(4点)

1. **URL変更**: 旧URL `https://x402.org/facilitator/discovery/resources`(404) → 新URL `https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`。`src/scan.ts` の `DISCOVERY_URL` のみ変更。`PAGE_LIMIT = 100` / `maxPages = 8`(サブリクエスト予算)およびページネーションロジックは無変更。
2. **価格読み取り**: `maxAmountRequired` 単独読み取りの想定だったが、実際は12/100件にしか存在しない。`accepts[0].maxAmountRequired` が文字列ならそれを優先し、無ければ `accepts[0].amount` にフォールバックするよう `src/normalize.ts` を変更。
3. **name/category**: 計画は `metadata.name` / `metadata.category` を前提にしていたが `metadata` キーは存在しない。実際に存在する `serviceName`(非空文字列ならそれ、無ければ従来のURL host+pathnameフォールバック)と `tags`(非空配列ならその先頭要素、無ければ `"other"`)に読み替えた。
4. **network正規化**: 計画は生の文字列を想定していたが、実際はCAIP-2形式(`eip155:8453` 等)で返る。Base mainnet(チェーンID 8453、公知)である `eip155:8453` のみ `"base"` に正規化し、他のCAIP-2値(`eip155:137` や `solana:5eykt...` 等)はそのまま生の文字列として格納する。

## 変更しなかったもの

- `usdFromAtomic` の `KNOWN_ASSETS` はBase USDCの1件のみのまま。未知アセットの `usd` はnull(為替・推定レートを発明しない)。
- `src/types.ts` の `ServiceInput` の形(下流タスクが依存しているため無変更)。
- description: item直下の `description` が文字列ならそれ、無ければ `accepts[0].description`、両方無ければ `null` という3段フォールバック(計画時点の1段フォールバックを拡張)。

## 要検証

- 上記の観測事実は設計者が2026-08-19に実地取得したものを唯一の正として採用した。本タスクでの追加の実地アクセスは行っていない(タスク境界の指示どおり)。将来的にAPIのレスポンスシェイプが変わった場合は再観測が必要。
