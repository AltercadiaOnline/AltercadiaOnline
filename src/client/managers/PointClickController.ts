import type { Player } from '../entities/Player.js';
import { InputHandler } from '../inputHandler.js';
import type { PlayerSprite } from '../entities/player/PlayerSprite.js';
import type { Camera } from '../scenes/Camera.js';
import type { MapManager } from '../managers/mapManager.js';
import type { NPCManager } from '../managers/NPCManager.js';
import { InteractionPromptOverlay } from '../ui/components/InteractionPromptOverlay.js';
import {
  INTERACTION_PROMPT_BUFFER_OFFSET_Y,
  INTERACTION_PROMPT_WORLD_OFFSET_Y,
} from '../layout/UIConstants.js';
import { screenToTile, toScreenCoords } from '../world/screenCoords.js';
import {
  findApproachTile,
  findPortalEntryTile,
  hasReachedClickTile,
} from '../../shared/world/clickNavigation.js';
import { findGridPath } from '../../shared/world/gridPathfinding.js';
import { isWithinInteractionRadius } from '../../shared/world/interactableDistance.js';
import {
  InteractableKind,
  parseInteractableId,
  portalTiles,
  type InteractableId,
} from '../../shared/world/interactableRegistry.js';
import { HitboxMap } from '../../shared/world/hitboxMap.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { tileCenterToWorldPixel, worldPixelToTile } from '../../shared/world/portals.js';
import { gridPathToWorldQueue } from '../../shared/world/pathQueue.js';
import type { WorldSocket } from '../world/WorldSocket.js';
import { isMonsterDefeated } from '../../shared/world/defeatedMonsterState.js';
import { requestPortalConfirmation } from '../world/portalConfirmationController.js';
import { getWorldObjectById, WorldObjectAction } from '../../shared/world/worldObjectRegistry.js';
import { beginWorldHudInteractionSession } from '../world/worldHudInteractionSession.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';
import type { InteractionCardTarget } from '../../shared/world/interactionCardTypes.js';
import { InteractionTargetType } from '../../shared/world/interactionCardTypes.js';
import type { Disposable } from '../utils/Disposable.js';
import { openInteractionCard, hideInteractionCard } from '../world/interactionCardController.js';
import {
  getWorldPlayerPickById,
  isWorldPlayerWithinInteractionRadius,
  pickWorldPlayerAt,
} from '../world/worldPlayerPickRegistry.js';
import { buildInteractableId } from '../../shared/world/interactableRegistry.js';

type MoveTarget = {
  readonly tileX: number;
  readonly tileY: number;
  readonly pendingInteractableId?: InteractableId;
  readonly pendingInteractionCard?: InteractionCardTarget;
};

export type NavigationDestination = {
  readonly worldX: number;
  readonly worldY: number;
  readonly tileX: number;
  readonly tileY: number;
};

export type PointClickControllerOptions = {
  readonly camera: Camera;
  readonly mapManager: MapManager;
  readonly npcManager: NPCManager;
  readonly player: Player;
  readonly worldSocket: WorldSocket;
  readonly promptHost: HTMLElement;
  readonly getMapTilesWide: () => number;
  readonly getMapTilesHigh: () => number;
  readonly onRequestCombat?: (monsterId: string) => void;
  readonly canOpenPortal?: (portalId: string) => boolean;
  readonly onNavigationDestination?: (destination: NavigationDestination | null) => void;
};

/**
 * Point-and-click — pathfinding em grade (BFS) + interações.
 */
export class PointClickController implements Disposable {
  private readonly camera: Camera;
  private readonly mapManager: MapManager;
  private readonly npcManager: NPCManager;
  private readonly player: Player;
  private readonly worldSocket: WorldSocket;
  private readonly getMapTilesWide: () => number;
  private readonly getMapTilesHigh: () => number;
  private readonly onRequestCombat: ((monsterId: string) => void) | undefined;
  private readonly canOpenPortal: ((portalId: string) => boolean) | undefined;
  private readonly onNavigationDestination: ((destination: NavigationDestination | null) => void) | undefined;
  private readonly prompt: InteractionPromptOverlay;
  private readonly offPortalConfirm: () => void;

  private hitboxMap: HitboxMap;
  private moveTarget: MoveTarget | null = null;
  private pendingInteractableId: InteractableId | null = null;

  constructor(options: PointClickControllerOptions) {
    this.camera = options.camera;
    this.mapManager = options.mapManager;
    this.npcManager = options.npcManager;
    this.player = options.player;
    this.worldSocket = options.worldSocket;
    this.getMapTilesWide = options.getMapTilesWide;
    this.getMapTilesHigh = options.getMapTilesHigh;
    this.onRequestCombat = options.onRequestCombat;
    this.canOpenPortal = options.canOpenPortal;
    this.onNavigationDestination = options.onNavigationDestination;
    this.hitboxMap = HitboxMap.forMap(options.mapManager.currentMapId);

    this.prompt = new InteractionPromptOverlay({
      host: options.promptHost,
      onAccept: () => this.acceptPendingInteraction(),
      onDismiss: () => this.dismissPrompt(),
    });

    this.offPortalConfirm = uiEvents.on(UIEventType.SHOW_PORTAL_CONFIRMATION, () => {
      this.dismissPrompt();
      this.pendingInteractableId = null;
    });
  }

  dispose(): void {
    this.offPortalConfirm();
    this.cancelNavigation();
    this.dismissPrompt();
    this.prompt.dispose();
  }

  setMapId(mapId: MapId): void {
    this.hitboxMap = HitboxMap.forMap(mapId);
    this.cancelNavigation();
    this.dismissPrompt();
  }

  handleWorldClick(screenX: number, screenY: number, options?: { readonly doubleClick?: boolean }): void {
    if (options?.doubleClick) {
      this.handleWorldDoubleClick(screenX, screenY);
      return;
    }

    if (this.prompt.isVisible()) {
      this.dismissPrompt();
    }
    hideInteractionCard();

    const pick = screenToTile(
      this.camera,
      screenX,
      screenY,
      this.getMapTilesWide(),
      this.getMapTilesHigh(),
    );
    if (!pick) return;

    const interactableId = this.hitboxMap.pick(pick.tileX, pick.tileY);
    if (interactableId) {
      this.handleInteractableClick(interactableId, screenX, screenY);
      return;
    }

    this.navigateToGroundTile(pick.tileX, pick.tileY);
  }

  cancelNavigation(): void {
    this.moveTarget = null;
    this.player.clearWalkPath();
    this.onNavigationDestination?.(null);
    hideInteractionCard();
  }

  /** Click-to-move a partir de tile (minimapa ou script). */
  navigateToTile(tileX: number, tileY: number): boolean {
    this.navigateToGroundTile(tileX, tileY);
    return this.moveTarget !== null;
  }

  /** Click-to-move a partir de pixel no mundo. */
  navigateToWorldPixel(worldX: number, worldY: number): boolean {
    const tile = worldPixelToTile(worldX, worldY);
    return this.navigateToTile(tile.tileX, tile.tileY);
  }

  refreshInteractables(): void {
    this.hitboxMap = HitboxMap.forMap(this.mapManager.currentMapId);
  }

  peekMonsterAt(tileX: number, tileY: number): string | null {
    const id = this.hitboxMap.pick(tileX, tileY);
    if (!id) return null;
    const definition = this.hitboxMap.getDefinition(id);
    if (!definition || definition.kind !== InteractableKind.MONSTER) return null;
    if (isMonsterDefeated(definition.sourceId)) return null;
    return definition.sourceId;
  }

  dismissPrompt(): void {
    this.pendingInteractableId = null;
    this.prompt.hide();
  }

  /** Retorna true enquanto o alvo de clique ainda não foi alcançado. */
  updateNavigation(
    player: Player,
    avatar: PlayerSprite | undefined,
    _deltaMs: number,
    _mapData: number[][],
  ): boolean {
    if (!this.moveTarget) return false;

    avatar?.applyAnimationSnapshot(player.getAnimationState());

    if (player.hasActiveWalkPath() || player.isMoving) {
      return true;
    }

    const reached = hasReachedClickTile(
      player.x,
      player.y,
      this.moveTarget.tileX,
      this.moveTarget.tileY,
    );

    if (!reached) {
      return true;
    }

    const pending = this.moveTarget.pendingInteractableId;
    const pendingCard = this.moveTarget.pendingInteractionCard;
    this.moveTarget = null;
    this.onNavigationDestination?.(null);
    player.clearMovementInput();
    avatar?.applyAnimationSnapshot(player.getAnimationState());

    if (pending) {
      this.queueInteractionPrompt(pending);
      return false;
    }

    if (pendingCard) {
      this.openInteractionCardAtEntity(pendingCard);
    }

    return false;
  }

  private handleWorldDoubleClick(screenX: number, screenY: number): void {
    this.dismissPrompt();

    const pick = screenToTile(
      this.camera,
      screenX,
      screenY,
      this.getMapTilesWide(),
      this.getMapTilesHigh(),
    );
    if (!pick) return;

    const target = this.resolveInteractionCardTarget(pick.tileX, pick.tileY, screenX, screenY);
    if (!target) return;

    if (this.canOpenInteractionCardNow(target)) {
      openInteractionCard(target);
      return;
    }

    this.navigateToInteractionCard(target);
  }

  private resolveInteractionCardTarget(
    tileX: number,
    tileY: number,
    screenX: number,
    screenY: number,
  ): InteractionCardTarget | null {
    const interactableId = this.hitboxMap.pick(tileX, tileY);
    if (interactableId) {
      const definition = this.hitboxMap.getDefinition(interactableId);
      if (definition?.kind === InteractableKind.NPC) {
        return {
          targetId: definition.sourceId,
          targetType: InteractionTargetType.NPC,
          displayName: definition.label,
          screenX,
          screenY,
        };
      }
    }

    const worldPlayer = pickWorldPlayerAt(tileX, tileY);
    if (worldPlayer) {
      return {
        targetId: worldPlayer.playerId,
        targetType: InteractionTargetType.PLAYER,
        displayName: worldPlayer.displayName,
        screenX,
        screenY,
      };
    }

    return null;
  }

  private canOpenInteractionCardNow(target: InteractionCardTarget): boolean {
    const player = this.player;

    if (target.targetType === InteractionTargetType.NPC) {
      const definition = this.hitboxMap.getDefinition(
        buildInteractableId(InteractableKind.NPC, target.targetId),
      );
      return definition ? isWithinInteractionRadius(player.x, player.y, definition) : false;
    }

    const entry = getWorldPlayerPickById(target.targetId);
    return entry ? isWorldPlayerWithinInteractionRadius(entry, player.x, player.y) : false;
  }

  private navigateToInteractionCard(target: InteractionCardTarget): void {
    this.cancelNavigation();
    hideInteractionCard();

    if (target.targetType === InteractionTargetType.NPC) {
      const interactableId = buildInteractableId(InteractableKind.NPC, target.targetId);
      const definition = this.hitboxMap.getDefinition(interactableId);
      if (!definition) return;

      const approach = this.resolveApproachTile(definition.tileX, definition.tileY, interactableId);
      if (!approach) return;

      this.startPathToTile(approach.tileX, approach.tileY, undefined, target);
      return;
    }

    const entry = getWorldPlayerPickById(target.targetId);
    if (!entry) return;

    const mapData = this.mapManager.mapDataSnapshot as number[][];
    const targetTile = worldPixelToTile(entry.worldX, entry.worldY);
    const approach = findApproachTile(
      mapData,
      targetTile.tileX,
      targetTile.tileY,
      this.player.x,
      this.player.y,
    );
    if (!approach) return;

    this.startPathToTile(approach.tileX, approach.tileY, undefined, target);
  }

  private openInteractionCardAtEntity(target: InteractionCardTarget): void {
    if (!this.canOpenInteractionCardNow(target)) return;

    if (target.targetType === InteractionTargetType.NPC) {
      const definition = this.hitboxMap.getDefinition(
        buildInteractableId(InteractableKind.NPC, target.targetId),
      );
      if (!definition) return;

      const center = tileCenterToWorldPixel(definition.tileX, definition.tileY);
      const screen = toScreenCoords(this.camera, center.x, center.y - INTERACTION_PROMPT_WORLD_OFFSET_Y);
      openInteractionCard({
        ...target,
        screenX: screen.screenX,
        screenY: screen.screenY,
      });
      return;
    }

    const entry = getWorldPlayerPickById(target.targetId);
    if (!entry) return;

    const screen = toScreenCoords(this.camera, entry.worldX, entry.worldY - INTERACTION_PROMPT_WORLD_OFFSET_Y);
    openInteractionCard({
      ...target,
      screenX: screen.screenX,
      screenY: screen.screenY,
    });
  }

  acceptPendingInteraction(): void {
    const interactableId = this.pendingInteractableId;
    if (!interactableId) return;

    this.dismissPrompt();
    this.executeInteraction(interactableId);
  }

  private handleInteractableClick(interactableId: InteractableId, screenX: number, screenY: number): void {
    const definition = this.hitboxMap.getDefinition(interactableId);
    if (!definition) return;

    if (definition.kind === InteractableKind.PORTAL && this.canOpenPortal) {
      if (!this.canOpenPortal(definition.sourceId)) return;
    }

    const player = this.player;
    if (isWithinInteractionRadius(player.x, player.y, definition)) {
      if (definition.kind === InteractableKind.PORTAL) {
        this.openPortalInteraction(definition.sourceId);
        return;
      }
      this.showPromptForInteractable(interactableId, screenX, screenY);
      return;
    }

    this.cancelNavigation();
    const approach = this.resolveApproachTile(definition.tileX, definition.tileY, interactableId);
    if (!approach) return;

    this.startPathToTile(approach.tileX, approach.tileY, interactableId);
  }

  private navigateToGroundTile(tileX: number, tileY: number): void {
    const center = tileCenterToWorldPixel(tileX, tileY);
    if (!this.mapManager.canPlayerWalkAt(center)) return;

    this.cancelNavigation();
    this.dismissPrompt();
    this.startPathToTile(tileX, tileY);
  }

  private startPathToTile(
    tileX: number,
    tileY: number,
    pendingInteractableId?: InteractableId,
    pendingInteractionCard?: InteractionCardTarget,
  ): void {
    const mapData = this.mapManager.mapDataSnapshot as number[][];
    const start = worldPixelToTile(this.player.x, this.player.y);
    const path = findGridPath(mapData, start, { tileX, tileY });

    if (path.length === 0 && (start.tileX !== tileX || start.tileY !== tileY)) {
      return;
    }

    const pathQueue = gridPathToWorldQueue(path, this.player.x, this.player.y);
    if (pathQueue.length === 0 && (start.tileX !== tileX || start.tileY !== tileY)) {
      return;
    }

    this.player.startAutoNavigation(pathQueue);
    this.moveTarget = {
      tileX,
      tileY,
      ...(pendingInteractableId !== undefined ? { pendingInteractableId } : {}),
      ...(pendingInteractionCard !== undefined ? { pendingInteractionCard } : {}),
    };

    const center = tileCenterToWorldPixel(tileX, tileY);
    this.onNavigationDestination?.({
      worldX: center.x,
      worldY: center.y,
      tileX,
      tileY,
    });
  }

  private resolveApproachTile(objectTileX: number, objectTileY: number, interactableId: InteractableId) {
    const mapData = this.mapManager.mapDataSnapshot as number[][];
    const { kind, sourceId } = parseInteractableId(interactableId);
    const player = this.player;

    if (kind === InteractableKind.PORTAL) {
      const portal = this.mapManager.portals.find((entry) => entry.id === sourceId);
      if (portal) {
        return findPortalEntryTile(mapData, portalTiles(portal), player.x, player.y);
      }
    }

    return findApproachTile(mapData, objectTileX, objectTileY, player.x, player.y);
  }

  private queueInteractionPrompt(interactableId: InteractableId): void {
    const definition = this.hitboxMap.getDefinition(interactableId);
    if (!definition) return;

    const player = this.player;
    if (!isWithinInteractionRadius(player.x, player.y, definition)) return;

    if (definition.kind === InteractableKind.PORTAL) {
      this.openPortalInteraction(definition.sourceId);
      return;
    }

    const center = tileCenterToWorldPixel(definition.tileX, definition.tileY);
    const screen = toScreenCoords(this.camera, center.x, center.y - INTERACTION_PROMPT_WORLD_OFFSET_Y);
    this.showPromptForInteractable(interactableId, screen.screenX, screen.screenY);
  }

  /** Portais usam só o modal central (PortalModal) — sem balão flutuante duplicado. */
  private openPortalInteraction(portalSourceId: string): void {
    if (this.canOpenPortal && !this.canOpenPortal(portalSourceId)) return;
    this.dismissPrompt();
    this.pendingInteractableId = null;
    requestPortalConfirmation(portalSourceId);
  }

  private showPromptForInteractable(interactableId: InteractableId, screenX: number, screenY: number): void {
    const definition = this.hitboxMap.getDefinition(interactableId);
    if (!definition) return;
    if (definition.kind === InteractableKind.PORTAL) return;

    this.pendingInteractableId = interactableId;
    const isCreature = definition.kind === InteractableKind.MONSTER;
    const promptOffsetY = isCreature ? 34 : INTERACTION_PROMPT_BUFFER_OFFSET_Y;
    this.prompt.show(definition.label, screenX, screenY - promptOffsetY, {
      ...(isCreature
        ? { variant: 'creature' as const, acceptLabel: 'Batalhar' }
        : {}),
    });
  }

  private executeInteraction(interactableId: InteractableId): void {
    const definition = this.hitboxMap.getDefinition(interactableId);
    if (!definition) return;

    const player = this.player;
    if (!isWithinInteractionRadius(player.x, player.y, definition)) return;

    switch (definition.kind) {
      case InteractableKind.NPC: {
        const npc = this.npcManager.getNpcById(definition.sourceId);
        if (npc) {
          InputHandler.emergencyStop(player, undefined);
          this.npcManager.executeAction(npc, player);
        }
        break;
      }
      case InteractableKind.PORTAL: {
        this.openPortalInteraction(definition.sourceId);
        break;
      }
      case InteractableKind.MONSTER: {
        if (isMonsterDefeated(definition.sourceId)) break;
        this.onRequestCombat?.(definition.sourceId);
        break;
      }
      case InteractableKind.WORLD_OBJECT: {
        const worldObject = getWorldObjectById(definition.sourceId);
        if (!worldObject) break;

        if (worldObject.action === WorldObjectAction.OPEN_RANKING_MONITOR) {
          beginWorldHudInteractionSession({
            x: player.x,
            y: player.y,
            facing: player.facing,
          });
          uiEvents.emit(UIEventType.SHOW_RANKING_MONITOR, {
            objectId: worldObject.id,
            label: worldObject.label,
          });
        }
        break;
      }
      default:
        break;
    }
  }
}
