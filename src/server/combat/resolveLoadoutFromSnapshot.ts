// @ts-nocheck
import { getDefaultClassActiveLoadout, normalizeClassActiveLoadout, } from '../../shared/combat/movesetLoadout.js';
import { resolveEffectiveEquippedForCombat } from '../../shared/economy/chargedEquipmentBattle.js';
import { emptyMarcosNodeProgression } from '../../shared/progression/marcoProgression.js';
import { getCharacterProfile } from '../../Economy/economyStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
/**
 * Monta PlayerCombatLoadout a partir do perfil econômico autoritativo + snapshot de combate.
 * Inventário, equipamento efetivo e buff de livro vêm do economyStore (pós-sync/consumo).
 */
export function resolveLoadoutFromSnapshot(playerId, characterId, snapshot) {
    const profile = getCharacterProfile(playerId, characterId);
    const classId = snapshot.classId ?? 'IMPETUS';
    const normalizedMoves = snapshot.activeMovesets && snapshot.activeMovesets.length > 0
        ? normalizeClassActiveLoadout(classId, snapshot.activeMovesets)
            ?? getDefaultClassActiveLoadout(classId)
        : getDefaultClassActiveLoadout(classId);
    const equipped = resolveEffectiveEquippedForCombat(profile.equipped, profile.inventory);
    const progressionState = getAuthoritativeProgression(playerId, characterId);
    return {
        playerId,
        characterId,
        classId,
        level: snapshot.level ?? progressionState.characterProfile.level ?? 1,
        flowSpeedBase: 35,
        activeMarcos: snapshot.marcoDominance
            ? [...snapshot.marcoDominance.activeMarcos]
            : ['quickStep'],
        nodeProgression: snapshot.marcoDominance?.nodeProgression ?? emptyMarcosNodeProgression(),
        equipped,
        inventory: profile.inventory.map((row) => ({ ...row })),
        activeBookBuff: profile.activeBookBuff,
        equippedSkillIds: [...normalizedMoves],
        displayName: snapshot.displayName ?? 'Operative',
        ...(snapshot.worldVitals ? { worldVitals: { ...snapshot.worldVitals } } : {}),
        ...(snapshot.pet ? { pet: snapshot.pet } : {}),
        movesetMastery: { ...progressionState.progression.movesetMastery },
    };
}
