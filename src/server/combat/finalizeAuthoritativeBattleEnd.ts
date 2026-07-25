// @ts-nocheck
/**
 * Fim de batalha PVE autoritativo — uma fonte para CombatWsHub e LocalCombatAuthority.
 * Aplica progressão / marcos / death penalty / vitals e monta COMBAT_FINISHED + BATTLE_ENDED.
 */
import { BattleType } from '../../shared/combat/battleType.js';
import { didPlayerWinBattle, resolveBattleCreatureId, } from '../../shared/items/combatCreatureRegistry.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import { progressMarcoAuthoritative } from '../../Economy/progressionGateway.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { persistWorldVitalsAfterCombat } from '../world/persistWorldVitalsAfterCombat.js';
import { buildCitySafeSpawnPayload } from '../../shared/world/zoneTransition.js';
import { applyAuthoritativeDeathPenalty } from './applyAuthoritativeDeathPenalty.js';
import { applyAuthoritativeBattleProgression, resolveAuthoritativeBattleProgressionGrant, } from './applyAuthoritativeBattleProgression.js';
import { buildCombatFinishedEvent } from './buildCombatFinishedEvent.js';
export function finalizeAuthoritativeBattleEnd(session, payload, forcedEndReason, surrenderVoltPenalty) {
    const playerActorId = session.getPlayerActorId();
    const characterId = session.getCharacterId();
    const combatClassId = session.getCombatClassId();
    const progressionState = getAuthoritativeProgression(playerActorId, characterId);
    const movesetMastery = ensureMovesetMasteryForClass(progressionState.progression.movesetMastery, combatClassId);
    const finishedEvent = buildCombatFinishedEvent(payload.state, playerActorId, null, null, forcedEndReason, session.getMovesUsedInBattle(), {
        characterLevel: progressionState.characterProfile.level,
        movesetMastery,
    });
    const endReason = forcedEndReason
        ?? (finishedEvent.payload.victory ? 'VICTORY' : 'DEFEAT');
    let payloadPatch = {};
    let marcosUpdated;
    if (finishedEvent.payload.victory && finishedEvent.payload.progressionGrant) {
        const scaledGrant = resolveAuthoritativeBattleProgressionGrant(playerActorId, characterId, finishedEvent.payload.progressionGrant);
        applyAuthoritativeBattleProgression(playerActorId, characterId, finishedEvent.payload.progressionGrant, combatClassId);
        payloadPatch = {
            progressionGrant: scaledGrant,
            xpGain: scaledGrant.totalBattleXp,
        };
        const marcoEvents = session.getMarcoProgressEvents(true);
        if (marcoEvents.length > 0) {
            const marcoResult = progressMarcoAuthoritative(playerActorId, characterId, marcoEvents);
            if (marcoResult.ok) {
                marcosUpdated = marcoResult.marcosState;
            }
        }
    }
    else if (!finishedEvent.payload.victory && endReason !== 'FORFEIT') {
        payloadPatch = {
            deathPenaltyOutcome: applyAuthoritativeDeathPenalty(playerActorId, characterId, combatClassId),
        };
    }
    const patchedFinished = Object.keys(payloadPatch).length > 0
        ? { ...finishedEvent, payload: { ...finishedEvent.payload, ...payloadPatch } }
        : finishedEvent;
    const enriched = {
        ...payload,
        events: [...payload.events, patchedFinished],
    };
    const victory = didPlayerWinBattle(enriched.state, playerActorId);
    const playerCombatant = enriched.state.combatants[playerActorId];
    const worldVitals = playerCombatant
        ? persistWorldVitalsAfterCombat(playerActorId, characterId, playerCombatant, 
        // Derrota → respawn no centro da cidade com vitals cheios.
        victory
            ? undefined
            : (() => {
                const spawn = buildCitySafeSpawnPayload();
                return {
                    fullRestore: true,
                    respawn: {
                        mapId: spawn.mapId,
                        x: spawn.x,
                        y: spawn.y,
                        facing: spawn.facing ?? 'south',
                    },
                };
            })())
        : undefined;
    const mayHaveLoot = victory && Boolean(resolveBattleCreatureId(enriched.state.combatants, playerActorId));
    const finishedPayload = patchedFinished.payload;
    const battleEnded = {
        battleId: enriched.state.battleId,
        victory,
        monsterInstanceId: session.getMonsterInstanceId() ?? '',
        lootGranted: false,
        hasLoot: mayHaveLoot,
        endReason,
        xpGain: finishedPayload.xpGain,
        battleType: enriched.state.battleType ?? finishedPayload.battleType ?? BattleType.PVE,
        ...(finishedPayload.rankingResult !== undefined
            ? { rankingResult: finishedPayload.rankingResult }
            : {}),
        ...(endReason === 'FORFEIT' && surrenderVoltPenalty !== undefined && surrenderVoltPenalty > 0
            ? { surrenderVoltPenalty }
            : {}),
    };
    return {
        enriched,
        battleEnded,
        mayHaveLoot,
        victory,
        ...(marcosUpdated ? { marcosUpdated } : {}),
        ...(worldVitals ? { worldVitals } : {}),
    };
}
