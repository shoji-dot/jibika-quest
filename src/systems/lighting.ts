// 暗さと明かり（純粋ロジック）
// 外耳道の奥ほど外の光が届かず暗い、という「演出」。医学的事実として説明はしない。

/** [行（タイル単位）, 暗さ 0〜1]。行は上（内側）ほど小さい。間は直線で補間する */
export const DARKNESS_POINTS: readonly [number, number][] = [
  [0, 0.85], // 鼓膜の門
  [6, 0.85],
  [10, 0.8], // 骨部
  [71, 0.8],
  [75, 0.7], // 峡部
  [78, 0.7],
  [82, 0.55], // 軟骨部（入口側は外光が少し届く）
  [116, 0.55],
  [121, 0], // コンカの集落（屋外）
  [139, 0],
];

/** 行（小数可）に対する暗さ */
export function darknessAtRow(row: number): number {
  const pts = DARKNESS_POINTS;
  if (row <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [r1, d1] = pts[i];
    if (row <= r1) {
      const [r0, d0] = pts[i - 1];
      const t = (row - r0) / (r1 - r0);
      return d0 + (d1 - d0) * t;
    }
  }
  return pts[pts.length - 1][1];
}

export const BASE_LIGHT = 44; // 帽子のヘッドライト（ワールド座標 px）
export const FOCUS_LIGHT_PER_POINT = 2;
export const FOCUS_LIGHT_MAX = 20;

/** 明かりの半径 ＝ 基本 ＋ 集中の補正（上限あり）＋ 装備の補正 */
export function lightRadius(focus: number, equipBonus: number): number {
  const fromFocus = Math.min(FOCUS_LIGHT_MAX, Math.max(0, focus) * FOCUS_LIGHT_PER_POINT);
  return BASE_LIGHT + fromFocus + Math.max(0, equipBonus);
}

/** 装備中の防具・アクセサリーの「明るさ」の合計（定義が無いものは0） */
export function equipmentLight(
  equipment: { armor: string | null; acc1: string | null; acc2: string | null },
  lightOf: (id: string) => number | undefined,
): number {
  let sum = 0;
  for (const id of [equipment.armor, equipment.acc1, equipment.acc2]) {
    if (id) sum += lightOf(id) ?? 0;
  }
  return sum;
}
