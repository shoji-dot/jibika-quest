// ゲーム演出データ（武器・敵・アイテム）
// 医学的な事実は data/medical.json に分けて管理し、ここでは medicalIds で参照するだけにする。
// 数値はすべて仮（試遊で調整）。

import type { WeaponType } from '../systems/combat';

export interface WeaponDef {
  id: string;
  name: string; // ゲーム名称
  type: WeaponType;
  range: number; // 攻撃射程（px）
  cooldown: number; // 通常攻撃の間隔（秒）
  mult: number; // 威力倍率
  gameEffect: string; // ゲーム効果の説明
  special: { name: string; cooldown: number; desc: string };
  motif: string; // 医学的背景（一般名）。詳細な医学的説明は v0.2 で台帳から表示
  medicalIds: string[];
}

export const WEAPONS: Record<string, WeaponDef> = {
  w_pick: {
    id: 'w_pick',
    name: '細針の刃',
    type: 'blade',
    range: 24,
    cooldown: 0.42,
    mult: 1.0,
    gameEffect: '近接・速攻。クリティカルが出やすい。耳垢は取れない',
    special: { name: '三連突き', cooldown: 5, desc: '目の前の敵を素早く3回突く' },
    motif: '耳科用の針（ピック）',
    medicalIds: [],
  },
  w_suction: {
    id: 'w_suction',
    name: '吸引の杖',
    type: 'suction',
    range: 56,
    cooldown: 0.6,
    mult: 0.7,
    gameEffect: '少し離れた敵を吸って攻撃。耳垢の塊を取り除ける',
    special: { name: '吸い寄せ', cooldown: 4, desc: '周囲の敵を引き寄せ、耳垢をまとめて吸う' },
    motif: '吸引管',
    medicalIds: [],
  },
};

export type EnemyKind = 'hoteri' | 'pneumo' | 'hflu' | 'morax';

export interface EnemyDef {
  kind: EnemyKind;
  name: string;
  motif: string;
  hp: number;
  atk: number;
  def: number;
  speed: number; // 追跡時 px/秒
  wander: number; // 徘徊時 px/秒
  sight: number; // 発見距離 px
  exp: number;
  group: number; // 何体1組で出るか
  weak: Partial<Record<WeaponType, number>>; // 相性倍率
  medicalIds: string[];
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  hoteri: {
    kind: 'hoteri', name: 'ホテリ', motif: '炎症',
    hp: 18, atk: 4, def: 0, speed: 28, wander: 14, sight: 70, exp: 6, group: 1,
    weak: { blade: 1.0, suction: 1.0 }, medicalIds: [],
  },
  pneumo: {
    kind: 'pneumo', name: 'ニューモ兄弟', motif: '肺炎球菌',
    hp: 15, atk: 5, def: 0, speed: 42, wander: 18, sight: 80, exp: 7, group: 2,
    weak: { blade: 1.2, suction: 0.8 }, medicalIds: ['MED-AOM-02'],
  },
  hflu: {
    kind: 'hflu', name: 'ヘモフィ', motif: 'インフルエンザ菌（無莢膜型）',
    hp: 9, atk: 3, def: 0, speed: 60, wander: 30, sight: 90, exp: 4, group: 3,
    weak: { blade: 0.9, suction: 1.5 }, medicalIds: ['MED-AOM-02'],
  },
  morax: {
    kind: 'morax', name: 'モラクセ姉妹', motif: 'モラクセラ・カタラーリス',
    hp: 20, atk: 4, def: 1, speed: 36, wander: 16, sight: 80, exp: 7, group: 2,
    weak: { blade: 1.2, suction: 0.9 }, medicalIds: ['MED-AOM-02'],
  },
};

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  heal?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  i_onigiri: { id: 'i_onigiri', name: '当直のおにぎり', desc: 'HPを30回復する。当直室の定番', heal: 30 },
};

/** 耳垢の塊（敵ではなく除去対象）。耳垢は本来、外耳道を守る生理的なもの */
export const CERUMEN = { hp: 6, suctionDamage: 2 };
