import { describe, it, expect } from 'vitest';
import { bonyness, floorColorAt, wallColorAt, COLORS, BLEND_TOP, BLEND_BOTTOM, mix, hexToRgb } from '../src/art/worldColors';
import { REGIONS } from '../src/data/map';

describe('背景の色（W2：少しずつ変わる）', () => {
  it('軟骨部は軟骨部の色、骨部は骨部の色', () => {
    expect(floorColorAt(100)).toEqual(COLORS.cartFloor);
    expect(floorColorAt(40)).toEqual(COLORS.bonyFloor);
    expect(wallColorAt(100)).toEqual(COLORS.cartWall);
    expect(wallColorAt(40)).toEqual(COLORS.bonyWall);
  });
  it('色が変わる区間は峡部を含む', () => {
    const isth = REGIONS.find((r) => r.id === 'isthmus')!;
    expect(BLEND_TOP).toBeLessThan(isth.y0);
    expect(BLEND_BOTTOM).toBeGreaterThan(isth.y1);
  });
  it('1行ごとの変化は小さく、奥へ行くほど骨部らしくなる', () => {
    let prev = bonyness(119);
    for (let r = 118; r >= 0; r--) {
      const b = bonyness(r);
      expect(b).toBeGreaterThanOrEqual(prev);
      expect(b - prev).toBeLessThanOrEqual(1 / (BLEND_BOTTOM - BLEND_TOP) + 1e-9);
      prev = b;
    }
  });
  it('色の補助関数', () => {
    expect(hexToRgb('#ff8000')).toEqual([255, 128, 0]);
    expect(mix([0, 0, 0], [200, 100, 50], 0.5)).toEqual([100, 50, 25]);
    expect(mix([0, 0, 0], [200, 100, 50], 2)).toEqual([200, 100, 50]);
  });
});
