// 戦闘計算（純粋ロジック）

export type WeaponType = 'blade' | 'suction';

export interface DamageInput {
  atk: number; // 攻撃側の攻撃力
  weaponMult: number; // 武器倍率
  typeMult: number; // 相性倍率（敵ごと）
  critRate: number; // 0〜1
  targetDef: number;
  rng: () => number; // 0以上1未満
}

export interface DamageResult {
  amount: number;
  crit: boolean;
}

export const CRIT_MULT = 1.8;

/** 与ダメージ：攻撃×倍率×相性×(0.85〜1.15)、クリティカルで1.8倍、防御を引き最低1 */
export function calcDamage(i: DamageInput): DamageResult {
  const variance = 0.85 + i.rng() * 0.3;
  const crit = i.rng() < i.critRate;
  let dmg = i.atk * i.weaponMult * i.typeMult * variance;
  if (crit) dmg *= CRIT_MULT;
  dmg -= i.targetDef;
  return { amount: Math.max(1, Math.round(dmg)), crit };
}

/** 敵との接触ダメージ：敵攻撃 − 守り×0.5、最低1 */
export function contactDamage(enemyAtk: number, playerDef: number): number {
  return Math.max(1, Math.round(enemyAtk - playerDef * 0.5));
}

/** 最も近い対象を返す（射程外なら null） */
export function nearestInRange<T extends { x: number; y: number }>(
  ox: number,
  oy: number,
  range: number,
  targets: readonly T[],
): T | null {
  let best: T | null = null;
  let bestD = range * range;
  for (const t of targets) {
    const dx = t.x - ox;
    const dy = t.y - oy;
    const d = dx * dx + dy * dy;
    if (d <= bestD) {
      bestD = d;
      best = t;
    }
  }
  return best;
}

export const HIT_PER_FOCUS = 0.015; // 集中1ポイントあたりの命中補正
export const HIT_MIN = 0.5;
export const HIT_MAX = 1;

/**
 * 命中率 ＝ 100% − 敵の回避 ＋ 集中×1.5%（50〜100%）。
 * 必中の武器（吸引の杖）は常に100%。
 */
export function hitChance(focus: number, evade: number, sureHit: boolean): number {
  if (sureHit) return 1;
  const p = 1 - evade + Math.max(0, focus) * HIT_PER_FOCUS;
  return Math.min(HIT_MAX, Math.max(HIT_MIN, p));
}

/** 命中判定（rng は 0以上1未満） */
export function rollHit(chance: number, rng: () => number): boolean {
  return rng() < chance;
}
