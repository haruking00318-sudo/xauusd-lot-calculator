// 計算ロジック本体
// DOMに依存しない純粋関数のみを置く。
// 将来MT5連携を追加する場合も、ここは変更せずに
// 入力データの取得元（datasources/）だけを差し替えれば良い構成にしている。

import {
  RISK_RATE,
  RANGE_USD,
  OZ_PER_LOT,
  LEVERAGE,
  LOT_STEP,
  USD_PER_LOT_RANGE,
} from './constants.js';

/**
 * 値を指定ステップ単位で切り下げる（浮動小数点誤差を吸収）
 * @param {number} value
 * @param {number} step
 * @returns {number}
 */
export function floorToStep(value, step) {
  if (!isFinite(value) || value <= 0) return 0;
  return Math.floor(value / step + 1e-9) * step;
}

/**
 * 口座残高・有効証拠金・価格情報から適正ロット等を計算する
 * @param {{balance:number, equity:number, xauusd:number, usdjpy:number}} input
 * @returns {object} 計算結果一式
 */
export function calculate({ balance, equity, xauusd, usdjpy }) {
  const riskAmount = balance * RISK_RATE; // 許容損失額（円）

  const theoreticalLot = usdjpy > 0
    ? riskAmount / usdjpy / USD_PER_LOT_RANGE
    : 0; // 理論適正ロット

  const finalLot = floorToStep(theoreticalLot, LOT_STEP); // 最終適正ロット

  const requiredMarginUsd = (xauusd * OZ_PER_LOT * finalLot) / LEVERAGE; // 必要証拠金（USD）
  const requiredMarginJpy = requiredMarginUsd * usdjpy;                  // 必要証拠金（円）

  const profitJpy = finalLot * RANGE_USD * OZ_PER_LOT * usdjpy; // 利確時損益（円）
  const lossJpy = profitJpy * -1;                                // 損切時損益（円）

  const isBelowMinLot = theoreticalLot > 0 && finalLot < LOT_STEP;

  let marginJudge = 'na'; // 'ok' | 'ng' | 'na'
  if (equity > 0 && finalLot > 0) {
    marginJudge = equity >= requiredMarginJpy ? 'ok' : 'ng';
  }

  return {
    riskAmount,
    theoreticalLot,
    finalLot,
    requiredMarginUsd,
    requiredMarginJpy,
    profitJpy,
    lossJpy,
    isBelowMinLot,
    marginJudge,
  };
}
