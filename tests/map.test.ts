import { describe, it, expect } from 'vitest';
import { buildMap, regionAtRow, REGIONS, WALKABLE, MAP_H, MAP_W, ISTHMUS_CERUMEN_ROWS, T } from '../src/data/map';

const m = buildMap();

/** 開始地点から鼓膜の前（行2〜7）に歩いて行けるか */
function reachGate(blocked: Set<string>): boolean {
  const q: [number, number][] = [[m.playerStart.tx, m.playerStart.ty]];
  const seen = new Set([`${m.playerStart.tx},${m.playerStart.ty}`]);
  while (q.length) {
    const [x, y] = q.shift()!;
    if (y <= 7) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      const k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H || seen.has(k) || blocked.has(k)) continue;
      if (!WALKABLE.has(m.tiles[ny][nx])) continue;
      seen.add(k);
      q.push([nx, ny]);
    }
  }
  return false;
}

describe('マップ', () => {
  it('部位の並びが解剖学の順（外側→内側）', () => {
    const order = [...REGIONS].sort((a, b) => b.y0 - a.y0).map((r) => r.id);
    expect(order).toEqual(['village', 'cart', 'isthmus', 'bony', 'gate']);
  });
  it('骨部は軟骨部より長い（外側1/3軟骨部・内側2/3骨部の比率を大まかに反映）', () => {
    const len = (id: string) => { const r = REGIONS.find((x) => x.id === id)!; return r.y1 - r.y0 + 1; };
    expect(len('bony')).toBeGreaterThan(len('cart'));
  });
  it('峡部が最も狭い', () => {
    const width = (row: number) => m.tiles[row].filter((t) => WALKABLE.has(t)).length;
    const isth = REGIONS.find((r) => r.id === 'isthmus')!;
    const minIsth = Math.min(...Array.from({ length: isth.y1 - isth.y0 + 1 }, (_, i) => width(isth.y0 + i)));
    for (let y = 8; y < 120; y++) {
      if (regionAtRow(y).id !== 'isthmus') expect(width(y)).toBeGreaterThan(minIsth);
    }
  });
  it('耳垢を取らないと鼓膜に行けず、取れば行ける', () => {
    const all = new Set(m.cerumen.map((c) => `${c.tx},${c.ty}`));
    expect(reachGate(all)).toBe(false);
    // 峡部の各列で1つずつ取り除けば通れる
    const keep = new Set(all);
    for (const row of ISTHMUS_CERUMEN_ROWS) {
      const c = m.cerumen.find((cc) => cc.ty === row)!;
      keep.delete(`${c.tx},${c.ty}`);
    }
    expect(reachGate(keep)).toBe(true);
  });
  it('敵・耳垢・人物は通行できる床の上にいる', () => {
    for (const p of [...m.spawns.map((s) => ({ tx: s.tx, ty: s.ty })), ...m.cerumen, m.playerStart, m.professor, m.saveDesk]) {
      expect(WALKABLE.has(m.tiles[p.ty][p.tx]), `${p.tx},${p.ty}`).toBe(true);
    }
  });
  it('鼓膜の行がある', () => {
    expect(m.tiles[1].includes(T.TM)).toBe(true);
  });
});
