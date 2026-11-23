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
