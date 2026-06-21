import { getRenderLayerBridge } from '../app/bridge/renderLayerBridge.js';

const BATTLE_ARENA_DOM_SELECTOR = '#scene-combat .battle-combat-top';

/** Remove arena DOM do layout quando Phaser renderiza o cenário de combate. */
export function syncPhaserBattleArenaDomVisibility(): void {
  const { renderEngine, activePhaserScene } = getRenderLayerBridge().snapshot();
  const phaserBattle = renderEngine === 'phaser' && activePhaserScene === 'battle';
  const arenaDom = document.querySelector<HTMLElement>(BATTLE_ARENA_DOM_SELECTOR);

  if (phaserBattle) {
    document.body.dataset.phaserBattleArena = '1';
    arenaDom?.setAttribute('aria-hidden', 'true');
  } else {
    delete document.body.dataset.phaserBattleArena;
    arenaDom?.setAttribute('aria-hidden', 'false');
  }
}
