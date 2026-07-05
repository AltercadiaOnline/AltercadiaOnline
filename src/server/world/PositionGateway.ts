import type { PlayerProfile } from '../models/playerProfile.js';
import type { PositionSyncPayload, WorldLoginResult } from '../../shared/world/playerWorldProfile.js';
import {
  createDefaultWorldProfile,
  isValidWorldPosition,
} from '../../shared/world/playerWorldProfile.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { moveDirectionToFacing, moveVectorToFacing } from '../../shared/world/playerFacing.js';
import { tryGridStep, type GridStep } from '../../shared/world/gridMovement.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { getMapDefinition } from '../../shared/world/mapRegistry.js';
import { setActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { setActiveWorldCollisionMapId } from '../../shared/world/worldCollisionRegistry.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';
import type { MovePlayerIntentPayload, RotatePlayerIntentPayload } from '../../shared/world/movementIntent.js';
import {
  calculateEuclideanDistance,
  getMaxDistanceForElapsed,
  MAX_VELOCITY,
  positionDeltaPx,
  POSITION_SYNC_DELTA_TIME_SEC,
} from '../../shared/world/positionVelocityPolicy.js';
import type { Player } from '../models/Player.js';
import {
  elapsedSinceLastPositionSync,
  touchPositionSyncClock,
} from './positionSyncClock.js';
import { getWorldProfile, saveWorldProfile } from './worldProfileStore.js';
import { notifyWorldPositionPersist } from './notifyWorldPositionPersist.js';

export type PositionGatewayServer = {
  getPlayer(playerId: string, characterId: number): Player | null;
};

export type PositionSyncResult =
  | {
      readonly ok: true;
      readonly profile: PlayerProfile;
      readonly wrotePosition: boolean;
      /** Cliente deve ser corrigido para profile (ex.: drift ou checkpoint). */
      readonly forceCorrection: boolean;
    }
  | {
      readonly ok: false;
      readonly reason:
        | 'INVALID_MAP'
        | 'INVALID_POSITION'
        | 'TELEPORT_DETECTED'
        | 'MAP_MISMATCH';
      readonly profile: PlayerProfile;
      readonly forceCorrection: boolean;
    };

export type WorldLoginRequest = {
  readonly playerId: string;
  readonly characterId: number;
  readonly displayName?: string;
  /** Ignorado — servidor é autoridade da posição inicial. */
  readonly clientMapId?: string;
  readonly clientPosition?: { readonly x: number; readonly y: number };
};

export type ProcessMoveResult =
  | {
      readonly ok: true;
      readonly profile: PlayerProfile;
      readonly changed: boolean;
      readonly seq: number;
    }
  | { readonly ok: false; readonly reason: string; readonly seq: number };

export type ProcessRotateResult =
  | {
      readonly ok: true;
      readonly profile: PlayerProfile;
      readonly changed: boolean;
      readonly seq: number;
    }
  | { readonly ok: false; readonly reason: string; readonly seq: number };

/**
 * Gateway autoritativo de posição — login, validação de movimento e heartbeat.
 */
export class PositionGateway {
  constructor(private readonly server: PositionGatewayServer) {}

  handleWorldLogin(request: WorldLoginRequest): WorldLoginResult {
    const { playerId, characterId } = request;
    if (!playerId || !Number.isFinite(characterId)) {
      const fallback = createDefaultWorldProfile();
      return toLoginResult(fallback);
    }

    const stored = getWorldProfile(playerId, characterId);
    return toLoginResult(stored);
  }

  /**
   * position-sync — valida velocidade máxima antes de qualquer gravação.
   * Se inválido (teleporte), devolve a posição oficial sem mutar o perfil.
   */
  handlePositionSync(playerId: string, payload: PositionSyncPayload): PositionSyncResult | null {
    if (!playerId || !Number.isFinite(payload.characterId)) return null;
    if (!isValidWorldPosition(payload.lastPosition)) return null;

    const player = this.server.getPlayer(playerId, payload.characterId);
    if (!player || !player.isExploring()) {
      return null;
    }

    const official = getWorldProfile(playerId, payload.characterId);
    const mapDef = getMapDefinition(payload.currentMapId as MapId);
    if (!mapDef) {
      return { ok: false, reason: 'INVALID_MAP', profile: official, forceCorrection: true };
    }

    if (payload.currentMapId !== official.currentMapId) {
      return { ok: false, reason: 'MAP_MISMATCH', profile: official, forceCorrection: true };
    }

    const velocityCheck = this.validateClaimedPosition(
      playerId,
      payload.characterId,
      official.lastPosition,
      payload.lastPosition,
      payload.reason,
    );
    if (!velocityCheck.ok) {
      return velocityCheck;
    }

    const driftPx = positionDeltaPx(official.lastPosition, payload.lastPosition);
    const isCheckpoint = payload.reason === 'heartbeat'
      || payload.reason === 'battle'
      || payload.reason === 'logout';

    // MOVE_INTENT é SSOT em exploração — checkpoint nunca grava coords do cliente.
    if (isCheckpoint) {
      return {
        ok: true,
        profile: official,
        wrotePosition: false,
        forceCorrection: driftPx > 1,
      };
    }

    const facing: PlayerFacing = payload.facing ?? official.facing;
    const updated = saveWorldProfile(playerId, payload.characterId, {
      currentMapId: payload.currentMapId,
      lastPosition: payload.lastPosition,
      facing,
    });
    notifyWorldPositionPersist(playerId, payload.characterId, updated);
    return { ok: true, profile: updated, wrotePosition: true, forceCorrection: false };
  }

  /**
   * Anti-teleporte: distância > MAX_VELOCITY × deltaTime → bloqueia e devolve posição anterior.
   */
  private validateClaimedPosition(
    playerId: string,
    characterId: number,
    official: { readonly x: number; readonly y: number },
    claimed: { readonly x: number; readonly y: number },
    reason?: PositionSyncPayload['reason'],
  ): { readonly ok: true } | Extract<PositionSyncResult, { readonly ok: false }> {
    const elapsedMs = elapsedSinceLastPositionSync(playerId, characterId);
    touchPositionSyncClock(playerId, characterId);

    const distancia = calculateEuclideanDistance(official, claimed);
    const deltaTime = Math.max(elapsedMs, 50) / 1000;
    const limiteDistancia = getMaxDistanceForElapsed(elapsedMs);

    if (distancia > limiteDistancia) {
      console.warn('[PositionGateway] Teleporte bloqueado — distância excede velocidade máxima', {
        playerId,
        characterId,
        reason: reason ?? 'unspecified',
        distanciaPx: distancia,
        limiteDistanciaPx: limiteDistancia,
        maxVelocityPxPerSec: MAX_VELOCITY,
        deltaTimeSec: deltaTime,
        syncIntervalSec: POSITION_SYNC_DELTA_TIME_SEC,
      });

      const profile = getWorldProfile(playerId, characterId);
      return { ok: false, reason: 'TELEPORT_DETECTED', profile, forceCorrection: true };
    }

    return { ok: true };
  }

  /** Valida passo de grade adjacente e persiste posição oficial. */
  processMoveIntent(
    playerId: string,
    characterId: number,
    intent: MovePlayerIntentPayload,
  ): ProcessMoveResult | null {
    const player = this.server.getPlayer(playerId, characterId);
    if (!player || !player.isExploring()) {
      return null;
    }

    const profile = getWorldProfile(playerId, characterId);
    const mapDef = getMapDefinition(profile.currentMapId as MapId);
    if (!mapDef) {
      return { ok: false, reason: 'INVALID_MAP', seq: intent.seq };
    }

    const mapData = mapDef.generateData();
    setActiveMapTileSize(profile.currentMapId);
    setActiveWorldCollisionMapId(profile.currentMapId as MapId);
    const currentTile = worldPixelToTile(profile.lastPosition.x, profile.lastPosition.y);
    const targetTileX = Math.floor(intent.targetX);
    const targetTileY = Math.floor(intent.targetY);

    if (targetTileX === currentTile.tileX && targetTileY === currentTile.tileY) {
      return { ok: true, profile, changed: false, seq: intent.seq };
    }

    const step = resolveStepToward(currentTile.tileX, currentTile.tileY, targetTileX, targetTileY);
    if (!step) {
      return { ok: false, reason: 'INVALID_TARGET', seq: intent.seq };
    }

    const origin = tileCenterToWorldPixel(currentTile.tileX, currentTile.tileY);
    const next = tryGridStep(origin, step, mapData);
    if (!next) {
      return { ok: false, reason: 'BLOCKED', seq: intent.seq };
    }

    const landed = worldPixelToTile(next.x, next.y);
    if (landed.tileX !== targetTileX || landed.tileY !== targetTileY) {
      return { ok: false, reason: 'TARGET_MISMATCH', seq: intent.seq };
    }

    const facing = moveVectorToFacing(step.stepX, step.stepY);
    const updated = saveWorldProfile(playerId, characterId, {
      currentMapId: profile.currentMapId,
      lastPosition: next,
      facing,
    });
    notifyWorldPositionPersist(playerId, characterId, updated);
    touchPositionSyncClock(playerId, characterId);

    return { ok: true, profile: updated, changed: true, seq: intent.seq };
  }

  /** Pivot — gira facing sem alterar lastPosition. */
  processRotateIntent(
    playerId: string,
    characterId: number,
    intent: RotatePlayerIntentPayload,
  ): ProcessRotateResult | null {
    const player = this.server.getPlayer(playerId, characterId);
    if (!player || !player.isExploring()) {
      return null;
    }

    const profile = getWorldProfile(playerId, characterId);
    const nextFacing = moveDirectionToFacing(intent.direction);
    if (profile.facing === nextFacing) {
      return { ok: true, profile, changed: false, seq: intent.seq };
    }

    const updated = saveWorldProfile(playerId, characterId, {
      currentMapId: profile.currentMapId,
      lastPosition: profile.lastPosition,
      facing: nextFacing,
    });
    notifyWorldPositionPersist(playerId, characterId, updated);
    touchPositionSyncClock(playerId, characterId);

    return { ok: true, profile: updated, changed: true, seq: intent.seq };
  }
}

function resolveStepToward(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): GridStep | null {
  const stepX = Math.sign(toX - fromX) as -1 | 0 | 1;
  const stepY = Math.sign(toY - fromY) as -1 | 0 | 1;
  if (stepX === 0 && stepY === 0) return null;
  if (Math.abs(toX - fromX) > 1 || Math.abs(toY - fromY) > 1) return null;
  return { stepX, stepY };
}

function toLoginResult(profile: PlayerProfile): WorldLoginResult {
  return {
    ok: true,
    currentMapId: profile.currentMapId,
    lastPosition: { ...profile.lastPosition },
    facing: profile.facing,
  };
}
