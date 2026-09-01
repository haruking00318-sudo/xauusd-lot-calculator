// 計算ロジック本体
// DOMに依存しない純粋関数のみを置く。
// 将来MT5連携を追加する場合も、ここは変更せずに
// 入力データの取得元（datasources/）だけを差し替えれば良い構成にしている。
//
// 許容損益率（riskRatePercent）と値幅（rangeUsd）はユーザーが自由に変更できる
// 値のため、固定定数ではなく引数として受け取る。

import { OZ_PER_LOT, LEVERAGE, LOT_STEP } from './constants.js';

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
 * 許容損益率（%）が有効な値かどうか（0より大きく100未満）
 * @param {number} riskRatePercent
 */
export function isRiskRateValid(riskRatePercent) {
  return isFinite(riskRatePercent) && riskRatePercent > 0 && riskRatePercent < 100;
}

/**
 * 値幅（USD）が有効な値かどうか（0より大きい）
 * @param {number} rangeUsd
 */
export function isRangeUsdValid(rangeUsd) {
  return isFinite(rangeUsd) && rangeUsd > 0;
}

/**
 * 口座残高・有効証拠金・価格情報・許容損益率・値幅から適正ロット等を計算する
 * @param {{
 *   balance:number, equity:number, xauusd:number, usdjpy:number,
 *   riskRatePercent:number, rangeUsd:number
 * }} input
 * @returns {object} 計算結果一式
 */
export function calculate({ balance, equity, xauusd, usdjpy, riskRatePercent, rangeUsd }) {
  const riskRateOk = isRiskRateValid(riskRatePercent);
  const rangeOk = isRangeUsdValid(rangeUsd);
  const isRiskSettingsInvalid = !riskRateOk || !rangeOk;

  // 不正な値のまま計算しないよう、無効な場合は0として扱う
  const effectiveRiskRate = riskRateOk ? riskRatePercent / 100 : 0; // 許容損益率（小数）
  const effectiveRangeUsd = rangeOk ? rangeUsd : 0;                  // 値幅（USD）

  const riskAmount = balance * effectiveRiskRate; // 許容損失額（円）＝口座残高×許容損益率

  const usdPerLotRange = effectiveRangeUsd * OZ_PER_LOT; // 1lotあたり損益（USD）＝値幅×100oz

  const theoreticalLot = (usdjpy > 0 && usdPerLotRange > 0)
    ? riskAmount / usdjpy / usdPerLotRange
    : 0; // 理論適正ロット

  const finalLot = floorToStep(theoreticalLot, LOT_STEP); // 最終適正ロット（0.01刻みで切り下げ）

  const requiredMarginUsd = (xauusd * OZ_PER_LOT * finalLot) / LEVERAGE; // 必要証拠金（USD）
  const requiredMarginJpy = requiredMarginUsd * usdjpy;                  // 必要証拠金（円）

  const profitJpy = finalLot * effectiveRangeUsd * OZ_PER_LOT * usdjpy; // 利確損益（円）
  const lossJpy = profitJpy * -1;                                        // 損切損益（円）（RR 1:1）

  const isBelowMinLot = !isRiskSettingsInvalid && theoreticalLot > 0 && finalLot < LOT_STEP;

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
    isRiskSettingsInvalid,
    marginJudge,
  };
}
