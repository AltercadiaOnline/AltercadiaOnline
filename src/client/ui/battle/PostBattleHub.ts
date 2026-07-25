// @ts-nocheck
/**
 * @deprecated Substituído por `PostBattleHubPanel.tsx` + `postBattleHudBridge`.
 * Mantido até confirmação de QA — nenhum import ativo no runtime React.
 * Delete este arquivo após validar vitória PVE/PVP em produção local.
 */
import { POST_BATTLE_HUB_ROOT_CLASS } from '../../../shared/types/postBattleHub.js';
import { dismissPostBattleHubUi } from '../../app/battle/dismissPostBattleHubUi.js';
export { POST_BATTLE_HUB_ROOT_CLASS as POST_BATTLE_HUB_ROOT_CLASS, POST_BATTLE_HUB_FORCE_CLASS, } from '../../../shared/types/postBattleHub.js';
/** @deprecated Use `ensurePostBattleOverlayMount()` */
export function resolvePostBattleHubMountTarget() {
    if (typeof document === 'undefined') {
        throw new Error('document indisponível');
    }
    return document.body;
}
/** @deprecated Sem efeito — estilos via CSS `.post-battle-hub--force-viewport` */
export function applyPostBattleHubForceStyles(_overlay) {
    /* noop — React + styles.css */
}
/** @deprecated Use `presentPostBattleHub()` → React */
export function mountPostBattleHub() {
    console.warn('[PostBattleHub] mountPostBattleHub legado desativado — use React PostBattleHubPanel.');
}
/** @deprecated Use `dismissPostBattleHubUi()` */
export function unmountPostBattleHub(_root) {
    dismissPostBattleHubUi();
    if (typeof document === 'undefined')
        return;
    document.querySelectorAll(`.${POST_BATTLE_HUB_ROOT_CLASS}`).forEach((node) => node.remove());
}
