# 取得元の利用規約確認(タスクT0)

x402 discovery/Bazaar APIのデータをカタログとして再利用・再配布してよいか、計画Task 0指定の3点を確認する。

## 1. x402.gitbook.io Bazaar章
`https://x402.gitbook.io/x402/core-concepts/bazaar-discovery-layer`

**未確認。** 直接取得を3回試みたが毎回404相当(取得ツールのレンダリング失敗の可能性)。代替として`llms-full.txt`を検索したが、原文引用:

> "Major themes: ... Discovery layer for service search & reputation"

というロードマップ言及のみで、利用規約に関する記述は見つからなかった。未確認のため、OK判定の根拠には使わない。

## 2. docs.cdp.coinbase.com/x402/bazaar
原文引用:

> "Bazaar discovery is public. You do not need a CDP API key to use the discovery APIs"

解釈: discovery APIは鍵不要で公開されており、閲覧・表示は妨げられないと読める。ただし再配布権を明示的に付与する文言はなく、これ単独では確定的ではない。

(補足・未検証)検索結果の断片に「`discoverable: true`で公開オプトインする」旨の記述があったが、当該ページを直接取得しては確認できなかったため未確認とし、判定には用いない。

## 3. x402.org / GitHub LICENSE
原文引用(x402.org):

> "The protocol is open-source and has been audited for security."

原文引用(GitHub `coinbase/x402/LICENSE`):

> "Apache License Version 2.0, January 2004..."

解釈: プロトコル本体(コード/仕様)はApache 2.0。ただしこれはBazaarの発見データ自体の利用許諾を意味しない点に注意。

## 結論: OK
確認した文書のいずれにも再利用・再配布を禁止する記述はない。discovery APIは公開・鍵不要と明言されており、agentmenuは価格・生存確認情報を読み取り正規化して再掲するのみで元データを改変しない。未確認箇所(#1)は積極的根拠に使わず、公開前に人間による再確認を推奨する。

## 帰属表示方針
`/catalog.json`の各エントリに`source: ["bazaar"]`を付与し、フッター/READMEに「Data sources: x402 discovery API」と明記する。
