// MT5データソース（複数ユーザー対応版）
//
// manualInput.js と同じ interface（getValues() / onChange()）を持つ。
// 加えて、接続状態をmain.js側へ通知するための onStatusChange() を持つ。
//
// APIキーはユーザーがWebアプリの「MT5連携キー」欄に入力した値を、
// getApiKey() コールバック経由でポーリングのたびに取得し、
// X-API-Key ヘッダーに載せて送信する（URLパラメータには含めない）。
//
// 動作：
//  - pollIntervalMs（既定2秒）ごとに GET {url} をポーリング
//  - APIキーが空の場合は 'no-key' を通知し、通信自体を行わない
//  - 取得に成功し status:"ok" かつ data がある場合、値をキャッシュして 'connected' を通知
//  - 直近の成功取得から staleTimeoutMs（既定10秒）以上経過している場合は 'stale' を通知
//    （APIサーバー自体には到達できているが、MT5 EAからの更新が来ていない状態）
//  - APIキーが無効な場合（サーバーが401を返した場合）は 'unauthorized' を通知する
//  - fetch自体が失敗した場合（サーバーに到達できない等）は 'error' を通知する
//  - 'unauthorized' / 'error' は main.js側で受け取り、手入力モードへ自動的に戻す
//
// 【重要】外部公開APIを使う構成のため、スマートフォン（iPhone / Android）の
// ブラウザからも同一のURLへ直接アクセスできる。

export function createMt5Source(options = {}) {
  const {
    url,
    pollIntervalMs = 2000,
    staleTimeoutMs = 10000,
    getApiKey = () => '',
  } = options;

  if (!url) {
    throw new Error('createMt5Source: url は必須です');
  }

  let latestValues = null;   // 直近取得できた { balance, equity, xauusd, usdjpy }
  let lastSuccessAt = null;  // 直近「データあり」で取得できた時刻（Date.now()）
  let timerId = null;
  let changeCallback = null;  // 新しい値を取得できたときに呼ぶ（再計算トリガー）
  let statusCallback = null;  // 接続状態が変わったときに呼ぶ
  // 'connected' | 'stale' | 'disconnected' | 'error' | 'unauthorized' | 'no-key'
  let currentStatus = 'disconnected';

  function setStatus(nextStatus) {
    if (nextStatus !== currentStatus) {
      currentStatus = nextStatus;
      if (statusCallback) statusCallback(currentStatus);
    }
  }

  function checkStale() {
    // より具体的な状態（キー未入力・エラー・認証エラー）はfetch成功まで変えない
    if (currentStatus === 'error' || currentStatus === 'unauthorized' || currentStatus === 'no-key') {
      return;
    }
    if (lastSuccessAt === null) {
      setStatus('disconnected');
      return;
    }
    const elapsed = Date.now() - lastSuccessAt;
    setStatus(elapsed >= staleTimeoutMs ? 'stale' : 'connected');
  }

  async function poll() {
    const apiKey = (getApiKey() || '').trim();

    if (!apiKey) {
      // APIキー未指定時は通信自体を行わない
      setStatus('no-key');
      return;
    }

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'X-API-Key': apiKey,
        },
      });
    } catch (err) {
      // サーバーに到達できない（未起動・CORSブロック・ネットワーク不可など）
      console.error('[MT5] APIへの接続に失敗しました:', err);
      setStatus('error');
      return;
    }

    if (response.status === 401) {
      console.error('[MT5] APIキーが無効です（401）。');
      setStatus('unauthorized');
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
