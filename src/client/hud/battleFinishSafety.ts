// @ts-nocheck
import { getBattleLogPanel } from '../ui/battle/BattleScreen.js';
const BATTLE_FINISH_SAFETY_MS = 12000;
let safetyTimer = null;
export function armBattleFinishSafety(onTimeout, delayMs = BATTLE_FINISH_SAFETY_MS) {
    clearBattleFinishSafety();
    const wait = Math.max(1000, Math.floor(delayMs));
    safetyTimer = setTimeout(() => {
        safetyTimer = null;
        getBattleLogPanel()?.append('[ERRO] Recompensas não recebidas do servidor a tempo. Liberando tela…');
        onTimeout();
    }, wait);
}
export function clearBattleFinishSafety() {
    if (safetyTimer !== null) {
        clearTimeout(safetyTimer);
        safetyTimer = null;
    }
}
