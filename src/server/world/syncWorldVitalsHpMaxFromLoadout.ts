// @ts-nocheck
import { applyPlayerHpMaxChange, computePlayerHpMax } from '../../shared/character/playerVitals.js';
import { resolveCombatLoadout } from '../../shared/combat/combatLoadoutResolver.js';
import { EconomyEventType } from '../../shared/economy/events.js';
import { globalEventBus } from '../../Economy/EventBus.js';
import { resolveAuthoritativeCombatLoadout } from '../persistence/authoritativeCombatLoadout.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';
const DEFAULT_MP_MAX = 48;
/**
 * Recalcula hpMax do SET e preenche HP atual com o delta do buff
 * (100/100 → 112/112). Emite WorldVitalsUpdated para a HUD.
 */
export function syncWorldVitalsHpMaxFromLoadout(playerId, characterId, intentId) {
    const loadout = resolveAuthoritativeCombatLoadout(playerId, characterId);
    const resolved = resolveCombatLoadout({
        classId: loadout.classId,
        level: loadout.level,
        equippedSkillIds: loadout.equippedSkillIds,
        activeMarcos: loadout.activeMarcos,
        nodeProgression: loadout.nodeProgression,
        equipped: loadout.equipped,
        flowSpeedBase: loadout.flowSpeedBase,
    });
    const nextHpMax = computePlayerHpMax(resolved.modifiers.maxHpBonusPercent);
    const profile = getWorldProfile(playerId, characterId);
    const prev = profile.sessionSync?.worldVitals;
    const previousHpMax = prev && prev.hpMax > 0 ? prev.hpMax : nextHpMax;
    const previousHpCurrent = prev ? prev.hpCurrent : nextHpMax;
    const hpCurrent = applyPlayerHpMaxChange(previousHpCurrent, previousHpMax, nextHpMax);
    const vitals = {
        hpCurrent,
        hpMax: nextHpMax,
        mpCurrent: prev?.mpCurrent ?? DEFAULT_MP_MAX,
        mpMax: prev?.mpMax ?? DEFAULT_MP_MAX,
    };
    saveWorldProfile(playerId, characterId, {
        ...profile,
        sessionSync: {
            ...profile.sessionSync,
            worldVitals: vitals,
        },
    });
    globalEventBus.emit({
        type: EconomyEventType.WorldVitalsUpdated,
        payload: {
            playerId,
            characterId,
            vitals,
            message: '',
            ...(intentId ? { intentId } : {}),
        },
    });
    return vitals;
}
