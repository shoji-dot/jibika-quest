// 仮想スティックの数値処理（純粋ロジック）

export interface StickVector {
  x: number; // -1〜1
  y: number; // -1〜1
  mag: number; // 0〜1
}

/**
 * タッチ開始点(ox,oy)と現在点(x,y)からスティックの入力ベクトルを求める。
 * radius を超えた分は 1 に丸め、deadzone 未満は 0 とする。
 */
export function stickVector(
  ox: number,
  oy: number,
  x: number,
  y: number,
  radius: number,
  deadzone = 0.15,
): StickVector {
  const dx = x - ox;
  const dy = y - oy;
  const dist = Math.hypot(dx, dy);
  if (dist === 0 || radius <= 0) return { x: 0, y: 0, mag: 0 };
  const raw = Math.min(1, dist / radius);
  if (raw < deadzone) return { x: 0, y: 0, mag: 0 };
  // デッドゾーン外を 0〜1 に再マッピング
  const mag = (raw - deadzone) / (1 - deadzone);
  return { x: (dx / dist) * mag, y: (dy / dist) * mag, mag };
}

/** スティックのつまみの表示位置（radius 内に制限） */
export function knobOffset(ox: number, oy: number, x: number, y: number, radius: number): { x: number; y: number } {
  const dx = x - ox;
  const dy = y - oy;
  const dist = Math.hypot(dx, dy);
  if (dist <= radius) return { x: dx, y: dy };
  return { x: (dx / dist) * radius, y: (dy / dist) * radius };
}
