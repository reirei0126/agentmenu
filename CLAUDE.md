# agentmenu

A machine-readable catalog of x402 paid endpoints, so agents can compare price and measured
quality before paying. Cloudflare Worker + D1, free tier only. See `README.md` for the product.

## 仕様の真実源(SSOT)と現在地

**この公開リポジトリに設計書・実装計画は置かない。** それらは非公開の
`~/projects/agentmenu-internal` にある(2026-08-21 に履歴ごと分離した)。

| 何 | どこ |
|---|---|
| 設計書(仕様) | `~/projects/agentmenu-internal/docs/superpowers/specs/2026-08-19-agentmenu-design.md` |
| 実装計画 + Amendment A1 + Correction C1 | `~/projects/agentmenu-internal/docs/superpowers/plans/2026-08-19-agentmenu-v1.md` |
| orgh実行handoff(タスク分解・品質ゲート) | `~/projects/agentmenu-internal/docs/orgh/2026-08-19-orgh-handoff.md` |
| デプロイ手順と実測記録 | `~/projects/agentmenu-internal/docs/notes/deploy-checklist.md` |
| 分離前の完全履歴(退避) | `~/projects/agentmenu-internal/archive/*.bundle` |

分離した理由: 計画書には事業判断(趣味フェーズの位置づけ、再判定日、昇格条件)が、
deploy-checklist にはアカウントID・DB ID・オーナーのメールが含まれる。掲載を検討する
出品者に見える場所に置くものではない。

## 現在地(2026-08-21)

- T0〜T9 完了、Cloudflare にデプロイ済み。https://agentmenu.rei-uesugi.workers.dev
- 初回 cron 前のため `services` は0件。cron は `0 */6 * * *`
- 未了: `agentmenu.dev` の購入とカスタムドメイン接続

## この リポジトリで守ること

- 設計書・計画・handoff・アカウント識別子をここにコミットしない(非公開リポジトリ側へ)
- `docs/notes/` に置いてよいのは、外部に見せる前提の技術メモだけ
  (現在: 取得元の利用規約確認、discovery APIのシェイプ調査)
- コミットメッセージ末尾に2行トレーラ(`Co-Authored-By:` と `Claude-Session:`)を付ける
- ランタイム依存(`dependencies`)を追加しない。Cloudflare無料枠のみで動かす
