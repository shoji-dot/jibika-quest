// メニュー（ステータス・装備・道具・セーブ・設定）
import { ITEMS, WEAPONS, gearLight } from '../data/gameData';
import { equipmentLight, lightRadius } from '../systems/lighting';
import { allocate, expToNext, LEVEL_CAP, STAT_KEYS, STAT_LABELS } from '../systems/progression';
import { decodeSaveCode, encodeSaveCode } from '../systems/save';
import { bus, derived, ear, store } from '../game/store';
import { writeSave } from '../game/storage';
import { toast } from './hud';

type Tab = 'status' | 'equip' | 'items' | 'save' | 'settings';
const TABS: [Tab, string][] = [
  ['status', 'ステータス'],
  ['equip', '装備'],
  ['items', '道具'],
  ['save', 'セーブ'],
  ['settings', '設定'],
];

let tab: Tab = 'status';
let saveFn: () => Promise<void> = async () => {};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function initMenu(save: () => Promise<void>): void {
  saveFn = save;
  document.getElementById('btn-menu')!.addEventListener('click', openMenu);
}

export function openMenu(): void {
  const el = document.getElementById('menu')!;
  el.hidden = false;
  bus.emit('menuOpen');
  render();
}

function closeMenu(): void {
  document.getElementById('menu')!.hidden = true;
  bus.emit('menuClose');
  bus.emit('hud');
}

function render(): void {
  const el = document.getElementById('menu')!;
  const tabs = TABS.map(([k, label]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}">${label}</button>`).join('');
  el.innerHTML = `
    <button class="close-x" data-close aria-label="閉じる">✕</button>
    <h2>メニュー</h2>
    <div class="tabs">${tabs}</div>
    <div id="menu-body">${body()}</div>`;
  el.querySelector('[data-close]')!.addEventListener('click', closeMenu);
  el.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => {
      tab = b.dataset.tab as Tab;
      render();
    }),
  );
  bind(el);
}

function body(): string {
  const e = ear();
  const d = derived();
  const s = store.data!.series;
  switch (tab) {
    case 'status': {
      const need = e.level >= LEVEL_CAP ? '—' : String(expToNext(e.level));
      const stats = STAT_KEYS.map(
        (k) => `<div class="stat"><span>${STAT_LABELS[k].name}</span><span class="note">${STAT_LABELS[k].desc}</span>
          <span class="v">${e.stats[k]}</span>
          <button class="mini" data-alloc="${k}" ${e.statPoints > 0 ? '' : 'disabled'}>＋</button></div>`,
      ).join('');
      const p = s.proficiency;
      const prof: [string, number][] = [
        ['解剖学', p.anatomy], ['疾患理解', p.disease], ['診断技術', p.diagnosis],
        ['手術技術', p.surgery], ['器具操作', p.instrument], ['判断力', p.judgement],
      ];
      return `
        <div class="card">
          <div class="row"><b style="font-size:18px">${esc(s.name)}</b><span class="spacer"></span><span>${esc(s.titles[0] ?? '')}</span></div>
          <div class="stat"><span>レベル</span><span class="v">${e.level}</span></div>
          <div class="stat"><span>経験値</span><span class="v">${e.exp} / ${need}</span></div>
          <div class="stat"><span>HP</span><span class="v">${Math.ceil(e.hp)} / ${d.maxHp}</span></div>
          <div class="stat"><span>攻撃力</span><span class="v">${d.atk}</span></div>
          <div class="stat"><span>守り</span><span class="v">${d.def}</span></div>
          <div class="stat"><span>移動の速さ</span><span class="v">${d.speed}</span></div>
          <div class="stat"><span>クリティカル率</span><span class="v">${Math.round(d.crit * 100)}%</span></div>
          <div class="stat"><span>命中補正</span><span class="v">+${(d.hitBonus * 100).toFixed(1)}%</span></div>
          <div class="stat"><span>明かりの広さ</span><span class="v">${lightRadius(e.stats.foc, equipmentLight(e.equipment, gearLight))}</span></div>
        </div>
        <h3>ステータス配分（残り ${e.statPoints} ポイント）</h3>
        <div class="card">${stats}</div>
        <h3>医学的習熟度</h3>
        <div class="card">${prof.map(([n, v]) => `<div class="stat"><span>${n}</span><span class="v">${v}</span></div>`).join('')}
          <p class="note">ゲーム内の能力値です。現実の医師の能力を評価するものではありません。v0.1 では「解剖学」のみ、新しい部位への到達で上がります。</p>
        </div>`;
    }
    case 'equip': {
      const ws = e.ownedWeapons.map((id) => {
        const w = WEAPONS[id];
        const on = e.equipment.weapon === id;
        return `<div class="card ${on ? 'selected' : ''}">
          <div class="row"><b>${esc(w.name)}</b><span class="spacer"></span>
            ${on ? '<span style="color:var(--accent)">装備中</span>' : `<button class="mini" data-equip="${id}">装備する</button>`}</div>
          <p>ゲーム効果：${esc(w.gameEffect)}</p>
          <p>特殊技「${esc(w.special.name)}」：${esc(w.special.desc)}（再使用 ${w.special.cooldown}秒）</p>
          <p>医学的背景：${esc(w.motif)}</p>
          <p class="note">医学的な説明は v0.2 で追加予定（監修中）。ゲーム上の効果は実際の器具の性能を表すものではありません。</p>
        </div>`;
      }).join('');
      return `<h3>武器</h3>${ws}
        <h3>防具・アクセサリー</h3>
        <div class="card"><p>綿・ガーゼの防具、顕微鏡・内視鏡・インプラントのアクセサリーは今後の版で登場します。</p></div>`;
    }
    case 'items': {
      const list = e.inventory.filter((i) => i.n > 0);
      if (list.length === 0) return '<div class="card"><p>道具を持っていない。</p></div>';
      return list.map((i) => {
        const it = ITEMS[i.id];
        return `<div class="card"><div class="row"><b>${esc(it?.name ?? i.id)}</b><span>×${i.n}</span><span class="spacer"></span>
          <button class="mini" data-use="${i.id}">使う</button></div><p>${esc(it?.desc ?? '')}</p></div>`;
      }).join('');
    }
    case 'save': {
      const when = new Date(store.data!.savedAt).toLocaleString('ja-JP');
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
      return `
        <button class="pbtn primary wide" data-save>今すぐセーブ</button>
        <p class="note">最後のセーブ：${esc(when)}。診療所の机に触れたとき・30秒ごと・アプリを閉じたときにも自動でセーブします。</p>
        ${standalone ? '' : `<div class="card"><p><b>データを消えにくくするには</b><br>Safari の共有ボタン →「ホーム画面に追加」から起動してください。Safari で 7 日間遊ばないと、データが消えることがあります。</p>
          <p class="note">※ホーム画面版と Safari 版では、データが別々になる場合があります。移すときは下のセーブコードを使ってください。</p></div>`}
        <h3>セーブコード（機種変更・データ移行用）</h3>
        <button class="pbtn wide" data-export>セーブコードを表示</button>
        <div id="export-area" hidden>
          <textarea id="export-text" readonly></textarea>
          <button class="pbtn wide" data-copy>コピー</button>
        </div>
        <h3>セーブコードから読み込む</h3>
        <textarea id="import-text" placeholder="JQ1. で始まるコードを貼り付け"></textarea>
        <button class="pbtn wide" data-import style="margin-top:8px">読み込む（現在のデータは上書き）</button>`;
    }
    case 'settings': {
      const m = e.settings.controlMode;
      return `
        <h3>操作方式（試遊で比べてください）</h3>
        <div class="card ${m === 'A' ? 'selected' : ''}" data-mode="A">
          <b>A：自動攻撃</b><p>近くの敵に自動で攻撃します。移動に集中できます。</p></div>
        <div class="card ${m === 'C' ? 'selected' : ''}" data-mode="C">
          <b>C：攻撃ボタン</b><p>「攻撃」ボタンを押している間だけ攻撃します。</p></div>
        <h3>この版について</h3>
        <div class="card">
          <p>耳鼻科クエスト 試遊版 v0.1.5</p>
          <p class="note">ドット絵・プログラムはすべて自作です（外部素材なし）。医学的な内容は監修中で、ゲーム上の演出は医学的事実と異なる場合があります。</p>
          <p class="note">PC：WASD/矢印で移動、J 攻撃、K 特殊、L 持替、I 道具</p>
        </div>`;
    }
  }
}

function bind(el: HTMLElement): void {
  el.querySelectorAll<HTMLButtonElement>('[data-alloc]').forEach((b) =>
    b.addEventListener('click', () => {
      const e = ear();
      const before = derived().maxHp;
      if (allocate(e, b.dataset.alloc as never)) {
        // 体力を上げた分だけ現在HPも増やす
        e.hp += derived().maxHp - before;
        render();
        bus.emit('hud');
      }
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-equip]').forEach((b) =>
    b.addEventListener('click', () => {
      ear().equipment.weapon = b.dataset.equip!;
      render();
      bus.emit('hud');
    }),
  );
  el.querySelectorAll<HTMLButtonElement>('[data-use]').forEach((b) =>
    b.addEventListener('click', () => {
      bus.emit('action', 'item');
      render();
    }),
  );
  el.querySelector('[data-save]')?.addEventListener('click', async () => {
    await saveFn();
    render();
    toast('セーブしました', 'good');
  });
  el.querySelector('[data-export]')?.addEventListener('click', async () => {
    await saveFn();
    const area = el.querySelector<HTMLElement>('#export-area')!;
    const txt = el.querySelector<HTMLTextAreaElement>('#export-text')!;
    txt.value = encodeSaveCode(store.data!);
    area.hidden = false;
  });
  el.querySelector('[data-copy]')?.addEventListener('click', async () => {
    const txt = el.querySelector<HTMLTextAreaElement>('#export-text')!;
    try {
      await navigator.clipboard.writeText(txt.value);
      toast('コピーしました', 'good');
    } catch {
      txt.select();
      toast('自動コピーできませんでした。長押しでコピーしてください', 'warn');
    }
  });
  let confirmAt = 0;
  el.querySelector<HTMLButtonElement>('[data-import]')?.addEventListener('click', async (ev) => {
    const btn = ev.currentTarget as HTMLButtonElement;
    const code = el.querySelector<HTMLTextAreaElement>('#import-text')!.value;
    let data;
    try {
      data = decodeSaveCode(code);
    } catch (err) {
      toast((err as Error).message, 'warn');
      return;
    }
    if (performance.now() - confirmAt > 4000) {
      confirmAt = performance.now();
      btn.textContent = `「${data.series.name} Lv${data.apps.ear.level}」で上書きします。もう一度押して確定`;
      return;
    }
    await writeSave(data);
    location.reload();
  });
  el.querySelectorAll<HTMLElement>('[data-mode]').forEach((c) =>
    c.addEventListener('click', () => {
      ear().settings.controlMode = c.dataset.mode as 'A' | 'C';
      render();
      bus.emit('hud');
    }),
  );
}
