import { TOWER_INTENT_TYPES } from '../../../shared/tower/towerIntentTypes.js';
import { BaseIntentHandler } from '../../network/BaseIntentHandler.js';
import { getAuthoritativeProgression } from '../../progression/authoritativeProgressionStore.js';
import { getWorldProfile, saveWorldProfile } from '../../world/worldProfileStore.js';
import { notifyWorldPositionPersist } from '../../world/notifyWorldPositionPersist.js';
import { ensureWorldCollisionForMap } from '../../../shared/world/constructWorldCollision.js';
import { getZoneLoadGateway } from '../../world/ZoneLoadGateway.js';
import type { MapId } from '../../../shared/world/mapRegistry.js';
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import type { TowerWorldSpawnMirror } from '../../../shared/tower/towerTypes.js';
import {
  ascendTowerFloor,
  buildTowerHudSnapshot,
  createTowerParty,
  enterTowerFloor1,
  evacuateTowerCheckpoint,
  getTowerPartyForPlayer,
  inviteToTowerParty,
  leaveTowerParty,
  setTowerPartyReady,
  unlockTowerEntry,
} from '../../tower/TowerRunRuntime.js';
import { startTowerBossCombatForParty } from '../../tower/startTowerBossCombat.js';
import { pushTowerRunSyncForParty } from '../../tower/pushTowerRunSync.js';

type EmptyPayload = Record<string, never> | undefined;

function readProfile(playerId: string, characterId: number) {
  return getAuthoritativeProgression(playerId, characterId).characterProfile;
}

export function teleportTowerPlayer(
  playerId: string,
  characterId: number,
  mapId: MapId,
  tileX: number,
  tileY: number,
): TowerWorldSpawnMirror {
  getZoneLoadGateway().ensure(mapId);
  ensureWorldCollisionForMap(mapId);
  const tile = DESIGN_CONFIG.TILE.SIZE;
  const existing = getWorldProfile(playerId, characterId);
  const facing = existing.facing ?? 'south';
  const lastPosition = {
    x: tileX * tile + tile / 2,
    y: tileY * tile + tile / 2,
  };
  const profile = saveWorldProfile(playerId, characterId, {
    ...existing,
    currentMapId: mapId,
    lastPosition,
    facing,
  });
  notifyWorldPositionPersist(playerId, characterId, profile);
  return {
    currentMapId: mapId,
    lastPosition,
    facing,
  };
}

function partySnapshot(playerId: string, characterId: number) {
  return buildTowerHudSnapshot(playerId, characterId);
}

function broadcastParty(
  playerId: string,
  characterId: number,
  worldSpawnByPlayer?: ReadonlyMap<string, TowerWorldSpawnMirror>,
): void {
  const party = getTowerPartyForPlayer(playerId);
  const targets = party
    ? party.members.map((m) => ({ playerId: m.playerId, characterId: m.characterId }))
    : [{ playerId, characterId }];
  for (const t of targets) {
    const base = partySnapshot(t.playerId, t.characterId);
    const worldSpawn = worldSpawnByPlayer?.get(t.playerId);
    pushTowerRunSyncForParty(
      [t.playerId],
      worldSpawn ? { ...base, worldSpawn } : base,
    );
  }
}

export class TowerPartyCreateHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.PARTY_CREATE;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    const characterId = session.characterId;
    if (!characterId || characterId < 1) {
      session.sendResponse(playerId, intentId, false, 'NO_WORLD_SESSION');
      return;
    }
    const profile = readProfile(playerId, characterId);
    const result = createTowerParty(
      playerId,
      characterId,
      profile.displayName?.trim() || 'Operador',
      profile.level ?? 1,
    );
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    const snap = partySnapshot(playerId, characterId);
    session.sendResponse(playerId, intentId, true, snap);
    broadcastParty(playerId, characterId);
  }
}

export class TowerPartyInviteHandler extends BaseIntentHandler<{
  readonly targetPlayerId: string;
  readonly targetCharacterId: number;
  readonly displayName?: string;
  readonly level?: number;
}> {
  readonly actionType = TOWER_INTENT_TYPES.PARTY_INVITE;

  async execute(
    playerId: string,
    payload: {
      readonly targetPlayerId: string;
      readonly targetCharacterId: number;
      readonly displayName?: string;
      readonly level?: number;
    },
    intentId: string,
  ): Promise<void> {
    const session = this.captureSession();
    if (!payload?.targetPlayerId || !payload.targetCharacterId) {
      session.sendResponse(playerId, intentId, false, 'PAYLOAD_INVALID');
      return;
    }
    const targetProfile = readProfile(payload.targetPlayerId, payload.targetCharacterId);
    const result = inviteToTowerParty(
      playerId,
      payload.targetPlayerId,
      payload.targetCharacterId,
      payload.displayName?.trim() || targetProfile.displayName?.trim() || 'Operador',
      payload.level ?? targetProfile.level ?? 1,
    );
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    session.sendResponse(playerId, intentId, true, partySnapshot(playerId, session.characterId));
    broadcastParty(playerId, session.characterId);
  }
}

export class TowerPartyLeaveHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.PARTY_LEAVE;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    const result = leaveTowerParty(playerId);
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    session.sendResponse(playerId, intentId, true, partySnapshot(playerId, session.characterId));
  }
}

export class TowerPartyReadyHandler extends BaseIntentHandler<{ readonly ready: boolean }> {
  readonly actionType = TOWER_INTENT_TYPES.PARTY_READY;

  async execute(
    playerId: string,
    payload: { readonly ready: boolean },
    intentId: string,
  ): Promise<void> {
    const session = this.captureSession();
    const result = setTowerPartyReady(playerId, payload?.ready !== false);
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    session.sendResponse(playerId, intentId, true, partySnapshot(playerId, session.characterId));
    broadcastParty(playerId, session.characterId);
  }
}

/** @deprecated Entrada é no spawn — no-op compat. */
export class TowerUnlockEntryHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.UNLOCK_ENTRY;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    const result = unlockTowerEntry(playerId);
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    session.sendResponse(playerId, intentId, true, partySnapshot(playerId, session.characterId));
  }
}

export class TowerEnterFloorHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.ENTER_FLOOR;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    const characterId = session.characterId;
    const result = enterTowerFloor1(playerId);
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    const worldSpawn = teleportTowerPlayer(playerId, characterId, result.mapId as MapId, 10, 10);
    const snap = {
      ...partySnapshot(playerId, characterId),
      mapId: result.mapId,
      worldSpawn,
    };
    session.sendResponse(playerId, intentId, true, snap);
    broadcastParty(playerId, characterId, new Map([[playerId, worldSpawn]]));
  }
}

export class TowerActivateBossHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.ACTIVATE_BOSS;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    try {
      const started = await startTowerBossCombatForParty(playerId, session.characterId);
      if (!started.ok) {
        session.sendResponse(playerId, intentId, false, started.error);
        return;
      }
      session.sendResponse(playerId, intentId, true, {
        ...partySnapshot(playerId, session.characterId),
        battleId: started.battleId,
        monsterInstanceId: started.monsterInstanceId,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'TOWER_COMBAT_FAILED';
      session.sendResponse(playerId, intentId, false, message);
    }
  }
}

export class TowerAscendHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.ASCEND;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    const characterId = session.characterId;
    const result = ascendTowerFloor(playerId);
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    const worldSpawn = teleportTowerPlayer(playerId, characterId, result.mapId as MapId, 10, 10);
    session.sendResponse(playerId, intentId, true, {
      ...partySnapshot(playerId, characterId),
      mapId: result.mapId,
      worldSpawn,
    });
    broadcastParty(playerId, characterId, new Map([[playerId, worldSpawn]]));
  }
}

export class TowerEvacuateHandler extends BaseIntentHandler<EmptyPayload> {
  readonly actionType = TOWER_INTENT_TYPES.EVACUATE;

  async execute(playerId: string, _payload: EmptyPayload, intentId: string): Promise<void> {
    const session = this.captureSession();
    const characterId = session.characterId;
    const result = evacuateTowerCheckpoint(playerId);
    if (!result.ok) {
      session.sendResponse(playerId, intentId, false, result.error);
      return;
    }
    const worldSpawn = teleportTowerPlayer(playerId, characterId, 'tower_gate', 12, 20);
    session.sendResponse(playerId, intentId, true, {
      ...partySnapshot(playerId, characterId),
      fameGain: result.fameGain,
      xpBuff: result.buff,
      mapId: 'tower_gate',
      worldSpawn,
    });
    broadcastParty(playerId, characterId, new Map([[playerId, worldSpawn]]));
  }
}

export class TowerPartyRespondHandler extends BaseIntentHandler<{
  readonly accept: boolean;
  readonly partyId?: string;
}> {
  readonly actionType = TOWER_INTENT_TYPES.PARTY_RESPOND;

  async execute(
    playerId: string,
    payload: { readonly accept: boolean; readonly partyId?: string },
    intentId: string,
  ): Promise<void> {
    const session = this.captureSession();
    if (payload?.accept === false) {
      leaveTowerParty(playerId);
    }
    session.sendResponse(playerId, intentId, true, partySnapshot(playerId, session.characterId));
  }
}

let createHandler: TowerPartyCreateHandler | null = null;
let inviteHandler: TowerPartyInviteHandler | null = null;
let leaveHandler: TowerPartyLeaveHandler | null = null;
let readyHandler: TowerPartyReadyHandler | null = null;
let respondHandler: TowerPartyRespondHandler | null = null;
let unlockHandler: TowerUnlockEntryHandler | null = null;
let enterHandler: TowerEnterFloorHandler | null = null;
let activateHandler: TowerActivateBossHandler | null = null;
let ascendHandler: TowerAscendHandler | null = null;
let evacuateHandler: TowerEvacuateHandler | null = null;

export function getTowerPartyCreateHandler(): TowerPartyCreateHandler {
  return (createHandler ??= new TowerPartyCreateHandler());
}
export function getTowerPartyInviteHandler(): TowerPartyInviteHandler {
  return (inviteHandler ??= new TowerPartyInviteHandler());
}
export function getTowerPartyLeaveHandler(): TowerPartyLeaveHandler {
  return (leaveHandler ??= new TowerPartyLeaveHandler());
}
export function getTowerPartyReadyHandler(): TowerPartyReadyHandler {
  return (readyHandler ??= new TowerPartyReadyHandler());
}
export function getTowerPartyRespondHandler(): TowerPartyRespondHandler {
  return (respondHandler ??= new TowerPartyRespondHandler());
}
export function getTowerUnlockEntryHandler(): TowerUnlockEntryHandler {
  return (unlockHandler ??= new TowerUnlockEntryHandler());
}
export function getTowerEnterFloorHandler(): TowerEnterFloorHandler {
  return (enterHandler ??= new TowerEnterFloorHandler());
}
export function getTowerActivateBossHandler(): TowerActivateBossHandler {
  return (activateHandler ??= new TowerActivateBossHandler());
}
export function getTowerAscendHandler(): TowerAscendHandler {
  return (ascendHandler ??= new TowerAscendHandler());
}
export function getTowerEvacuateHandler(): TowerEvacuateHandler {
  return (evacuateHandler ??= new TowerEvacuateHandler());
}
