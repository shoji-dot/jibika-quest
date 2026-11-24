import { describe, it, expect } from 'vitest';
import { darknessAtRow, lightRadius, equipmentLight, BASE_LIGHT } from '../src/systems/lighting';
import { REGIONS } from '../src/data/map';

describe('暗さ', () => {
  it('場所ごとの暗さ（設計レビュー09の値）', () => {
    expect(darknessAtRow(130)).toBe(0); // 集落
    expect(darknessAtRow(100)).toBeCloseTo(0.55); // 軟骨部
    expect(darknessAtRow(76)).toBeCloseTo(0.7); // 峡部
    expect(darknessAtRow(40)).toBeCloseTo(0.8); // 骨部
    expect(darknessAtRow(3)).toBeCloseTo(0.85); // 鼓膜の門
  });
  it('奥（行が小さい）へ行くほど暗さは減らない', () => {
    let prev = darknessAtRow(139);
    for (let r = 138.5; r >= 0; r -= 0.5) {
      const d = darknessAtRow(r);
      expect(d).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = d;
    }
  });
  it('境目で急に変わらない（0.5行あたりの変化が小さい）', () => {
    for (let r = 0; r < 139; r += 0.5) {
      expect(Math.abs(darknessAtRow(r + 0.5) - darknessAtRow(r))).toBeLessThan(0.06);
    }
  });
  it('各エリアの中央の暗さがエリア内で一定', () => {
    const mid = (id: string) => { const g = REGIONS.find((x) => x.id === id)!; return (g.y0 + g.y1) / 2; };
    expect(darknessAtRow(mid('bony'))).toBeCloseTo(0.8);
    expect(darknessAtRow(mid('cart'))).toBeCloseTo(0.55);
  });
  it('範囲外でも値が出る', () => {
    expect(darknessAtRow(-5)).toBeCloseTo(0.85);
    expect(darknessAtRow(500)).toBe(0);
  });
});

describe('明かり', () => {
  it('基本は44px、集中1ポイントで+2px、上限+20px', () => {
    expect(lightRadius(0, 0)).toBe(BASE_LIGHT);
    expect(lightRadius(3, 0)).toBe(BASE_LIGHT + 6);
    expect(lightRadius(10, 0)).toBe(BASE_LIGHT + 20);
    expect(lightRadius(50, 0)).toBe(BASE_LIGHT + 20);
  });
  it('装備の明るさを足す（負の値は無視）', () => {
    expect(lightRadius(0, 12)).toBe(BASE_LIGHT + 12);
    expect(lightRadius(0, -5)).toBe(BASE_LIGHT);
  });
  it('装備の明るさの合計（定義の無い装備は0）', () => {
    const table: Record<string, number> = { headlamp: 16, endo: 10 };
    expect(equipmentLight({ armor: null, acc1: 'headlamp', acc2: 'endo' }, (id) => table[id])).toBe(26);
    expect(equipmentLight({ armor: 'cotton', acc1: null, acc2: null }, (id) => table[id])).toBe(0);
  });
});
