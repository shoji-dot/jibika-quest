import { describe, it, expect } from 'vitest';
import {
  addExp, allocate, derive, emptyStats, expToNext, resetAllocation, LEVEL_CAP, type ProgressState,
} from '../src/systems/progression';
import { calcDamage, contactDamage, nearestInRange } from '../src/systems/combat';
import { stickVector, knobOffset } from '../src/systems/input';
import {
  createNewSave, decodeSaveCode, encodeSaveCode, migrate, normalizeName, validateSave, DEFAULT_NAME, SCHEMA_VERSION,
} from '../src/systems/save';

const fresh = (): ProgressState => ({ level: 1, exp: 0, statPoints: 0, stats: emptyStats() });

describe('成長：経験値曲線', () => {
  it('floor(10×L^1.6) の値', () => {
    expect(expToNext(1)).toBe(10);
    expect(expToNext(2)).toBe(30);
    expect(expToNext(3)).toBe(57);
    expect(expToNext(4)).toBe(91);
  });
  it('上限レベルでは無限大', () => {
    expect(expToNext(LEVEL_CAP)).toBe(Infinity);
  });
});

describe('成長：レベルアップ', () => {
  it('ちょうど必要量でレベルが上がり、ポイント3を得る', () => {
    const p = fresh();
    expect(addExp(p, 10)).toBe(1);
    expect(p).toMatchObject({ level: 2, exp: 0, statPoints: 3 });
  });
  it('一度に複数レベル上がり、余りが繰り越される', () => {
    const p = fresh();
    expect(addExp(p, 10 + 30 + 5)).toBe(2);
    expect(p).toMatchObject({ level: 3, exp: 5, statPoints: 6 });
  });
  it('上限を超えない・上限では経験値0', () => {
    const p = fresh();
    addExp(p, 1_000_000);
    expect(p.level).toBe(LEVEL_CAP);
    expect(p.exp).toBe(0);
    expect(addExp(p, 100)).toBe(0);
  });
  it('0以下は無視', () => {
    const p = fresh();
    expect(addExp(p, 0)).toBe(0);
    expect(addExp(p, -5)).toBe(0);
    expect(p.exp).toBe(0);
  });
});

describe('成長：ステータス配分', () => {
  it('ポイントがあれば配分でき、無ければ失敗', () => {
    const p = fresh();
    expect(allocate(p, 'str')).toBe(false);
    p.statPoints = 2;
    expect(allocate(p, 'str')).toBe(true);
    expect(allocate(p, 'vit')).toBe(true);
    expect(allocate(p, 'vit')).toBe(false);
    expect(p.stats).toMatchObject({ str: 1, vit: 1 });
  });
  it('振り直しで全ポイントが戻る', () => {
    const p = fresh();
    p.statPoints = 3;
    allocate(p, 'str'); allocate(p, 'str'); allocate(p, 'foc');
    resetAllocation(p);
    expect(p.statPoints).toBe(3);
    expect(p.stats).toEqual(emptyStats());
  });
  it('派生能力値', () => {
    const d = derive(3, { vit: 2, str: 1, def: 2, agi: 1, foc: 30 });
    expect(d.maxHp).toBe(30 + 8 + 10);
    expect(d.atk).toBe(4 + 3 + 2);
    expect(d.def).toBe(3);
    expect(d.speed).toBe(67);
    expect(d.crit).toBe(0.5); // 上限
  });
});

describe('戦闘', () => {
  const fixed = (...vals: number[]) => { let i = 0; return () => vals[i++ % vals.length]; };
  it('ばらつき中央・非クリティカル', () => {
    const r = calcDamage({ atk: 10, weaponMult: 1, typeMult: 1, critRate: 0.1, targetDef: 0, rng: fixed(0.5, 0.9) });
    expect(r).toEqual({ amount: 10, crit: false });
  });
  it('クリティカルは1.8倍', () => {
    const r = calcDamage({ atk: 10, weaponMult: 1, typeMult: 1, critRate: 0.5, targetDef: 0, rng: fixed(0.5, 0.1) });
    expect(r).toEqual({ amount: 18, crit: true });
  });
  it('相性・防御が反映され、最低1', () => {
    const r = calcDamage({ atk: 10, weaponMult: 0.7, typeMult: 1.5, critRate: 0, targetDef: 0, rng: fixed(0.5) });
    expect(r.amount).toBe(11); // 10.5 → 四捨五入
    const r2 = calcDamage({ atk: 1, weaponMult: 1, typeMult: 1, critRate: 0, targetDef: 99, rng: fixed(0.5) });
    expect(r2.amount).toBe(1);
  });
  it('接触ダメージ', () => {
    expect(contactDamage(4, 0)).toBe(4);
    expect(contactDamage(4, 3)).toBe(3); // 4 - 1.5 = 2.5 → 3
    expect(contactDamage(1, 10)).toBe(1);
  });
  it('射程内で最も近い対象', () => {
    const ts = [{ x: 30, y: 0, id: 'a' }, { x: 10, y: 10, id: 'b' }, { x: 100, y: 0, id: 'c' }];
    expect(nearestInRange(0, 0, 40, ts)?.id).toBe('b');
    expect(nearestInRange(0, 0, 5, ts)).toBeNull();
  });
});

describe('仮想スティック', () => {
  it('デッドゾーン内は0', () => {
    expect(stickVector(0, 0, 3, 0, 50)).toEqual({ x: 0, y: 0, mag: 0 });
  });
  it('半径を超えると大きさ1', () => {
    const v = stickVector(0, 0, 0, 200, 50);
    expect(v.mag).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(1);
  });
  it('つまみは半径内に制限', () => {
    expect(knobOffset(0, 0, 30, 40, 25)).toEqual({ x: 15, y: 20 });
    expect(knobOffset(0, 0, 3, 4, 25)).toEqual({ x: 3, y: 4 });
  });
});

describe('セーブ', () => {
  const now = new Date('2026-11-23T00:00:00Z');
  it('名前の正規化（8文字・空白・空欄）', () => {
    expect(normalizeName('  みみ太郎  ')).toBe('みみ太郎');
    expect(normalizeName('あいうえおかきくけこ')).toBe('あいうえおかきく');
    expect(normalizeName('   ')).toBe(DEFAULT_NAME);
    expect(normalizeName('🦻👂🦻👂🦻👂🦻👂🦻')).toHaveLength(16); // サロゲートペアを1文字と数える
  });
  it('新規セーブはシリーズ共通と耳アプリ固有に分かれる', () => {
    const s = createNewSave('テスト', 'id-1', now);
    expect(s.schemaVersion).toBe(SCHEMA_VERSION);
    expect(s.series.name).toBe('テスト');
    expect(s.apps.ear.level).toBe(1);
    expect(validateSave(s)).toBeNull();
  });
  it('セーブコードの往復で一致する（日本語名を含む）', () => {
    const s = createNewSave('鼓膜まもる', 'id-2', now);
    s.apps.ear.level = 4;
    s.series.proficiency.anatomy = 3;
    const code = encodeSaveCode(s);
    expect(code.startsWith('JQ1.')).toBe(true);
    expect(decodeSaveCode(code)).toEqual(s);
  });
  it('改行や空白が混じっても読める', () => {
    const s = createNewSave('A', 'id', now);
    const code = encodeSaveCode(s);
    const broken = code.slice(0, 20) + '\n ' + code.slice(20);
    expect(decodeSaveCode(broken)).toEqual(s);
  });
  it('書き換え・欠損・形式違いを検出', () => {
    const code = encodeSaveCode(createNewSave('A', 'id', now));
    const [p, body, sum] = code.split('.');
    const tampered = `${p}.${body.slice(0, -2)}xx.${sum}`;
    expect(() => decodeSaveCode(tampered)).toThrow('書き換え');
    expect(() => decodeSaveCode(code.slice(0, code.length - 10))).toThrow();
    expect(() => decodeSaveCode('hello')).toThrow('形式');
  });
  it('欠けた任意項目は移行時に補われる', () => {
    const s = createNewSave('A', 'id', now) as unknown as { apps: { ear: Record<string, unknown> } };
    delete s.apps.ear.flags;
    delete s.apps.ear.settings;
    const m = migrate(s);
    expect(m.apps.ear.flags).toEqual({});
    expect(m.apps.ear.settings.controlMode).toBe('A');
  });
  it('新しすぎる版は拒否', () => {
    const s = createNewSave('A', 'id', now);
    s.schemaVersion = SCHEMA_VERSION + 1;
    expect(() => migrate(s)).toThrow('更新');
  });
  it('壊れたデータは拒否', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate({ schemaVersion: 1, series: { name: 'x' } })).toThrow('耳アプリ');
  });
});
