# 耳鼻科クエスト（仮称）

耳の解剖構造を舞台にした、iPhone 縦画面向けの 2D アクション RPG（PWA）。

- 現在の版：**v0.1.0 試遊版**（コンカの集落〜外耳道〜鼓膜の門の手前）
- 企画資料：OneDrive の `耳鼻科クエスト/docs/`（企画書・医学情報台帳ほか）

## 技術構成

Vite ＋ TypeScript ＋ Phaser 4 ＋ vite-plugin-pwa ＋ idb-keyval、テストは Vitest。

## 開発

```bash
npm install
npm run dev      # 開発サーバ（同じ Wi-Fi の端末からも接続可）
npm test         # 単体テスト（戦闘・成長・入力・セーブ・マップ）
npm run build    # 型チェック＋本番ビルド（dist/）
npm run icons    # アイコン PNG を再生成
```

## フォルダ

| パス | 内容 |
|---|---|
| `src/systems/` | Phaser に依存しない純粋ロジック（戦闘・成長・入力・セーブ） |
| `src/data/` | ゲーム演出データ（武器・敵・アイテム）とマップ生成 |
| `src/art/` | 自作ドット絵データと描画 |
| `src/scenes/` | Phaser のシーン |
| `src/ui/` | HUD・操作・メニュー・タイトル（DOM） |
| `src/game/` | 状態管理・端末内保存 |
| `tests/` | Vitest |

## 方針メモ

- 医学的事実とゲーム上の演出は分けて管理する（医学情報台帳の ID で参照）。
- 敵は疾患・病態のモチーフであり、患者を敵として描かない。
- 画像・音などの外部素材は使っていない（すべてコード生成）。
