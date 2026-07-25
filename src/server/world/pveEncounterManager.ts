/**
 * Ofertas de encontro PVE — autoridade no servidor.
 *
 * Abandono (timeout / saiu / disconnect) → libera monstro + próximo encontro = batalha 100%.
 */

import {
  CREATURE_ENCOUNTER_FLEE_COOLDOWN_MS,
  CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS,
  isPlayerInMonsterEncounterRange,
  resolveCreatureWanderProfile,
} from '../../shared/world/creatureWanderConfig.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import type { MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import type {
  PveEncounterClearPayload,
  PveEncounterFleeResultPayload,
  PveEncounterOfferPayload,
} from '../../shared/world/pveEncounterProtocol.js';
import {
  getActiveMonstersForMap,
  getWorldMonsterEntry,
} from '../../shared/world/worldMonsterInstances.js';
import {
  isMonsterClaimedByOther,
  markMonsterClaimInCombat,
  releaseMonsterClaimIfOwner,
  tryClaimMonsterForHud,
  __resetPveMonsterClaimsForTests,
} from './pveMonsterClaim.js';
import type { CreatureAiPlayerProbe } from './creatureAiTick.js';

export {
  isMonsterEncounterClaimed,
  isMonsterClaimedByOther,
  releasePveMonsterClaim,
} from './pveMonsterClaim.js';

export type PveEncounterOutbound =
  | { readonly connectionKey: string; readonly type: 'pve-encounter-offer'; readonly payload: PveEncounterOfferPayload }
  | { readonly connectionKey: string; readonly type: 'pve-encounter-clear'; readonly payload: PveEncounterClearPayload }
  | { readonly connectionKey: string; readonly type: 'pve-encounter-flee-result'; readonly payload: PveEncounterFleeResultPayload };

export type PveForceBattleJoin = {
  readonly connectionId: string;
  readonly playerId: string;
  readonly characterId: number;
  readonly monsterInstanceId: string;
};

export type PveEncounterTickResult = {
  readonly outbound: readonly PveEncounterOutbound[];
  readonly forceBattles: readonly PveForceBattleJoin[];
};

type PendingOffer = {
  readonly monsterInstanceId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly mapId: string;
  readonly offeredAtMs: number;
  readonly connectionKey: string;
  readonly playerId: string;
  readonly characterId: number;
};

type FleeCooldown = {
  readonly untilMs: number;
};

type CombatGrant = {
  readonly monsterInstanceId: string;
  readonly untilMs: number;
};

const pendingByPlayerKey = new Map<string, PendingOffer>();
const fleeCooldownByPair = new Map<string, FleeCooldown>();
const combatGrantByPlayerKey = new Map<string, CombatGrant>();
/** Próximo encontro PVE inicia combate obrigatório (sem HUD / sem fuga). */
const forceBattleNextByPlayerKey = new Set<string>();
/** Evita double handleJoin enquanto o force-join anterior ainda resolve. */
const forceJoinInFlightByPlayerKey = new Set<string>();

const PVE_COMBAT_GRANT_TTL_MS = 5_000;

const ABANDON_REASONS: ReadonlySet<PveEncounterClearPayload['reason']> = new Set([
  'expired',
  'moved_away',
  'cancelled',
]);

function playerKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function pairKey(playerId: string, characterId: number, monsterInstanceId: string): string {
  return `${playerKey(playerId, characterId)}:${monsterInstanceId}`;
}

export function markForceBattleNextEncounter(playerId: string, characterId: number): void {
  forceBattleNextByPlayerKey.add(playerKey(playerId, characterId));
}

export function hasForceBattleNextEncounter(playerId: string, characterId: number): boolean {
  return forceBattleNextByPlayerKey.has(playerKey(playerId, characterId));
}

export function consumeForceBattleNextEncounter(playerId: string, characterId: number): boolean {
  const key = playerKey(playerId, characterId);
  if (!forceBattleNextByPlayerKey.has(key)) return false;
  forceBattleNextByPlayerKey.delete(key);
  return true;
}

/** Limpa flag de combate obrigatório — só após join bem-sucedido. */

export function clearForceJoinInFlight(playerId: string, characterId: number): void {
  forceJoinInFlightByPlayerKey.delete(playerKey(playerId, characterId));
}

export function issuePveCombatGrant(
  playerId: string,
  characterId: number,
  monsterInstanceId: string,
  nowMs: number,
): void {
  combatGrantByPlayerKey.set(playerKey(playerId, characterId), {
    monsterInstanceId,
    untilMs: nowMs + PVE_COMBAT_GRANT_TTL_MS,
  });
}

export function consumePveCombatGrant(
  playerId: string,
  characterId: number,
  monsterInstanceId: string,
  nowMs: number,
): boolean {
  const key = playerKey(playerId, characterId);
  const grant = combatGrantByPlayerKey.get(key);
  if (!grant) return false;
  if (nowMs > grant.untilMs || grant.monsterInstanceId !== monsterInstanceId) {
    combatGrantByPlayerKey.delete(key);
    return false;
  }
  combatGrantByPlayerKey.delete(key);
  return true;
}

export type EncounterPlayerProbe = CreatureAiPlayerProbe & {
  readonly connectionId: string;
};

function findEncounterCandidates(
  mapId: string,
  playerWorldX: number,
  playerWorldY: number,
  playerId: string,
  characterId: number,
): readonly MonsterRegistryEntry[] {
  if (!isMapId(mapId)) return [];
  const tileSize = resolveMapTileSize(mapId);
  return getActiveMonstersForMap(mapId).filter((monster) => {
    if (isMonsterClaimedByOther(monster.id, playerId, characterId)) return false;
    return isPlayerInMonsterEncounterRange(playerWorldX, playerWorldY, monster, tileSize);
  });
}

function pushOffer(out: PveEncounterOutbound[], offer: PendingOffer): void {
  out.push({
    connectionKey: offer.connectionKey,
    type: 'pve-encounter-offer',
    payload: {
      monsterInstanceId: offer.monsterInstanceId,
      creatureId: offer.creatureId,
      name: offer.name,
      mapId: offer.mapId,
      offeredAtMs: offer.offeredAtMs,
    },
  });
}

function clearPendingAndReleaseClaim(
  key: string,
  existing: PendingOffer,
  reason: PveEncounterClearPayload['reason'],
): PveEncounterOutbound {
  pendingByPlayerKey.delete(key);
  releaseMonsterClaimIfOwner(
    existing.monsterInstanceId,
    existing.playerId,
    existing.characterId,
  );
  return {
    connectionKey: existing.connectionKey,
    type: 'pve-encounter-clear',
    payload: { monsterInstanceId: existing.monsterInstanceId, reason },
  };
}

/** Abandono sem Aceitar/Fugir — libera monstro e marca próximo combate obrigatório. */
function abandonPendingEncounter(
  key: string,
  existing: PendingOffer,
  reason: PveEncounterClearPayload['reason'],
): PveEncounterOutbound {
  if (ABANDON_REASONS.has(reason)) {
    markForceBattleNextEncounter(existing.playerId, existing.characterId);
  }
  return clearPendingAndReleaseClaim(key, existing, reason);
}

function beginForcedBattle(
  player: EncounterPlayerProbe,
  monster: MonsterRegistryEntry,
  nowMs: number,
  forceBattles: PveForceBattleJoin[],
): void {
  const key = playerKey(player.playerId, player.characterId);
  if (forceJoinInFlightByPlayerKey.has(key)) return;
  // Flag force permanece até join OK — se falhar, o próximo tick retenta.
  forceJoinInFlightByPlayerKey.add(key);
  markMonsterClaimInCombat(monster.id, player.playerId, player.characterId);
  issuePveCombatGrant(player.playerId, player.characterId, monster.id, nowMs);
  forceBattles.push({
    connectionId: player.connectionId,
    playerId: player.playerId,
    characterId: player.characterId,
    monsterInstanceId: monster.id,
  });
}

export function tickPveEncounterOffers(
  nowMs: number,
  players: readonly EncounterPlayerProbe[],
): PveEncounterTickResult {
  const out: PveEncounterOutbound[] = [];
  const forceBattles: PveForceBattleJoin[] = [];

  for (const player of players) {
    const key = playerKey(player.playerId, player.characterId);
    const existing = pendingByPlayerKey.get(key);

    if (existing) {
      if (nowMs - existing.offeredAtMs >= CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS) {
        out.push(abandonPendingEncounter(key, existing, 'expired'));
        continue;
      }

      const monster = getWorldMonsterEntry(existing.monsterInstanceId);
      if (!monster || monster.mapId !== player.mapId || !isMapId(player.mapId)) {
        out.push(abandonPendingEncounter(key, existing, 'moved_away'));
        continue;
      }

      const tileSize = resolveMapTileSize(player.mapId);
      if (
        !isPlayerInMonsterEncounterRange(
          player.worldX,
          player.worldY,
          monster,
          tileSize,
        )
      ) {
        out.push(abandonPendingEncounter(key, existing, 'moved_away'));
      }
      continue;
    }

    const candidates = findEncounterCandidates(
      player.mapId,
      player.worldX,
      player.worldY,
      player.playerId,
      player.characterId,
    );

    const mustForce = hasForceBattleNextEncounter(player.playerId, player.characterId);

    for (const monster of candidates) {
      if (!mustForce) {
        const cd = fleeCooldownByPair.get(
          pairKey(player.playerId, player.characterId, monster.id),
        );
        if (cd && nowMs < cd.untilMs) continue;
      }

      if (mustForce) {
        if (isMonsterClaimedByOther(monster.id, player.playerId, player.characterId)) {
          continue;
        }
        beginForcedBattle(player, monster, nowMs, forceBattles);
        break;
      }

      if (!tryClaimMonsterForHud(monster.id, player.playerId, player.characterId)) {
        continue;
      }

      const offer: PendingOffer = {
        monsterInstanceId: monster.id,
        creatureId: monster.creatureId,
        name: monster.name,
        mapId: monster.mapId,
        offeredAtMs: nowMs,
        connectionKey: player.connectionId,
        playerId: player.playerId,
        characterId: player.characterId,
      };
      pendingByPlayerKey.set(key, offer);
      pushOffer(out, offer);
      break;
    }
  }

  return { outbound: out, forceBattles };
}

export function getPendingPveEncounter(
  playerId: string,
  characterId: number,
): PendingOffer | undefined {
  return pendingByPlayerKey.get(playerKey(playerId, characterId));
}

export function clearPendingPveEncounter(
  playerId: string,
  characterId: number,
  reason: PveEncounterClearPayload['reason'],
): PveEncounterOutbound | null {
  const key = playerKey(playerId, characterId);
  const existing = pendingByPlayerKey.get(key);
  if (!existing) return null;
  if (ABANDON_REASONS.has(reason)) {
    return abandonPendingEncounter(key, existing, reason);
  }
  return clearPendingAndReleaseClaim(key, existing, reason);
}

/** Disconnect / abandono de sessão com HUD aberta. */
export function abandonPveEncounterOnDisconnect(
  playerId: string,
  characterId: number,
): PveEncounterOutbound | null {
  return clearPendingPveEncounter(playerId, characterId, 'cancelled');
}

export function acceptPveEncounter(
  playerId: string,
  characterId: number,
  monsterInstanceId: string,
  nowMs: number = Date.now(),
): { readonly ok: true; readonly monsterInstanceId: string } | { readonly ok: false; readonly reason: string } {
  const pending = getPendingPveEncounter(playerId, characterId);
  if (!pending || pending.monsterInstanceId !== monsterInstanceId) {
    return { ok: false, reason: 'NO_PENDING_ENCOUNTER' };
  }
  const monster = getWorldMonsterEntry(monsterInstanceId);
  if (!monster) {
    pendingByPlayerKey.delete(playerKey(playerId, characterId));
    releaseMonsterClaimIfOwner(monsterInstanceId, playerId, characterId);
    return { ok: false, reason: 'MONSTER_NOT_ACTIVE' };
  }
  pendingByPlayerKey.delete(playerKey(playerId, characterId));
  markMonsterClaimInCombat(monsterInstanceId, playerId, characterId);
  issuePveCombatGrant(playerId, characterId, monsterInstanceId, nowMs);
  return { ok: true, monsterInstanceId };
}

export type RequestPveEncounterResult =
  | { readonly ok: true; readonly kind: 'offer'; readonly outbound: readonly PveEncounterOutbound[] }
  | { readonly ok: true; readonly kind: 'force_battle'; readonly monsterInstanceId: string }
  | { readonly ok: false; readonly reason: string };

export function requestPveEncounterOffer(
  player: EncounterPlayerProbe,
  monsterInstanceId: string,
  nowMs: number,
): RequestPveEncounterResult {
  const monster = getWorldMonsterEntry(monsterInstanceId);
  if (!monster) {
    return { ok: false, reason: 'MONSTER_NOT_ACTIVE' };
  }
  if (monster.mapId !== player.mapId) {
    return { ok: false, reason: 'MONSTER_MAP_MISMATCH' };
  }

  if (!isMapId(player.mapId)) {
    return { ok: false, reason: 'MONSTER_MAP_MISMATCH' };
  }
  const tileSize = resolveMapTileSize(player.mapId);
  if (
    !isPlayerInMonsterEncounterRange(
      player.worldX,
      player.worldY,
      monster,
      tileSize,
    )
  ) {
    return { ok: false, reason: 'MONSTER_TOO_FAR' };
  }

  if (isMonsterClaimedByOther(monsterInstanceId, player.playerId, player.characterId)) {
    return { ok: false, reason: 'MONSTER_RESERVED' };
  }

  const key = playerKey(player.playerId, player.characterId);
  const existing = pendingByPlayerKey.get(key);
  if (existing && existing.monsterInstanceId !== monsterInstanceId) {
    return { ok: false, reason: 'ENCOUNTER_BUSY' };
  }

  if (hasForceBattleNextEncounter(player.playerId, player.characterId)) {
    const forceBattles: PveForceBattleJoin[] = [];
    beginForcedBattle(player, monster, nowMs, forceBattles);
    return { ok: true, kind: 'force_battle', monsterInstanceId: monster.id };
  }

  const cd = fleeCooldownByPair.get(pairKey(player.playerId, player.characterId, monsterInstanceId));
  if (cd && nowMs < cd.untilMs) {
    return { ok: false, reason: 'ENCOUNTER_COOLDOWN' };
  }

  if (!tryClaimMonsterForHud(monster.id, player.playerId, player.characterId)) {
    return { ok: false, reason: 'MONSTER_RESERVED' };
  }

  const offer: PendingOffer = {
    monsterInstanceId: monster.id,
    creatureId: monster.creatureId,
    name: monster.name,
    mapId: monster.mapId,
    offeredAtMs: nowMs,
    connectionKey: player.connectionId,
    playerId: player.playerId,
    characterId: player.characterId,
  };
  pendingByPlayerKey.set(key, offer);

  const outbound: PveEncounterOutbound[] = [];
  pushOffer(outbound, offer);
  return { ok: true, kind: 'offer', outbound };
}

export function tryFleePveEncounter(
  playerId: string,
  characterId: number,
  monsterInstanceId: string,
  nowMs: number,
  rng: () => number = Math.random,
): {
  readonly ok: true;
  readonly fled: boolean;
  readonly outbound: readonly PveEncounterOutbound[];
} | {
  readonly ok: false;
  readonly reason: string;
} {
  const pending = getPendingPveEncounter(playerId, characterId);
  if (!pending || pending.monsterInstanceId !== monsterInstanceId) {
    return { ok: false, reason: 'NO_PENDING_ENCOUNTER' };
  }

  const fled =
    rng() < resolveCreatureWanderProfile(pending.creatureId).fleeSuccessChance;
  const outbound: PveEncounterOutbound[] = [];

  pendingByPlayerKey.delete(playerKey(playerId, characterId));

  if (fled) {
    releaseMonsterClaimIfOwner(monsterInstanceId, playerId, characterId);
    fleeCooldownByPair.set(pairKey(playerId, characterId, monsterInstanceId), {
      untilMs: nowMs + CREATURE_ENCOUNTER_FLEE_COOLDOWN_MS,
    });
    outbound.push({
      connectionKey: pending.connectionKey,
      type: 'pve-encounter-flee-result',
      payload: {
        monsterInstanceId,
        success: true,
        message: 'Você conseguiu escapar.',
      },
    });
    outbound.push({
      connectionKey: pending.connectionKey,
      type: 'pve-encounter-clear',
      payload: { monsterInstanceId, reason: 'fled' },
    });
  } else {
    markMonsterClaimInCombat(monsterInstanceId, playerId, characterId);
    issuePveCombatGrant(playerId, characterId, monsterInstanceId, nowMs);
    outbound.push({
      connectionKey: pending.connectionKey,
      type: 'pve-encounter-flee-result',
      payload: {
        monsterInstanceId,
        success: false,
        message: 'A fuga falhou! Prepare-se para a batalha.',
      },
    });
    outbound.push({
      connectionKey: pending.connectionKey,
      type: 'pve-encounter-clear',
      payload: { monsterInstanceId, reason: 'failed_flee' },
    });
  }

  return { ok: true, fled, outbound };
}

export function __resetPveEncountersForTests(): void {
  pendingByPlayerKey.clear();
  fleeCooldownByPair.clear();
  combatGrantByPlayerKey.clear();
  forceBattleNextByPlayerKey.clear();
  forceJoinInFlightByPlayerKey.clear();
  __resetPveMonsterClaimsForTests();
}
