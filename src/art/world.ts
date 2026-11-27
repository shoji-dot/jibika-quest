// マップ全体の背景を1枚の絵として描く（設計レビュー15 W1・W2）
// 当たり判定は従来どおりタイル（map.ts）を使い、この絵は見た目だけ。起動時に1回だけ描く。
import { MAP_H, MAP_W, REGIONS, TILE, T, WALKABLE, type MapData } from '../data/map';
import { COLORS, bonyness, floorColorAt, hexToRgb, mix, wallColorAt, type RGB } from './worldColors';

/** 再現性のある乱数（毎回同じ模様にする） */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function regionId(row: number): string {
  return REGIONS.find((r) => row >= r.y0 && row <= r.y1)?.id ?? 'village';
}

const WHITE: RGB = [255, 255, 255];
const BLACK: RGB = [0, 0, 0];
const PORE: RGB = [120, 60, 60];
const HAIR_ROOT: RGB = [70, 40, 35];
const HAIR: RGB = [90, 55, 45];
const GLAND: RGB = [230, 190, 90];
const GLAND_DARK: RGB = [170, 120, 50];
const BONE_LINE: RGB = [150, 130, 100];
const LIP: RGB = [255, 230, 220];

export class WorldPainter {
  readonly w = MAP_W * TILE;
  readonly h = MAP_H * TILE;
  readonly data: Uint8ClampedArray<ArrayBuffer>;
  private r = rng(20261127);

  constructor(private map: MapData) {
    this.data = new Uint8ClampedArray(new ArrayBuffer(this.w * this.h * 4));
  }

  put(x: number, y: number, c: RGB, alpha = 1): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (Math.floor(y) * this.w + Math.floor(x)) * 4;
    if (alpha >= 1) {
      this.data[i] = c[0];
      this.data[i + 1] = c[1];
      this.data[i + 2] = c[2];
    } else {
      this.data[i] = this.data[i] + (c[0] - this.data[i]) * alpha;
      this.data[i + 1] = this.data[i + 1] + (c[1] - this.data[i + 1]) * alpha;
      this.data[i + 2] = this.data[i + 2] + (c[2] - this.data[i + 2]) * alpha;
    }
    this.data[i + 3] = 255;
  }

  rect(x0: number, y0: number, w: number, h: number, c: RGB): void {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.put(x, y, c);
  }

  walk(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < MAP_W && ty < MAP_H && WALKABLE.has(this.map.tiles[ty][tx]);
  }

  /** W1・W2：床と壁 */
  paintTerrain(): void {
    const t = this.map.tiles;
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = 0; tx < MAP_W; tx++) {
        const tile = t[ty][tx];
        const reg = regionId(ty);
        const x0 = tx * TILE;
        const y0 = ty * TILE;
        if (tile === T.VOID) {
          this.rect(x0, y0, TILE, TILE, COLORS.void);
        } else if (WALKABLE.has(tile)) {
          if (reg === 'village') this.paintVillageFloor(x0, y0, tile === T.FLOWER);
          else this.paintCanalFloor(x0, y0, ty, reg);
        } else if (tile === T.SKIN_WALL || tile === T.BONE_WALL) {
          this.paintWall(tx, ty, reg);
        }
        // 家・鼓膜などのタイルは透明のまま（下のタイル層がそのまま見える。個別に描く場合は別の処理で上書き）
      }
    }
  }

  private paintCanalFloor(x0: number, y0: number, row: number, reg: string): void {
    const base = floorColorAt(row);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const n = this.r();
        let c = base;
        if (n < 0.05) c = mix(base, PORE, 0.12); // 毛穴・細かい凹凸
        else if (n < 0.09) c = mix(base, WHITE, 0.18); // 湿ったつや
        this.put(x0 + x, y0 + y, c);
      }
    }
    // 軟骨部の床：根元のある毛（MED-EAC-05）。骨部に近づくほど少なくする
    if (bonyness(row) < 1 && this.r() < 0.35 * (1 - bonyness(row))) {
      const hx = x0 + 2 + Math.floor(this.r() * 12);
      const hy = y0 + 4 + Math.floor(this.r() * 10);
      this.put(hx, hy, HAIR_ROOT);
      const lean = this.r() < 0.5 ? 1 : 0;
      for (let i = 1; i < 6; i++) this.put(hx + (i >> 1) * lean, hy - i, HAIR);
    }
    // 骨部の床：薄い皮膚の下の淡い筋（演出）
    if ((reg === 'bony' || reg === 'gate') && this.r() < 0.12) {
      const sx = x0 + Math.floor(this.r() * 10);
      const sy = y0 + Math.floor(this.r() * 15);
      for (let i = 0; i < 6; i++) this.put(sx + i, sy + (i / 3) | 0, mix(base, [210, 120, 120], 0.35));
    }
  }

  private paintVillageFloor(x0: number, y0: number, flower: boolean): void {
    const base = COLORS.villageFloor;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        this.put(x0 + x, y0 + y, this.r() < 0.05 ? mix(base, [200, 140, 120], 0.12) : base);
      }
    }
    if (flower) {
      this.rect(x0 + 7, y0 + 8, 1, 5, hexToRgb('#5aa05a'));
      this.rect(x0 + 6, y0 + 6, 3, 1, WHITE);
      this.rect(x0 + 7, y0 + 5, 1, 3, WHITE);
      this.put(x0 + 7, y0 + 6, hexToRgb('#ffd24a'));
    }
  }

  private paintWall(tx: number, ty: number, reg: string): void {
    const x0 = tx * TILE;
    const y0 = ty * TILE;
    const base = reg === 'village' ? COLORS.villageWall : wallColorAt(ty);
    const bony = reg !== 'village' && bonyness(ty) > 0.5;
    const below = this.walk(tx, ty + 1);
    const above = this.walk(tx, ty - 1);
    const left = this.walk(tx - 1, ty);
    const right = this.walk(tx + 1, ty);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        let c = base;
        // 骨部：骨の層のすじ（硬さの表現。演出）
        if (bony && (y + ((x / 5) | 0)) % 6 === 0) c = mix(base, BONE_LINE, 0.25);
        if (this.r() < 0.08) c = mix(c, BLACK, 0.15);
        // 床に面した側を明るく（壁の縁＝立体感）
        if (below && y >= TILE - 3) c = mix(base, LIP, 0.35 - (TILE - 1 - y) * 0.08);
        if ((left && x < 2) || (right && x >= TILE - 2)) c = mix(c, LIP, 0.18);
        if (above && y < 2) c = mix(c, BLACK, 0.25);
        this.put(x0 + x, y0 + y, c);
      }
    }
    // 軟骨部の壁：耳垢腺の出口（MED-EAC-06）と壁から生える毛（MED-EAC-05）
    if (reg === 'cart' || (reg === 'isthmus' && bonyness(ty) < 0.5)) {
      if ((left || right || below) && this.r() < 0.45) {
        const gx = x0 + (left ? TILE - 4 : right ? 3 : 3 + Math.floor(this.r() * 10));
        const gy = y0 + 4 + Math.floor(this.r() * 8);
        this.put(gx, gy, GLAND);
        this.put(gx + 1, gy, mix(GLAND, GLAND_DARK, 0.5));
        this.put(gx, gy + 1, GLAND_DARK);
      }
      if ((left || right) && this.r() < 0.35) {
        const hx = x0 + (left ? 1 : TILE - 2);
        const hy = y0 + 3 + Math.floor(this.r() * 10);
        const dx = left ? -1 : 1;
        for (let i = 0; i < 5; i++) this.put(hx + dx * i, hy - (i >> 1), [80, 50, 40]);
      }
    }
  }

  /**
   * W3：鼓膜（右耳を外耳道から見た向き。右＝前、上＝上）。台帳 MED-TM-03（S29〜S32）
   * 外耳道に対して斜めに張っているため、上下につぶれた楕円として描く（大きさは演出）。
   * 描く目印：線維輪（白っぽい縁）、ツチ骨柄（臍部から上前方へ）、外側突起、その上の弛緩部、
   * 臍部から前下方へ広がる光錐、透けて見えるキヌタ骨（後上方）。
   */
  paintEardrum(centerTx: number): void {
    const cx = centerTx * TILE + 8;
    const cy = 16;
    const rx = 5.5 * TILE;
    const ry = 15;
    const membrane: RGB = hexToRgb('#c9c3cc');
    const annulus: RGB = hexToRgb('#ebe6ee');
    const flaccida: RGB = hexToRgb('#d9b9c2');
    const umbo = { x: cx - 2, y: cy + 3 };
    const lateral = { x: cx + 9, y: cy - ry + 4 };
    // 鼓膜のタイルの下地：まわりの骨（楕円の外側に古いタイルが見えないようにする）
    for (let tx = 0; tx < MAP_W; tx++) if (this.map.tiles[1][tx] === T.TM) this.paintWall(tx, 1, 'gate');
    for (let y = 0; y < 2 * TILE; y++) {
      for (let x = Math.floor(cx - rx - 2); x <= cx + rx + 2; x++) {
        const e = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (e > 1) continue;
        let c = e > 0.86 ? annulus : membrane;
        // 弛緩部：外側突起より上の小さな部分（やや赤みを帯びた色で区別）
        if (y < lateral.y - 1 && Math.abs(x - lateral.x) < 14 && e <= 0.86) c = flaccida;
        if (this.r() < 0.06 && e <= 0.86) c = mix(c, WHITE, 0.15);
        this.put(x, y, c);
      }
    }
    // 透けて見えるキヌタ骨（後上方＝左上のかげ）
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) this.put(cx - 20 + i, cy - 7 + j, mix(membrane, [150, 140, 150], 0.3));
    // ツチ骨柄（臍部から上前方の外側突起へ）
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const x = umbo.x + ((lateral.x - umbo.x) * i) / steps;
      const y = umbo.y + ((lateral.y - umbo.y) * i) / steps;
      this.put(x, y, hexToRgb('#f4f0e2'));
      this.put(x + 1, y, hexToRgb('#bdb6a8'));
    }
    // 外側突起（小さな白い出っ張り）
    this.rect(lateral.x - 1, lateral.y - 1, 3, 2, WHITE);
    // 臍部
    this.put(umbo.x, umbo.y, hexToRgb('#a8a0aa'));
    // 光錐：臍部から前下方（右下）へ三角形に広がる明るい反射
    for (let i = 1; i <= 26; i++) {
      const half = Math.floor(i / 7);
      const x = umbo.x + i;
      const y = umbo.y + Math.round(i * 0.42);
      for (let k = -half; k <= half; k++) {
        const e = ((x - cx) / rx) ** 2 + ((y + k - cy) / ry) ** 2;
        if (e < 0.86) this.put(x, y + k, mix(membrane, WHITE, 0.85 - i * 0.015));
      }
    }
  }

  /**
   * W4・W5：集落（耳甲介）。V は集落の先頭行（外耳道の入口の行）。
   * 外耳道の入口は耳甲介の最も前、耳珠は入口の前（台帳 MED-AUR-01）。ゲームでは右を前とする（鼓膜と同じ右耳の向き）。
   */
  paintVillage(V: number): void {
    const t = this.map.tiles;
    // 小道：集落の真ん中から外耳道の入口へ
    for (let y = (V + 1) * TILE; y < (V + 13) * TILE; y++) {
      for (let x = 7 * TILE + 8; x < 13 * TILE - 8; x++) {
        const edge = x < 7 * TILE + 12 || x >= 13 * TILE - 12;
        if (!WALKABLE.has(t[(y / TILE) | 0][(x / TILE) | 0])) continue;
        const n = this.r();
        let c = mix(COLORS.villageFloor, [200, 140, 120], edge ? 0.12 : 0.2);
        if (n < 0.06) c = mix(c, [150, 100, 90], 0.3); // 小石
        else if (n < 0.1) c = mix(c, WHITE, 0.2);
        this.put(x, y, c);
      }
    }
    // 外耳孔の門の柱（入口の両側の壁の上）
    const post = (tx: number) => {
      const x0 = tx * TILE + 3;
      for (let y = V * TILE - 6; y < (V + 1) * TILE; y++) {
        for (let x = x0; x < x0 + 10; x++) {
          const c = x === x0 || x === x0 + 9 ? hexToRgb('#6a2a36') : mix(hexToRgb('#b4606c'), WHITE, x < x0 + 4 ? 0.15 : 0);
          this.put(x, y, c);
        }
      }
    };
    post(5);
    post(15);
    // 耳珠の丘：入口の前（右側）の壁の上に、軟骨の盛り上がり
    const hx = 17.5 * TILE;
    const hy = (V - 0.5) * TILE;
    for (let y = hy - 30; y < hy + 22; y++) {
      for (let x = hx - 40; x < hx + 40; x++) {
        const e = ((x - hx) / 38) ** 2 + ((y - hy) / 24) ** 2;
        if (e >= 1 || x >= MAP_W * TILE) continue;
        const ty = (y / TILE) | 0;
        const tx = (x / TILE) | 0;
        if (ty >= 0 && ty < MAP_H && WALKABLE.has(t[ty][tx])) continue; // 通れる床の上には描かない
        const light = Math.max(0, 1 - e) * (y < hy ? 1 : 0.6);
        this.put(x, y, mix(hexToRgb('#a85060'), hexToRgb('#f0b4ac'), light * 0.9));
      }
    }
    // 家（タイルの位置に描き直す）：診療所と器械室
    this.house(2, 7, V + 3, '#3a8a8a', 'clinic');
    this.house(12, 16, V + 3, '#7a5aa8', 'tools');
    // 道しるべ（入口の左手前）
    const sx = 7 * TILE + 2;
    const sy = (V + 1) * TILE + 2;
    this.rect(sx + 6, sy + 6, 2, 10, hexToRgb('#6a4a2a'));
    this.rect(sx, sy, 14, 7, hexToRgb('#b07a50'));
    this.rect(sx + 1, sy + 1, 12, 1, hexToRgb('#d8a878'));
    this.rect(sx + 9, sy + 3, 3, 1, hexToRgb('#4a2a1a')); // 矢印（奥＝上へ）
    this.put(sx + 10, sy + 2, hexToRgb('#4a2a1a'));
  }

  /** 家：屋根1行＋壁2行（タイル x0〜x1、屋根の行 roofRow） */
  private house(x0t: number, x1t: number, roofRow: number, roof: string, kind: 'clinic' | 'tools'): void {
    const x0 = x0t * TILE;
    const x1 = (x1t + 1) * TILE;
    const y0 = roofRow * TILE;
    const roofC = hexToRgb(roof);
    for (let y = y0; y < y0 + TILE; y++) {
      for (let x = x0; x < x1; x++) {
        let c = (y - y0) % 4 === 3 ? mix(roofC, BLACK, 0.25) : roofC;
        if (y === y0) c = mix(roofC, WHITE, 0.3);
        if (((x - x0 + ((y - y0) >> 2) * 3) % 8) === 0) c = mix(c, BLACK, 0.15);
        this.put(x, y, c);
      }
    }
    for (let y = y0 + TILE; y < y0 + 3 * TILE; y++) {
      for (let x = x0; x < x1; x++) {
        let c = hexToRgb('#f3efe6');
        if ((y - y0) % 6 === 0) c = hexToRgb('#d8d2c6');
        if (x === x0 || x === x1 - 1) c = hexToRgb('#c8c0b2');
        this.put(x, y, c);
      }
    }
    // 窓
    for (let wx = x0 + 6; wx < x1 - 10; wx += 22) {
      this.rect(wx, y0 + TILE + 5, 9, 8, hexToRgb('#5a4a3a'));
      this.rect(wx + 1, y0 + TILE + 6, 7, 3, hexToRgb('#8fd0ee'));
      this.rect(wx + 1, y0 + TILE + 9, 7, 3, hexToRgb('#5a9ec0'));
      this.rect(wx + 4, y0 + TILE + 6, 1, 6, hexToRgb('#5a4a3a'));
    }
    // 扉（タイルの扉の位置）
    const doorTx = kind === 'clinic' ? 4 : 14;
    this.rect(doorTx * TILE + 3, y0 + 2 * TILE + 1, 10, 15, hexToRgb('#7a4a2a'));
    this.rect(doorTx * TILE + 4, y0 + 2 * TILE + 2, 8, 1, hexToRgb('#9a6a4a'));
    this.put(doorTx * TILE + 10, y0 + 2 * TILE + 9, hexToRgb('#ffd24a'));
    // 看板（屋根の上）：診療所＝額帯鏡の印、器械室＝細い針の印
    const cx = (x0 + x1) / 2;
    this.rect(cx - 9, y0 + 3, 18, 9, hexToRgb('#2a1a2a'));
    this.rect(cx - 8, y0 + 4, 16, 7, kind === 'clinic' ? hexToRgb('#f4f4f0') : hexToRgb('#ffcf3a'));
    if (kind === 'clinic') {
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 5) this.put(cx + x, y0 + 7 + y, hexToRgb('#8aa0c0'));
      this.put(cx, y0 + 7, hexToRgb('#2a1a2a'));
    } else {
      for (let i = 0; i < 9; i++) this.put(cx - 4 + i, y0 + 9 - (i >> 2), hexToRgb('#4a4a58'));
    }
  }

  toCanvas(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const ctx = c.getContext('2d')!;
    ctx.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return c;
  }
}
