// エントリーポイント
// データ取得（datasources） → 計算（calculator） → 描画（ui） を
// つなぐだけの薄い層にしている。

import { calculate } from './calculator.js';
import { getInputElements, getOutputElements, render } from './ui.js';
import { createManualInputSource } from './datasources/manualInput.js';

const inputElements = getInputElements();
const outputElements = getOutputElements();

// 現在は手入力データソースを使用。
// 将来MT5連携を追加する場合はここを差し替える。
const dataSource = createManualInputSource(inputElements);

function recalculate() {
  const values = dataSource.getValues();
  const result = calculate(values);
  render(result, outputElements);
}

dataSource.onChange(recalculate);

recalculate();
