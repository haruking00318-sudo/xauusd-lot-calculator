// 画面描画（DOM更新）を担当するモジュール

import { formatJpy, formatUsd, formatLot } from './format.js';

export function getInputElements() {
  return {
    balance: document.getElementById('balance'),
    equity: document.getElementById('equity'),
    xauusd: document.getElementById('xauusd'),
    usdjpy: document.getElementById('usdjpy'),
  };
}

export function getOutputElements() {
  return {
    heroBox: document.getElementById('heroBox'),
    finalLot: document.getElementById('finalLot'),
    riskAmount: document.getElementById('riskAmount'),
    theoLot: document.getElementById('theoLot'),
    marginUsd: document.getElementById('marginUsd'),
    marginJpy: document.getElementById('marginJpy'),
    profitAmount: document.getElementById('profitAmount'),
    lossAmount: document.getElementById('lossAmount'),
    marginJudge: document.getElementById('marginJudge'),
  };
}

const JUDGE_LABEL = {
  ok: { text: '証拠金OK', className: 'badge badge-ok' },
  ng: { text: '証拠金不足', className: 'badge badge-ng' },
  na: { text: '-', className: 'badge badge-na' },
};

/**
 * 計算結果をDOMへ反映する
 * @param {ReturnType<typeof import('./calculator.js').calculate>} result
 * @param {ReturnType<typeof getOutputElements>} out
 */
export function render(result, out) {
  out.riskAmount.textContent = formatJpy(result.riskAmount);
  out.theoLot.textContent = formatLot(result.theoreticalLot);

  out.finalLot.textContent = formatLot(result.finalLot);
  out.heroBox.classList.toggle('insufficient', result.isBelowMinLot);

  out.marginUsd.firstChild.textContent = formatUsd(result.requiredMarginUsd);
  out.marginJpy.textContent = formatJpy(result.requiredMarginJpy);

  out.profitAmount.textContent = formatJpy(result.profitJpy);
  out.lossAmount.textContent = formatJpy(result.lossJpy);

  const judge = JUDGE_LABEL[result.marginJudge];
  out.marginJudge.textContent = judge.text;
  out.marginJudge.className = judge.className;
}
