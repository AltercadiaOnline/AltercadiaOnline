import {
  facingToAnimDirection,
  resolvePlayerAnimationState,
  type PlayerAnimationSnapshot,
  type PlayerAnimDirection,
  PLAYER_ANIM_IDLE_EPSILON,
} from '../../shared/world/playerAnimationState.js';
import {
  calculateTotalWeight,
  resolveMaxCarryCapacity,
} from '../../shared/character/carryCapacity.js';
import {
  createEmptyStatsBonus,
  type PlayerStatsBonus,
} from '../../shared/character/playerStatsBonus.js';
import { getPlayerStatsGateway } from '../gateway/PlayerStatsGateway.js';
import {
  moveDirectionToFacing,
  type PlayerFacing,
} from '../../shared/world/playerFacing.js';

import type { MoveDirection, PlayerPositionUpdate } from '../../shared/world/protocol.js';
import { gridPathToWorldQueue } from '../../shared/world/pathQueue.js';
import type { GridTileCoord } from '../../shared/world/gridMovement.js';
import { resolvePlayerHeightOnTowerStep } from '../../shared/world/localizedHeight.js';
import { worldPixelToTile } from '../../shared/world/portals.js';
import type { WorldPosition } from '../../shared/world/movement.js';
import type { PlayerRenderSnapshot } from './player/index.js';
import {
  createDefaultPlayerSkin,
  type PlayerSkin,
} from '../../shared/character/playerSkin.js';
import type { MovementKeyState } from '../inputHandler.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import type { WorldSocket } from '../world/WorldSocket.js';
import {
  PlayerHybridLocomotion,
  type MovementMode,
} from './playerHybridLocomotion.js';
import type { WorldPositionSnapshot } from '../../shared/playerDataSnapshots.js';
import { reconcileAuthoritativePosition } from '../../shared/world/playerMovementReconcile.js';
import {
  getWorldMovementAuthority,
  isAuthoritativeMovementOnline,
} from '../world/worldMovementAuthority.js';

export type { MovementMode };

export type PlayerSpawn = {
  readonly x: number;
  readonly y: number;
  readonly facing?: PlayerPositionUpdate['facing'];
  readonly mapId?: string;
  readonly name?: string;
  readonly level?: number;
  readonly skin?: PlayerSkin;
};

/**
 * Avatar — locomoção híbrida MANUAL (teclado/snap) + AUTO (path-follower).
 */
export class Player {
  private readonly locomotion: PlayerHybridLocomotion;
  private lastAnimDirection: PlayerAnimDirection = 'DOWN';

  public mapId: string | undefined;
  public displayName: string;
  public level: number;
  public skin: PlayerSkin;
  private _isEncumbered = false;
  public statsBonus: PlayerStatsBonus = createEmptyStatsBonus();
  public speedBonusTotal = 0;
  /** Altura local (torre) — cliente espelha degraus; servidor é autoridade futura. */
  public heightLevel = 0;
  /** Trava de interação com HUD de mundo (ex.: terminal do Ancião Cael). */
  public isLocked = false;

  constructor(
    private readonly worldSocket: WorldSocket,
    spawn: PlayerSpawn,
  ) {
    this.locomotion = new PlayerHybridLocomotion(
      spawn.x,
      spawn.y,
      spawn.facing ?? 'south',
    );
    this.lastAnimDirection = facingToAnimDirection(this.facing);
    this.mapId = spawn.mapId;
    this.displayName = spawn.name ?? 'Operative';
    this.level = spawn.level ?? 1;
    this.skin = spawn.skin ? { ...spawn.skin } : createDefaultPlayerSkin();
    this.syncEncumberedState();
    this.calculateStats();
  }

  get movementMode(): MovementMode {
    return this.locomotion.movementMode;
  }

  get facing(): PlayerFacing {
    return this.locomotion.facing;
  }

  set facing(value: PlayerFacing) {
    this.locomotion.facing = value;
  }

  get x(): number {
    return this.locomotion.displayX;
  }

  get y(): number {
    return this.locomotion.displayY;
  }

  get renderX(): number {
    return this.locomotion.displayX;
  }

  get renderY(): number {
    return this.locomotion.displayY;
  }

  get tileX(): number {
    return this.locomotion.tileX;
  }

  get tileY(): number {
    return this.locomotion.tileY;
  }

  get maxCapacity(): number {
    return resolveMaxCarryCapacity(this.level);
  }

  get isEncumbered(): boolean {
    return this._isEncumbered;
  }

  get isMoving(): boolean {
    return this.locomotion.isMoving;
  }

  setSkin(skin: PlayerSkin): void {
    this.skin = { ...skin };
  }

  getSkin(): PlayerSkin {
    return { ...this.skin };
  }

  setDisplayName(name: string): void {
    this.displayName = name;
  }

  setLevel(level: number): void {
    this.level = Math.max(1, Math.floor(level));
    this.syncEncumberedState();
  }

  syncEncumberedState(): void {
    this._isEncumbered = this.getCurrentWeight() > this.maxCapacity;
  }

  calculateStats(): void {
    const snapshot = getPlayerStatsGateway().refreshFromLocalEquipment();
    this.statsBonus = snapshot.statsBonus;
    this.speedBonusTotal = snapshot.speedBonusTotal;
  }

  getStatsBonus(): PlayerStatsBonus {
    return { ...this.statsBonus };
  }

  getCurrentWeight(): number {
    const itemStore = getPlayerItemStore();
    return calculateTotalWeight({
      inventorySlots: itemStore.getInventorySnapshot().slots,
      equipment: itemStore.toEquipmentGrid(),
      playerLevel: this.level,
    }).currentWeight;
  }

  getAnimationState(): PlayerAnimationSnapshot {
    const velocity = this.locomotion.getVelocity();
    const snapshot = resolvePlayerAnimationState(velocity, {
      lastDirection: facingToAnimDirection(this.facing),
      idleEpsilon: PLAYER_ANIM_IDLE_EPSILON,
    });
    if (snapshot.state !== 'IDLE') {
      this.lastAnimDirection = snapshot.direction;
    }
    return snapshot;
  }

  isGridAnimating(): boolean {
    return this.locomotion.hasManualVelocity;
  }

  hasActiveWalkPath(): boolean {
    return this.locomotion.movementMode === 'AUTO' && this.locomotion.pathQueue.length > 0;
  }

  /** Point-and-click — fila de waypoints float + modo AUTO. */
  startAutoNavigation(pathQueue: readonly WorldPosition[]): void {
    this.locomotion.setPathQueue(pathQueue);
  }

  /** Legado: converte tiles do pathfinding para fila vetorial. */
  setWalkPath(path: readonly GridTileCoord[]): void {
    const queue = gridPathToWorldQueue(path, this.x, this.y);
    this.startAutoNavigation(queue);
  }

  clearWalkPath(): void {
    this.locomotion.clearPathQueue();
  }

  clearMovementInput(): void {
    this.locomotion.stop();
  }

  rotate(direction: MoveDirection): void {
    this.locomotion.stop();
    const nextFacing = moveDirectionToFacing(direction);
    if (this.locomotion.facing === nextFacing) return;
    this.locomotion.facing = nextFacing;
    this.lastAnimDirection = facingToAnimDirection(nextFacing);
    this.worldSocket.emit('rotate', { direction });
  }

  tickGridMovement(
    deltaMs: number,
    mapData: number[][],
    movementKeys: MovementKeyState | null,
  ): void {
    this.locomotion.tick(
      deltaMs,
      mapData,
      movementKeys,
      {
        speedBonusTotal: this.speedBonusTotal,
        isEncumbered: this._isEncumbered,
      },
      (step) => {
        this.worldSocket.emit('move', { stepX: step.stepX, stepY: step.stepY });
        if (isAuthoritativeMovementOnline()) {
          getWorldMovementAuthority().recordPredictedStep(
            this.x,
            this.y,
            this.facing,
          );
        }
      },
    );
  }

  /**
   * SSOT autoritativo — PlayerDataStore (GSS) notifica via subscribeWorldPosition.
   * Offline delega a applyServerUpdate; online reconcilia sem quebrar predição local.
   */
  applyWorldPositionFromStore(
    snapshot: WorldPositionSnapshot,
    context?: { readonly mapData?: number[][] },
  ): void {
    if (snapshot.mapId) {
      this.mapId = snapshot.mapId;
    }

    const update: PlayerPositionUpdate = {
      x: snapshot.x,
      y: snapshot.y,
      facing: snapshot.facing,
      mapId: snapshot.mapId,
    };

    if (!isAuthoritativeMovementOnline()) {
      this.applyServerUpdate(update, context);
      return;
    }

    const authority = getWorldMovementAuthority();
    if (update.facing && !authority.shouldDeferServerFacing(update.facing)) {
      this.facing = update.facing;
    }

    const reconcile = reconcileAuthoritativePosition({
      local: { x: this.x, y: this.y },
      remote: { x: update.x, y: update.y },
      mapId: update.mapId ?? this.mapId,
      mapData: context?.mapData,
      isMoving: this.locomotion.isMoving,
    });

    if (!reconcile.apply) {
      return;
    }

    this.locomotion.applyServerPosition(
      reconcile.position.x,
      reconcile.position.y,
      update.facing,
      { force: reconcile.force },
    );
  }

  applyServerUpdate(
    update: PlayerPositionUpdate,
    context?: { readonly mapData?: number[][] },
  ): void {
    const authority = getWorldMovementAuthority();

    if (update.mapId) {
      this.mapId = update.mapId;
    }

    if (isAuthoritativeMovementOnline()) {
      if (
        update.facing
        && !authority.shouldDeferServerFacing(update.facing)
      ) {
        this.facing = update.facing;
      }
      return;
    }

    if (update.facing) {
      this.facing = update.facing;
    }

    const reconcile = reconcileAuthoritativePosition({
      local: { x: this.x, y: this.y },
      remote: { x: update.x, y: update.y },
      mapId: update.mapId ?? this.mapId,
      mapData: context?.mapData,
      isMoving: this.locomotion.isMoving,
    });

    if (!reconcile.apply) {
      return;
    }

    this.locomotion.applyServerPosition(
      reconcile.position.x,
      reconcile.position.y,
      update.facing,
      { force: reconcile.force },
    );
  }

  forceAuthoritativePosition(update: PlayerPositionUpdate): void {
    if (update.mapId) {
      this.mapId = update.mapId;
    }
    this.locomotion.setWorldPosition(update.x, update.y, update.facing ?? this.facing);
  }

  toSnapshot(): PlayerPositionUpdate {
    return {
      x: this.renderX,
      y: this.renderY,
      facing: this.facing,
      ...(this.mapId !== undefined ? { mapId: this.mapId } : {}),
    };
  }

  toRenderSnapshot(): PlayerRenderSnapshot {
    return {
      x: this.renderX,
      y: this.renderY,
      facing: this.facing,
      name: this.displayName,
      level: this.level,
      skin: this.getSkin(),
      heightLevel: this.heightLevel,
    };
  }

  syncLocalizedHeightFromWorldPosition(): void {
    this.heightLevel = resolvePlayerHeightOnTowerStep(
      this.renderX,
      this.renderY,
      this.heightLevel,
    );
  }
}
