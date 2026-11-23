// ゲーム全体の状態と、画面（DOM）⇔ゲーム（Phaser）間のイベント
import { derive, type Derived, type ProgressState } from '../systems/progression';
import type { SaveData, EarAppData } from '../systems/save';

type Handler<T> = (payload: T) => void;

export interface Events {
  hud: void; // HP・EXP・エリア名などの再描画
  toast: { text: string; kind?: 'info' | 'good' | 'warn' };
  dialog: { speaker: string; lines: string[]; onClose?: () => void };
  levelUp: { level: number };
  areaChanged: { name: string; en: string };
  died: void;
  menuOpen: void;
  menuClose: void;
  input: { stickX: number; stickY: number };
  action: 'attack-down' | 'attack-up' | 'special' | 'swap' | 'item';
  cooldown: { special: number; specialMax: number };
  respawn: void;
  stateReplaced: void;
}

class Bus {
  private map = new Map<keyof Events, Set<Handler<never>>>();
  on<K extends keyof Events>(k: K, h: Handler<Events[K]>): () => void {
    if (!this.map.has(k)) this.map.set(k, new Set());
    this.map.get(k)!.add(h as Handler<never>);
    return () => this.map.get(k)!.delete(h as Handler<never>);
  }
  emit<K extends keyof Events>(k: K, ...payload: Events[K] extends void ? [] : [Events[K]]): void {
    this.map.get(k)?.forEach((h) => (h as Handler<Events[K]>)(payload[0] as Events[K]));
  }
}

export const bus = new Bus();

/** 現在のセーブデータ（ゲーム中はこれを直接書き換える） */
export const store: { data: SaveData | null; area: { name: string; en: string } } = {
  data: null,
  area: { name: '', en: '' },
};

export function ear(): EarAppData {
  if (!store.data) throw new Error('セーブデータが未読み込みです');
  return store.data.apps.ear;
}

export function progress(): ProgressState {
  return ear(); // EarAppData は ProgressState の項目を含む
}

export function derived(): Derived {
  const e = ear();
  return derive(e.level, e.stats);
}

export function itemCount(id: string): number {
  return ear().inventory.find((i) => i.id === id)?.n ?? 0;
}

export function addItem(id: string, n: number): void {
  const inv = ear().inventory;
  const it = inv.find((i) => i.id === id);
  if (it) it.n = Math.max(0, it.n + n);
  else if (n > 0) inv.push({ id, n });
}
