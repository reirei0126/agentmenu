# 取得元の利用規約確認(タスクT0)

x402 discovery/Bazaar APIのデータを再利用・再配布してよいか、計画Task 0指定の3点を確認する。

## 1. x402.gitbook.io Bazaar章
`https://x402.gitbook.io/x402/core-concepts/bazaar-discovery-layer`

**未確認。** 直接取得を3回試みたが毎回404相当(取得ツールのレンダリング失敗の可能性)。代替の`llms-full.txt`で原文引用:

> "Major themes: ... Discovery layer for service search & reputation"

というロードマップ言及のみ発見。利用規約の記述はなく、OK判定の根拠には使わない。

## 2. docs.cdp.coinbase.com/x402/bazaar
本ページは直接取得2回成功(うち1回は"discoverable"を名指し検索)。原文引用:

> "Bazaar discovery is public. You do not need a CDP API key to use the discovery APIs"

解釈: discovery APIは鍵不要で公開されており、閲覧・表示は妨げられない。

「discoverable:trueが同意を意味するか」(Task 0 Step 1要求事項)について: 本ページ本文に"discoverable"の語は一切なし(確定)。追加取得を試行し`https://coinbase-cloud.mintlify.app/x402/bazaar`(同名ページのミラーと見られる別ドメイン、計画指定URL外)を直接取得できた。原文引用:

> "attach `declareDiscoveryExtension()` ... on routes you want discoverable" / "Only routes that declare Bazaar metadata can appear in CDP discovery."

解釈: 掲載はルート単位のオプトインで黙示的同意ではない。計画指定URL外のため補強情報とする。

## 3. x402.org / GitHub LICENSE
原文引用(x402.org):

> "The protocol is open-source and has been audited for security."

原文引用(GitHub `coinbase/x402/LICENSE`):

> "Apache License Version 2.0, January 2004..."

解釈: プロトコル本体(コード/仕様)はApache 2.0。ただしBazaarの発見データ自体の許諾は意味しない。

## 結論: OK
確認した文書に再利用・再配布の禁止はない。discovery APIは公開・鍵不要で、掲載はルート単位のオプトインである。agentmenuは価格・生存確認情報を読み取り正規化して再掲するのみで元データを改変しない。未確認箇所(#1)は根拠に使わず、公開前に人間による再確認を推奨する。

## 帰属表示方針
`/catalog.json`各エントリに`source: ["bazaar"]`を付与し、フッター/READMEに「Data sources: x402 discovery API」と明記する。
