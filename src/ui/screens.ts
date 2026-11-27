// タイトル・名前入力・戦闘不能の画面（DOM）
import { HERO_H, HERO_PALETTE, HERO_W, composeHero } from '../art/hero';
import { createNewSave, decodeSaveCode, DEFAULT_NAME, NAME_MAX, normalizeName, type SaveData } from '../systems/save';
import { newPlayerId, writeSave } from '../game/storage';
import { bus } from '../game/store';

const screen = () => document.getElementById('screen')!;

function heroCanvas(): HTMLCanvasElement {
  // 武器なしの正面の絵（2頭身・16×16）
  const c = document.createElement('canvas');
  c.width = HERO_W;
  c.height = HERO_H;
  c.className = 'title-hero';
  const ctx = c.getContext('2d')!;
  composeHero('down0', null).forEach((row, y) =>
    [...row].forEach((ch, x) => {
      const col = HERO_PALETTE[ch];
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(x, y, 1, 1);
      }
    }),
  );
  return c;
}

/** タイトル画面。ゲーム開始時のセーブデータを返す */
export function showTitle(existing: SaveData | null): Promise<SaveData> {
  return new Promise((resolve) => {
    const el = screen();
    el.hidden = false;
    el.innerHTML = `
      <div class="title-wrap">
        <div class="title-logo">耳鼻科クエスト</div>
        <p class="title-sub">〜 聴界アウリスの響き 〜　試遊版 v0.1.5</p>
        <div id="hero-slot"></div>
        <div class="title-btns">
          ${existing ? `<button class="pbtn primary wide" data-continue>つづきから（${escapeHtml(existing.series.name)} Lv${existing.apps.ear.level}）</button>` : ''}
          <button class="pbtn ${existing ? '' : 'primary'} wide" data-new>はじめから</button>
          <button class="pbtn wide" data-code>セーブコードで再開</button>
        </div>
        <div id="code-box" hidden style="width:100%;max-width:320px">
          <textarea id="code-text" placeholder="JQ1. で始まるコードを貼り付け"></textarea>
          <button class="pbtn wide" data-load style="margin-top:8px">読み込む</button>
        </div>
        <p class="foot">ドット絵・プログラムは自作です。医学的内容は監修中です。<br>敵は病態のモチーフであり、患者さんではありません。</p>
      </div>`;
    el.querySelector('#hero-slot')!.appendChild(heroCanvas());

    el.querySelector('[data-continue]')?.addEventListener('click', () => {
      el.hidden = true;
      resolve(existing!);
    });

    let confirmNew = 0;
    el.querySelector<HTMLButtonElement>('[data-new]')!.addEventListener('click', async (ev) => {
      if (existing && performance.now() - confirmNew > 4000) {
        confirmNew = performance.now();
        (ev.currentTarget as HTMLButtonElement).textContent = '今のデータは上書きされます。もう一度押して確定';
        return;
      }
      const name = await askName();
      const data = createNewSave(name, newPlayerId(), new Date());
      await writeSave(data);
      el.hidden = true;
      resolve(data);
    });

    el.querySelector('[data-code]')!.addEventListener('click', () => {
      (el.querySelector('#code-box') as HTMLElement).hidden = false;
    });
    el.querySelector('[data-load]')!.addEventListener('click', async () => {
      const code = (el.querySelector('#code-text') as HTMLTextAreaElement).value;
      try {
        const data = decodeSaveCode(code);
        await writeSave(data);
        el.hidden = true;
        resolve(data);
      } catch (err) {
        alertInline(el, (err as Error).message);
      }
    });
  });
}

function askName(): Promise<string> {
  return new Promise((resolve) => {
    const el = screen();
    el.innerHTML = `
      <div class="title-wrap">
        <h2>あなたの名前は？</h2>
        <p class="title-sub">コンカ診療所の新人医師見習いです（${NAME_MAX}文字まで）</p>
        <div style="width:100%;max-width:320px">
          <input type="text" id="name-input" maxlength="${NAME_MAX * 2}" placeholder="${DEFAULT_NAME}" autocomplete="off" enterkeyhint="done" />
          <p class="note" id="name-preview" style="text-align:left">空欄のときは「${DEFAULT_NAME}」になります</p>
          <button class="pbtn primary wide" data-ok>決定</button>
        </div>
      </div>`;
    const input = el.querySelector<HTMLInputElement>('#name-input')!;
    const prev = el.querySelector<HTMLElement>('#name-preview')!;
    input.addEventListener('input', () => {
      prev.textContent = `表示名：${normalizeName(input.value)}`;
    });
    const ok = () => resolve(normalizeName(input.value));
    el.querySelector('[data-ok]')!.addEventListener('click', ok);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) ok();
    });
  });
}

export function showDied(): void {
  const el = screen();
  el.hidden = false;
  el.innerHTML = `
    <div class="died">
      <h2>一時撤退</h2>
      <p>無理は禁物。診療所で態勢を立て直そう。</p>
      <p class="note">経験値・道具は失いません。</p>
      <button class="pbtn primary" data-ok style="min-width:220px">診療所に戻る</button>
    </div>`;
  el.querySelector('[data-ok]')!.addEventListener('click', () => {
    el.hidden = true;
    bus.emit('respawn');
  });
}

function alertInline(el: HTMLElement, msg: string): void {
  let p = el.querySelector<HTMLElement>('.inline-err');
  if (!p) {
    p = document.createElement('p');
    p.className = 'inline-err';
    p.style.color = 'var(--warn)';
    el.querySelector('#code-box')!.appendChild(p);
  }
  p.textContent = msg;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
