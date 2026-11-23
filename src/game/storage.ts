// 端末内保存（IndexedDB）。使えない環境では localStorage に退避する。
import { get, set } from 'idb-keyval';
import { migrate, type SaveData } from '../systems/save';

const KEY = 'jibika-quest:save:slot1';

export async function loadSave(): Promise<SaveData | null> {
  let raw: unknown = null;
  try {
    raw = await get(KEY);
  } catch {
    const s = localStorage.getItem(KEY);
    raw = s ? JSON.parse(s) : null;
  }
  if (!raw) return null;
  try {
    return migrate(raw);
  } catch (e) {
    console.warn('セーブデータを読み込めませんでした', e);
    return null;
  }
}

export async function writeSave(d: SaveData): Promise<void> {
  d.savedAt = new Date().toISOString();
  const copy = structuredClone(d);
  try {
    await set(KEY, copy);
  } catch {
    localStorage.setItem(KEY, JSON.stringify(copy));
  }
}

/** ブラウザに「消さないで」と頼む（iOS では効かない場合もある） */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) return await navigator.storage.persist();
  } catch {
    /* 無視 */
  }
  return false;
}

export function newPlayerId(): string {
  return crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
