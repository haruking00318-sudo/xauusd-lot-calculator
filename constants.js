// XAUUSD専用 固定条件
// 仕様変更が入った場合はこのファイルのみを編集する

export const RISK_RATE = 0.15;      // 許容損益率（口座残高に対する割合）
export const RANGE_USD = 8;         // 想定値幅（USD）
export const OZ_PER_LOT = 100;      // 1lotあたりのoz数
export const LEVERAGE = 1000;       // レバレッジ倍率
export const LOT_STEP = 0.01;       // ロット刻み（切り下げ単位）

// 1lotあたり想定値幅分の損益（USD）＝ 8 × 100 = 800USD
export const USD_PER_LOT_RANGE = RANGE_USD * OZ_PER_LOT;
