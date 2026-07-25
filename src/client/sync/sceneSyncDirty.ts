// @ts-nocheck
/**
 * Lazy Sync — dirty flags de cena (Observer).
 *
 * Menus React (inventário / moveset) NÃO empurram postMessage ao Construct.
 * Só na transição exploração → batalha o flush injeta o delta mínimo.
 *
 * Hot path (posição) continua em exploration-frame — fora deste módulo.
 */
function getState() {
    const g = globalThis;
    if (!g.__ALTERCADIA_SCENE_SYNC_DIRTY__) {
        g.__ALTERCADIA_SCENE_SYNC_DIRTY__ = {
            battleLoadoutDirty: false,
            battleConsumablesDirty: false,
            pendingLoadout: null,
        };
    }
    return g.__ALTERCADIA_SCENE_SYNC_DIRTY__;
}
/** Moveset salvo no servidor — marca dirty; Construct não é notificado ainda. */
export function markBattleLoadoutDirty(loadout) {
    const state = getState();
    state.battleLoadoutDirty = true;
    state.pendingLoadout = [...loadout];
}
/** Compra/uso/loot de inventário — dirty de consumíveis de batalha. */
export function markBattleConsumablesDirty() {
    getState().battleConsumablesDirty = true;
}
export function isBattleSceneSyncDirty() {
    const state = getState();
    return state.battleLoadoutDirty || state.battleConsumablesDirty;
}
export function peekBattleSceneSyncDirty() {
    return { ...getState() };
}
/**
 * Flush único — chamar só ao entrar em batalha.
 * Retorna null se não há nada dirty (já sincronizado / primeira entrada limpa).
 */
export function flushBattleSceneSync() {
    const state = getState();
    if (!state.battleLoadoutDirty && !state.battleConsumablesDirty) {
        return null;
    }
    const delta = {
        timestampMs: Date.now(),
        ...(state.battleLoadoutDirty && state.pendingLoadout
            ? { loadout: [...state.pendingLoadout] }
            : {}),
        ...(state.battleConsumablesDirty ? { consumablesChanged: true } : {}),
    };
    state.battleLoadoutDirty = false;
    state.battleConsumablesDirty = false;
    state.pendingLoadout = null;
    return delta;
}
/** Testes / logout — zera dirty sem flush. */
export function resetSceneSyncDirtyForTests() {
    const g = globalThis;
    g.__ALTERCADIA_SCENE_SYNC_DIRTY__ = {
        battleLoadoutDirty: false,
        battleConsumablesDirty: false,
        pendingLoadout: null,
    };
}
