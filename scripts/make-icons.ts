// アプリアイコン（PNG）をドット絵データから生成する
// 実行：npx tsx scripts/make-icons.ts
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SPRITES, expandRows } from '../src/art/sprites';

function crc32(buf: Buffer): number {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size: number, px: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = px(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const hex = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

const def = SPRITES.hero0;
const rows = expandRows(def);
const BG = hex('#1b1020');
const RING = hex('#f0a8a0');

function icon(size: number): Buffer {
  // 24×24 の格子：外周に耳介を思わせる淡いリング、中央に主人公
  const grid = 24;
  const cell = size / grid;
  return png(size, (x, y) => {
    const gx = Math.floor(x / cell);
    const gy = Math.floor(y / cell);
    const sx = gx - 4;
    const sy = gy - 4;
    if (sx >= 0 && sx < 16 && sy >= 0 && sy < 16) {
      const col = def.palette[rows[sy][sx]];
      if (col) return hex(col);
    }
    const d = Math.hypot(gx - 11.5, gy - 11.5);
    if (d > 10 && d < 11.2) return RING;
    return BG;
  });
}

writeFileSync('public/icon-192.png', icon(192));
writeFileSync('public/icon-512.png', icon(512));
writeFileSync('public/apple-touch-icon.png', icon(180));
writeFileSync('public/favicon.png', icon(48));
console.log('アイコンを生成しました');
