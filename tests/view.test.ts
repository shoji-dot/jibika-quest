import { describe, it, expect } from 'vitest';
import { pixelZoom, bufferSize } from '../src/systems/view';

describe('描画倍率', () => {
  it('画素比ごとの1ドットの画素数（整数）', () => {
    expect(pixelZoom(3)).toBe(4); // iPhone（画素比3）：4/3 ≒ 1.33倍
    expect(pixelZoom(2)).toBe(3); // 画素比2：3/2 = 1.5倍（2.67を四捨五入）
    expect(pixelZoom(1)).toBe(1); // PC：1倍
  });
  it('おかしな値でも1以上', () => {
    expect(pixelZoom(0)).toBe(1);
    expect(pixelZoom(Number.NaN)).toBe(1);
    expect(pixelZoom(0.1)).toBe(1);
  });
  it('論理サイズでの見た目の倍率が目標（1.33倍）に近い', () => {
    for (const dpr of [1, 2, 3]) expect(Math.abs(pixelZoom(dpr) / dpr - 4 / 3)).toBeLessThan(0.35);
  });
  it('描画用の画面の大きさ', () => {
    expect(bufferSize(390, 500, 3)).toEqual({ width: 1170, height: 1500 });
    expect(bufferSize(375.5, 400.2, 2)).toEqual({ width: 751, height: 800 });
  });
});
