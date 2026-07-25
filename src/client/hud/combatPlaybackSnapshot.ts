// @ts-nocheck
function cloneStatuses(statuses) {
    return (statuses ?? []).map((row) => ({ ...row, ...(row.metadata ? { metadata: { ...row.metadata } } : {}) }));
}
export function cloneCombatantsForPlayback(combatants) {
    const out = {};
    for (const [id, combatant] of Object.entries(combatants)) {
        out[id] = {
            ...combatant,
            skills: [...combatant.skills],
            activeStatuses: cloneStatuses(combatant.activeStatuses),
            temporaryModifiers: [...(combatant.temporaryModifiers ?? [])],
            activeShields: [...(combatant.activeShields ?? [])],
        };
    }
    return out;
}
export function applyStatusAppliedToPlayback(combatants, targetId, status) {
    const actor = combatants[targetId];
    if (!actor)
        return;
    const current = cloneStatuses(actor.activeStatuses);
    const existing = current.find((row) => row.id === status.statusId);
    const nextRow = existing
        ? {
            ...existing,
            name: status.statusName,
            turnsRemaining: Math.max(existing.turnsRemaining, status.turnsRemaining),
            stacks: Math.max(existing.stacks, status.stacks),
        }
        : {
            id: status.statusId,
            name: status.statusName,
            turnsRemaining: status.turnsRemaining,
            appliedAtTurn: status.appliedAtTurn ?? 0,
            stacks: status.stacks,
        };
    const nextStatuses = existing
        ? current.map((row) => (row.id === status.statusId ? nextRow : row))
        : [...current, nextRow];
    combatants[targetId] = { ...actor, activeStatuses: nextStatuses };
}
export function removeStatusFromPlayback(combatants, targetId, statusId) {
    const actor = combatants[targetId];
    if (!actor)
        return;
    combatants[targetId] = {
        ...actor,
        activeStatuses: (actor.activeStatuses ?? []).filter((row) => row.id !== statusId),
    };
}
