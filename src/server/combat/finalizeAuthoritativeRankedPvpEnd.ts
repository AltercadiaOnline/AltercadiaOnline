/**
 * Fim de duelo PVP (rankeado ou casual) — progressão por oponente (sem loot);
 * rating opcional + vitals + BATTLE_ENDED.
 */

import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { BattleEndReason, BattleEndedPayload } from '../../shared/combat/battleEnded.js';
import type { CombatFinishedPayload } from '../../shared/combat/combatFinished.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { didPlayerWinBattle } from '../../shared/items/combatCreatureRegistry.js';
import { CombatEventType } from '../../shared/events.js';
import { buildEmptyLootRevealSlots } from '../../shared/loot/lootRevealSlots.js';
import { ensureMovesetMasteryForClass } from '../../shared/progression/movesetMasterySeed.js';
import { resolvePvpBattleProgressionGrant } from '../../shared/progression/battleProgressionGrant.js';
import { persistWorldVitalsAfterCombat, type PersistWorldVitalsOptions } from '../world/persistWorldVitalsAfterCombat.js';
import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import { buildCitySafeSpawnPayload } from '../../shared/world/zoneTransition.js';
import type { RankedPvpCombatSession, RankedPvpPeer } from './pvp/RankedPvpCombatSession.js';
import { applyPvpRankedRatingDelta } from './pvp/pvpRankedRating.js';
import { applyAuthoritativeDeathPenalty } from './applyAuthoritativeDeathPenalty.js';
import type { DeathPenaltyOutcome } from '../../shared/progression/ProgressionPenaltyManager.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import {
  applyAuthoritativeBattleProgression,
  resolveAuthoritativeBattleProgressionGrant,
} from './applyAuthoritativeBattleProgression.js';

export type FinalizeRankedPvpPeerResult = {
  readonly peer: RankedPvpPeer;
  readonly enriched: CombatDispatchPayload;
  readonly battleEnded: BattleEndedPayload;
  readonly victory: boolean;
  readonly worldVitals?: PlayerWorldVitals;
};

export type FinalizeRankedPvpEndResult = {
  readonly peers: readonly FinalizeRankedPvpPeerResult[];
};

function resolveEndReason(
  victory: boolean,
  forcedEndReason?: BattleEndReason,
): BattleEndReason {
  if (forcedEndReason) return forcedEndReason;
  return victory ? 'VICTORY' : 'DEFEAT';
}

function resolvePeerCharacterLevel(peer: RankedPvpPeer): number {
  try {
    const state = getAuthoritativeProgression(peer.playerId, peer.characterId);
    const level = state.characterProfile.level;
    if (typeof level === 'number' && Number.isFinite(level) && level >= 1) {
      return Math.floor(level);
    }
  } catch {
    // bot / peer sem store — cai no loadout
  }
  return Math.max(1, Math.floor(peer.loadout.level ?? 1));
}

export function finalizeAuthoritativeRankedPvpEnd(
  session: RankedPvpCombatSession,
  payloadsByConnection: ReadonlyMap<string, CombatDispatchPayload>,
  options?: {
    readonly forcedEndReasonByConnection?: ReadonlyMap<string, BattleEndReason>;
    /** connectionId do jogador que desistiu / desconectou — oponente vence. */
    readonly forfeitingConnectionId?: string;
  },
): FinalizeRankedPvpEndResult {
  const peers: FinalizeRankedPvpPeerResult[] = [];
  const isCasual = !session.appliesRankedRating();
  /** FORFEIT / DC: ninguém ganha progressão (pacote produto). */
  const skipProgression = Boolean(options?.forfeitingConnectionId);

  const lastStrikerActorId = session.getLastStrikerActorId();
  let anyKoVictory = false;
  if (!options?.forfeitingConnectionId) {
    for (const peer of session.listPeers()) {
      const basePayload = payloadsByConnection.get(peer.connectionId);
      if (!basePayload) continue;
      if (didPlayerWinBattle(basePayload.state, peer.actorId)) anyKoVictory = true;
    }
  }

  for (const peer of session.listPeers()) {
    const basePayload = payloadsByConnection.get(peer.connectionId);
    if (!basePayload) continue;

    const forced = options?.forcedEndReasonByConnection?.get(peer.connectionId);
    const forfeited = options?.forfeitingConnectionId === peer.connectionId;
    const victory = forfeited
      ? false
      : options?.forfeitingConnectionId
        ? options.forfeitingConnectionId !== peer.connectionId
        : anyKoVictory
          ? didPlayerWinBattle(basePayload.state, peer.actorId)
          : lastStrikerActorId === peer.actorId;

    const endReason = resolveEndReason(
      victory,
      forced ?? (forfeited ? 'FORFEIT' : undefined),
    );

    const rankingResult = session.appliesRankedRating()
      ? applyPvpRankedRatingDelta(
        peer.playerId,
        peer.characterId,
        victory,
      )
      : undefined;

    /** Duelo do card: derrota / desistir / DC → mesma penalidade de morte do PVE. */
    let deathPenaltyOutcome: DeathPenaltyOutcome | undefined;
    if (isCasual && !victory) {
      deathPenaltyOutcome = applyAuthoritativeDeathPenalty(
        peer.playerId,
        peer.characterId,
        peer.loadout.classId,
      );
    }

    const opponent = session.getOpponentPeer(peer.connectionId);
    let progressionGrant = undefined as ReturnType<typeof resolvePvpBattleProgressionGrant> | undefined;
    let xpGain = 0;

    if (!skipProgression && opponent && endReason !== 'FORFEIT') {
      const selfLevel = resolvePeerCharacterLevel(peer);
      const opponentLevel = resolvePeerCharacterLevel(opponent);
      const progressionState = getAuthoritativeProgression(peer.playerId, peer.characterId);
      const movesetMastery = ensureMovesetMasteryForClass(
        progressionState.progression.movesetMastery,
        peer.loadout.classId,
      );
      const rawGrant = resolvePvpBattleProgressionGrant({
        victory,
        endReason,
        selfLevel,
        opponentLevel,
        movesUsedInBattle: session.getMovesUsedInBattle(peer.actorId),
        characterLevel: selfLevel,
        movesetMastery,
      });
      if (rawGrant.totalBattleXp > 0) {
        const scaledGrant = resolveAuthoritativeBattleProgressionGrant(
          peer.playerId,
          peer.characterId,
          rawGrant,
        );
        applyAuthoritativeBattleProgression(
          peer.playerId,
          peer.characterId,
          rawGrant,
          peer.loadout.classId,
        );
        progressionGrant = scaledGrant;
        xpGain = scaledGrant.totalBattleXp;
      }
    }

    const finishedPayload: CombatFinishedPayload = {
      battleId: basePayload.state.battleId,
      victory,
      xpGain,
      loot: null,
      lootReveal: buildEmptyLootRevealSlots(),
      battleType: BattleType.PVP,
      endReason,
      ...(rankingResult ? { rankingResult } : {}),
      ...(deathPenaltyOutcome !== undefined ? { deathPenaltyOutcome } : {}),
      ...(progressionGrant ? { progressionGrant } : {}),
    };

    const enriched: CombatDispatchPayload = {
      ...basePayload,
      events: [
        ...basePayload.events,
        { type: CombatEventType.COMBAT_FINISHED, payload: finishedPayload },
      ],
      ui: {
        ...basePayload.ui,
        actionsEnabled: false,
        playerActorId: peer.actorId,
      },
    };

    const combatant = enriched.state.combatants[peer.actorId];
    const casualDefeatVitalsOptions: PersistWorldVitalsOptions | undefined =
      isCasual && !victory && endReason !== 'FORFEIT'
        ? (() => {
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
          })()
        : undefined;
    const worldVitals = combatant
      ? persistWorldVitalsAfterCombat(
        peer.playerId,
        peer.characterId,
        combatant,
        {
          ...casualDefeatVitalsOptions,
          ...(!isCasual ? { keepPreBattleVitals: true } : {}),
        },
      )
      : undefined;

    const battleEnded: BattleEndedPayload = {
      battleId: enriched.state.battleId,
      victory,
      monsterInstanceId: '',
      lootGranted: false,
      hasLoot: false,
      endReason,
      battleType: BattleType.PVP,
      ...(isCasual ? { casualPvp: true } : {}),
      ...(rankingResult ? { rankingResult } : {}),
      ...(deathPenaltyOutcome !== undefined ? { deathPenaltyOutcome } : {}),
      ...(worldVitals ? { worldVitals } : {}),
      ...(xpGain > 0 ? { xpGain } : {}),
    };

    peers.push({
      peer,
      enriched,
      battleEnded,
      victory,
      ...(worldVitals ? { worldVitals } : {}),
    });
  }

  return { peers };
}
