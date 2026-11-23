// HUD・トースト・会話ウィンドウ（DOM）
import { WEAPONS } from '../data/gameData';
import { expToNext, LEVEL_CAP } from '../systems/progression';
import { bus, derived, ear, itemCount, store } from '../game/store';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

export function initHud(): void {
  bus.on('hud', renderHud);
  bus.on('areaChanged', renderHud);
  bus.on('toast', ({ text, kind }) => toast(text, kind));
  bus.on('levelUp', ({ level }) => {
    toast(`レベル ${level} に上がった！ ステータスポイント +3（☰から配分）`, 'good');
    renderHud();
  });
  bus.on('dialog', (d) => showDialog(d.speaker, d.lines, d.onClose));
  bus.on('cooldown', ({ special, specialMax }) => {
    $('special-cd').style.height = specialMax > 0 ? `${(special / specialMax) * 100}%` : '0';
  });
}

export function renderHud(): void {
  if (!store.data) return;
  const e = ear();
  const d = derived();
  $('hud-name').textContent = store.data.series.name;
  $('hud-lv').textContent = `Lv${e.level}`;
  $('hud-hp').textContent = `${Math.ceil(e.hp)}/${d.maxHp}`;
  $('hud-hp-fill').style.width = `${Math.max(0, Math.min(100, (e.hp / d.maxHp) * 100))}%`;
  const need = expToNext(e.level);
  $('hud-exp-fill').style.width = e.level >= LEVEL_CAP ? '100%' : `${Math.min(100, (e.exp / need) * 100)}%`;
  $('hud-area').textContent = store.area.name;
  const w = WEAPONS[e.equipment.weapon];
  $('hud-weapon').textContent = w?.name ?? '';
  $('special-label').textContent = w?.special.name ?? '特殊';
  $('item-count').textContent = String(itemCount('i_onigiri'));
  $('hud-points').hidden = e.statPoints <= 0;
  const modeC = e.settings.controlMode === 'C';
  $('btn-attack').hidden = !modeC;
}

export function toast(text: string, kind: 'info' | 'good' | 'warn' = 'info'): void {
  const wrap = $('toasts');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  wrap.appendChild(el);
  while (wrap.children.length > 3) wrap.firstChild?.remove();
  setTimeout(() => el.remove(), 2900);
}

// ---- 会話 ----
let queue: { speaker: string; lines: string[]; onClose?: () => void }[] = [];
let current: { speaker: string; lines: string[]; onClose?: () => void; i: number } | null = null;

function showDialog(speaker: string, lines: string[], onClose?: () => void): void {
  queue.push({ speaker, lines, onClose });
  if (!current) next();
}

function next(): void {
  const box = $('dialog');
  if (current && current.i < current.lines.length - 1) {
    current.i++;
  } else {
    if (current) {
      const cb = current.onClose;
      current = null;
      cb?.();
    }
    const n = queue.shift();
    if (!n) {
      box.hidden = true;
      bus.emit('menuClose');
      return;
    }
    current = { ...n, i: 0 };
    if (box.hidden) bus.emit('menuOpen'); // 会話中はゲームを止める
    box.hidden = false;
  }
  $('dialog-speaker').textContent = current.speaker;
  $('dialog-text').textContent = current.lines[current.i];
}

export function initDialog(): void {
  const box = $('dialog');
  let downAt = 0;
  box.addEventListener('pointerdown', () => (downAt = performance.now()));
  box.addEventListener('pointerup', () => {
    if (performance.now() - downAt < 800) next();
  });
  // PC 用
  window.addEventListener('keydown', (ev) => {
    if (!box.hidden && (ev.key === 'Enter' || ev.key === ' ')) {
      ev.preventDefault();
      next();
    }
  });
  queue = [];
}
