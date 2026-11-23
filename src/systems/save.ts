// セーブデータの構造・移行・セーブコード（純粋ロジック）
// 保存先（IndexedDB）への読み書きは src/game/storage.ts が担当する。
//
// 構造の方針（企画書 02 §4-2）：
//   series … シリーズ共通（将来の鼻・喉アプリへ引き継ぐ部分）
//   apps.ear … 耳アプリ固有

import { emptyStats, type Stats } from './progression';

export const SCHEMA_VERSION = 1;
export const SAVE_CODE_PREFIX = 'JQ1';

export interface Proficiency {
  anatomy: number; // 解剖学
  disease: number; // 疾患理解
  diagnosis: number; // 診断技術
  surgery: number; // 手術技術
  instrument: number; // 器具操作
  judgement: number; // 判断力
}

export interface EarAppData {
  level: number;
  exp: number;
  statPoints: number;
  stats: Stats;
  hp: number;
  position: { map: string; x: number; y: number };
  equipment: { weapon: string; armor: string | null; acc1: string | null; acc2: string | null };
  ownedWeapons: string[];
  inventory: { id: string; n: number }[];
  skills: string[];
  areasVisited: string[];
  areasCleared: string[];
  quests: Record<string, string>;
  bestiary: string[];
  flags: Record<string, boolean>;
  settings: { controlMode: 'A' | 'C' };
  playTimeSec: number;
}

export interface SaveData {
  schemaVersion: number;
  savedAt: string;
  series: {
    playerId: string;
    name: string;
    titles: string[];
    proficiency: Proficiency;
  };
  apps: {
    ear: EarAppData;
    [app: string]: unknown;
  };
}

export const DEFAULT_NAME = 'ヒビキ';
export const NAME_MAX = 8;

/** 名前の正規化：前後の空白を除き、8文字まで。空ならデフォルト名 */
export function normalizeName(input: string): string {
  const t = input.replace(/[\u0000-\u001f]/g, '').trim();
  const chars = Array.from(t).slice(0, NAME_MAX);
  return chars.length > 0 ? chars.join('') : DEFAULT_NAME;
}

export function createNewSave(name: string, playerId: string, now: Date): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    savedAt: now.toISOString(),
    series: {
      playerId,
      name: normalizeName(name),
      titles: ['新人医師'],
      proficiency: { anatomy: 0, disease: 0, diagnosis: 0, surgery: 0, instrument: 0, judgement: 0 },
    },
    apps: {
      ear: {
        level: 1,
        exp: 0,
        statPoints: 0,
        stats: emptyStats(),
        hp: 30,
        position: { map: 'ear-a01', x: -1, y: -1 }, // -1 は初期位置
        equipment: { weapon: 'w_pick', armor: null, acc1: null, acc2: null },
        ownedWeapons: ['w_pick', 'w_suction'],
        inventory: [{ id: 'i_onigiri', n: 3 }],
        skills: [],
        areasVisited: [],
        areasCleared: [],
        quests: {},
        bestiary: [],
        flags: {},
        settings: { controlMode: 'A' },
        playTimeSec: 0,
      },
    },
  };
}

/** 最低限の形チェック。おかしければ理由を返す */
export function validateSave(d: unknown): string | null {
  if (typeof d !== 'object' || d === null) return 'データが空です';
  const s = d as Partial<SaveData>;
  if (typeof s.schemaVersion !== 'number') return 'バージョン情報がありません';
  if (!s.series || typeof s.series.name !== 'string') return 'キャラクター情報が壊れています';
  const ear = s.apps?.ear as Partial<EarAppData> | undefined;
  if (!ear || typeof ear.level !== 'number' || typeof ear.exp !== 'number') return '耳アプリのデータが壊れています';
  if (!ear.stats || !ear.equipment || !Array.isArray(ear.inventory)) return '耳アプリのデータが壊れています';
  return null;
}

/**
 * 旧バージョンのセーブを現行形式へ移行する。
 * 将来 schemaVersion を上げたらここに変換を追加する。
 * 現行より新しい版は読み込めない（アプリ更新を促す）。
 */
export function migrate(raw: unknown): SaveData {
  const err = validateSave(raw);
  if (err) throw new Error(err);
  const d = structuredClone(raw) as SaveData;
  if (d.schemaVersion > SCHEMA_VERSION) {
    throw new Error('新しい版のセーブデータです。ゲームを更新してください');
  }
  // v1 → 現行：欠けている任意項目を補う（前方互換）
  const ear = d.apps.ear;
  ear.ownedWeapons ??= ['w_pick', 'w_suction'];
  ear.areasVisited ??= [];
  ear.areasCleared ??= [];
  ear.quests ??= {};
  ear.bestiary ??= [];
  ear.flags ??= {};
  ear.skills ??= [];
  ear.settings ??= { controlMode: 'A' };
  ear.playTimeSec ??= 0;
  d.schemaVersion = SCHEMA_VERSION;
  return d;
}

// ---- セーブコード（機種変更・Safari⇔ホーム画面・将来の別アプリ引き継ぎ用） ----

/** FNV-1a 32bit（改ざん・コピー漏れ検出用。暗号的な安全性はない） */
export function fnv1a(text: string): string {
  let h = 0x811c9dc5;
  const bytes = new TextEncoder().encode(text);
  for (const b of bytes) {
    h ^= b;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64: string): string {
  const norm = b64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

/** セーブデータ → 「JQ1.<本体>.<チェックサム>」 */
export function encodeSaveCode(d: SaveData): string {
  const body = toBase64Url(JSON.stringify(d));
  return `${SAVE_CODE_PREFIX}.${body}.${fnv1a(body)}`;
}

/** セーブコード → セーブデータ（不正なら日本語メッセージで例外） */
export function decodeSaveCode(code: string): SaveData {
  const parts = code.replace(/\s+/g, '').split('.');
  if (parts.length !== 3 || parts[0] !== SAVE_CODE_PREFIX) {
    throw new Error('セーブコードの形式が正しくありません');
  }
  const [, body, sum] = parts;
  if (fnv1a(body) !== sum) {
    throw new Error('セーブコードが途中で欠けているか、書き換えられています');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fromBase64Url(body));
  } catch {
    throw new Error('セーブコードを読み取れませんでした');
  }
  return migrate(parsed);
}
