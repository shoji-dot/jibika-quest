import { describe, it, expect } from 'vitest';
import { HERO_BASE, HERO_FRAMES, HERO_H, HERO_PALETTE, HERO_W, WEAPON_OVERLAYS, composeHero, heroTextureKey } from '../src/art/hero';
import { WEAPONS } from '../src/data/gameData';

describe('主人公のドット絵（2頭身・16×16）', () => {
  it('体の絵6枚がすべて 16×16', () => {
    expect(HERO_FRAMES).toHaveLength(6);
    for (const f of HERO_FRAMES) {
      expect(HERO_BASE[f]).toHaveLength(HERO_H);
      for (const r of HERO_BASE[f]) expect(r).toHaveLength(HERO_W);
    }
  });
  it('使っている色記号はすべてパレットにある', () => {
    for (const w of [null, ...Object.keys(WEAPONS)]) {
      for (const f of HERO_FRAMES) {
        for (const ch of composeHero(f, w).join('')) if (ch !== '.') expect(HERO_PALETTE[ch], `${f} ${w} ${ch}`).toBeDefined();
      }
    }
  });
  it('すべての武器に3方向の重ね絵があり、枠内に収まる', () => {
    for (const id of Object.keys(WEAPONS)) {
      const ov = WEAPON_OVERLAYS[id];
      expect(ov, id).toBeDefined();
      for (const d of ['down', 'up', 'side'] as const) {
        expect(ov[d].length).toBeGreaterThan(0);
        for (const [x, y] of ov[d]) {
          expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(HERO_W);
          expect(y).toBeGreaterThanOrEqual(0); expect(y).toBeLessThan(HERO_H);
        }
      }
    }
  });
  it('武器を持つと絵が変わり、武器ごとに違う', () => {
    const none = composeHero('side0', null).join('');
    const pick = composeHero('side0', 'w_pick').join('');
    const suc = composeHero('side0', 'w_suction').join('');
    expect(pick).not.toBe(none);
    expect(suc).not.toBe(none);
    expect(pick).not.toBe(suc);
  });
  it('合成しても元の体の絵は変わらない', () => {
    const before = HERO_BASE.down0.join('');
    composeHero('down0', 'w_pick');
    expect(HERO_BASE.down0.join('')).toBe(before);
  });
  it('テクスチャ名', () => {
    expect(heroTextureKey('up1', null)).toBe('hero_up1');
    expect(heroTextureKey('up1', 'w_pick')).toBe('hero_up1_w_pick');
  });
});
