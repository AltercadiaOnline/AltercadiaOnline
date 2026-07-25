// @ts-nocheck
export const COMBAT_PRACTICE_MAX_BATTLES_PER_INTENT = 1;
export const COMBAT_PRACTICE_MAX_MOVE_USES_PER_BATTLE = 120;
export const COMBAT_PRACTICE_MAX_DAMAGE_PER_BATTLE = 50_000;
export const COMBAT_PRACTICE_MAX_CRITS_PER_BATTLE = 60;
export function emptyCombatPractice() {
    return {
        moveUsage: {},
        triggers: {},
        damageDealt: 0,
        damageTaken: 0,
        critsLanded: 0,
        battlesPlayed: 0,
    };
}
export function mergeCombatPractice(base, delta) {
    const moveUsage = { ...base.moveUsage };
    for (const [moveId, count] of Object.entries(delta.moveUsage)) {
        if (count <= 0)
            continue;
        moveUsage[moveId] = (moveUsage[moveId] ?? 0) + count;
    }
    const triggers = { ...base.triggers };
    for (const [trigger, count] of Object.entries(delta.triggers)) {
        if (!count || count <= 0)
            continue;
        const key = trigger;
        triggers[key] = (triggers[key] ?? 0) + count;
    }
    return {
        moveUsage,
        triggers,
        damageDealt: base.damageDealt + Math.max(0, delta.damageDealt),
        damageTaken: base.damageTaken + Math.max(0, delta.damageTaken),
        critsLanded: base.critsLanded + Math.max(0, delta.critsLanded),
        battlesPlayed: base.battlesPlayed + Math.max(0, delta.battlesPlayed),
    };
}
/** Valida delta reportado pelo cliente após uma batalha (anti-replay básico). */
export function validateCombatPracticeDelta(delta) {
    if (delta.battlesPlayed < 1 || delta.battlesPlayed > COMBAT_PRACTICE_MAX_BATTLES_PER_INTENT) {
        return 'Contagem de batalhas inválida.';
    }
    if (delta.damageDealt > COMBAT_PRACTICE_MAX_DAMAGE_PER_BATTLE) {
        return 'Dano causado excede limite da batalha.';
    }
    if (delta.damageTaken > COMBAT_PRACTICE_MAX_DAMAGE_PER_BATTLE) {
        return 'Dano recebido excede limite da batalha.';
    }
    if (delta.critsLanded > COMBAT_PRACTICE_MAX_CRITS_PER_BATTLE) {
        return 'Críticos excedem limite da batalha.';
    }
    let moveUses = 0;
    for (const count of Object.values(delta.moveUsage)) {
        moveUses += count;
        if (count > COMBAT_PRACTICE_MAX_MOVE_USES_PER_BATTLE) {
            return 'Uso de movimento excede limite da batalha.';
        }
    }
    if (moveUses > COMBAT_PRACTICE_MAX_MOVE_USES_PER_BATTLE) {
        return 'Total de ações excede limite da batalha.';
    }
    for (const count of Object.values(delta.triggers)) {
        if ((count ?? 0) > COMBAT_PRACTICE_MAX_MOVE_USES_PER_BATTLE) {
            return 'Gatilho de progressão excede limite da batalha.';
        }
    }
    const hasActivity = moveUses > 0
        || delta.damageDealt > 0
        || delta.damageTaken > 0
        || delta.critsLanded > 0
        || Object.keys(delta.triggers).length > 0;
    if (!hasActivity) {
        return 'Nenhuma atividade de combate registrada.';
    }
    return null;
}
