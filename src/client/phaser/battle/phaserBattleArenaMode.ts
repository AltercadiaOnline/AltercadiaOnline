import { getRenderLayerBridge } from '../../app/bridge/renderLayerBridge.js';

/** Phaser renderiza arena + VFX — DOM de projéteis fica oculto. */
export function isPhaserBattleArenaActive(): boolean {
  const { renderEngine, activePhaserScene } = getRenderLayerBridge().snapshot();
  return renderEngine === 'phaser' && activePhaserScene === 'battle';
}
