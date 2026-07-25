// @ts-nocheck
import { flushBattleSceneSync } from './sceneSyncDirty.js';
import { getWorldRenderEngine } from '../worldRender/bootOnlineWorldRender.js';
/**
 * Flush Lazy Sync na entrada de batalha.
 * Construct recebe no máx. um battle-prep; inventário completo fica na store React.
 */
export function flushAndPublishBattleScenePrep() {
    const delta = flushBattleSceneSync();
    if (!delta)
        return null;
    const engine = getWorldRenderEngine();
    engine?.applyBattlePrep?.(delta);
    console.debug('[SceneSync] battle-prep flushed', {
        loadoutSlots: delta.loadout?.length ?? 0,
        consumablesChanged: Boolean(delta.consumablesChanged),
    });
    return delta;
}
