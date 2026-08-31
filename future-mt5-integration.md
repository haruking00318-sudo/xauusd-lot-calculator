# 将来のMT5連携について（メモ）

現時点ではMT5連携は未実装です。手入力（口座残高／有効証拠金／XAUUSD価格／USDJPY価格）でアプリは完結しています。

将来、MT5から以下を自動取得したい場合は次の方針で拡張します。

- 取得したい値：Balance / Equity / XAUUSD / USDJPY

## 拡張方針

計算ロジック（`src/js/calculator.js`）とUI描画（`src/js/ui.js`）は、値の取得元（データソース）を意識しない作りにしてあります。値の取得元は `src/js/datasources/` 配下のモジュールが担当し、`main.js` から差し替えて使う構成です。

現在の `src/js/datasources/manualInput.js` は次の形のインターフェースを持っています。

```js
{
  getValues() {
    // { balance, equity, xauusd, usdjpy } を返す
  },
  onChange(callback) {
    // 値が変わったら callback を呼ぶ
  }
}
```

MT5連携を追加する際は、同じ形のインターフェースを持つ `src/js/datasources/mt5.js` を新規作成し、`main.js` の `dataSource` を差し替えるだけで済むようにする想定です（`calculator.js` / `ui.js` は変更不要）。

実装方法（案・未着手）：
- MT5側にEA/スクリプトを置き、ローカルファイルやWebSocket、HTTP経由でBalance/Equity/価格を出力する
- `mt5.js` がその出力をポーリングまたは購読し、`getValues()` で最新値を返す
- 自動取得の値と手入力を切り替えられるようにするかは、実装時に検討する
