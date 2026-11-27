import { describe, expect, it } from 'vitest';
import { buildMap, SPAWN_ZONES, T, TILE } from '../src/data/map';
import { ENEMIES } from '../src/data/gameData';
import { pickRespawnTile, respawnSeconds, RESPAWN_MIN_DIST, zoneCandidates } from '../src/systems/spawning';

const m = buildMap();
const isFloor = (t: number) => t === T.SKIN_FLOOR || t === T.BONE_FLOOR;
const blocked = new Set(m.cerumen.map((c) => `${c.tx},${c.ty}`));

describe('出現エリア（設計レビュー17 R2）', () => {
  it('すべての組がどこかの出現エリアに属し、行がエリアの範囲内', () => {
    for (const sp of m.spawns) {
      expect(sp.zone).toBeGreaterThanOrEqual(0);
      const z = SPAWN_ZONES[sp.zone];
      expect(sp.ty).toBeGreaterThanOrEqual(z.top);
      expect(sp.ty).toBeLessThanOrEqual(z.bottom);
    }
  });

  it('組の数は v0.1.4 と同じ22組、エリアごとの内訳は設計どおり', () => {
    expect(m.spawns.length).toBe(22);
    const count = (zoneId: string) => {
      const zi = SPAWN_ZONES.findIndex((z) => z.id === zoneId);
      const c: Record<string, number> = {};
      for (const sp of m.spawns.filter((s) => s.zone === zi)) c[sp.kind] = (c[sp.kind] ?? 0) + 1;
      return c;
    };
    expect(count('cart_outer')).toEqual({ hoteri: 2, hflu: 1 });
    expect(count('cart_inner')).toEqual({ hoteri: 1, pneumo: 1, hflu: 1 });
    expect(count('bony_near')).toEqual({ pneumo: 1, morax: 1, hoteri: 1, hflu: 1 });
    expect(count('bony_deep')).toEqual({ pneumo: 2, morax: 2, hoteri: 2, hflu: 2 });
    expect(count('gate_guard')).toEqual({ hoteri: 2, pneumo: 1, morax: 1 });
  });

  it('再出現までの時間 ＝ 基本時間 × ステージの倍率', () => {
    const zone = (id: string) => SPAWN_ZONES.find((z) => z.id === id)!;
    expect(respawnSeconds(ENEMIES.hflu.respawnSec, zone('cart_outer'))).toBeCloseTo(15);
    expect(respawnSeconds(ENEMIES.hoteri.respawnSec, zone('cart_inner'))).toBeCloseTo(20);
    expect(respawnSeconds(ENEMIES.pneumo.respawnSec, zone('bony_near'))).toBeCloseTo(22.5);
    expect(respawnSeconds(ENEMIES.morax.respawnSec, zone('bony_deep'))).toBeCloseTo(22.5);
    // 鼓膜の門の守りは敵の種類によらず基本60秒（骨部の倍率で54秒）
    expect(respawnSeconds(ENEMIES.hflu.respawnSec, zone('gate_guard'))).toBeCloseTo(54);
  });

  it('各エリアに再出現の候補があり、組の左右も床で耳垢の上ではない', () => {
    for (const z of SPAWN_ZONES) {
      const c = zoneCandidates(m.tiles, z, isFloor, blocked);
      expect(c.length).toBeGreaterThan(10);
      for (const { tx, ty } of c) {
        for (const x of [tx - 1, tx, tx + 1]) {
          expect(isFloor(m.tiles[ty][x])).toBe(true);
          expect(blocked.has(`${x},${ty}`)).toBe(false);
        }
      }
    }
  });

  it('再出現の位置は主人公から 64px 以上離れる。候補がなければ null', () => {
    const z = SPAWN_ZONES[0];
    const c = zoneCandidates(m.tiles, z, isFloor, blocked);
    const p = c[Math.floor(c.length / 2)];
    const px = p.tx * TILE + 8;
    const py = p.ty * TILE + 8;
    let seed = 1;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 200; i++) {
      const at = pickRespawnTile(c, px, py, TILE, rnd)!;
      expect(Math.hypot(at.tx * TILE + 8 - px, at.ty * TILE + 8 - py)).toBeGreaterThanOrEqual(RESPAWN_MIN_DIST);
    }
    expect(pickRespawnTile([{ tx: p.tx, ty: p.ty }], px, py, TILE, rnd)).toBeNull();
  });
});
