# XAUUSD ロット計算

XAUUSD（ゴールド）専用の適正ロット計算Webアプリです。口座残高・有効証拠金・価格情報を入力すると、許容損失額に基づく適正ロットなどを即時に計算・表示します。APIキーを使ったMT5自動取得（複数ユーザー対応・PC/iPhone/Android対応）にも対応しています。

ビルド不要の静的サイトです（HTML / CSS / JavaScriptのみ）。

## 固定条件

- 銘柄：XAUUSD
- 1lot = 100oz
- 最小ロット：0.01（0.01刻みで切り下げ）
- レバレッジ：1000倍
- RR：1:1

## 手動設定項目（初期値あり・画面から変更可能）

- 許容損益率：初期値15%（0%より大きく100%未満で入力）
- 値幅：初期値8USD（0より大きい値で入力。利確幅・損切幅の両方に使用、RR 1:1を維持）

これら2項目はMT5自動取得の対象外です。MT5自動取得モードON時でも常に手動で変更できます。

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
許容損失額（円） = 口座残高 × 許容損益率

1lotあたり損益（USD） = 値幅 × 100oz

理論適正ロット = 許容損失額（円） ÷ USDJPY ÷ (値幅 × 100)

最終適正ロット = 理論適正ロットを0.01単位で切り下げ

必要証拠金（USD） = XAUUSD価格 × 100 × 最終適正ロット ÷ 1000
必要証拠金（円） = 必要証拠金（USD）× USDJPY

利確損益（円） = 最終適正ロット × 値幅 × 100 × USDJPY
損切損益（円） = 利確損益 × -1（RR 1:1）
```

許容損益率が0%以下または100%以上、あるいは値幅が0以下の場合は入力として無効とみなし、対象の入力欄を赤枠で表示した上で、適正ロットの計算を行いません（0として表示）。

## MT5自動取得モード（複数ユーザー対応）

画面上部に「MT5連携キー」入力欄があります。サーバー管理者から発行された自分専用のAPIキーをここに入力し、「MT5自動取得」トグルをONにすると、外部公開されたMT5連携APIサーバー（`GET /api/mt5/latest`）を2秒ごとにポーリングし、**自分のAPIキーに紐づくデータだけ**を口座残高・有効証拠金・XAUUSD価格・USDJPY価格へ自動反映して即時再計算します。手入力欄はこの間、編集不可（読み取り専用表示）になります。許容損益率・値幅はこの対象外で、常に手動で変更できます。

APIキーは `X-API-Key` リクエストヘッダーで送信され、URLパラメータには含まれません。

- **MT5接続中**：直近10秒以内にMT5からのデータを取得できている状態
- **MT5未接続**：APIサーバー自体には到達できるが、10秒以上MT5からの更新がない状態
- **APIキーが無効です**：サーバーがそのAPIキーを認識できなかった場合（401）。自動的に手入力モードへ戻ります
- **MT5連携キーを入力してください**：キー欄が空のままトグルをONにしようとした場合。ONにならず、手入力モードのままになります
- API自体に到達できない場合（サーバー未起動・ネットワーク不可など）は、自動的に手入力モードへ戻ります

### APIのベースURLの設定

`src/js/main.js` の先頭にある定数を、実際にデプロイしたAPIサーバーのURLに書き換えてください。

```js
const MT5_API_BASE_URL = 'http://localhost:5000'; // ← ここを外部公開URLに変更する
```

このアプリは静的サイト（ビルドツールなし）のため、Node.jsのような実行時環境変数は使えません。代わりに、この定数を「デプロイ前に書き換える設定値」として扱います。編集後にコミット・pushすれば、GitHub Pages等で公開したページにも反映されます。

外部公開APIを使う構成にしたことで、**PC・iPhone・Android のどのブラウザからでも**、同じURL・同じAPIキーでMT5自動取得が動作します（`localhost` 依存を廃止したため、スマートフォンでも動作します）。

事前に [`server/`](../server/README.md) のAPIサーバーを起動し、[`XAUUSD_LotCalculator_Bridge.mq5`](../XAUUSD_LotCalculator_Bridge.mq5) にAPIサーバーのURLと自分のAPIキーを設定してMT5で動かしておく必要があります。

## 今後の予定

- ログイン機能・課金機能（現段階では対象外。APIキー方式のみ）
- APIキー入力欄の値をブラウザに保存し、次回訪問時に自動入力する機能の検討
