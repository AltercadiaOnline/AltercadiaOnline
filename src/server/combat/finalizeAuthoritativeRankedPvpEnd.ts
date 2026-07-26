/**
 * Fim de duelo PVP rankeado — sem loot/XP de criatura; rating + vitals + BATTLE_ENDED por peer.
 */

import type { CombatDispatchPayload } from '../../shared/combatWire.js';
import type { BattleEndReason, BattleEndedPayload } from '../../shared/combat/battleEnded.js';
import type { CombatFinishedPayload } from '../../shared/combat/combatFinished.js';
import { BattleType } from '../../shared/combat/battleType.js';
import { didPlayerWinBattle } from '../../shared/items/combatCreatureRegistry.js';
import { CombatEventType } from '../../shared/events.js';
import { buildEmptyLootRevealSlots } from '../../shared/loot/lootRevealSlots.js';
import { persistWorldVitalsAfterCombat } from '../world/persistWorldVitalsAfterCombat.js';
import type { PlayerWorldVitals } from '../../shared/character/equipmentState.js';
import type { RankedPvpCombatSession, RankedPvpPeer } from './pvp/RankedPvpCombatSession.js';
import { applyPvpRankedRatingDelta } from './pvp/pvpRankedRating.js';

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

  for (const peer of session.listPeers()) {
    const basePayload = payloadsByConnection.get(peer.connectionId);
    if (!basePayload) continue;

    const forced = options?.forcedEndReasonByConnection?.get(peer.connectionId);
    const forfeited = options?.forfeitingConnectionId === peer.connectionId;
    const victory = forfeited
      ? false
      : options?.forfeitingConnectionId
        ? options.forfeitingConnectionId !== peer.connectionId
        : didPlayerWinBattle(basePayload.state, peer.actorId);

    const endReason = resolveEndReason(
      victory,
      forced ?? (forfeited ? 'FORFEIT' : undefined),
    );

    const rankingResult = applyPvpRankedRatingDelta(
      peer.playerId,
      peer.characterId,
      victory,
    );

    const finishedPayload: CombatFinishedPayload = {
      battleId: basePayload.state.battleId,
      victory,
      xpGain: 0,
      loot: null,
      lootReveal: buildEmptyLootRevealSlots(),
      battleType: BattleType.PVP,
      endReason,
      rankingResult,
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
    const worldVitals = combatant
      ? persistWorldVitalsAfterCombat(peer.playerId, peer.characterId, combatant)
      : undefined;

    const battleEnded: BattleEndedPayload = {
      battleId: enriched.state.battleId,
      victory,
      monsterInstanceId: '',
      lootGranted: false,
      hasLoot: false,
      endReason,
      battleType: BattleType.PVP,
      rankingResult,
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
