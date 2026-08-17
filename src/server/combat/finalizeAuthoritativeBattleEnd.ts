/**
 * Fim de batalha PVE autoritativo — uma fonte para CombatWsHub e LocalCombatAuthority.
 * Aplica progressão / marcos / death penalty / vitals e monta COMBAT_FINISHED + BATTLE_ENDED.
 */

import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { BattleEndReason, BattleEndedPayload } from '../../shared/combat/battleEnded.js';
import type { CombatFinishedPayload } from '../../shared/combat/combatFinished.js';
import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { BattleType } from '../../shared/combat/battleType.js';
import {
  didPlayerWinBattle,
  resolveBattleCreatureId,
} from '../../shared/items/combatCreatureRegistry.js';
import { isBossCreatureId } from '../../shared/combat/MonsterCatalog.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import type { MarcosStateSnapshot } from '../../shared/playerDataSnapshots.js';
import { progressMarcoAuthoritative } from '../../Economy/progressionGateway.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { persistWorldVitalsAfterCombat } from '../world/persistWorldVitalsAfterCombat.js';
import { buildCitySafeSpawnPayload } from '../../shared/world/zoneTransition.js';
import { applyAuthoritativeDeathPenalty } from './applyAuthoritativeDeathPenalty.js';
import { applyAuthoritativePveKillCredit } from './applyAuthoritativePveKillCredit.js';
import {
  applyAuthoritativeBattleProgression,
  resolveAuthoritativeBattleProgressionGrant,
} from './applyAuthoritativeBattleProgression.js';
import { buildCombatFinishedEvent } from './buildCombatFinishedEvent.js';
import type { CombatSession } from './CombatSession.js';

export type FinalizeAuthoritativeBattleEndResult = {
  readonly enriched: CombatDispatchPayload;
  readonly battleEnded: BattleEndedPayload;
  readonly mayHaveLoot: boolean;
  readonly victory: boolean;
  /** Presente quando marcos avançaram — Hub usa EventBus; local emite economy-event. */
  readonly marcosUpdated?: Omit<MarcosStateSnapshot, 'revision'>;
  /** Vitals persistidos — online via EventBus; local reenvia economy-event. */
  readonly worldVitals?: PlayerWorldVitals;
};

export function finalizeAuthoritativeBattleEnd(
  session: CombatSession,
  payload: CombatDispatchPayload,
  forcedEndReason?: BattleEndReason,
  surrenderVoltPenalty?: number,
): FinalizeAuthoritativeBattleEndResult {
  const playerActorId = session.getPlayerActorId();
  const characterId = session.getCharacterId();
  const combatClassId = session.getCombatClassId();
  const progressionState = getAuthoritativeProgression(playerActorId, characterId);
  const movesetMastery = ensureMovesetMasteryForClass(
    progressionState.progression.movesetMastery,
    combatClassId,
  );

  const finishedEvent = buildCombatFinishedEvent(
    payload.state,
    playerActorId,
    null,
    null,
    forcedEndReason,
    session.getMovesUsedInBattle(),
    {
      characterLevel: progressionState.characterProfile.level,
      movesetMastery,
    },
  );

  const endReason: BattleEndReason = forcedEndReason
    ?? (finishedEvent.payload.victory ? 'VICTORY' : 'DEFEAT');

  let payloadPatch: Partial<CombatFinishedPayload> = {};
  let marcosUpdated: FinalizeAuthoritativeBattleEndResult['marcosUpdated'];

  if (finishedEvent.payload.victory && finishedEvent.payload.progressionGrant) {
    const scaledGrant = resolveAuthoritativeBattleProgressionGrant(
      playerActorId,
      characterId,
      finishedEvent.payload.progressionGrant,
    );
    applyAuthoritativeBattleProgression(
      playerActorId,
      characterId,
      finishedEvent.payload.progressionGrant,
      combatClassId,
    );
    payloadPatch = {
      progressionGrant: scaledGrant,
      xpGain: scaledGrant.totalBattleXp,
    };

    const battleType = payload.state.battleType ?? BattleType.PVE;
    if (battleType === BattleType.PVE) {
      const creatureId = resolveBattleCreatureId(payload.state.combatants, playerActorId)
        ?? finishedEvent.payload.progressionGrant?.creatureId
        ?? null;
      const packSize = Math.max(1, payload.state.pveEncounterPackSize ?? 1);
      const isBoss = creatureId ? isBossCreatureId(creatureId) : false;
      applyAuthoritativePveKillCredit(playerActorId, characterId, {
        kills: isBoss ? 0 : packSize,
        bossKills: isBoss ? 1 : 0,
      });

      const marcoEvents = session.getMarcoProgressEvents(true);
      if (marcoEvents.length > 0) {
        const marcoResult = progressMarcoAuthoritative(
          playerActorId,
          characterId,
          marcoEvents,
        );
        if (marcoResult.ok) {
          marcosUpdated = marcoResult.marcosState;
        }
      }
    }
  } else if (!finishedEvent.payload.victory && endReason !== 'FORFEIT') {
    payloadPatch = {
      deathPenaltyOutcome: applyAuthoritativeDeathPenalty(
        playerActorId,
        characterId,
        combatClassId,
      ),
    };
  }

  const patchedFinished =
    Object.keys(payloadPatch).length > 0
      ? { ...finishedEvent, payload: { ...finishedEvent.payload, ...payloadPatch } }
      : finishedEvent;

  const enriched: CombatDispatchPayload = {
    ...payload,
    events: [...payload.events, patchedFinished],
  };

  const victory = didPlayerWinBattle(enriched.state, playerActorId);

  const playerCombatant = enriched.state.combatants[playerActorId];
  const worldVitals = playerCombatant
    ? persistWorldVitalsAfterCombat(
        playerActorId,
        characterId,
        playerCombatant,
        // Só derrota (HP=0) → cidade + HP baixo. Fuga (FORFEIT) e vitória → mesma posição da farm.
        victory || endReason === 'FORFEIT'
          ? undefined
          : (() => {
              const spawn = buildCitySafeSpawnPayload();
              return {
                defeatRespawn: true,
                respawn: {
                  mapId: spawn.mapId,
                  x: spawn.x,
                  y: spawn.y,
                  facing: spawn.facing ?? 'south',
                },
              };
            })(),
      )
    : undefined;
  const mayHaveLoot = victory && Boolean(
    resolveBattleCreatureId(enriched.state.combatants, playerActorId),
  );
  const finishedPayload = patchedFinished.payload;

  const battleEnded: BattleEndedPayload = {
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
    ...(finishedPayload.deathPenaltyOutcome !== undefined
      ? { deathPenaltyOutcome: finishedPayload.deathPenaltyOutcome }
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
