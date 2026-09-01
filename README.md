# XAUUSD ロット計算

XAUUSD（ゴールド）専用の適正ロット計算Webアプリです。口座残高・有効証拠金・価格情報を入力すると、許容損失額に基づく適正ロットなどを即時に計算・表示します。

ビルド不要の静的サイトです（HTML / CSS / JavaScriptのみ）。

## 固定条件

- 銘柄：XAUUSD
- 1lot = 100oz
- 最小ロット：0.01（0.01刻みで切り下げ）
- レバレッジ：1000倍
- 許容損益率：15%
- 値幅：8ドル
- RR：1:1

## ファイル構成

```
xauusd-lot-calculator/
├── index.html                     # エントリーHTML
├── src/
│   ├── css/
│   │   └── style.css              # 全スタイル
│   └── js/
│       ├── constants.js           # 固定条件（定数）
│       ├── calculator.js          # 計算ロジック（DOM非依存）
│       ├── format.js              # 表示用フォーマット関数
│       ├── ui.js                  # DOM取得・画面描画
│       ├── main.js                # エントリーポイント（各モジュールを接続）
│       └── datasources/
│           ├── manualInput.js     # 手入力データソース
│           └── mt5.js             # MT5連携APIポーリングデータソース
├── docs/
│   └── future-mt5-integration.md  # 将来のMT5連携方針メモ
├── .gitignore
└── README.md
```

計算ロジック（`calculator.js`）と画面描画（`ui.js`）、値の取得元（`datasources/`）を分離しているため、仕様（計算式）を変えずに、将来MT5から値を自動取得する形へ拡張しやすい構成にしています。詳細は [`docs/future-mt5-integration.md`](./docs/future-mt5-integration.md) を参照してください。

## ローカルで起動する手順

`index.html` は ES Modules（`<script type="module">`）を使用しているため、`file://` で直接開くとブラウザによってはCORSエラーで動作しません。ローカルサーバー経由で開いてください。

### 方法1：Python

```bash
cd xauusd-lot-calculator
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開く。

### 方法2：Node.js（npxが使える場合）

```bash
cd xauusd-lot-calculator
npx serve .
```

表示されたURL（例：`http://localhost:3000`）をブラウザで開く。

### 方法3：VS Code

「Live Server」拡張機能を導入し、`index.html` を右クリック →「Open with Live Server」。

## GitHubへのPush手順

初回：

```bash
cd xauusd-lot-calculator
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <あなたのリポジトリURL>
git push -u origin main
```

以降の更新：

```bash
git add .
git commit -m "変更内容"
git push
```

別PCで編集を再開する場合：

```bash
git clone <あなたのリポジトリURL>
cd xauusd-lot-calculator
# 上記「ローカルで起動する手順」を参照してサーバーを起動
```

## 計算式

```
許容損失額（円） = 口座残高 × 15%

1lotあたり8ドル幅の損益（USD） = 8 × 100 = 800USD

理論適正ロット = 許容損失額（円） ÷ USDJPY ÷ 800

最終適正ロット = 理論適正ロットを0.01単位で切り下げ

必要証拠金（USD） = XAUUSD価格 × 100 × 最終適正ロット ÷ 1000
必要証拠金（円） = 必要証拠金（USD）× USDJPY

利確時損益（円） = 最終適正ロット × 8 × 100 × USDJPY
損切時損益（円） = 利確時損益 × -1
```

## MT5自動取得モード

画面上部の「MT5自動取得」トグルをONにすると、[MT5連携APIサーバー](../server/README.md)（`GET /api/mt5/latest`）を2秒ごとにポーリングし、口座残高・有効証拠金・XAUUSD価格・USDJPY価格を自動反映して即時再計算します。手入力欄はこの間、編集不可（読み取り専用表示）になります。

- **MT5接続中**：直近10秒以内にMT5からのデータを取得できている状態
- **MT5未接続**：APIサーバー自体には到達できるが、10秒以上MT5からの更新がない状態
- API自体に到達できない場合（サーバー未起動・CORS・ネットワーク不可など）は、自動的に手入力モードへ戻ります

事前に [`server/`](../server/README.md) のAPIサーバーを起動し、[`XAUUSD_LotCalculator_Bridge.mq5`](../XAUUSD_LotCalculator_Bridge.mq5) をMT5で動かしておく必要があります。

**注意**：GitHub Pages（https）上で公開した場合、閲覧者自身のPCの `localhost` APIへブラウザの制限上アクセスできないため、この自動取得モードは同一PC上でWebアプリとAPIサーバーを両方起動しているローカル環境でのみ動作確認できます。本番運用（別ホスティング先のAPIサーバーを使う場合）は `src/js/main.js` 内の `MT5_API_URL` を差し替えてください。

## 今後の予定

- MT5連携APIサーバーの本番ホスティング先の選定・デプロイ
- 自動取得モードのURLを設定画面から変更できるようにするかの検討
