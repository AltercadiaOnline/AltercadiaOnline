/**
 * Ofertas de encontro PVE — autoridade no servidor.
 * Cliente só espelha HUD e envia aceitar / tentar fugir.
 *
 * Claim: quem abre a HUD primeiro reserva o monstro (outros não recebem offer).
 */

import {
  CREATURE_ENCOUNTER_FLEE_COOLDOWN_MS,
  CREATURE_ENCOUNTER_RADIUS_TILES,
  CREATURE_WORLD_FLEE_SUCCESS_CHANCE,
  chebyshevTileDistance,
} from '../../shared/world/creatureWanderConfig.js';
import { isMapId } from '../../shared/world/mapRegistry.js';
import type { MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import type {
  PveEncounterClearPayload,
  PveEncounterFleeResultPayload,
  PveEncounterOfferPayload,
} from '../../shared/world/pveEncounterProtocol.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import {
  getActiveMonstersForMap,
  getWorldMonsterEntry,
} from '../../shared/world/worldMonsterInstances.js';
import type { CreatureAiPlayerProbe } from './creatureAiTick.js';

export type PveEncounterOutbound =
  | { readonly connectionKey: string; readonly type: 'pve-encounter-offer'; readonly payload: PveEncounterOfferPayload }
  | { readonly connectionKey: string; readonly type: 'pve-encounter-clear'; readonly payload: PveEncounterClearPayload }
  | { readonly connectionKey: string; readonly type: 'pve-encounter-flee-result'; readonly payload: PveEncounterFleeResultPayload };

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

type MonsterClaim = {
  readonly playerId: string;
  readonly characterId: number;
  readonly phase: 'hud' | 'combat';
};

const pendingByPlayerKey = new Map<string, PendingOffer>();
const fleeCooldownByPair = new Map<string, FleeCooldown>();
/** Autoriza combat-join logo após Aceitar / fuga falha (TTL curto). */
const combatGrantByPlayerKey = new Map<string, CombatGrant>();
/** Reserva do monstro — HUD ou combate em andamento. */
const claimByMonsterId = new Map<string, MonsterClaim>();

const PVE_COMBAT_GRANT_TTL_MS = 5_000;

function playerKey(playerId: string, characterId: number): string {
  return `${playerId}:${characterId}`;
}

function pairKey(playerId: string, characterId: number, monsterInstanceId: string): string {
  return `${playerKey(playerId, characterId)}:${monsterInstanceId}`;
}

function isClaimOwner(
  claim: MonsterClaim,
  playerId: string,
  characterId: number,
): boolean {
  return claim.playerId === playerId && claim.characterId === characterId;
}

/** True se outro jogador já reservou este monstro. */
export function isMonsterClaimedByOther(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): boolean {
  const claim = claimByMonsterId.get(monsterInstanceId);
  if (!claim) return false;
  return !isClaimOwner(claim, playerId, characterId);
}

/** True se o monstro está reservado (HUD ou combate) — AI pode pausar. */
export function isMonsterEncounterClaimed(monsterInstanceId: string): boolean {
  return claimByMonsterId.has(monsterInstanceId);
}

function tryClaimMonsterForHud(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): boolean {
  const existing = claimByMonsterId.get(monsterInstanceId);
  if (existing && !isClaimOwner(existing, playerId, characterId)) {
    return false;
  }
  claimByMonsterId.set(monsterInstanceId, {
    playerId,
    characterId,
    phase: 'hud',
  });
  return true;
}

function markMonsterClaimInCombat(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): void {
  claimByMonsterId.set(monsterInstanceId, {
    playerId,
    characterId,
    phase: 'combat',
  });
}

function releaseMonsterClaimIfOwner(
  monsterInstanceId: string,
  playerId: string,
  characterId: number,
): void {
  const claim = claimByMonsterId.get(monsterInstanceId);
  if (!claim) return;
  if (!isClaimOwner(claim, playerId, characterId)) return;
  claimByMonsterId.delete(monsterInstanceId);
}

/** Libera reserva (fim de batalha sem vitória, cleanup, etc.). */
export function releasePveMonsterClaim(monsterInstanceId: string): void {
  claimByMonsterId.delete(monsterInstanceId);
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

/** Consome grant válido para este monstro. */
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
  playerTileX: number,
  playerTileY: number,
  playerId: string,
  characterId: number,
): readonly MonsterRegistryEntry[] {
  if (!isMapId(mapId)) return [];
  return getActiveMonstersForMap(mapId).filter((monster) => {
    if (isMonsterClaimedByOther(monster.id, playerId, characterId)) return false;
    const dist = chebyshevTileDistance(playerTileX, playerTileY, monster.tileX, monster.tileY);
    return dist <= CREATURE_ENCOUNTER_RADIUS_TILES;
  });
}

function pushOffer(
  out: PveEncounterOutbound[],
  offer: PendingOffer,
): void {
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

/**
 * Detecta proximidade e emite offers / clears.
 * Não inicia combate — só a HUD. Claim no momento do offer.
 */
export function tickPveEncounterOffers(
  nowMs: number,
  players: readonly EncounterPlayerProbe[],
): readonly PveEncounterOutbound[] {
  const out: PveEncounterOutbound[] = [];

  for (const player of players) {
    const key = playerKey(player.playerId, player.characterId);
    const playerTile = worldPixelToTile(player.worldX, player.worldY);
    const existing = pendingByPlayerKey.get(key);

    if (existing) {
      const monster = getWorldMonsterEntry(existing.monsterInstanceId);
      if (!monster || monster.mapId !== player.mapId) {
        out.push(clearPendingAndReleaseClaim(key, existing, 'moved_away'));
        continue;
      }

      const dist = chebyshevTileDistance(
        playerTile.tileX,
        playerTile.tileY,
        monster.tileX,
        monster.tileY,
      );
      if (dist > CREATURE_ENCOUNTER_RADIUS_TILES) {
        out.push(clearPendingAndReleaseClaim(key, existing, 'moved_away'));
      }
      continue;
    }

    const candidates = findEncounterCandidates(
      player.mapId,
      playerTile.tileX,
      playerTile.tileY,
      player.playerId,
      player.characterId,
    );
    for (const monster of candidates) {
      const cd = fleeCooldownByPair.get(
        pairKey(player.playerId, player.characterId, monster.id),
      );
      if (cd && nowMs < cd.untilMs) continue;

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

  return out;
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
  return clearPendingAndReleaseClaim(key, existing, reason);
}

/** Aceitar encontro — grant + claim passa a combate. */
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

/**
 * Pedido manual (tecla E) — mesma HUD do aggro por proximidade.
 * Claim no sucesso; se outro player já reservou → MONSTER_RESERVED.
 */
export function requestPveEncounterOffer(
  player: EncounterPlayerProbe,
  monsterInstanceId: string,
  nowMs: number,
): { readonly ok: true; readonly outbound: readonly PveEncounterOutbound[] } | { readonly ok: false; readonly reason: string } {
  const monster = getWorldMonsterEntry(monsterInstanceId);
  if (!monster) {
    return { ok: false, reason: 'MONSTER_NOT_ACTIVE' };
  }
  if (monster.mapId !== player.mapId) {
    return { ok: false, reason: 'MONSTER_MAP_MISMATCH' };
  }

  const playerTile = worldPixelToTile(player.worldX, player.worldY);
  const dist = chebyshevTileDistance(
    playerTile.tileX,
    playerTile.tileY,
    monster.tileX,
    monster.tileY,
  );
  if (dist > CREATURE_ENCOUNTER_RADIUS_TILES) {
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
  return { ok: true, outbound };
}

/**
 * Tentar fugir — 50% sucesso. Sucesso libera claim; falha mantém claim em combate.
 */
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

  const fled = rng() < CREATURE_WORLD_FLEE_SUCCESS_CHANCE;
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
  claimByMonsterId.clear();
}
