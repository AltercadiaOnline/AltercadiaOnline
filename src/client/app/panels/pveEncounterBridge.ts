// @ts-nocheck
/**
 * Ponte WS para encontro PVE — evita import circular gameSession ↔ React HUD.
 *
 * Sender em globalThis: o bundle tsc (`/client`) faz bind e o React HUD (`/app-ui`)
 * dispara o mesmo slot — sem isso, Aceitar falha com sender null → INVALID_MESSAGE.
 */
function getSenderSlot() {
    return globalThis;
}
export function bindPveEncounterWsSender(next) {
    getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__ = next;
}
export function sendPveEncounterAccept(monsterInstanceId) {
    const sender = getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__;
    if (!sender)
        return false;
    sender('pve-encounter-accept', { monsterInstanceId });
    return true;
}
export function sendPveEncounterFlee(monsterInstanceId) {
    const sender = getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__;
    if (!sender)
        return false;
    sender('pve-encounter-flee', { monsterInstanceId });
    return true;
}
/** Tecla E / interação — pede a mesma HUD do aggro (servidor valida). */
export function sendPveEncounterRequest(monsterInstanceId) {
    const sender = getSenderSlot().__ALTERCADIA_PVE_ENCOUNTER_SENDER__;
    if (!sender)
        return false;
    sender('pve-encounter-request', { monsterInstanceId });
    return true;
}
