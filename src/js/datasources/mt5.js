// MT5データソース
//
// manualInput.js と同じ interface（getValues() / onChange()）を持つ。
// 加えて、接続状態をmain.js側へ通知するための onStatusChange() を持つ。
//
// 動作：
//  - pollIntervalMs（既定2秒）ごとに GET {url} をポーリング
//  - 取得に成功し status:"ok" かつ data がある場合、値をキャッシュして 'connected' を通知
//  - 直近の成功取得から staleTimeoutMs（既定10秒）以上経過している場合は 'stale' を通知
//    （APIサーバー自体には到達できているが、MT5 EAからの更新が来ていない状態）
//  - fetch自体が失敗した場合（サーバーに到達できない等）は 'error' を通知する
//    → main.js側でこれを受けて手入力モードへ自動的に戻す
//
// 【重要】GitHub Pages（https）上からは、閲覧者自身のlocalhost APIへは
// ブラウザのMixed Content制限等により到達できない場合がある。
// そのため、まずはローカル環境（同一PC上でWebアプリとAPIサーバーを両方起動）
// での動作確認を前提とした実装にしている。

export function createMt5Source(options = {}) {
  const {
    url = 'http://localhost:5000/api/mt5/latest',
    pollIntervalMs = 2000,
    staleTimeoutMs = 10000,
  } = options;

  let latestValues = null;   // 直近取得できた { balance, equity, xauusd, usdjpy }
  let lastSuccessAt = null;  // 直近「データあり」で取得できた時刻（Date.now()）
  let timerId = null;
  let changeCallback = null;  // 新しい値を取得できたときに呼ぶ（再計算トリガー）
  let statusCallback = null;  // 接続状態が変わったときに呼ぶ
  let currentStatus = 'disconnected'; // 'connected' | 'stale' | 'disconnected' | 'error'

  function setStatus(nextStatus) {
    if (nextStatus !== currentStatus) {
      currentStatus = nextStatus;
      if (statusCallback) statusCallback(currentStatus);
    }
  }

  function checkStale() {
    if (currentStatus === 'error') return; // エラー状態はfetch成功まで変えない
    if (lastSuccessAt === null) {
      setStatus('disconnected');
      return;
    }
    const elapsed = Date.now() - lastSuccessAt;
    setStatus(elapsed >= staleTimeoutMs ? 'stale' : 'connected');
  }

  async function poll() {
    let response;
    try {
      response = await fetch(url, { cache: 'no-store' });
    } catch (err) {
      // サーバーに到達できない（未起動・CORSブロック・ネットワーク不可など）
      console.error('[MT5] APIへの接続に失敗しました:', err);
      setStatus('error');
      return;
    }

    if (!response.ok) {
      console.error('[MT5] APIがエラーを返しました。HTTPステータス:', response.status);
      setStatus('error');
      return;
    }

    let json;
    try {
      json = await response.json();
    } catch (err) {
      console.error('[MT5] APIレスポンスの解析に失敗しました:', err);
      setStatus('error');
      return;
    }

    if (json && json.status === 'ok' && json.data) {
      const { balance, equity, xauusd, usdjpy } = json.data;
      latestValues = { balance, equity, xauusd, usdjpy };
      lastSuccessAt = Date.now();
      setStatus('connected');
      if (changeCallback) changeCallback();
      return;
    }

    // status:"empty" など、通信自体は成功しているがまだMT5からのデータがない場合
    checkStale();
  }

  return {
    // manualInput.js と同じインターフェース -----------------------------
    getValues() {
      return latestValues || { balance: 0, equity: 0, xauusd: 0, usdjpy: 0 };
    },
    onChange(callback) {
      changeCallback = callback;
    },
    // MT5データソース固有 -------------------------------------------------
    onStatusChange(callback) {
      statusCallback = callback;
    },
    start() {
      poll(); // 即時に1回実行
      timerId = setInterval(() => {
        poll();
        checkStale();
      }, pollIntervalMs);
    },
    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
      setStatus('disconnected');
    },
  };
}
