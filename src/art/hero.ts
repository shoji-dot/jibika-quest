// 主人公（案A 額帯鏡の勇者・16×24）のドット絵と、手に持つ武器の重ね絵
// 設計：docs/11_設計レビュー_v0.1.2（L1・L2・L4 承認済み）。すべて自作。
// 体の絵に武器の重ね絵を合成して使う。左向きは右向きを左右反転する。

export const HERO_W = 16;
export const HERO_H = 24;

export type HeroFrame = 'down0' | 'down1' | 'up0' | 'up1' | 'side0' | 'side1';
export const HERO_FRAMES: readonly HeroFrame[] = ['down0', 'down1', 'up0', 'up1', 'side0', 'side1'];

export const HERO_PALETTE: Record<string, string> = {
  'G': '#6a7688',
  'M': '#ffffff',
  'R': '#8a2030',
  'T': '#8a96a8',
  'Y': '#c8901a',
  'g': '#b8c2d0',
  'h': '#3b2a20',
  'k': '#2a1a2a',
  'm': '#c8d4e8',
  'n': '#6a4a2a',
  'p': '#2d3f73',
  'r': '#d04040',
  's': '#f2c6a0',
  't': '#dfe6f2',
  'w': '#f4f4f0',
  'y': '#ffcf3a'
};

/** 体の絵（'.' は透明） */
export const HERO_BASE: Record<HeroFrame, string[]> = {
  // 正面・立ち
  down0: [
    '................',
    '......kkkk......',
    '.....kmMMmk.....',
    '...kkmMkkMmkk...',
    '..khkmMMMMmkhk..',
    '..khhkkkkkkhhk..',
    '..khhhhhhhhhhk..',
    '..khsssssssshk..',
    '..kssskssksssk..',
    '..kssskssksssk..',
    '..kssssssssssk..',
    '...kssssssssk...',
    '.RrkkyyyyyykkrR.',
    'RrkwwwywwywwwkrR',
    'RkwwwwywwywwwwkR',
    'RkswwwywwywwwskR',
    'RkkYYYYYYYYYYkkR',
    'Rr.kwwwwwwwwk.rR',
    '.R.kwwkkkkwwk.R.',
    '...kppk..kppk...',
    '...kppk..kppk...',
    '...kppk..kppk...',
    '..kkkkk..kkkkk..',
    '................',
  ],
  // 正面・歩き
  down1: [
    '................',
    '......kkkk......',
    '.....kmMMmk.....',
    '...kkmMkkMmkk...',
    '..khkmMMMMmkhk..',
    '..khhkkkkkkhhk..',
    '..khhhhhhhhhhk..',
    '..khsssssssshk..',
    '..kssskssksssk..',
    '..kssskssksssk..',
    '..kssssssssssk..',
    '...kssssssssk...',
    '.RrkkyyyyyykkrR.',
    'RrkwwwywwywwwkrR',
    'RkwwwwywwywwwwkR',
    'RkswwwywwywwwskR',
    'RkkYYYYYYYYYYkkR',
    'Rr.kwwwwwwwwk.rR',
    '.R.kwwkkkkwwk.R.',
    '...kppk..kppk...',
    '...kppk..kppk...',
    '...kppk..kkkk...',
    '..kkkkk.........',
    '................',
  ],
  // 背中・立ち
  up0: [
    '................',
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '..kkkkkkkkkkkk..',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '...khhhhhhhhk...',
    '....kssssssk....',
    '.kRRyyyyyyyyRRk.',
    'kRrrrrrrrrrrrrRk',
    'kRrrrrRrrRrrrrRk',
    'ksrrrrRrrRrrrrsk',
    'kRrrrrRrrRrrrrRk',
    'kRrrrrrrrrrrrrRk',
    '.kRrrrrrrrrrrRk.',
    '..kRRRRRRRRRRk..',
    '...kppk..kppk...',
    '...kppk..kppk...',
    '..kkkkk..kkkkk..',
    '................',
  ],
  // 背中・歩き
  up1: [
    '................',
    '................',
    '.....kkkkkk.....',
    '....khhhhhhk....',
    '...khhhhhhhhk...',
    '..kkkkkkkkkkkk..',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '..khhhhhhhhhhk..',
    '...khhhhhhhhk...',
    '....kssssssk....',
    '.kRRyyyyyyyyRRk.',
    'kRrrrrrrrrrrrrRk',
    'kRrrrrRrrRrrrrRk',
    'ksrrrrRrrRrrrrsk',
    'kRrrrrRrrRrrrrRk',
    'kRrrrrrrrrrrrrRk',
    '.kRrrrrrrrrrrRk.',
    '..kRRRRRRRRRRk..',
    '...kppk..kppk...',
    '...kkkk..kppk...',
    '.........kkkkk..',
    '................',
  ],
  // 右向き・立ち
  side0: [
    '................',
    '................',
    '....kkkkkk......',
    '...khhhhhhkkk...',
    '..khhhhhhhkmMk..',
    '..khhhhhhhkMmk..',
    '..khhhhhsssk....',
    '..khhhhssksk....',
    '..khhhhsssssk...',
    '...khhhssssk....',
    '....khsssk......',
    '.....kssk.......',
    '..RRkyyyyyk.....',
    '.Rrrkwwwwywk....',
    'Rrrrkwwwwywk....',
    'Rrrrkwwswywk....',
    'RrrrkYYYYYYk....',
    '.Rrrkwwwwwwk....',
    '..RRkwwwkwwk....',
    '.....kppkpk.....',
    '.....kppkpk.....',
    '.....kppkpk.....',
    '....kkkkkkkk....',
    '................',
  ],
  // 右向き・歩き
  side1: [
    '................',
    '................',
    '....kkkkkk......',
    '...khhhhhhkkk...',
    '..khhhhhhhkmMk..',
    '..khhhhhhhkMmk..',
    '..khhhhhsssk....',
    '..khhhhssksk....',
    '..khhhhsssssk...',
    '...khhhssssk....',
    '....khsssk......',
    '.....kssk.......',
    '..RRkyyyyyk.....',
    '.Rrrkwwwwywk....',
    'Rrrrkwwwwywk....',
    'Rrrrkwwswywk....',
    'RrrrkYYYYYYk....',
    '.Rrrkwwwwwwk....',
    '..RRkwwwkwwk....',
    '.....kpkkpk.....',
    '....kpk..kpk....',
    '...kpk....kpk...',
    '..kkk......kkk..',
    '................',
  ],
};

type Dir = 'down' | 'up' | 'side';
/** 武器の重ね絵：[x, y, 色記号]。手の位置は 正面(2,15)・背中(14,15)・横(7,15) */
export const WEAPON_OVERLAYS: Record<string, Record<Dir, [number, number, string][]>> = {
  // 細針の刃：銀の細い針と柄
  w_pick: {
    down: [[0, 14, 'k'], [1, 6, 'T'], [1, 7, 't'], [1, 8, 't'], [1, 9, 't'], [1, 10, 't'], [1, 11, 't'], [1, 12, 't'], [1, 13, 't'], [1, 14, 'k'], [1, 15, 'n'], [1, 16, 'n'], [2, 14, 'k']],
    up: [[13, 14, 'k'], [14, 6, 'T'], [14, 7, 't'], [14, 8, 't'], [14, 9, 't'], [14, 10, 't'], [14, 11, 't'], [14, 12, 't'], [14, 13, 't'], [14, 14, 'k'], [14, 15, 'n'], [14, 16, 'n'], [15, 14, 'k']],
    side: [[8, 14, 'k'], [8, 15, 'n'], [8, 16, 'k'], [9, 15, 't'], [10, 15, 't'], [11, 15, 't'], [12, 15, 't'], [13, 15, 't'], [14, 15, 't'], [15, 15, 'T']],
  },
  // 吸引の杖：先端が曲がった管
  w_suction: {
    down: [[0, 13, 'G'], [1, 8, 'g'], [1, 9, 'g'], [1, 10, 'g'], [1, 11, 'g'], [1, 12, 'g'], [1, 13, 'g'], [1, 14, 'g'], [1, 15, 'g'], [1, 16, 'g'], [1, 17, 'G'], [2, 6, 'G'], [2, 7, 'g']],
    up: [[13, 6, 'G'], [13, 7, 'g'], [14, 8, 'g'], [14, 9, 'g'], [14, 10, 'g'], [14, 11, 'g'], [14, 12, 'g'], [14, 13, 'g'], [14, 14, 'g'], [14, 15, 'g'], [14, 16, 'g'], [14, 17, 'G'], [15, 13, 'G']],
    side: [[8, 15, 'g'], [9, 15, 'g'], [10, 14, 'G'], [10, 15, 'g'], [11, 15, 'g'], [12, 15, 'g'], [13, 15, 'g'], [14, 16, 'g'], [15, 17, 'G']],
  },
};

/** 体の絵に武器の重ね絵を合成した行データを返す（weaponId が null なら武器なし） */
export function composeHero(frame: HeroFrame, weaponId: string | null): string[] {
  const rows = HERO_BASE[frame].map((r) => [...r]);
  if (weaponId) {
    const dir = frame.slice(0, -1) as Dir;
    const ov = WEAPON_OVERLAYS[weaponId]?.[dir] ?? [];
    for (const [x, y, c] of ov) rows[y][x] = c;
  }
  return rows.map((r) => r.join(''));
}

/** テクスチャ名：武器なしは hero_<frame>、武器ありは hero_<frame>_<weaponId> */
export function heroTextureKey(frame: HeroFrame, weaponId: string | null): string {
  return weaponId ? `hero_${frame}_${weaponId}` : `hero_${frame}`;
}
