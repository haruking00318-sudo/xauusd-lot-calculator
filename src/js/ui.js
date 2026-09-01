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

export function getModeElements() {
  return {
    toggle: document.getElementById('mt5ModeToggle'),
    statusBadge: document.getElementById('mt5Status'),
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
 * 手入力欄の有効/無効を切り替える（MT5自動取得モード中は編集不可にする）
 * @param {ReturnType<typeof getInputElements>} inputs
 * @param {boolean} disabled
 */
export function setInputsDisabled(inputs, disabled) {
  Object.values(inputs).forEach((el) => {
    el.disabled = disabled;
  });
}

/**
 * 手入力欄へ値を反映する（MT5から取得した値を表示するため）
 * @param {ReturnType<typeof getInputElements>} inputs
 * @param {{balance:number, equity:number, xauusd:number, usdjpy:number}} values
 */
export function setInputValues(inputs, values) {
  inputs.balance.value = values.balance;
  inputs.equity.value = values.equity;
  inputs.xauusd.value = values.xauusd;
  inputs.usdjpy.value = values.usdjpy;
}

const MT5_STATUS_LABEL = {
  connected: { text: 'MT5接続中', className: 'badge badge-ok' },
  stale: { text: 'MT5未接続', className: 'badge badge-ng' },
  disconnected: { text: 'MT5未接続', className: 'badge badge-ng' },
  error: { text: 'MT5未接続', className: 'badge badge-ng' },
  manual: { text: '手入力モード', className: 'badge badge-na' },
};

/**
 * MT5接続状態バッジを更新する
 * @param {ReturnType<typeof getModeElements>} modeEl
 * @param {'connected'|'stale'|'disconnected'|'error'|'manual'} status
 */
export function renderMt5Status(modeEl, status) {
  const label = MT5_STATUS_LABEL[status] || MT5_STATUS_LABEL.manual;
  modeEl.statusBadge.textContent = label.text;
  modeEl.statusBadge.className = label.className;
}

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
