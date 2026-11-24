// 成長システム（経験値・レベル・ステータス配分）
// Phaser に依存しない純粋ロジック。数値はすべて仮（試遊で調整）。

export type StatKey = 'vit' | 'str' | 'def' | 'agi' | 'foc';

export const STAT_KEYS: readonly StatKey[] = ['vit', 'str', 'def', 'agi', 'foc'];

/** 基礎ステータスの表示名 */
export const STAT_LABELS: Record<StatKey, { name: string; desc: string }> = {
  vit: { name: '体力', desc: '最大HPが上がる' },
  str: { name: '筋力', desc: '攻撃力が上がる' },
  def: { name: '守り', desc: '受けるダメージが減る' },
  agi: { name: '身のこなし', desc: '移動が速くなる' },
  foc: { name: '集中', desc: 'クリティカル・命中・明かりが上がる' },
};

export type Stats = Record<StatKey, number>;

export const LEVEL_CAP = 10;
export const POINTS_PER_LEVEL = 3;

export interface ProgressState {
  level: number;
  exp: number;
  statPoints: number;
  stats: Stats;
}

export function emptyStats(): Stats {
  return { vit: 0, str: 0, def: 0, agi: 0, foc: 0 };
}

/** 次のレベルまでに必要な経験値：floor(10 × L^1.6) */
export function expToNext(level: number): number {
  if (level >= LEVEL_CAP) return Infinity;
  return Math.floor(10 * Math.pow(level, 1.6));
}

/**
 * 経験値を加算し、レベルアップを処理する。
 * @returns 上がったレベル数
 */
export function addExp(p: ProgressState, amount: number): number {
  if (amount <= 0 || p.level >= LEVEL_CAP) return 0;
  p.exp += Math.floor(amount);
  let gained = 0;
  while (p.level < LEVEL_CAP && p.exp >= expToNext(p.level)) {
    p.exp -= expToNext(p.level);
    p.level += 1;
    p.statPoints += POINTS_PER_LEVEL;
    gained += 1;
  }
  if (p.level >= LEVEL_CAP) p.exp = 0;
  return gained;
}

/** ステータスポイントを1つ配分する。ポイントが無ければ false */
export function allocate(p: ProgressState, key: StatKey): boolean {
  if (p.statPoints <= 0) return false;
  p.stats[key] += 1;
  p.statPoints -= 1;
  return true;
}

/** 配分をすべて戻す（アイテム「医局人事の辞令」用） */
export function resetAllocation(p: ProgressState): void {
  const total = STAT_KEYS.reduce((s, k) => s + p.stats[k], 0);
  p.stats = emptyStats();
  p.statPoints += total;
}

export interface Derived {
  maxHp: number;
  atk: number;
  def: number;
  speed: number; // px/秒
  crit: number; // 0〜1
  hitBonus: number; // 命中補正（0〜）。集中1ポイントで +1.5%
}

/** レベルとステータスから実際の能力値を計算する */
export function derive(level: number, s: Stats): Derived {
  return {
    maxHp: 30 + 4 * (level - 1) + 5 * s.vit,
    atk: 4 + level + 2 * s.str,
    def: 1.5 * s.def,
    speed: 64 + 3 * s.agi,
    crit: Math.min(0.5, 0.05 + 0.02 * s.foc),
    hitBonus: 0.015 * s.foc,
  };
}
