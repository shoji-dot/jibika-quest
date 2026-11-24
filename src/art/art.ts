// ドット絵・タイルをコードで描いて Phaser のテクスチャとして登録する
import type Phaser from 'phaser';
import { SPRITES, expandRows } from './sprites';
import { TILE } from '../data/map';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function drawSprite(ctx: CanvasRenderingContext2D, key: string, ox = 0, oy = 0): void {
  const def = SPRITES[key];
  expandRows(def).forEach((row, y) => {
    [...row].forEach((ch, x) => {
      const col = def.palette[ch];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    });
  });
}

/** 決まった乱数（タイルの模様を毎回同じにする） */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

type TilePainter = (ctx: CanvasRenderingContext2D, ox: number) => void;

function speckle(base: string, dots: string[], density: number, seed: number): TilePainter {
  return (ctx, ox) => {
    const r = rng(seed);
    ctx.fillStyle = base;
    ctx.fillRect(ox, 0, TILE, TILE);
    for (let i = 0; i < TILE * TILE * density; i++) {
      ctx.fillStyle = dots[Math.floor(r() * dots.length)];
      ctx.fillRect(ox + Math.floor(r() * TILE), Math.floor(r() * TILE), 1, 1);
    }
  };
}

// タイルセットの並び（map.ts の T と一致）
const TILE_PAINTERS: TilePainter[] = [
  // 0 VOID
  (ctx, ox) => { ctx.fillStyle = '#120a14'; ctx.fillRect(ox, 0, TILE, TILE); },
  // 1 皮膚の壁（軟骨部・耳介）
  (ctx, ox) => {
    speckle('#a8505a', ['#8e3f4a', '#b8646c'], 0.25, 11)(ctx, ox);
    ctx.fillStyle = '#c47078'; ctx.fillRect(ox, 0, TILE, 2);
  },
  // 2 骨の壁
  (ctx, ox) => {
    speckle('#d8ccb0', ['#c2b494', '#e6dcc4'], 0.25, 12)(ctx, ox);
    ctx.fillStyle = '#b8a888';
    ctx.fillRect(ox + 2, 5, 6, 1); ctx.fillRect(ox + 9, 11, 5, 1);
    ctx.fillStyle = '#efe6d2'; ctx.fillRect(ox, 0, TILE, 2);
  },
  // 3 皮膚の床（軟骨部）
  speckle('#f0a8a0', ['#e89890', '#f6b8b0'], 0.12, 13),
  // 4 骨部の床（薄い皮膚）
  speckle('#f3e2d0', ['#e8d0bc', '#f8ece0'], 0.10, 14),
  // 5 毛の生えた床
  (ctx, ox) => {
    speckle('#f0a8a0', ['#e89890'], 0.1, 15)(ctx, ox);
    ctx.fillStyle = '#5a3a30';
    for (const [x, y, h] of [[3, 4, 6], [7, 6, 7], [11, 3, 6], [5, 9, 5], [12, 9, 5]]) {
      for (let i = 0; i < h; i++) ctx.fillRect(ox + x + (i > h / 2 ? 1 : 0), y + i, 1, 1);
    }
  },
  // 6 集落の床（耳介の皮膚）
  speckle('#f4c8b4', ['#ecbaa4', '#f8d6c6'], 0.10, 16),
  // 7 家の壁
  (ctx, ox) => {
    ctx.fillStyle = '#f0ece4'; ctx.fillRect(ox, 0, TILE, TILE);
    ctx.fillStyle = '#c8c2b8';
    for (let y = 3; y < TILE; y += 5) ctx.fillRect(ox, y, TILE, 1);
    ctx.fillRect(ox + 7, 0, 1, 3); ctx.fillRect(ox + 3, 4, 1, 4); ctx.fillRect(ox + 11, 9, 1, 4);
  },
  // 8 屋根
  (ctx, ox) => {
    ctx.fillStyle = '#3a8a8a'; ctx.fillRect(ox, 0, TILE, TILE);
    ctx.fillStyle = '#2c6c6c';
    for (let y = 2; y < TILE; y += 4) ctx.fillRect(ox, y, TILE, 1);
    ctx.fillStyle = '#5aaaa8'; ctx.fillRect(ox, 0, TILE, 1);
  },
  // 9 扉
  (ctx, ox) => {
    TILE_PAINTERS[7](ctx, ox);
    ctx.fillStyle = '#7a4a2a'; ctx.fillRect(ox + 3, 2, 10, 14);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(ox + 10, 9, 2, 2);
  },
  // 10 鼓膜（真珠様の灰色。光錐を描く）
  (ctx, ox) => {
    speckle('#c8c8d8', ['#b8b8cc', '#d8d8e6'], 0.12, 17)(ctx, ox);
    ctx.fillStyle = '#f4f4ff';
    for (let i = 0; i < 6; i++) ctx.fillRect(ox + 8 + i, 9 + i > 15 ? 15 : 9 + Math.floor(i * 1.1), 2, 1);
    ctx.fillStyle = '#a0a0b8'; ctx.fillRect(ox, 15, TILE, 1);
  },
  // 11 花
  (ctx, ox) => {
    TILE_PAINTERS[6](ctx, ox);
    ctx.fillStyle = '#5aa05a'; ctx.fillRect(ox + 7, 8, 1, 5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 6, 6, 3, 1); ctx.fillRect(ox + 7, 5, 1, 3);
    ctx.fillStyle = '#ffd24a'; ctx.fillRect(ox + 7, 6, 1, 1);
  },
];

/** 小物（エフェクト等） */
function registerEffects(scene: Phaser.Scene): void {
  // 斬撃
  {
    const [c, ctx] = makeCanvas(16, 16);
    ctx.fillStyle = '#ffffff';
    for (let a = 0; a < 14; a++) {
      const t = (a / 13) * Math.PI * 0.9 + Math.PI * 1.05;
      ctx.fillRect(8 + Math.round(Math.cos(t) * 6), 8 + Math.round(Math.sin(t) * 6), 2, 2);
    }
    scene.textures.addCanvas('fx_slash', c);
  }
  // 吸引の渦
  {
    const [c, ctx] = makeCanvas(16, 16);
    ctx.fillStyle = '#9fe8ff';
    for (let a = 0; a < 24; a++) {
      const t = a * 0.5;
      const r = 1 + a * 0.28;
      ctx.fillRect(8 + Math.round(Math.cos(t) * r), 8 + Math.round(Math.sin(t) * r), 1, 1);
    }
    scene.textures.addCanvas('fx_suction', c);
  }
  // 消滅の煙
  {
    const [c, ctx] = makeCanvas(16, 16);
    ctx.fillStyle = '#ffffff';
    for (const [x, y, s] of [[4, 4, 3], [9, 3, 4], [3, 9, 4], [9, 9, 3], [7, 6, 3]]) ctx.fillRect(x, y, s, s);
    scene.textures.addCanvas('fx_puff', c);
  }
  // 上皮の小片（外向きに流れる床の表現）
  {
    const [c, ctx] = makeCanvas(3, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(0, 1, 3, 1); ctx.fillRect(1, 0, 1, 3);
    scene.textures.addCanvas('fx_flake', c);
  }
  // 腫れ（ホテリが残す床）
  {
    const [c, ctx] = makeCanvas(20, 20);
    const g = ctx.createRadialGradient(10, 10, 2, 10, 10, 10);
    g.addColorStop(0, 'rgba(230,60,40,0.55)');
    g.addColorStop(1, 'rgba(230,60,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 20, 20);
    scene.textures.addCanvas('fx_swell', c);
  }
  // 走りの煙（💨）：灰色の縁取り付きの白い雲3粒（明るい床でも見えるように）
  {
    const [c, ctx] = makeCanvas(12, 9);
    const puffs: [number, number, number][] = [[3, 5, 2], [6, 3, 3], [9, 5, 2]]; // 中心x, 中心y, 半径
    const disc = (cx: number, cy: number, r: number) => {
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + 1) ctx.fillRect(cx + x, cy + y, 1, 1);
    };
    ctx.fillStyle = '#8a7a8e';
    for (const [x, y, r] of puffs) disc(x, y, r + 1);
    ctx.fillStyle = '#ffffff';
    for (const [x, y, r] of puffs) disc(x, y, r);
    scene.textures.addCanvas('fx_dust', c);
  }
  // 影
  {
    const [c, ctx] = makeCanvas(12, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(2, 0, 8, 4); ctx.fillRect(0, 1, 12, 2);
    scene.textures.addCanvas('shadow', c);
  }
}

export function registerArt(scene: Phaser.Scene): void {
  for (const key of Object.keys(SPRITES)) {
    const [c, ctx] = makeCanvas(16, 16);
    drawSprite(ctx, key);
    scene.textures.addCanvas(key, c);
  }
  const [tc, tctx] = makeCanvas(TILE * TILE_PAINTERS.length, TILE);
  TILE_PAINTERS.forEach((paint, i) => paint(tctx, i * TILE));
  scene.textures.addCanvas('tiles', tc);
  registerEffects(scene);
}
