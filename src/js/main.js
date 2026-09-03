// エントリーポイント
// データ取得（datasources） → 計算（calculator） → 描画（ui） をつなぐ。
//
// 動作モードは2つ：
//   - 手入力モード（既定）：ユーザーが入力欄を編集するたびに再計算
//   - MT5自動取得モード：2秒ごとに外部APIをポーリングし、取得できた値で
//     口座残高・有効証拠金・XAUUSD価格・USDJPY価格の入力欄を更新した上で
//     即時再計算する。ユーザーは自分の「MT5連携キー」を入力する必要がある。
//
// 許容損益率・値幅はMT5自動取得の対象外。モードに関わらず常に手動で
// 変更できる（getRiskInputElements() で取得する別枠の入力欄）。
//
// MT5自動取得モード中にAPIキーが無効・未指定、またはAPIへ到達できなく
// なった場合は、自動的に手入力モードへ戻す。

import { calculate, isRiskRateValid, isRangeUsdValid } from './calculator.js';
import {
  getInputElements,
  getRiskInputElements,
  getOutputElements,
  getModeElements,
  render,
  renderMt5Status,
  setInputsDisabled,
  setInputValues,
  setFieldValidity,
} from './ui.js';
import { createManualInputSource } from './datasources/manualInput.js';
import { createMt5Source } from './datasources/mt5.js';

// MT5連携APIサーバーのベースURL。
// ローカル動作確認時は http://localhost:5000 のままでよいが、
// 外部公開後は実際の公開URL（例: https://your-app.onrender.com）に書き換える。
// スマートフォンからアクセスする場合も、このURLが外部から到達可能である必要がある。
const MT5_API_BASE_URL = 'http://localhost:5000';
const MT5_API_URL = `${MT5_API_BASE_URL}/api/mt5/latest`;

const inputElements = getInputElements();
const riskInputElements = getRiskInputElements();
const outputElements = getOutputElements();
const modeElements = getModeElements();

if (!modeElements.toggle || !modeElements.statusBadge || !modeElements.apiKeyInput) {
  console.error(
    '[main.js] MT5モード切替用のDOM要素が見つかりません。' +
    'index.html に id="mt5ModeToggle" / id="mt5Status" / id="mt5ApiKey" があるか確認してください。'
  );
}

const manualSource = createManualInputSource(inputElements);
const mt5Source = createMt5Source({
  url: MT5_API_URL,
  pollIntervalMs: 2000,
  staleTimeoutMs: 10000,
  getApiKey: () => (modeElements.apiKeyInput ? modeElements.apiKeyInput.value : ''),
});

// 現在アクティブなデータソース（口座残高・有効証拠金・XAUUSD・USDJPYの取得元）
function getActiveSource() {
  return modeElements.toggle && modeElements.toggle.checked ? mt5Source : manualSource;
}

// 許容損益率・値幅を読み取る（常に手動入力欄から）
function getRiskSettings() {
  return {
    riskRatePercent: parseFloat(riskInputElements.riskRate.value),
    rangeUsd: parseFloat(riskInputElements.rangeUsd.value),
  };
}

function recalcAndRender() {
  const base = getActiveSource().getValues();
  const { riskRatePercent, rangeUsd } = getRiskSettings();

  const result = calculate({
    balance: base.balance,
    equity: base.equity,
    xauusd: base.xauusd,
    usdjpy: base.usdjpy,
    riskRatePercent,
    rangeUsd,
  });

  render(result, outputElements);

  // 個別の欄にも不正値の枠線を表示する
  setFieldValidity(riskInputElements.riskRate, isRiskRateValid(riskRatePercent));
  setFieldValidity(riskInputElements.rangeUsd, isRangeUsdValid(rangeUsd));
}

// 手入力モード：balance/equity/xauusd/usdjpy いずれかの変更で再計算
manualSource.onChange(recalcAndRender);

// MT5モード：新しい値を取得できたら入力欄へ反映して再計算
mt5Source.onChange(() => {
  setInputValues(inputElements, mt5Source.getValues());
  recalcAndRender();
});

// 許容損益率・値幅：モードに関わらず、変更したら即再計算
riskInputElements.riskRate.addEventListener('input', recalcAndRender);
riskInputElements.rangeUsd.addEventListener('input', recalcAndRender);

// MT5接続状態の変化をバッジへ反映。
// 'error'（APIに到達できない）・'unauthorized'（APIキーが無効）の場合は
// 自動的に手入力モードへ戻す。'no-key' はトグルON時点で弾いているため、
// ここに来るのは主にAPIキーが後から空にされた場合。
mt5Source.onStatusChange((status) => {
  if (!modeElements.toggle || !modeElements.toggle.checked) return; // 手入力モード中は無視

  renderMt5Status(modeElements, status);

  if (status === 'error' || status === 'unauthorized' || status === 'no-key') {
    if (status === 'unauthorized') {
      setFieldValidity(modeElements.apiKeyInput, false);
    }
    switchToManualMode();
  }
});

function switchToManualMode() {
  mt5Source.stop();
  if (modeElements.toggle) modeElements.toggle.checked = false;
  setInputsDisabled(inputElements, false);
  renderMt5Status(modeElements, 'manual');
  recalcAndRender();
}

function switchToMt5Mode() {
  setInputsDisabled(inputElements, true);
  renderMt5Status(modeElements, 'disconnected');
  mt5Source.start();
}

// MT5自動取得トグル：ON時はmt5.js、OFF時はmanualInput.jsを使用する
if (modeElements.toggle) {
  modeElements.toggle.addEventListener('change', () => {
    if (!modeElements.toggle.checked) {
      switchToManualMode();
      return;
    }

    // APIキー未指定時は取得しない（ONにさせない）
    const apiKey = (modeElements.apiKeyInput.value || '').trim();
    if (!apiKey) {
      modeElements.toggle.checked = false;
      setFieldValidity(modeElements.apiKeyInput, false);
      renderMt5Status(modeElements, 'no-key');
      return;
    }

    setFieldValidity(modeElements.apiKeyInput, true);
    switchToMt5Mode();
  });
}

// APIキー欄の入力が始まったら、不正表示（赤枠）は一旦解除する
if (modeElements.apiKeyInput) {
  modeElements.apiKeyInput.addEventListener('input', () => {
    setFieldValidity(modeElements.apiKeyInput, true);
  });
}

// 初期状態は手入力モード
recalcAndRender();
