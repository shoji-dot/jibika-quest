// 背景の色（純粋ロジック）。設計レビュー15 W2：軟骨部→峡部→骨部で色が少しずつ変わる
// 色の変化そのものは演出。部位の順序は台帳 MED-EAC-01〜03 に基づく。

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.min(1, Math.max(0, t));
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k)) as RGB;
}

export const COLORS = {
  cartFloor: hexToRgb('#eaa39a'),
  bonyFloor: hexToRgb('#f1ddd0'),
  cartWall: hexToRgb('#a24c58'),
  bonyWall: hexToRgb('#d9cdb2'),
  villageFloor: hexToRgb('#f3c7b2'),
  villageWall: hexToRgb('#b8606a'),
  void: hexToRgb('#120a14'),
};

/** 色が切り替わる区間（行）：この区間で軟骨部の色→骨部の色へ少しずつ変わる */
export const BLEND_TOP = 70; // 骨部側の端
export const BLEND_BOTTOM = 84; // 軟骨部側の端

/** 行に対する「骨部らしさ」0（軟骨部）〜1（骨部） */
export function bonyness(row: number): number {
  if (row >= BLEND_BOTTOM) return 0;
  if (row <= BLEND_TOP) return 1;
  return (BLEND_BOTTOM - row) / (BLEND_BOTTOM - BLEND_TOP);
}

export function floorColorAt(row: number): RGB {
  return mix(COLORS.cartFloor, COLORS.bonyFloor, bonyness(row));
}

export function wallColorAt(row: number): RGB {
  return mix(COLORS.cartWall, COLORS.bonyWall, bonyness(row));
}
