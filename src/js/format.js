// 表示用フォーマット関数

export function formatJpy(n) {
  return '¥' + Math.round(n).toLocaleString('ja-JP');
}

export function formatUsd(n) {
  return '$' + n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatLot(n) {
  return n.toLocaleString('ja-JP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
