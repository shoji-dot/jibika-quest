// 耳鼻科クエスト エントリーポイント
import Phaser from 'phaser';
import './style.css';
import { FieldScene } from './scenes/FieldScene';
import { bus, store } from './game/store';
import { loadSave, requestPersistence } from './game/storage';
import { initControls } from './ui/controls';
import { initDialog, initHud, renderHud } from './ui/hud';
import { initMenu } from './ui/menu';
import { showDied, showTitle } from './ui/screens';
import { bufferSize } from './systems/view';

async function boot(): Promise<void> {
  initHud();
  initDialog();
  initControls();

  const existing = await loadSave();
  const data = await showTitle(existing);
  store.data = data;
  void requestPersistence();

  document.getElementById('hud')!.hidden = false;
  document.getElementById('controls')!.hidden = false;

  // 端末の実際の画素数で描き、表示は論理サイズに縮める（ドット絵の点をそろえるため。設計レビュー13 N2）
  const dpr = window.devicePixelRatio || 1;
  const gameEl = document.getElementById('game')!;
  const initial = bufferSize(gameEl.clientWidth, gameEl.clientHeight, dpr);
  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: '#120a14',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.NONE,
      width: initial.width,
      height: initial.height,
      zoom: 1 / dpr,
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: { activePointers: 3 },
    scene: [FieldScene],
    callbacks: {
      preBoot: (g) => g.registry.set('dpr', dpr),
    },
  });
  // 画面の大きさが変わったら（回転・アドレスバーの伸縮など）描画サイズを合わせる
  new ResizeObserver(() => {
    const size = bufferSize(gameEl.clientWidth, gameEl.clientHeight, dpr);
    if (size.width !== game.scale.gameSize.width || size.height !== game.scale.gameSize.height) {
      game.scale.setGameSize(size.width, size.height);
    }
  }).observe(gameEl);

  const field = () => game.scene.getScene('field') as FieldScene;
  initMenu(() => field().save(false));
  bus.on('died', showDied);
  renderHud();

  // 開発・自動テスト用（本番でも無害）
  (window as unknown as { __jq: unknown }).__jq = { game, store, bus };
}

void boot();
