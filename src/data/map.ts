// A0 コンカの集落 ＋ A1 外耳道回廊（＋鼓膜の門の手前）のマップ生成
//
// 画面の「下＝外側、上＝内側（深部）」。企画書 04 に対応。
// 解剖学的な順序（台帳 MED-EAC-01〜04）：
//   集落（耳甲介）→ 軟骨部（外側1/3）→ 峡部（最狭部）→ 骨部（内側2/3）→ 鼓膜
// 長さの比率・S字の形は演出。スケールは実物と無関係。

import type { EnemyKind } from './gameData';

export const TILE = 16;
export const MAP_W = 20;
export const MAP_H = 140;
/** 外耳道の最も外側（集落の直前）の行 */
export const CANAL_BOTTOM = 119;

/** タイル番号（art.ts のタイルセットの並びと一致させる） */
export const T = {
  VOID: 0,
  SKIN_WALL: 1,
  BONE_WALL: 2,
  SKIN_FLOOR: 3,
  BONE_FLOOR: 4,
  HAIR: 5,
  VILLAGE_FLOOR: 6,
  HOUSE_WALL: 7,
  ROOF: 8,
  DOOR: 9,
  TM: 10,
  FLOWER: 11,
} as const;

/** 通行できるタイル */
export const WALKABLE: ReadonlySet<number> = new Set([T.SKIN_FLOOR, T.BONE_FLOOR, T.HAIR, T.VILLAGE_FLOOR, T.FLOWER]);

export interface Region {
  id: string;
  name: string;
  en: string;
  y0: number; // タイル行（含む）
  y1: number;
  canal: boolean; // 外耳道内（床が外向きに流れる：MED-EAC-04）
}

export const REGIONS: Region[] = [
  { id: 'gate', name: '鼓膜の門', en: 'Tympanic membrane', y0: 0, y1: 7, canal: true },
  { id: 'bony', name: '外耳道・骨部', en: 'Bony part', y0: 8, y1: 73, canal: true },
  { id: 'isthmus', name: '外耳道・峡部', en: 'Isthmus', y0: 74, y1: 79, canal: true },
  { id: 'cart', name: '外耳道・軟骨部', en: 'Cartilaginous part', y0: 80, y1: 119, canal: true },
  { id: 'village', name: 'コンカの集落', en: 'Concha village', y0: 120, y1: 139, canal: false },
];

export function regionAtRow(row: number): Region {
  return REGIONS.find((r) => row >= r.y0 && row <= r.y1) ?? REGIONS[REGIONS.length - 1];
}

/** 峡部を塞ぐ耳垢の行 */
export const ISTHMUS_CERUMEN_ROWS = [76, 78] as const;

export interface Spawn {
  kind: EnemyKind;
  tx: number;
  ty: number;
}

export interface MapData {
  tiles: number[][];
  spawns: Spawn[];
  cerumen: { tx: number; ty: number }[];
  playerStart: { tx: number; ty: number };
  saveDesk: { tx: number; ty: number };
  professor: { tx: number; ty: number };
}

/** 再現性のある乱数（マップを毎回同じにする） */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 外耳道の中心線（ゆるいS字） */
export function canalCenter(row: number): number {
  const t = (CANAL_BOTTOM - row) / (CANAL_BOTTOM - 2);
  return Math.round(10 + 4 * Math.sin(t * Math.PI * 2));
}

/** 外耳道の半幅（行ごと） */
export function canalHalfWidth(row: number): number {
  if (row >= 84) return 4; // 軟骨部
  if (row >= 80) return 3; // 峡部へ向かって細くなる
  if (row >= 74) return 1; // 峡部（最も狭い：MED-EAC-03）
  if (row >= 70) return 2;
  if (row >= 8) return 3; // 骨部
  return 5; // 鼓膜の手前の小部屋
}

export function buildMap(seed = 20261123): MapData {
  const rnd = mulberry32(seed);
  const tiles: number[][] = Array.from({ length: MAP_H }, () => Array<number>(MAP_W).fill(T.VOID));
  const floor = (x: number, y: number, t: number) => {
    if (x >= 0 && x < MAP_W && y >= 0 && y < MAP_H) tiles[y][x] = t;
  };

  // --- 外耳道（行2〜CANAL_BOTTOM）---
  for (let y = 2; y <= CANAL_BOTTOM; y++) {
    const cx = canalCenter(y);
    const hw = canalHalfWidth(y);
    const region = regionAtRow(y);
    for (let x = cx - hw; x <= cx + hw; x++) {
      let t: number = region.id === 'cart' ? T.SKIN_FLOOR : T.BONE_FLOOR;
      // 軟骨部には毛がある（MED-EAC-05）。通行可能な装飾
      if (region.id === 'cart' && rnd() < 0.15) t = T.HAIR;
      floor(x, y, t);
    }
  }

  // --- 鼓膜（行1）---
  {
    const cx = canalCenter(2);
    for (let x = cx - 5; x <= cx + 5; x++) floor(x, 1, T.TM);
  }

  // --- 集落（行120〜139）---
  const V = 120; // 集落の先頭行
  for (let x = 6; x <= 14; x++) floor(x, V, T.VILLAGE_FLOOR);
  for (let y = V + 1; y <= MAP_H - 2; y++) {
    for (let x = 1; x <= 18; x++) floor(x, y, rnd() < 0.06 ? T.FLOWER : T.VILLAGE_FLOOR);
  }
  // 診療所（屋根1行＋壁2行、扉つき）
  for (let x = 2; x <= 7; x++) {
    floor(x, V + 3, T.ROOF);
    floor(x, V + 4, T.HOUSE_WALL);
    floor(x, V + 5, T.HOUSE_WALL);
  }
  floor(4, V + 5, T.DOOR);
  // 器械室（v0.1 は外観のみ）
  for (let x = 12; x <= 16; x++) {
    floor(x, V + 3, T.ROOF);
    floor(x, V + 4, T.HOUSE_WALL);
    floor(x, V + 5, T.HOUSE_WALL);
  }
  floor(14, V + 5, T.DOOR);

  // --- 壁：床に隣接する空白を壁にする（外耳道の軟骨部・集落は皮膚、それ以外は骨）---
  const isFloorLike = (x: number, y: number) =>
    x >= 0 && x < MAP_W && y >= 0 && y < MAP_H && tiles[y][x] !== T.VOID;
  const walls: [number, number, number][] = [];
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      if (tiles[y][x] !== T.VOID) continue;
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1 && !near; dx++) {
          if ((dx || dy) && isFloorLike(x + dx, y + dy)) near = true;
        }
      }
      if (near) {
        const r = regionAtRow(y).id;
        walls.push([x, y, r === 'cart' || r === 'village' ? T.SKIN_WALL : T.BONE_WALL]);
      }
    }
  }
  for (const [x, y, t] of walls) tiles[y][x] = t;

  // --- 耳垢の塊：峡部を2列で塞ぐ（MED-EAC-03）＋軟骨部に少し ---
  // 峡部の2列はそれぞれ1つ以上取り除くと通れる（isthmusRows で判定）
  const cerumen: { tx: number; ty: number }[] = [];
  for (const y of ISTHMUS_CERUMEN_ROWS) {
    const cx = canalCenter(y);
    for (let x = cx - 1; x <= cx + 1; x++) cerumen.push({ tx: x, ty: y });
  }
  cerumen.push({ tx: canalCenter(110) - 3, ty: 110 });
  cerumen.push({ tx: canalCenter(100) + 3, ty: 100 });

  // --- 敵の出現位置 ---
  const spawnAt = (kind: EnemyKind, row: number, dx?: number): Spawn => {
    const cx = canalCenter(row);
    const hw = Math.max(0, canalHalfWidth(row) - 1);
    const tx = dx !== undefined ? cx + dx : cx - hw + Math.floor(rnd() * (hw * 2 + 1));
    return { kind, tx, ty: row };
  };
  const spawns: Spawn[] = [
    // 軟骨部
    spawnAt('hoteri', 115), spawnAt('hflu', 108), spawnAt('hoteri', 104), spawnAt('pneumo', 97),
    spawnAt('hflu', 90), spawnAt('hoteri', 85),
    // 骨部
    spawnAt('pneumo', 68), spawnAt('morax', 62), spawnAt('hoteri', 57), spawnAt('hflu', 52),
    spawnAt('pneumo', 47), spawnAt('morax', 42), spawnAt('hoteri', 37), spawnAt('hflu', 31),
    spawnAt('pneumo', 26), spawnAt('morax', 20), spawnAt('hoteri', 15), spawnAt('hflu', 11),
    // 鼓膜の手前の守り
    spawnAt('hoteri', 5, -3), spawnAt('hoteri', 5, 3), spawnAt('pneumo', 3, 0), spawnAt('morax', 7, 0),
  ];

  return {
    tiles,
    spawns,
    cerumen,
    playerStart: { tx: 10, ty: 132 },
    saveDesk: { tx: 3, ty: 127 },
    professor: { tx: 6, ty: 127 },
  };
}
