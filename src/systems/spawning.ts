// 敵の出現エリアと再出現（設計レビュー17 R2）
// 再出現までの時間 ＝ 敵ごとの基本時間（エリアで上書き可）× ステージの倍率

/** 再出現の倍率を持つステージ（外耳道の軟骨部・骨部） */
export type SpawnStage = 'cart' | 'bony';

export const STAGE_RESPAWN_MUL: Record<SpawnStage, number> = {
  cart: 1.0,
  bony: 0.9, // 奥ほど病態の勢いが強い、という演出
};

/** 再出現の位置は主人公からこれ以上離す（px） */
export const RESPAWN_MIN_DIST = 64;

export interface SpawnZone {
  id: string;
  label: string;
  stage: SpawnStage;
  /** 出現する行の範囲（両端を含む） */
  top: number;
  bottom: number;
  /** 指定するとエリア内の敵の基本時間をこの値にする（鼓膜の門の守り） */
  baseSec?: number;
}

/** 再出現までの秒数 */
export function respawnSeconds(kindBaseSec: number, zone: SpawnZone): number {
  const base = zone.baseSec ?? kindBaseSec;
  return base * STAGE_RESPAWN_MUL[zone.stage];
}

/**
 * エリア内で敵の組を出せるタイル（中心）の一覧。
 * 組は左右に1タイルずつ広がるので、左右のタイルも床であること。
 */
export function zoneCandidates(
  tiles: number[][],
  zone: SpawnZone,
  isFloor: (t: number) => boolean,
  blocked: Set<string>,
): { tx: number; ty: number }[] {
  const out: { tx: number; ty: number }[] = [];
  for (let ty = zone.top; ty <= zone.bottom; ty++) {
    const row = tiles[ty];
    if (!row) continue;
    for (let tx = 1; tx < row.length - 1; tx++) {
      if (!isFloor(row[tx - 1]) || !isFloor(row[tx]) || !isFloor(row[tx + 1])) continue;
      if (blocked.has(`${tx - 1},${ty}`) || blocked.has(`${tx},${ty}`) || blocked.has(`${tx + 1},${ty}`)) continue;
      out.push({ tx, ty });
    }
  }
  return out;
}

/** 主人公から minDist 以上離れた候補を1つ選ぶ。なければ null（次のフレームで再挑戦） */
export function pickRespawnTile(
  cands: { tx: number; ty: number }[],
  px: number,
  py: number,
  tile: number,
  rnd: () => number,
  minDist = RESPAWN_MIN_DIST,
): { tx: number; ty: number } | null {
  const ok = cands.filter((c) => Math.hypot(c.tx * tile + tile / 2 - px, c.ty * tile + tile / 2 - py) >= minDist);
  if (ok.length === 0) return null;
  return ok[Math.floor(rnd() * ok.length) % ok.length];
}
