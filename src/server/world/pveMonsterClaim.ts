// @ts-nocheck
/**
 * Reserva de monstro PVE — quem abre a HUD primeiro segura o bicho.
 */
const claimByMonsterId = new Map();
function isClaimOwner(claim, playerId, characterId) {
    return claim.playerId === playerId && claim.characterId === characterId;
}
export function isMonsterClaimedByOther(monsterInstanceId, playerId, characterId) {
    const claim = claimByMonsterId.get(monsterInstanceId);
    if (!claim)
        return false;
    return !isClaimOwner(claim, playerId, characterId);
}
export function isMonsterEncounterClaimed(monsterInstanceId) {
    return claimByMonsterId.has(monsterInstanceId);
}
export function tryClaimMonsterForHud(monsterInstanceId, playerId, characterId) {
    const existing = claimByMonsterId.get(monsterInstanceId);
    if (existing && !isClaimOwner(existing, playerId, characterId)) {
        return false;
    }
    claimByMonsterId.set(monsterInstanceId, {
        playerId,
        characterId,
        phase: 'hud',
    });
    return true;
}
export function markMonsterClaimInCombat(monsterInstanceId, playerId, characterId) {
    claimByMonsterId.set(monsterInstanceId, {
        playerId,
        characterId,
        phase: 'combat',
    });
}
export function releaseMonsterClaimIfOwner(monsterInstanceId, playerId, characterId) {
    const claim = claimByMonsterId.get(monsterInstanceId);
    if (!claim)
        return;
    if (!isClaimOwner(claim, playerId, characterId))
        return;
    claimByMonsterId.delete(monsterInstanceId);
}
export function releasePveMonsterClaim(monsterInstanceId) {
    claimByMonsterId.delete(monsterInstanceId);
}
export function __resetPveMonsterClaimsForTests() {
    claimByMonsterId.clear();
}
