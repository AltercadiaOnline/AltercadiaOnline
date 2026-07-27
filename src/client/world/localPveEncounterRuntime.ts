/**
 * Espelho local do encontro PVE + wander de criaturas.
 * Mesma UX/AI do servidor (HUD / fuga / respawn / leash ~2 tiles).
 * Só ativo em GAME_MODE=local — poses via applyServerWorldCreatureSnapshots
 * (mesmo caminho do state-sync online).
 */

import {
  CREATURE_ENCOUNTER_FLEE_COOLDOWN_MS,
  CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS,
  CREATURE_RESPAWN_MS,
  isPlayerInMonsterEncounterRange,
  resolveCreatureWanderProfile,
} from '../../shared/world/creatureWanderConfig.js';
import {
  clearCreatureAiRuntime,
  tickCreatureWanderAi,
} from '../../shared/world/creatureAiTick.js';
import { isMapId, type MapId } from '../../shared/world/mapRegistry.js';
import type { MonsterRegistryEntry } from '../../shared/world/monsterRegistry.js';
import { tileCenterToWorldPixel } from '../../shared/world/portals.js';
import {
  getActiveMonstersForMap,
  getWorldMonsterEntry,
  getWorldMonsterEntryRaw,
  restoreWorldMonsterAfterRespawn,
  stashWorldMonsterForRespawn,
} from '../../shared/world/worldMonsterInstances.js';
import { monsterEntryToCreatureSnapshot } from '../../shared/world/worldCreatureSync.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { getPveEncounterStore } from '../app/panels/pveEncounterStore.js';
import { getGameMode } from '../runtime/gameMode.js';
import { applyServerWorldCreatureSnapshots } from './worldCreatureSyncBridge.js';

export type LocalPvePlayerPose = {
  readonly mapId: string;
  readonly worldX: number;
  readonly worldY: number;
};

type PendingOffer = {
  readonly monsterInstanceId: string;
  readonly creatureId: string;
  readonly name: string;
  readonly mapId: string;
  readonly offeredAtMs: number;
};

type PoseProvider = () => LocalPvePlayerPose | null;
type ExploringProvider = () => boolean;

let poseProvider: PoseProvider | null = null;
let exploringProvider: ExploringProvider | null = null;
let tickTimer: ReturnType<typeof setInterval> | null = null;

let pending: PendingOffer | null = null;
let forceBattleNext = false;
const fleeCooldownUntil = new Map<string, number>();
const respawnAtById = new Map<string, { readonly template: MonsterRegistryEntry; readonly atMs: number }>();

function clearPendingUi(
  reason: 'accepted' | 'fled' | 'failed_flee' | 'expired' | 'cancelled' | 'moved_away',
): void {
  if (!pending) return;
  const monsterInstanceId = pending.monsterInstanceId;
  pending = null;
  getPveEncounterStore().applyClear({ monsterInstanceId, reason });
}

function abandonWithoutDecision(
  reason: 'expired' | 'moved_away' | 'cancelled',
): void {
  if (!pending) return;
  forceBattleNext = true;
  clearPendingUi(reason);
}

function findCandidates(
  mapId: MapId,
  playerWorldX: number,
  playerWorldY: number,
): MonsterRegistryEntry[] {
  const tileSize = resolveMapTileSize(mapId);
  return getActiveMonstersForMap(mapId).filter((monster) =>
    isPlayerInMonsterEncounterRange(playerWorldX, playerWorldY, monster, tileSize),
  );
}

function emitOffer(monster: MonsterRegistryEntry, nowMs: number): void {
  pending = {
    monsterInstanceId: monster.id,
    creatureId: monster.creatureId,
    name: monster.name,
    mapId: monster.mapId,
    offeredAtMs: nowMs,
  };
  getPveEncounterStore().applyOffer({
    monsterInstanceId: monster.id,
    creatureId: monster.creatureId,
    name: monster.name,
    mapId: monster.mapId,
    offeredAtMs: nowMs,
  });
}

async function startLocalBattle(monsterInstanceId: string): Promise<void> {
  forceBattleNext = false;
  const { startBattle } = await import('../game/GameStateProvider.js');
  // Force / fuga falha: combat-join no LocalCombatSocket (espelha handleJoin do servidor).
  // Aceite HUD: pve-encounter-accept → localCombatAcceptPve (sem startBattle).
  await startBattle(monsterInstanceId);
}

/**
 * Aceite PVE local — espelho de `acceptPveEncounter` no servidor.
 * Só limpa o pending interno; clear na HUD vem via `pve-encounter-clear` no socket.
 */
export function tryAcceptLocalPveEncounter(
  monsterInstanceId: string,
): { readonly ok: true; readonly monsterInstanceId: string } | { readonly ok: false; readonly reason: string } {
  if (getGameMode() !== 'local') {
    return { ok: false, reason: 'NO_PENDING_ENCOUNTER' };
  }
  if (!pending || pending.monsterInstanceId !== monsterInstanceId) {
    return { ok: false, reason: 'NO_PENDING_ENCOUNTER' };
  }
  pending = null;
  forceBattleNext = false;
  return { ok: true, monsterInstanceId };
}

function beginForcedBattle(monster: MonsterRegistryEntry): void {
  forceBattleNext = false;
  pending = null;
  getPveEncounterStore().applyClear({
    monsterInstanceId: monster.id,
    reason: 'accepted',
  });
  void startLocalBattle(monster.id);
}

/** Espelho de claim online — pending HUD congela o monstro no wander. */
function isLocalEncounterClaimed(monsterInstanceId: string): boolean {
  return pending?.monsterInstanceId === monsterInstanceId;
}

function publishLocalCreatureSnapshots(mapId: MapId): void {
  const snapshots = getActiveMonstersForMap(mapId).map(monsterEntryToCreatureSnapshot);
  applyServerWorldCreatureSnapshots(mapId, snapshots);
}

/** Mesmo tick online + publish como se viesse state-sync. */
function tickLocalCreatureWander(nowMs: number, pose: LocalPvePlayerPose): void {
  if (!isMapId(pose.mapId)) return;

  const stepped = tickCreatureWanderAi(
    nowMs,
    [
      {
        playerId: 'local-player',
        characterId: 1,
        mapId: pose.mapId,
        worldX: pose.worldX,
        worldY: pose.worldY,
      },
    ],
    { isEncounterClaimed: isLocalEncounterClaimed },
  );
  if (stepped > 0) {
    publishLocalCreatureSnapshots(pose.mapId);
  }
}

function tickLocalEncounters(nowMs: number): void {
  if (getGameMode() !== 'local') return;
  if (!exploringProvider?.()) return;

  // Respawn
  for (const [id, entry] of [...respawnAtById]) {
    if (nowMs < entry.atMs) continue;
    respawnAtById.delete(id);
    clearCreatureAiRuntime(id);
    restoreWorldMonsterAfterRespawn(entry.template);
    if (isMapId(entry.template.mapId)) {
      publishLocalCreatureSnapshots(entry.template.mapId);
    }
  }

  const pose = poseProvider?.();
  if (!pose || !isMapId(pose.mapId)) return;

  tickLocalCreatureWander(nowMs, pose);

  const tileSize = resolveMapTileSize(pose.mapId);

  if (pending) {
    if (nowMs - pending.offeredAtMs >= CREATURE_ENCOUNTER_IDLE_TIMEOUT_MS) {
      abandonWithoutDecision('expired');
      return;
    }
    const monster = getWorldMonsterEntry(pending.monsterInstanceId);
    if (!monster || monster.mapId !== pose.mapId) {
      abandonWithoutDecision('moved_away');
      return;
    }
    if (
      !isPlayerInMonsterEncounterRange(pose.worldX, pose.worldY, monster, tileSize)
    ) {
      abandonWithoutDecision('moved_away');
    }
    return;
  }

  const candidates = findCandidates(pose.mapId, pose.worldX, pose.worldY);
  for (const monster of candidates) {
    if (forceBattleNext) {
      beginForcedBattle(monster);
      return;
    }
    const cd = fleeCooldownUntil.get(monster.id);
    if (cd && nowMs < cd) continue;
    emitOffer(monster, nowMs);
    return;
  }
}

export function startLocalPveEncounterRuntime(options: {
  readonly getPose: PoseProvider;
  readonly isExploring: ExploringProvider;
}): void {
  stopLocalPveEncounterRuntime();
  poseProvider = options.getPose;
  exploringProvider = options.isExploring;
  tickTimer = setInterval(() => tickLocalEncounters(Date.now()), 100);
}

export function stopLocalPveEncounterRuntime(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
  poseProvider = null;
  exploringProvider = null;
  pending = null;
  // Mantém forceBattleNext / cooldowns / respawns na sessão de página.
}

export function resetLocalPveEncounterRuntime(): void {
  stopLocalPveEncounterRuntime();
  forceBattleNext = false;
  fleeCooldownUntil.clear();
  respawnAtById.clear();
  clearCreatureAiRuntime();
  getPveEncounterStore().reset();
}

export function dispatchLocalPveEncounter(
  type: 'pve-encounter-accept' | 'pve-encounter-flee' | 'pve-encounter-request',
  payload: { readonly monsterInstanceId: string },
): void {
  if (getGameMode() !== 'local') return;
  const nowMs = Date.now();
  const monsterId = payload.monsterInstanceId;

  if (type === 'pve-encounter-request') {
    const pose = poseProvider?.();
    if (!pose || !isMapId(pose.mapId)) return;
    const monster = getWorldMonsterEntry(monsterId);
    if (!monster || monster.mapId !== pose.mapId) return;
    const tileSize = resolveMapTileSize(pose.mapId);
    if (
      !isPlayerInMonsterEncounterRange(pose.worldX, pose.worldY, monster, tileSize)
    ) {
      return;
    }

    if (forceBattleNext) {
      beginForcedBattle(monster);
      return;
    }
    if (pending && pending.monsterInstanceId !== monsterId) return;
    const cd = fleeCooldownUntil.get(monsterId);
    if (cd && nowMs < cd) return;
    emitOffer(monster, nowMs);
    return;
  }

  if (!pending || pending.monsterInstanceId !== monsterId) return;

  // Aceite canônico: LocalCombatSocket → tryAcceptLocalPveEncounter → localCombatAcceptPve.
  // Mantido aqui só se alguém chamar dispatch direto (legado).
  if (type === 'pve-encounter-accept') {
    const accepted = tryAcceptLocalPveEncounter(monsterId);
    if (!accepted.ok) return;
    getPveEncounterStore().applyClear({ monsterInstanceId: monsterId, reason: 'accepted' });
    void startLocalBattle(monsterId);
    return;
  }

  // flee
  const creatureId = pending.creatureId;
  pending = null;
  const fled =
    Math.random() < resolveCreatureWanderProfile(creatureId).fleeSuccessChance;
  if (fled) {
    fleeCooldownUntil.set(monsterId, nowMs + CREATURE_ENCOUNTER_FLEE_COOLDOWN_MS);
    getPveEncounterStore().applyFleeResult({
      monsterInstanceId: monsterId,
      success: true,
      message: 'Você conseguiu escapar.',
    });
    getPveEncounterStore().applyClear({ monsterInstanceId: monsterId, reason: 'fled' });
    window.setTimeout(() => {
      getPveEncounterStore().clearFleeToast('Você conseguiu escapar.');
    }, 2_500);
    return;
  }

  getPveEncounterStore().applyFleeResult({
    monsterInstanceId: monsterId,
    success: false,
    message: 'A fuga falhou! Prepare-se para a batalha.',
  });
  getPveEncounterStore().applyClear({ monsterInstanceId: monsterId, reason: 'failed_flee' });
  void startLocalBattle(monsterId);
}

/** Vitória local — agenda respawn no home (mesmo timer do servidor). */
export function scheduleLocalMonsterRespawn(monsterId: string, nowMs: number = Date.now()): void {
  const live = getWorldMonsterEntryRaw(monsterId);
  if (!live) {
    stashWorldMonsterForRespawn(monsterId);
    return;
  }
  const homeTileX = live.homeTileX ?? live.tileX;
  const homeTileY = live.homeTileY ?? live.tileY;
  const tileSize = isMapId(live.mapId) ? resolveMapTileSize(live.mapId) : 32;
  const feet = tileCenterToWorldPixel(homeTileX, homeTileY, tileSize);
  const template: MonsterRegistryEntry = {
    ...live,
    tileX: homeTileX,
    tileY: homeTileY,
    worldX: feet.x,
    worldY: feet.y,
    homeTileX,
    homeTileY,
    facing: 'south',
  };
  stashWorldMonsterForRespawn(monsterId);
  clearCreatureAiRuntime(monsterId);
  respawnAtById.set(monsterId, { template, atMs: nowMs + CREATURE_RESPAWN_MS });
}
