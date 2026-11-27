// フィールド（探索・戦闘）シーン
import Phaser from 'phaser';
import { registerArt } from '../art/art';
import { heroTextureKey, type HeroFrame } from '../art/hero';
import { buildMap, regionAtRow, ISTHMUS_CERUMEN_ROWS, MAP_H, MAP_W, TILE, WALKABLE, type MapData, type Spawn } from '../data/map';
import { CERUMEN, ENEMIES, ITEMS, WEAPONS, gearLight, type EnemyDef } from '../data/gameData';
import { darknessAtRow, equipmentLight, lightRadius } from '../systems/lighting';
import { pixelZoom } from '../systems/view';
import { calcDamage, contactDamage, hitChance, nearestInRange, rollHit } from '../systems/combat';
import { addExp } from '../systems/progression';
import { facingFrom, type Facing } from '../systems/input';
import { addItem, bus, derived, ear, itemCount, progress, store } from '../game/store';
import { writeSave } from '../game/storage';

type Body = Phaser.Physics.Arcade.Body;
type Sprite = Phaser.Physics.Arcade.Sprite;

interface EnemyState {
  def: EnemyDef;
  hp: number;
  group: number; // 出現グループ番号
  home: Phaser.Math.Vector2;
  wanderT: number;
  wanderDir: Phaser.Math.Vector2;
  stun: number;
  enraged: boolean;
  dropT: number; // ホテリの「腫れ」を残す間隔
}

interface CerumenState {
  idx: number;
  hp: number;
}

const CONVEYOR_SPEED = 16; // 外耳道の床が外向き（画面下向き）に流れる速さ px/秒（演出：MED-EAC-04）
const INVULN = 0.8;
const RESPAWN_SEC = 45;
const DUST_INTERVAL = 0.12; // 走りの煙を出す間隔（秒）
const DUST_MIN_INPUT = 0.6; // スティックをこれ以上倒しているときだけ煙を出す
const DARK_SIZE = 1024; // 暗幕テクスチャの一辺（ワールド px）。引いた画面（PC の1倍表示を含む）より十分大きくする
const DARK_COLOR = '22, 8, 12'; // 暗い赤褐色（皮膚の中にいる感じ）
const LIGHT_FORWARD = 10; // 明かりの中心を向いている方向へずらす量（px）

export class FieldScene extends Phaser.Scene {
  private mapData!: MapData;
  private layer!: Phaser.Tilemaps.TilemapLayer;
  private player!: Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private cerumens!: Phaser.Physics.Arcade.StaticGroup;
  private swells!: Phaser.Physics.Arcade.Group;
  private drops!: Phaser.Physics.Arcade.Group;
  private professor!: Phaser.Physics.Arcade.Image;
  private desk!: Phaser.Physics.Arcade.Image;
  private flakes: Phaser.GameObjects.Image[] = [];
  private darkness!: Phaser.GameObjects.Image;
  private darkTex!: Phaser.Textures.CanvasTexture;
  private drawnRadius = -1;

  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private stick = new Phaser.Math.Vector2(0, 0);
  private attackHeld = false;
  private facing = new Phaser.Math.Vector2(0, -1);
  private dir: Facing = 'down'; // 主人公の見た目の向き（4方向）

  private attackCd = 0;
  private specialCd = 0;
  private invuln = 0;
  private slowUntil = 0;
  private knock = new Phaser.Math.Vector2(0, 0);
  private knockT = 0;
  private dustT = 0;
  private dead = false;

  private regionId = '';
  private nearProfessor = false;
  private onDesk = false;
  private gateShown = false;
  private bladeHintAt = -99;
  private groupsDead = new Map<number, number>(); // グループ番号 → 全滅した時刻
  private groupSpawn = new Map<number, Spawn>();
  private autosaveT = 0;
  private hudT = 0;
  private unsubs: (() => void)[] = [];

  constructor() {
    super('field');
  }

  create(): void {
    if (!this.textures.exists('tiles')) registerArt(this);
    this.mapData = buildMap();

    // --- マップ ---
    const map = this.make.tilemap({ data: this.mapData.tiles, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0)!;
    this.layer = map.createLayer(0, tileset, 0, 0) as Phaser.Tilemaps.TilemapLayer;
    this.layer.setCollisionByExclusion([...WALKABLE]);
    this.physics.world.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);

    // --- 主人公 ---
    const e = ear();
    const start = this.mapData.playerStart;
    const px = e.position.x >= 0 ? e.position.x : start.tx * TILE + 8;
    const py = e.position.y >= 0 ? e.position.y : start.ty * TILE + 8;
    this.player = this.physics.add.sprite(px, py, heroTextureKey('down0', e.equipment.weapon));
    // 16×16 の絵（2頭身）。座標の基準点は絵の中心
    const pb = this.player.body as Body;
    // 当たり判定（10×7）：基準点の1px下から（v0.1.1〜v0.1.2 と同じ位置）
    pb.setSize(10, 7).setOffset(3, 9);
    this.player.setCollideWorldBounds(true);
    // 歩きアニメ（正面・背中・横 × 武器ごと）。左向きは横向きを反転して使う
    for (const weaponId of Object.keys(WEAPONS)) {
      for (const group of ['down', 'up', 'side'] as const) {
        const key = `walk_${group}_${weaponId}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: [
            { key: heroTextureKey(`${group}0` as HeroFrame, weaponId) },
            { key: heroTextureKey(`${group}1` as HeroFrame, weaponId) },
          ],
          frameRate: 7,
          repeat: -1,
        });
      }
    }
    this.physics.add.collider(this.player, this.layer);

    // --- 診療所の机（セーブ）と教授 ---
    const d = this.mapData.saveDesk;
    this.desk = this.physics.add.staticImage(d.tx * TILE + 8, d.ty * TILE + 8, 'desk');
    const pr = this.mapData.professor;
    this.professor = this.physics.add.staticImage(pr.tx * TILE + 8, pr.ty * TILE + 8, 'professor');
    (this.professor.body as Phaser.Physics.Arcade.StaticBody).setSize(10, 8).setOffset(3, 8);
    this.physics.add.collider(this.player, this.professor);

    // --- 耳垢の塊 ---
    this.cerumens = this.physics.add.staticGroup();
    this.mapData.cerumen.forEach((c, idx) => {
      if (e.flags[`cerumen_${idx}`]) return; // 除去済み
      const s = this.cerumens.create(c.tx * TILE + 8, c.ty * TILE + 8, 'cerumen') as Phaser.Physics.Arcade.Sprite;
      s.setData('st', { idx, hp: CERUMEN.hp } satisfies CerumenState);
    });
    this.physics.add.collider(this.player, this.cerumens, () => this.onBumpCerumen());

    // --- 敵 ---
    this.enemies = this.physics.add.group();
    this.mapData.spawns.forEach((sp, gi) => {
      this.groupSpawn.set(gi, sp);
      this.spawnGroup(gi, sp);
    });
    this.physics.add.collider(this.enemies, this.layer);
    this.physics.add.collider(this.enemies, this.cerumens);
    this.physics.add.overlap(this.player, this.enemies, (_p, en) => this.onTouchEnemy(en as Sprite));

    // --- 腫れ・ドロップ ---
    this.swells = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.swells, () => {
      this.slowUntil = this.time.now + 250;
    });
    this.drops = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.player, this.drops, (_p, it) => this.pickUp(it as Phaser.GameObjects.Image));

    // --- 上皮の小片（外向きに流れる床の演出） ---
    for (let i = 0; i < 26; i++) {
      const f = this.add.image(0, 0, 'fx_flake').setAlpha(0.55).setDepth(1);
      this.resetFlake(f, true);
      this.flakes.push(f);
    }

    // --- 暗さ（暗幕に明かりの穴をあける） ---
    this.darkTex = (this.textures.exists('darkness')
      ? this.textures.get('darkness')
      : this.textures.createCanvas('darkness', DARK_SIZE, DARK_SIZE)) as Phaser.Textures.CanvasTexture;
    this.darkness = this.add.image(0, 0, 'darkness').setDepth(9000);
    this.updateLight();

    // --- カメラ ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP_W * TILE, MAP_H * TILE);
    cam.startFollow(this.player, true, 0.2, 0.2);
    cam.setRoundPixels(true);
    this.applyZoom();
    this.scale.on('resize', () => this.applyZoom());

    // --- 入力 ---
    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,J,K,L,I') as Record<string, Phaser.Input.Keyboard.Key>;
    this.keys.J.on('down', () => (this.attackHeld = true));
    this.keys.J.on('up', () => (this.attackHeld = false));
    this.keys.K.on('down', () => this.useSpecial());
    this.keys.L.on('down', () => this.swapWeapon());
    this.keys.I.on('down', () => this.useItem());

    this.unsubs.push(
      bus.on('input', (v) => this.stick.set(v.stickX, v.stickY)),
      bus.on('action', (a) => {
        if (a === 'attack-down') this.attackHeld = true;
        else if (a === 'attack-up') this.attackHeld = false;
        else if (a === 'special') this.useSpecial();
        else if (a === 'swap') this.swapWeapon();
        else if (a === 'item') this.useItem();
      }),
      bus.on('respawn', () => this.respawn()),
      bus.on('menuOpen', () => this.scene.pause()),
      bus.on('menuClose', () => this.scene.resume()),
    );
    this.events.once('shutdown', () => this.unsubs.forEach((u) => u()));

    // iPhone でアプリを切り替えた時などに自動保存
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void this.save(false);
    });

    this.updateRegion(true);
    bus.emit('hud');

    // 初回の導入
    if (!e.flags.intro) {
      this.time.delayedCall(400, () => this.introDialog());
    }
  }

  // ---------------- 毎フレーム ----------------

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(0.05, deltaMs / 1000);
    if (!store.data || this.dead) return;
    const e = ear();
    e.playTimeSec += dt;

    this.attackCd = Math.max(0, this.attackCd - dt);
    this.specialCd = Math.max(0, this.specialCd - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.knockT = Math.max(0, this.knockT - dt);

    this.movePlayer(dt);
    this.updateRegion(false);
    // 鼓膜の目の前まで来たら（試遊版の終点）
    if (this.player.y < 3 * TILE && !this.gateShown) {
      this.gateShown = true;
      this.reachGate();
    } else if (this.player.y > 6 * TILE) {
      this.gateShown = false;
    }
    this.handleAttack();
    this.updateEnemies(dt);
    this.updateFlakes(dt);
    this.updateLight();
    this.checkProximity();
    this.handleRespawns();

    // 奥行き（下にあるものを手前に）
    this.player.setDepth(this.player.y);
    this.player.setAlpha(this.invuln > 0 && Math.floor(this.invuln * 20) % 2 === 0 ? 0.4 : 1);

    this.hudT += dt;
    if (this.hudT > 0.1) {
      this.hudT = 0;
      bus.emit('cooldown', { special: this.specialCd, specialMax: this.weapon().special.cooldown });
    }
    this.autosaveT += dt;
    if (this.autosaveT > 30) {
      this.autosaveT = 0;
      void this.save(false);
    }
  }

  private movePlayer(_dt: number): void {
    const k = this.keys;
    let vx = this.stick.x;
    let vy = this.stick.y;
    if (k.A.isDown || k.LEFT.isDown) vx = -1;
    if (k.D.isDown || k.RIGHT.isDown) vx = 1;
    if (k.W.isDown || k.UP.isDown) vy = -1;
    if (k.S.isDown || k.DOWN.isDown) vy = 1;
    const len = Math.hypot(vx, vy);
    if (len > 1) {
      vx /= len;
      vy /= len;
    }
    const moving = len > 0.05;
    let speed = derived().speed;
    if (this.time.now < this.slowUntil) speed *= 0.55;

    const body = this.player.body as Body;
    if (this.knockT > 0) {
      body.setVelocity(this.knock.x, this.knock.y);
    } else {
      const flow = regionAtRow(Math.floor(this.player.y / TILE)).canal ? CONVEYOR_SPEED : 0;
      body.setVelocity(vx * speed, vy * speed + flow);
    }

    if (moving) {
      this.facing.set(vx, vy).normalize();
      this.dir = facingFrom(vx, vy, this.dir);
    }
    this.applyDirSprite(moving);

    // 走りの煙（見た目のみ。速度・当たり判定には影響しない）
    this.dustT -= _dt;
    if (moving && Math.min(1, len) >= DUST_MIN_INPUT && this.knockT <= 0 && this.dustT <= 0) {
      this.dustT = DUST_INTERVAL;
      this.spawnDust();
    }
  }

  /** 足元の進行方向と反対側に小さな煙を出す */
  private spawnDust(): void {
    const outdoor = !regionAtRow(Math.floor(this.player.y / TILE)).canal;
    const x = this.player.x - this.facing.x * 6 + (Math.random() - 0.5) * 3;
    const y = this.player.y + 6 - this.facing.y * 4;
    const d = this.add.image(x, y, 'fx_dust').setDepth(this.player.depth - 1).setScale(0.6).setAlpha(outdoor ? 0.95 : 0.8);
    this.tweens.add({
      targets: d,
      x: x - this.facing.x * 5,
      y: y - this.facing.y * 5 - 2,
      scale: 1.3,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => d.destroy(),
    });
  }

  /** 向き（this.dir）に合わせて主人公の絵を切り替える。止まっているときは1コマ目 */
  private applyDirSprite(moving: boolean): void {
    const group = this.dir === 'left' || this.dir === 'right' ? 'side' : this.dir;
    this.player.setFlipX(this.dir === 'left');
    const weaponId = ear().equipment.weapon; // 持っている武器の絵も切り替える
    const anim = `walk_${group}_${weaponId}`;
    if (moving) {
      if (this.player.anims.currentAnim?.key !== anim || !this.player.anims.isPlaying) this.player.play(anim);
    } else {
      if (this.player.anims.isPlaying) this.player.stop();
      const idle = heroTextureKey(`${group}0` as HeroFrame, weaponId);
      if (this.player.texture.key !== idle) this.player.setTexture(idle);
    }
  }

  private weapon() {
    return WEAPONS[ear().equipment.weapon] ?? WEAPONS.w_pick;
  }

  // ---------------- 攻撃 ----------------

  private aliveEnemies(): Sprite[] {
    return (this.enemies.getChildren() as Sprite[]).filter((s) => s.active);
  }

  private handleAttack(): void {
    if (this.attackCd > 0) return;
    const mode = ear().settings.controlMode;
    if (mode === 'C' && !this.attackHeld) return;
    const w = this.weapon();
    const px = this.player.x;
    const py = this.player.y;
    let target: { x: number; y: number; kind: 'enemy' | 'cerumen'; obj: Sprite } | null = null;

    const en = nearestInRange(px, py, w.range, this.aliveEnemies());
    if (en) target = { x: en.x, y: en.y, kind: 'enemy', obj: en };
    if (!target && w.type === 'suction') {
      const c = nearestInRange(px, py, w.range, this.cerumens.getChildren() as Sprite[]);
      if (c) target = { x: c.x, y: c.y, kind: 'cerumen', obj: c };
    }

    if (!target) {
      if (mode === 'C') {
        // 空振り（向いている方向）
        this.attackCd = w.cooldown;
        this.showFx(px + this.facing.x * 14, py + this.facing.y * 14, w.type);
      }
      return;
    }
    this.attackCd = w.cooldown;
    this.facing.set(target.x - px, target.y - py).normalize();
    // 攻撃した敵の方を向く
    this.dir = facingFrom(this.facing.x, this.facing.y, this.dir, 0);
    this.applyDirSprite(this.player.anims.isPlaying);
    this.showFx(target.x, target.y, w.type);
    if (target.kind === 'enemy') this.hitEnemy(target.obj, 1);
    else this.hitCerumen(target.obj, CERUMEN.suctionDamage);
  }

  private showFx(x: number, y: number, type: string): void {
    const key = type === 'suction' ? 'fx_suction' : 'fx_slash';
    const fx = this.add.image(x, y, key).setDepth(9999);
    fx.setRotation(Math.atan2(this.facing.y, this.facing.x) + Math.PI / 2);
    this.tweens.add({
      targets: fx,
      alpha: 0,
      scale: type === 'suction' ? 0.4 : 1.3,
      angle: type === 'suction' ? fx.angle - 180 : fx.angle,
      duration: 220,
      onComplete: () => fx.destroy(),
    });
  }

  private hitEnemy(s: Sprite, multScale: number): void {
    if (!s.active) return;
    const st = s.getData('st') as EnemyState;
    const w = this.weapon();
    const dv = derived();
    // 命中判定（吸引の杖は必中）
    if (!rollHit(hitChance(ear().stats.foc, st.def.evade, w.sureHit), Math.random)) {
      this.popNumber(s.x, s.y - 8, 'MISS', '#b8b0c0');
      return;
    }
    const r = calcDamage({
      atk: dv.atk,
      weaponMult: w.mult * multScale,
      typeMult: st.def.weak[w.type] ?? 1,
      critRate: dv.crit,
      targetDef: st.def.def,
      rng: Math.random,
    });
    st.hp -= r.amount;
    this.popNumber(s.x, s.y - 8, r.crit ? `${r.amount}!` : `${r.amount}`, r.crit ? '#ffe066' : '#ffffff');
    // ノックバック（吸引は手前に引く）
    const dir = new Phaser.Math.Vector2(s.x - this.player.x, s.y - this.player.y).normalize();
    const push = w.type === 'suction' ? -70 : 110;
    (s.body as Body).setVelocity(dir.x * push, dir.y * push);
    st.stun = 0.18;
    s.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    this.time.delayedCall(70, () => {
      if (s.active) {
        s.clearTint();
        if (st.enraged) s.setTint(0xff9090);
      }
    });
    if (st.hp <= 0) this.killEnemy(s);
  }

  private hitCerumen(s: Sprite, dmg: number): void {
    if (!s.active) return;
    const st = s.getData('st') as CerumenState;
    st.hp -= dmg;
    this.tweens.add({ targets: s, scaleX: 0.85, scaleY: 0.85, yoyo: true, duration: 60 });
    if (st.hp <= 0) {
      ear().flags[`cerumen_${st.idx}`] = true;
      this.puff(s.x, s.y, 0xd8a24a);
      s.destroy();
      if (!ear().flags.firstCerumen) {
        ear().flags.firstCerumen = true;
        bus.emit('toast', { text: '耳垢の塊を吸い取った！', kind: 'good' });
      }
      // 峡部の2列それぞれで1つ以上取り除けば通れる
      const removed = (row: number) =>
        this.mapData.cerumen.some((c, i) => c.ty === row && ear().flags[`cerumen_${i}`]);
      const open = ISTHMUS_CERUMEN_ROWS.every((r) => removed(r));
      if (open && !ear().flags.isthmusOpen) {
        ear().flags.isthmusOpen = true;
        bus.emit('toast', { text: '峡部が通れるようになった！', kind: 'good' });
      }
    }
  }

  private onBumpCerumen(): void {
    if (this.weapon().type === 'suction') return;
    if (this.time.now - this.bladeHintAt < 6000) return;
    this.bladeHintAt = this.time.now;
    bus.emit('toast', { text: '耳垢は刃では取れない。「持替」で吸引の杖に！', kind: 'warn' });
  }

  private useSpecial(): void {
    if (this.dead || this.specialCd > 0) return;
    const w = this.weapon();
    this.specialCd = w.special.cooldown;
    if (w.type === 'blade') {
      const t = nearestInRange(this.player.x, this.player.y, w.range + 10, this.aliveEnemies());
      if (!t) {
        this.showFx(this.player.x + this.facing.x * 14, this.player.y + this.facing.y * 14, 'blade');
        return;
      }
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 90, () => {
          if (!t.active) return;
          this.showFx(t.x, t.y, 'blade');
          this.hitEnemy(t, 0.8);
        });
      }
    } else {
      const R = 72;
      const fx = this.add.image(this.player.x, this.player.y, 'fx_suction').setDepth(9999).setScale(5).setAlpha(0.8);
      this.tweens.add({ targets: fx, scale: 0.5, alpha: 0, angle: -360, duration: 380, onComplete: () => fx.destroy() });
      for (const s of this.aliveEnemies()) {
        const dx = this.player.x - s.x;
        const dy = this.player.y - s.y;
        const d = Math.hypot(dx, dy);
        if (d > R || d < 1) continue;
        const st = s.getData('st') as EnemyState;
        st.stun = 0.5;
        (s.body as Body).setVelocity((dx / d) * 150, (dy / d) * 150);
        this.hitEnemy(s, 0.5);
      }
      for (const c of [...(this.cerumens.getChildren() as Sprite[])]) {
        if (Math.hypot(this.player.x - c.x, this.player.y - c.y) <= R) this.hitCerumen(c, 4);
      }
    }
  }

  private swapWeapon(): void {
    if (this.dead) return;
    const e = ear();
    const list = e.ownedWeapons;
    const i = list.indexOf(e.equipment.weapon);
    e.equipment.weapon = list[(i + 1) % list.length];
    this.attackCd = 0.2;
    this.specialCd = Math.min(this.specialCd, 1);
    bus.emit('toast', { text: `${this.weapon().name}に持ち替えた` });
    bus.emit('hud');
  }

  private useItem(): void {
    if (this.dead) return;
    const id = 'i_onigiri';
    if (itemCount(id) <= 0) {
      bus.emit('toast', { text: 'おにぎりがない……', kind: 'warn' });
      return;
    }
    const e = ear();
    const max = derived().maxHp;
    if (e.hp >= max) {
      bus.emit('toast', { text: 'HPは満タンだ' });
      return;
    }
    addItem(id, -1);
    const heal = ITEMS[id].heal ?? 0;
    e.hp = Math.min(max, e.hp + heal);
    this.popNumber(this.player.x, this.player.y - 12, `+${heal}`, '#7dff9a');
    bus.emit('hud');
  }

  // ---------------- 敵 ----------------

  private spawnGroup(gi: number, sp: Spawn): void {
    const def = ENEMIES[sp.kind];
    for (let i = 0; i < def.group; i++) {
      const x = sp.tx * TILE + 8 + (i - (def.group - 1) / 2) * 12;
      const y = sp.ty * TILE + 8 + (i % 2) * 6;
      const s = this.enemies.create(x, y, def.kind) as Sprite;
      const b = s.body as Body;
      b.setSize(10, 9).setOffset(3, 5);
      s.setData('st', {
        def,
        hp: def.hp,
        group: gi,
        home: new Phaser.Math.Vector2(x, y),
        wanderT: Math.random() * 2,
        wanderDir: new Phaser.Math.Vector2(0, 0),
        stun: 0,
        enraged: false,
        dropT: 2 + Math.random() * 2,
      } satisfies EnemyState);
      // ぷるぷる動く
      this.tweens.add({
        targets: s,
        scaleY: 0.88,
        scaleX: 1.08,
        yoyo: true,
        repeat: -1,
        duration: 380 + Math.random() * 200,
        ease: 'Sine.easeInOut',
      });
    }
    this.groupsDead.delete(gi);
  }

  private updateEnemies(dt: number): void {
    const px = this.player.x;
    const py = this.player.y;
    for (const s of this.aliveEnemies()) {
      const st = s.getData('st') as EnemyState;
      const b = s.body as Body;
      s.setDepth(s.y);
      if (st.stun > 0) {
        st.stun -= dt;
        b.velocity.scale(0.9);
        continue;
      }
      const dx = px - s.x;
      const dy = py - s.y;
      const dist = Math.hypot(dx, dy);
      const speedMul = st.enraged ? 1.5 : 1;
      const sight = st.def.sight * (st.enraged ? 1.6 : 1);
      if (dist < sight && dist > 1) {
        b.setVelocity((dx / dist) * st.def.speed * speedMul, (dy / dist) * st.def.speed * speedMul);
      } else {
        st.wanderT -= dt;
        const hx = st.home.x - s.x;
        const hy = st.home.y - s.y;
        const hd = Math.hypot(hx, hy);
        if (hd > 56) {
          st.wanderDir.set(hx / hd, hy / hd);
        } else if (st.wanderT <= 0) {
          st.wanderT = 1.2 + Math.random() * 1.8;
          if (Math.random() < 0.3) st.wanderDir.set(0, 0);
          else st.wanderDir.setToPolar(Math.random() * Math.PI * 2, 1);
        }
        b.setVelocity(st.wanderDir.x * st.def.wander, st.wanderDir.y * st.def.wander);
      }
      if (Math.abs(b.velocity.x) > 2) s.setFlipX(b.velocity.x < 0);

      // ホテリは通った跡に「腫れ」を残す（移動が遅くなる）
      if (st.def.kind === 'hoteri') {
        st.dropT -= dt;
        if (st.dropT <= 0) {
          st.dropT = 3;
          const sw = this.swells.create(s.x, s.y + 4, 'fx_swell') as Phaser.Physics.Arcade.Image;
          sw.setDepth(2);
          (sw.body as Body).setSize(14, 14).setOffset(3, 3);
          this.tweens.add({ targets: sw, alpha: 0, delay: 1800, duration: 700, onComplete: () => sw.destroy() });
        }
      }
    }
  }

  private killEnemy(s: Sprite): void {
    const st = s.getData('st') as EnemyState;
    this.puff(s.x, s.y, 0xffffff);
    this.tweens.killTweensOf(s);
    s.disableBody(true, true);
    s.destroy();

    // 相方がいる敵（ニューモ兄弟・モラクセ姉妹）は、片方が倒れると怒る
    const mates = this.aliveEnemies().filter((o) => (o.getData('st') as EnemyState).group === st.group);
    if (mates.length > 0 && st.def.group === 2) {
      for (const m of mates) {
        const ms = m.getData('st') as EnemyState;
        if (!ms.enraged) {
          ms.enraged = true;
          m.setTint(0xff9090);
        }
      }
      if (!ear().flags.firstEnrage) {
        ear().flags.firstEnrage = true;
        bus.emit('toast', { text: `相方がやられて${st.def.name}が怒った！`, kind: 'warn' });
      }
    }
    if (mates.length === 0) this.groupsDead.set(st.group, this.time.now);

    // 経験値
    const gained = addExp(progress(), st.def.exp);
    this.popNumber(s.x, s.y - 14, `EXP+${st.def.exp}`, '#9fd8ff');
    if (gained > 0) {
      const e = ear();
      e.hp = derived().maxHp; // レベルアップで全回復
      bus.emit('levelUp', { level: e.level });
    }
    // 図鑑（v0.1 は記録のみ。表示は v0.2）
    const bes = ear().bestiary;
    if (!bes.includes(st.def.kind)) bes.push(st.def.kind);

    // ドロップ
    if (Math.random() < 0.1) {
      const it = this.drops.create(s.x, s.y, 'onigiri') as Phaser.Physics.Arcade.Image;
      it.setDepth(3);
      this.tweens.add({ targets: it, y: it.y - 4, yoyo: true, repeat: -1, duration: 400 });
    }
    bus.emit('hud');
  }

  private handleRespawns(): void {
    const now = this.time.now;
    for (const [gi, t] of this.groupsDead) {
      if (now - t < RESPAWN_SEC * 1000) continue;
      const sp = this.groupSpawn.get(gi)!;
      const d = Math.hypot(this.player.x - (sp.tx * TILE + 8), this.player.y - (sp.ty * TILE + 8));
      if (d > 170) this.spawnGroup(gi, sp);
    }
  }

  private onTouchEnemy(s: Sprite): void {
    if (this.invuln > 0 || this.dead || !s.active) return;
    const st = s.getData('st') as EnemyState;
    const dmg = contactDamage(st.def.atk * (st.enraged ? 1.3 : 1), derived().def);
    const e = ear();
    e.hp = Math.max(0, e.hp - dmg);
    this.invuln = INVULN;
    this.popNumber(this.player.x, this.player.y - 12, `-${dmg}`, '#ff8080');
    this.cameras.main.shake(80, 0.004);
    const dir = new Phaser.Math.Vector2(this.player.x - s.x, this.player.y - s.y).normalize();
    this.knock.set(dir.x * 140, dir.y * 140);
    this.knockT = 0.14;
    bus.emit('hud');
    if (e.hp <= 0) this.die();
  }

  private die(): void {
    this.dead = true;
    (this.player.body as Body).setVelocity(0, 0);
    this.player.stop();
    this.player.setTint(0x808080);
    bus.emit('died');
  }

  private respawn(): void {
    const e = ear();
    e.hp = derived().maxHp;
    const st = this.mapData.playerStart;
    this.player.setPosition(st.tx * TILE + 8, (st.ty - 3) * TILE + 8);
    this.player.clearTint();
    this.dead = false;
    this.invuln = 1.5;
    // 敵を初期配置に戻す
    for (const s of [...(this.enemies.getChildren() as Sprite[])]) {
      this.tweens.killTweensOf(s);
      s.destroy();
    }
    this.groupSpawn.forEach((sp, gi) => this.spawnGroup(gi, sp));
    this.cameras.main.flash(300, 255, 255, 255);
    bus.emit('hud');
    void this.save(false);
  }

  private pickUp(it: Phaser.GameObjects.Image): void {
    this.tweens.killTweensOf(it);
    it.destroy();
    addItem('i_onigiri', 1);
    bus.emit('toast', { text: '当直のおにぎりを拾った', kind: 'good' });
    bus.emit('hud');
  }

  // ---------------- 場所・会話 ----------------

  private updateRegion(force: boolean): void {
    const r = regionAtRow(Math.floor(this.player.y / TILE));
    if (!force && r.id === this.regionId) return;
    this.regionId = r.id;
    store.area = { name: r.name, en: r.en };
    bus.emit('areaChanged', { name: r.name, en: r.en });
    const e = ear();
    if (!e.areasVisited.includes(r.id)) {
      e.areasVisited.push(r.id);
      if (r.id !== 'village' && !force) {
        store.data!.series.proficiency.anatomy += 1;
        bus.emit('toast', { text: `${r.name}（${r.en}）に到達　解剖学 +1`, kind: 'good' });
      }
    }
  }

  private reachGate(): void {
    const e = ear();
    const first = !e.areasCleared.includes('a1');
    if (first) e.areasCleared.push('a1');
    void this.save(false);
    bus.emit('dialog', {
      speaker: '鼓膜の門（Tympanic membrane）',
      lines: [
        '真珠のような灰色の膜が、行く手をふさいでいる。',
        '門の向こうから、何かがふくらんでくるような気配がする……。',
        '（試遊版 v0.1 はここまでです。鼓膜の門の先は v0.2 で開放予定）',
        first ? 'ここまで遊んでいただきありがとうございます！ 集落に戻ってレベル上げを続けることもできます。' : '集落に戻って、レベル上げを続けることもできます。',
      ],
    });
  }

  private checkProximity(): void {
    const p = this.player;
    const dProf = Phaser.Math.Distance.Between(p.x, p.y, this.professor.x, this.professor.y);
    if (dProf < 22 && !this.nearProfessor) {
      this.nearProfessor = true;
      this.professorTalk();
    } else if (dProf > 40) {
      this.nearProfessor = false;
    }
    const dDesk = Phaser.Math.Distance.Between(p.x, p.y, this.desk.x, this.desk.y);
    if (dDesk < 20 && !this.onDesk) {
      this.onDesk = true;
      ear().hp = derived().maxHp;
      void this.save(true);
      bus.emit('hud');
    } else if (dDesk > 36) {
      this.onDesk = false;
    }
  }

  private introDialog(): void {
    const name = store.data!.series.name;
    bus.emit('dialog', {
      speaker: '教授',
      lines: [
        `おお、${name}君。今日からコンカ診療所の一員だね。`,
        '外耳道の奥で、病態の化身「パトス」たちが暴れているらしい。',
        '鼓膜の門まで行って、様子を見てきなさい。',
        '途中の峡部は狭くて詰まりやすい。吸引の杖も忘れずにな。',
        '……それと、わしは時々突然質問するから、勉強もしておくように。',
      ],
      onClose: () => {
        ear().flags.intro = true;
        bus.emit('toast', { text: '左下をなぞって移動。敵に近づくと自動で攻撃します' });
        void this.save(false);
      },
    });
  }

  private professorTalk(): void {
    const e = ear();
    if (!e.flags.intro) return;
    let lines: string[];
    if (e.areasCleared.includes('a1')) {
      lines = ['鼓膜の門まで行ったか。ふくらんで閉ざされていた？ ふむ……。', '準備ができたら、次の版で一緒に調べよう。'];
    } else if (!e.flags.isthmusOpen) {
      lines = ['峡部の耳垢は刃では取れん。「持替」で吸引の杖だ。', '机に触れるとセーブとHP回復ができるぞ。'];
    } else {
      lines = ['峡部を抜けたか。その先の骨部は皮膚が薄い。気をつけて進みなさい。'];
    }
    bus.emit('dialog', { speaker: '教授', lines });
  }

  // ---------------- 演出 ----------------

  /** 明かりの半径・場所の暗さ・向きに合わせて暗幕を更新する */
  private updateLight(): void {
    const e = ear();
    const r = lightRadius(e.stats.foc, equipmentLight(e.equipment, gearLight));
    if (r !== this.drawnRadius) this.drawDarkness(r);
    const d = darknessAtRow(this.player.y / TILE);
    this.darkness.setVisible(d > 0.01).setAlpha(d);
    this.darkness.setPosition(this.player.x + this.facing.x * LIGHT_FORWARD, this.player.y + this.facing.y * LIGHT_FORWARD);
  }

  /** 中央に明かりの穴（ふちをぼかした円）がある暗幕を描く */
  private drawDarkness(radius: number): void {
    this.drawnRadius = radius;
    const ctx = this.darkTex.getContext();
    const c = DARK_SIZE / 2;
    ctx.clearRect(0, 0, DARK_SIZE, DARK_SIZE);
    const g = ctx.createRadialGradient(c, c, radius * 0.45, c, c, radius);
    g.addColorStop(0, `rgba(${DARK_COLOR}, 0)`);
    g.addColorStop(0.6, `rgba(${DARK_COLOR}, 0.55)`);
    g.addColorStop(1, `rgba(${DARK_COLOR}, 1)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, DARK_SIZE, DARK_SIZE);
    this.darkTex.refresh();
  }

  private resetFlake(f: Phaser.GameObjects.Image, anywhere: boolean): void {
    const cam = this.cameras.main;
    const view = cam.worldView;
    const y = anywhere ? view.y + Math.random() * Math.max(1, view.height) : view.y - 4;
    const row = Math.floor(y / TILE);
    const cols: number[] = [];
    if (row >= 0 && row < MAP_H) {
      for (let x = 0; x < MAP_W; x++) if (WALKABLE.has(this.mapData.tiles[row][x])) cols.push(x);
    }
    const r = regionAtRow(Math.max(0, Math.min(MAP_H - 1, row)));
    if (!r.canal || cols.length === 0) {
      f.setVisible(false);
      f.setPosition(-100, y);
      return;
    }
    f.setVisible(true);
    const cx = cols[Math.floor(Math.random() * cols.length)];
    f.setPosition(cx * TILE + Math.random() * TILE, y);
  }

  private updateFlakes(dt: number): void {
    const view = this.cameras.main.worldView;
    for (const f of this.flakes) {
      f.y += CONVEYOR_SPEED * 1.5 * dt;
      if (f.y > view.bottom + 4 || f.y < view.y - 40 || !f.visible) {
        if (Math.random() < 0.05 || f.y > view.bottom + 4 || f.y < view.y - 40) this.resetFlake(f, f.y < view.y - 40);
      }
    }
  }

  private puff(x: number, y: number, tint: number): void {
    const p = this.add.image(x, y, 'fx_puff').setDepth(9998).setTint(tint);
    this.tweens.add({ targets: p, scale: 1.8, alpha: 0, duration: 300, onComplete: () => p.destroy() });
  }

  private popNumber(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, {
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        fontStyle: 'bold',
        color,
        stroke: '#1b1020',
        strokeThickness: 3,
        resolution: 4,
      })
      .setOrigin(0.5)
      .setDepth(10000);
    this.tweens.add({ targets: t, y: y - 14, alpha: 0, duration: 700, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private applyZoom(): void {
    // 描画は端末の画素単位。1ドット＝整数画素で、論理サイズで約1.33倍に見える倍率（設計レビュー13 M8）
    const dpr = (this.registry.get('dpr') as number | undefined) ?? 1;
    this.cameras.main.setZoom(pixelZoom(dpr));
  }

  // ---------------- セーブ ----------------

  async save(showToast: boolean): Promise<void> {
    if (!store.data || this.dead) return;
    const e = ear();
    e.position = { map: 'ear-a01', x: Math.round(this.player.x), y: Math.round(this.player.y) };
    await writeSave(store.data);
    if (showToast) bus.emit('toast', { text: 'セーブしました（HP回復）', kind: 'good' });
  }
}
