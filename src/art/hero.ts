// 主人公（案A 額帯鏡の勇者・2頭身・16×16）のドット絵と、手に持つ武器の重ね絵
// 設計：docs/13_設計レビュー_v0.1.3（M7 承認済み）。すべて自作。等身だけを参考にしたオリジナルのデザイン。
// 体の絵に武器の重ね絵を合成して使う。左向きは右向きを左右反転する。

export const HERO_W = 16;
export const HERO_H = 16;

export type HeroFrame = 'down0' | 'down1' | 'up0' | 'up1' | 'side0' | 'side1';
export const HERO_FRAMES: readonly HeroFrame[] = ['down0', 'down1', 'up0', 'up1', 'side0', 'side1'];

export const HERO_PALETTE: Record<string, string> = {
  G: '#6a7688',
  H: '#8a5030',
  M: '#ffffff',
  R: '#8a2030',
  S: '#d8a080',
  T: '#8a96a8',
  Y: '#c8901a',
  e: '#2a2a48',
  g: '#b8c2d0',
  h: '#5a3020',
  k: '#2a1a2a',
  m: '#c8d4e8',
  n: '#5a3a22',
  p: '#2d3f73',
  r: '#d04040',
  s: '#f2c6a0',
  t: '#dfe6f2',
  w: '#f4f4f0',
  y: '#ffcf3a',
};

/** 体の絵（'.' は透明） */
export const HERO_BASE: Record<HeroFrame, string[]> = {
  // 正面・立ち
  down0: [
    '.....k..k.k.....',
    '....kkhkkhkk....',
    '...khhhhhhhhk...',
    '..khhhkmMkhhhk..',
    '..kkkkkMmkkkkk..',
    '..kHssssssssHk..',
    '..khssessesshk..',
    '..khssessesshk..',
    '..khSssssssShk..',
    '...kksssssskk...',
    '...RwwwyywwwR...',
    '..RrwwwywwwwrR..',
    '..RrsYYYYYYsrR..',
    '...R.kpkkpk.R...',
    '.....kp..pk.....',
    '.....nn..nn.....',
  ],
  // 正面・歩き
  down1: [
    '.....k..k.k.....',
    '....kkhkkhkk....',
    '...khhhhhhhhk...',
    '..khhhkmMkhhhk..',
    '..kkkkkMmkkkkk..',
    '..kHssssssssHk..',
    '..khssessesshk..',
    '..khssessesshk..',
    '..khSssssssShk..',
    '...kksssssskk...',
    '...RwwwyywwwR...',
    '..RrwwwywwwwrR..',
    '..RrsYYYYYYsrR..',
    '...R.kpkkpk.R...',
    '.....kp..nn.....',
    '.....nn.........',
  ],
  // 背中・立ち
  up0: [
    '.....k..k.k.....',
    '....kkkkkkkk....',
    '...khhhhhhhhk...',
    '..khhhhhhhhhhk..',
    '..kkkkkkkkkkkk..',
    '..khhhhHhhhhhk..',
    '..khhHhhhhhhhk..',
    '..khhhhhhHhhhk..',
    '..khhhhhhhhhhk..',
    '...kkkkkkkkkk...',
    '..RryyyyyyyyrR..',
    '..RrrrrRRrrrrR..',
    '..srrrrRRrrrrs..',
    '...RRkpkkpkRR...',
    '.....kp..pk.....',
    '.....nn..nn.....',
  ],
  // 背中・歩き
  up1: [
    '.....k..k.k.....',
    '....kkkkkkkk....',
    '...khhhhhhhhk...',
    '..khhhhhhhhhhk..',
    '..kkkkkkkkkkkk..',
    '..khhhhHhhhhhk..',
    '..khhHhhhhhhhk..',
    '..khhhhhhHhhhk..',
    '..khhhhhhhhhhk..',
    '...kkkkkkkkkk...',
    '..RryyyyyyyyrR..',
    '..RrrrrRRrrrrR..',
    '..srrrrRRrrrrs..',
    '...RRkpkkpkRR...',
    '.....kp..nn.....',
    '.....nn.........',
  ],
  // 右向き・立ち
  side0: [
    '....k.k.k.......',
    '....kkkkkkk.....',
    '...khhhhhhhk....',
    '..khhhhhhhhhkk..',
    '..kkkkkkkkkkmM..',
    '..khhhhhsssskk..',
    '..khhhhssesss...',
    '..khhhhssessk...',
    '..khhhhsSsssk...',
    '...kkksssssk....',
    '....Rwwwwyw.....',
    '...rrwwwwww.....',
    '..RrrYYYYsY.....',
    '.RrR.kpkpk......',
    '......pkp.......',
    '.....nn.nn......',
  ],
  // 右向き・歩き
  side1: [
    '....k.k.k.......',
    '....kkkkkkk.....',
    '...khhhhhhhk....',
    '..khhhhhhhhhkk..',
    '..kkkkkkkkkkmM..',
    '..khhhhhsssskk..',
    '..khhhhssesss...',
    '..khhhhssessk...',
    '..khhhhsSsssk...',
    '...kkksssssk....',
    '....Rwwwwyw.....',
    '...rrwwwwww.....',
    '..RrrYYYYsY.....',
    '.RrR.pk.kp......',
    '....p.....p.....',
    '...nn.....nn....',
  ],
};

type Dir = 'down' | 'up' | 'side';
/** 武器の重ね絵：[x, y, 色記号]。手の位置は 正面(4,12)・背中(13,12)・横(9,12) */
export const WEAPON_OVERLAYS: Record<string, Record<Dir, [number, number, string][]>> = {
  // 細針の刃：銀の細い針と柄
  w_pick: {
    down: [[2, 11, 'k'], [3, 4, 'T'], [3, 5, 't'], [3, 6, 't'], [3, 7, 't'], [3, 8, 't'], [3, 9, 't'], [3, 10, 't'], [3, 11, 'k'], [3, 12, 'n'], [4, 11, 'k']],
    up: [[12, 11, 'k'], [13, 4, 'T'], [13, 5, 't'], [13, 6, 't'], [13, 7, 't'], [13, 8, 't'], [13, 9, 't'], [13, 10, 't'], [13, 11, 'k'], [13, 12, 'n'], [14, 11, 'k']],
    side: [[10, 11, 'k'], [10, 12, 'n'], [10, 13, 'k'], [11, 12, 't'], [12, 12, 't'], [13, 12, 't'], [14, 12, 't'], [15, 12, 't']],
  },
  // 吸引の杖：先端が曲がった管
  w_suction: {
    down: [[2, 10, 'G'], [3, 6, 'g'], [3, 7, 'g'], [3, 8, 'g'], [3, 9, 'g'], [3, 10, 'g'], [3, 11, 'g'], [3, 12, 'g'], [3, 13, 'g'], [4, 4, 'G'], [4, 5, 'g']],
    up: [[12, 4, 'G'], [12, 5, 'g'], [13, 6, 'g'], [13, 7, 'g'], [13, 8, 'g'], [13, 9, 'g'], [13, 10, 'g'], [13, 11, 'g'], [13, 12, 'g'], [13, 13, 'g'], [14, 10, 'G']],
    side: [[10, 12, 'g'], [11, 11, 'G'], [11, 12, 'g'], [12, 12, 'g'], [13, 12, 'g'], [14, 13, 'g'], [15, 14, 'G']],
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
