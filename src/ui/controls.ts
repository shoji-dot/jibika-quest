// タッチ操作：フローティング仮想スティックとボタン（DOM）
import { knobOffset, stickVector } from '../systems/input';
import { bus } from '../game/store';

const RADIUS = 44; // スティックが最大入力になる距離（CSS px）

export function initControls(): void {
  const zone = document.getElementById('stick-zone')!;
  const base = document.getElementById('stick-base')!;
  const knob = document.getElementById('stick-knob')!;
  const hint = document.getElementById('stick-hint')!;
  let pointerId: number | null = null;
  let ox = 0;
  let oy = 0;

  const centerBase = () => {
    base.style.left = '50%';
    base.style.top = '50%';
    knob.style.transform = '';
    base.style.opacity = '0.6';
  };
  centerBase();

  zone.addEventListener('pointerdown', (ev) => {
    if (pointerId !== null) return;
    ev.preventDefault();
    pointerId = ev.pointerId;
    zone.setPointerCapture(ev.pointerId);
    const r = zone.getBoundingClientRect();
    // 触れた場所がスティックの中心（端すぎる場合は少し内側へ）
    ox = Math.min(Math.max(ev.clientX, r.left + 40), r.right - 40);
    oy = Math.min(Math.max(ev.clientY, r.top + 40), r.bottom - 40);
    base.style.left = `${ox - r.left}px`;
    base.style.top = `${oy - r.top}px`;
    base.style.opacity = '1';
    hint.hidden = true;
    move(ev.clientX, ev.clientY);
  });
  const move = (x: number, y: number) => {
    const v = stickVector(ox, oy, x, y, RADIUS);
    const k = knobOffset(ox, oy, x, y, RADIUS);
    knob.style.transform = `translate(${k.x}px, ${k.y}px)`;
    bus.emit('input', { stickX: v.x, stickY: v.y });
  };
  zone.addEventListener('pointermove', (ev) => {
    if (ev.pointerId !== pointerId) return;
    ev.preventDefault();
    move(ev.clientX, ev.clientY);
  });
  const end = (ev: PointerEvent) => {
    if (ev.pointerId !== pointerId) return;
    pointerId = null;
    centerBase();
    bus.emit('input', { stickX: 0, stickY: 0 });
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);

  // ボタン：押した瞬間に反応（指を離すまで待たない）
  const press = (id: string, onDown: () => void, onUp?: () => void) => {
    const el = document.getElementById(id)!;
    el.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
      el.classList.add('pressed');
      el.setPointerCapture(ev.pointerId);
      onDown();
    });
    const up = () => {
      if (!el.classList.contains('pressed')) return;
      el.classList.remove('pressed');
      onUp?.();
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('lostpointercapture', up);
  };
  press('btn-attack', () => bus.emit('action', 'attack-down'), () => bus.emit('action', 'attack-up'));
  press('btn-special', () => bus.emit('action', 'special'));
  press('btn-swap', () => bus.emit('action', 'swap'));
  press('btn-item', () => bus.emit('action', 'item'));

  // iOS のピンチズーム・ダブルタップズームを止める
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
}
