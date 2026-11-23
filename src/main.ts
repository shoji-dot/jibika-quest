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

  const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game',
    backgroundColor: '#120a14',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: '100%',
      height: '100%',
    },
    physics: {
      default: 'arcade',
      arcade: { debug: false },
    },
    input: { activePointers: 3 },
    scene: [FieldScene],
  });

  const field = () => game.scene.getScene('field') as FieldScene;
  initMenu(() => field().save(false));
  bus.on('died', showDied);
  renderHud();

  // 開発・自動テスト用（本番でも無害）
  (window as unknown as { __jq: unknown }).__jq = { game, store, bus };
}

void boot();
