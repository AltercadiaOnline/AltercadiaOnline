// @ts-nocheck
export const BattleStatusId = {
    Poison: 'POISON',
    Paralysis: 'PARALYSIS',
    Blind: 'BLIND',
    Stun: 'STUN',
    Vulnerable: 'VULNERABLE',
};
export function canCombatantAct(statuses) {
    for (const status of statuses) {
        if (status.turnsRemaining <= 0)
            continue;
        if (status.id === BattleStatusId.Stun) {
            return { ok: false, reason: 'STUN' };
        }
        if (status.id === BattleStatusId.Paralysis) {
            return { ok: false, reason: 'PARALYSIS' };
        }
    }
    return { ok: true };
}
export function tickStatusEffects(statuses) {
    return statuses
        .map((entry) => ({ ...entry, turnsRemaining: entry.turnsRemaining - 1 }))
        .filter((entry) => entry.turnsRemaining > 0);
}
const VALID_STATUS_IDS = new Set(Object.values(BattleStatusId));
export function parseStatusEffects(raw) {
    if (!raw?.length)
        return [];
    const parsed = [];
    for (const token of raw) {
        const [id, turnsRaw] = token.split(':');
        if (!id || !VALID_STATUS_IDS.has(id))
            continue;
        const turns = Number(turnsRaw ?? 2);
        parsed.push({
            id: id,
            turnsRemaining: Number.isFinite(turns) ? Math.max(1, turns) : 2,
        });
    }
    return parsed;
}
export function serializeStatusEffects(statuses) {
    return statuses.map((entry) => `${entry.id}:${entry.turnsRemaining}`);
}
/** Dano de POISON aplicado no início do turno. */
export function resolvePoisonTick(statuses) {
    const poison = statuses.find((s) => s.id === BattleStatusId.Poison && s.turnsRemaining > 0);
    if (!poison)
        return 0;
    return 8;
}
/** BLIND reduz precisão — multiplicador de acerto. */
export function blindAccuracyMultiplier(statuses) {
    const blind = statuses.find((s) => s.id === BattleStatusId.Blind && s.turnsRemaining > 0);
    return blind ? 0.6 : 1;
}
export function hasBlockingStatus(statuses) {
    return !canCombatantAct(statuses).ok;
}
/** VULNERABLE: alvo recebe +20% de dano. */
export function vulnerableDamageMultiplier(statuses) {
    const vulnerable = statuses.find((s) => s.id === BattleStatusId.Vulnerable && s.turnsRemaining > 0);
    return vulnerable ? 1.2 : 1;
}
