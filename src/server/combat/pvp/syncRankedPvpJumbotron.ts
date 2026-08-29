import type { CombatEvent } from '../../../shared/events.js';
import {
  buildPvpJumbotronSnapshot,
  createIdlePvpJumbotronSnapshot,
  resolvePvpJumbotronLastLogLine,
} from '../../../shared/combat/pvp/pvpJumbotronSnapshot.js';
import { getPvpJumbotronSnapshot, publishPvpJumbotronSnapshot } from './pvpJumbotronAuthority.js';
import type { RankedPvpCombatSession } from './RankedPvpCombatSession.js';

/** Só o púlpito ranqueado alimenta o telão — casual não sobrescreve. */
export function syncRankedPvpJumbotronFromSession(
  session: RankedPvpCombatSession,
  events: readonly CombatEvent[] = [],
): void {
  if (!session.appliesRankedRating()) return;
  const state = session.getState();
  if (state.phase === 'ENDED') {
    publishPvpJumbotronSnapshot(createIdlePvpJumbotronSnapshot());
    return;
  }
  const peers = session.listPeers();
  const peerA = peers[0];
  const peerB = peers[1];
  if (!peerA || !peerB) {
    publishPvpJumbotronSnapshot(createIdlePvpJumbotronSnapshot());
    return;
  }
  const previous = getPvpJumbotronSnapshot();
  const lastLogLine = resolvePvpJumbotronLastLogLine(
    events,
    state.combatants,
    previous.lastLogLine,
  );
  publishPvpJumbotronSnapshot(buildPvpJumbotronSnapshot({
    state,
    actorAId: peerA.actorId,
    actorBId: peerB.actorId,
    lastLogLine,
  }));
}

export function clearRankedPvpJumbotron(session?: RankedPvpCombatSession): void {
  if (session && !session.appliesRankedRating()) return;
  publishPvpJumbotronSnapshot(createIdlePvpJumbotronSnapshot());
}
