// @ts-nocheck
import { getDefaultClassActiveLoadout, normalizeClassActiveLoadout, } from '../../shared/combat/movesetLoadout.js';
import { reconcileClassAndMovesetMastery } from '../../shared/progression/movesetMasterySeed.js';
import { getAuthoritativeProgression, patchAuthoritativeProgression, } from './authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from '../world/worldProfileStore.js';
/**
 * Fecha o elo player → classe → moveset após hidratar o save.
 * Grava `classId` se faltava, seeda domínio vazio e limpa loadout de outra classe.
 */
export function reconcileAuthoritativeCharacterClassLink(playerId, characterId) {
    const state = getAuthoritativeProgression(playerId, characterId);
    const reconciled = reconcileClassAndMovesetMastery(state.characterProfile.classId, state.progression.movesetMastery);
    if (reconciled.classIdWasMissing || reconciled.masteryWasPatched) {
        patchAuthoritativeProgression(playerId, characterId, {
            progression: { movesetMastery: reconciled.movesetMastery },
            characterProfile: { classId: reconciled.classId },
        });
    }
    const profile = getWorldProfile(playerId, characterId);
    const savedMoves = profile.sessionSync?.activeMovesets;
    if (savedMoves && savedMoves.length > 0) {
        const normalized = normalizeClassActiveLoadout(reconciled.classId, savedMoves);
        if (!normalized) {
            saveWorldProfile(playerId, characterId, {
                ...profile,
                sessionSync: {
                    ...profile.sessionSync,
                    activeMovesets: [...getDefaultClassActiveLoadout(reconciled.classId)],
                },
            });
        }
    }
    return reconciled.classId;
}
