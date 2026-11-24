// ドット絵データ（すべて自作。外部素材は使わない）
// 16×16。左半分（8列）を書き、右半分は左右反転でつくる（mirror: true）。
// '.' は透明。文字ごとの色は palette で指定する。

export interface SpriteDef {
  palette: Record<string, string>;
  rows: string[];
  mirror?: boolean;
}

const OUTLINE = '#2a1a2a';

const heroPalette = {
  k: OUTLINE, w: '#f4f4f0', s: '#f2c6a0', h: '#3b2a20', l: '#ffe066', g: '#8a96a8', b: '#4a7bd0', p: '#2d3f73',
};

const heroTop = [
  '........',
  '....kkkk',
  '...kgggl',
  '..kggggg',
  '..khhhhh',
  '..khssss',
  '..ksssks',
  '..ksssss',
  '...kssss',
  '..kwwwbb',
  '.kwwwwwb',
  '.kswwwww',
  '..kwwwww',
  '..kwwwww',
];

// 背中（左半分）
const heroBack = [
  '........',
  '....kkkk',
  '...kgggg',
  '..kggggg',
  '..khhhhh',
  '..khhhhh',
  '..khhhhh',
  '..khhhhh',
  '...kssss',
  '..kwwwww',
  '.kwwwwww',
  '.kswwwww',
  '..kwwwww',
  '..kwwwww',
];

// 横向き（16列そのまま。右向き）
const heroSide = [
  '................',
  '.....kkkkkk.....',
  '....kggggggkk...',
  '...kgggggggll...',
  '...khhhhhhhk....',
  '...khhhhsssk....',
  '...khhhssks.....',
  '....khhsssss....',
  '.....kssssk.....',
  '....kwwwwbbk....',
  '...kwwwwwwbk....',
  '...kwwwswwwk....',
  '...kwwwwwwwk....',
  '....kwwwwwk.....',
];

export const SPRITES: Record<string, SpriteDef> = {
  // 主人公（医師見習い）：白衣、ヘッドライト付きの帽子
  hero0: { palette: heroPalette, mirror: true, rows: [...heroTop, '...kpk..', '...kk...'] },
  hero1: { palette: heroPalette, mirror: true, rows: ['........', ...heroTop.slice(0, 13), '...kpkk.', '....kk..'] },

  // 主人公・背中（上向き）
  hero_up0: { palette: heroPalette, mirror: true, rows: [...heroBack, '...kpk..', '...kk...'] },
  hero_up1: { palette: heroPalette, mirror: true, rows: ['........', ...heroBack.slice(0, 13), '...kpkk.', '....kk..'] },

  // 主人公・横向き（右向き。左は反転して使う）。ヘッドライトが前を向く
  hero_side0: { palette: heroPalette, rows: [...heroSide, '.....kpkpk......', '.....kk.kk......'] },
  hero_side1: { palette: heroPalette, rows: ['................', ...heroSide.slice(0, 13), '....kp...pk.....', '...kk.....kk....'] },

  // 教授：白髪・眼鏡・ネクタイ
  professor: {
    mirror: true,
    palette: { k: OUTLINE, w: '#f4f4f0', s: '#f2c6a0', g: '#d8d8e0', r: '#c03a3a', p: '#3a3a48' },
    rows: [
      '........',
      '....kkkk',
      '...kgggg',
      '..kggggg',
      '..kgssss',
      '..kskkks',
      '..ksssss',
      '..ksgggs',
      '...kssss',
      '..kwwwwr',
      '.kwwwwwr',
      '.kswwwww',
      '..kwwwww',
      '..kwwwww',
      '...kpk..',
      '...kk...',
    ],
  },

  // ホテリ（炎症）
  hoteri: {
    mirror: true,
    palette: { k: '#5a1a10', r: '#e0402a', o: '#ff8a2a', y: '#ffe066' },
    rows: [
      '........',
      '.......k',
      '......kr',
      '.....kro',
      '....kroo',
      '...kroyo',
      '...kroyy',
      '..kroyyy',
      '..krokyy',
      '..kroyyy',
      '..krooyy',
      '...krooo',
      '....krrr',
      '.....kkk',
      '........',
      '........',
    ],
  },

  // ニューモ（肺炎球菌モチーフ）：グラム陽性＝紫系。槍の穂先形
  pneumo: {
    mirror: true,
    palette: { k: '#2a1840', v: '#7a4cc8', V: '#a98be8' },
    rows: [
      '........',
      '........',
      '........',
      '.......k',
      '......kv',
      '.....kvV',
      '....kvVV',
      '....kvkV',
      '...kvvVV',
      '...kvvvv',
      '...kvvvv',
      '....kvvv',
      '.....kkk',
      '........',
      '........',
      '........',
    ],
  },

  // ヘモフィ（インフルエンザ菌モチーフ）：グラム陰性＝桃色系。小さな短い棒
  hflu: {
    mirror: true,
    palette: { k: '#5a1a2a', p: '#e86a8a', P: '#f6a6bb' },
    rows: [
      '........',
      '........',
      '........',
      '........',
      '........',
      '....kkkk',
      '...kpPPP',
      '..kpPkPP',
      '..kpppPP',
      '...kpppp',
      '....kkkk',
      '........',
      '........',
      '........',
      '........',
      '........',
    ],
  },

  // モラクセ（モラクセラ・カタラーリスモチーフ）：グラム陰性＝桃色系。豆形
  morax: {
    mirror: true,
    palette: { k: '#5a1a2a', m: '#d9607a', M: '#f19aae' },
    rows: [
      '........',
      '........',
      '........',
      '........',
      '....kkkk',
      '...kmMMM',
      '..kmMMMM',
      '..kmMkMM',
      '..kmmMMM',
      '..kmmmmm',
      '...kmmmm',
      '....kk..',
      '........',
      '........',
      '........',
      '........',
    ],
  },

  // 耳垢の塊（障害物）
  cerumen: {
    mirror: true,
    palette: { k: '#4a2a10', c: '#b07a2a', C: '#d8a24a', d: '#8a5a1a' },
    rows: [
      '........',
      '........',
      '.....kkk',
      '...kkCCC',
      '..kCCCCc',
      '.kCCcCCC',
      '.kCCCCcc',
      'kCcCCCcC',
      'kCCCccCC',
      'kcCCCCdc',
      'kccCCddc',
      '.kcdcccd',
      '.kdcccdd',
      '..kkdddd',
      '....kkkk',
      '........',
    ],
  },

  // 診療所の机（セーブ地点）
  desk: {
    mirror: true,
    palette: { k: OUTLINE, n: '#8a5a3a', N: '#b07a50', e: '#6ad0ff' },
    rows: [
      '........',
      '........',
      '........',
      '...kkkkk',
      '...keeee',
      '...keeee',
      '...kkkkk',
      '......kk',
      'kkkkkkkk',
      'kNNNNNNN',
      'knnnnnnn',
      'kk......',
      'kk......',
      'kk......',
      '........',
      '........',
    ],
  },

  // 当直のおにぎり（ドロップ品）
  onigiri: {
    mirror: true,
    palette: { k: OUTLINE, w: '#ffffff', n: '#1f3a2a' },
    rows: [
      '........',
      '........',
      '........',
      '.......k',
      '......kw',
      '.....kww',
      '....kwww',
      '...kwwww',
      '...kwwww',
      '..kwwwnn',
      '..kwwwnn',
      '..kkkknn',
      '........',
      '........',
      '........',
      '........',
    ],
  },
};

/** 左半分＋反転で16列の行を得る */
export function expandRows(def: SpriteDef): string[] {
  return def.rows.map((r) => (def.mirror ? r + [...r].reverse().join('') : r));
}
