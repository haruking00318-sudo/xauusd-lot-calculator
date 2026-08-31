// 手入力データソース
//
// 現在はこのモジュールが入力値の取得元になっている。
// 将来MT5連携を追加する場合は、同じ getValues() の形（
// { balance, equity, xauusd, usdjpy } を返す関数）を持つ
// mt5.js を同じ datasources/ 配下に追加し、main.js側で
// 差し替えるだけで良い構成にしている。
// （現時点ではMT5連携は未実装）

export function createManualInputSource(elements) {
  return {
    getValues() {
      return {
        balance: parseFloat(elements.balance.value) || 0,
        equity: parseFloat(elements.equity.value) || 0,
        xauusd: parseFloat(elements.xauusd.value) || 0,
        usdjpy: parseFloat(elements.usdjpy.value) || 0,
      };
    },
    onChange(callback) {
      Object.values(elements).forEach((el) => {
        el.addEventListener('input', callback);
      });
    },
  };
}
