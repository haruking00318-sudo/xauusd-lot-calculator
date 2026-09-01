// エントリーポイント
// データ取得（datasources） → 計算（calculator） → 描画（ui） をつなぐ。
//
// 動作モードは2つ：
//   - 手入力モード（既定）：ユーザーが入力欄を編集するたびに再計算
//   - MT5自動取得モード：2秒ごとにAPIをポーリングし、取得できた値で
//     入力欄を更新した上で即時再計算する
//
// MT5自動取得モード中にAPIへ到達できなくなった場合（fetch失敗）は、
// 自動的に手入力モードへ戻す。

import { calculate } from './calculator.js';
import {
  getInputElements,
  getOutputElements,
  getModeElements,
  render,
  renderMt5Status,
  setInputsDisabled,
  setInputValues,
} from './ui.js';
import { createManualInputSource } from './datasources/manualInput.js';
import { createMt5Source } from './datasources/mt5.js';

// MT5連携APIサーバーのURL（ローカル動作確認用。
// 本番運用時は別ホスティング先のURLに差し替える）
const MT5_API_URL = 'http://localhost:5000/api/mt5/latest';

const inputElements = getInputElements();
const outputElements = getOutputElements();
const modeElements = getModeElements();

const manualSource = createManualInputSource(inputElements);
const mt5Source = createMt5Source({
  url: MT5_API_URL,
  pollIntervalMs: 2000,
  staleTimeoutMs: 10000,
});

function recalculateFromManualInputs() {
  const values = manualSource.getValues();
  render(calculate(values), outputElements);
}

function recalculateFromMt5() {
  const values = mt5Source.getValues();
  setInputValues(inputElements, values);
  render(calculate(values), outputElements);
}

// 手入力モード：入力のたびに再計算
manualSource.onChange(recalculateFromManualInputs);

// MT5モード：新しい値を取得できたら入力欄へ反映して再計算
mt5Source.onChange(recalculateFromMt5);

// MT5接続状態の変化をバッジへ反映。'error'（APIに到達できない）の場合は
// 自動的に手入力モードへ戻す。
mt5Source.onStatusChange((status) => {
  if (!modeElements.toggle.checked) return; // 手入力モード中は無視

  renderMt5Status(modeElements, status);

  if (status === 'error') {
    switchToManualMode();
  }
});

function switchToManualMode() {
  mt5Source.stop();
  modeElements.toggle.checked = false;
  setInputsDisabled(inputElements, false);
  renderMt5Status(modeElements, 'manual');
  recalculateFromManualInputs();
}

function switchToMt5Mode() {
  setInputsDisabled(inputElements, true);
  renderMt5Status(modeElements, 'disconnected');
  mt5Source.start();
}

modeElements.toggle.addEventListener('change', () => {
  if (modeElements.toggle.checked) {
    switchToMt5Mode();
  } else {
    switchToManualMode();
  }
});

// 初期状態は手入力モード
recalculateFromManualInputs();
