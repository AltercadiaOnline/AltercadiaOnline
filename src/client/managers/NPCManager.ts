import type { Player } from '../entities/Player.js';
import { NPC } from '../entities/NPC.js';
import type { Camera } from '../scenes/Camera.js';
import {
  getNpcSpriteBounds,
  renderNpcSprite,
  WORLD_INTERACT_PROMPT_KEY,
} from '../world/npcRenderer.js';
import { renderPlayer } from '../renderPlayer.js';
import {
  formatNpcDomNametag,
  type DomNametagEntry,
} from '../world/worldDomOverlay.js';
import { buildNpcSpriteDecalEntries } from '../world/npcSpriteDecalAnchors.js';
import { getPlayerNametagAnchor, resolvePlayerNametagView } from '../world/nametagRenderer.js';
import { getPetDepthY } from '../../shared/world/petEntity.js';
import { renderPetSprite } from '../entities/pet/petRenderer.js';
import { getPetVisualBounds } from '../../shared/world/petEntity.js';
import type { PetRenderSnapshot } from '../entities/pet/PetFollowEntity.js';
import {
  getPlayerDepthYWithHeight,
  shouldUseLocalizedHeightStacking,
} from '../../shared/world/localizedHeight.js';
import { getPlayerDepthY } from '../../shared/world/playerEntity.js';
import type { WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';
import type { PlayerRenderSnapshot } from '../entities/player/index.js';
import { validateSpriteDimensions } from '../../config/spriteDimensions.js';
import {
  getResolvedNpcRegistry,
  NPC_INTERACTION_RADIUS_TILES,
  NpcActionType,
} from '../../shared/world/npcRegistry.js';
import { grantMarketTerminalAccess } from '../../shared/economy/marketAccessGate.js';
import { ARENA_PULPIT_AUDIENCE_FACING } from '../../shared/world/maps/city01LayoutConstants.js';
import { tileCenterToWorldPixel } from '../../shared/world/portals.js';
import { beginWorldHudInteractionSession } from '../world/worldHudInteractionSession.js';
import { isWorldHudInteractionLocked } from '../world/worldHudInteractionSession.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { uiEvents, UIEventType, type UiWindowId } from '../ui/uiEvents.js';
import { windowManager } from '../ui/WindowManager.js';
import { postSystemNotification } from '../ui/logService.js';

const ACTION_TO_WINDOW: Partial<Record<NpcActionType, UiWindowId>> = {
  [NpcActionType.OPEN_QUEST]: 'quest',
  [NpcActionType.OPEN_BANK]: 'bank',
};

function isVendorNpcAction(actionType: NpcActionType): boolean {
  return actionType === NpcActionType.OPEN_NPC_VENDOR;
}

function isLabShopNpcAction(actionType: NpcActionType): boolean {
  return actionType === NpcActionType.OPEN_LAB_SHOP;
}

function isPetShopNpcAction(actionType: NpcActionType): boolean {
  return actionType === NpcActionType.OPEN_PET_SHOP;
}

function isTournamentBetNpcAction(actionType: NpcActionType): boolean {
  return actionType === NpcActionType.OPEN_TOURNAMENT_BET;
}

function isRefractionBoothNpcAction(actionType: NpcActionType): boolean {
  return actionType === NpcActionType.OPEN_REFRACTION_BOOTH;
}

/** Margem extra além da viewport da câmera (tiles) — cobre pop-in com viewport 9×8. */
const ACTIVE_ZONE_MARGIN_TILES = 2;

export class NPCManager {
  private readonly allNpcs: NPC[];
  private activeNpcs: NPC[] = [];
  private nearestInteractable: NPC | null = null;
  private currentMapId: string;
  private lastCullTileX = Number.NaN;
  private lastCullTileY = Number.NaN;

  constructor(mapId: string) {
    this.currentMapId = mapId;
    this.allNpcs = getResolvedNpcRegistry()
      .filter((entry) => entry.mapId === mapId)
      .map((entry) => {
        validateSpriteDimensions(entry);
        return new NPC(entry);
      });
  }

  setMapId(mapId: string): void {
    this.currentMapId = mapId;
    this.lastCullTileX = Number.NaN;
    this.lastCullTileY = Number.NaN;
    this.refreshActiveZone(null);
  }

  /** Atualiza subset visível — só NPCs na viewport + margem. */
  refreshActiveZone(camera: Camera | null): void {
    if (!camera) {
      this.activeNpcs = this.allNpcs.filter((npc) => npc.mapId === this.currentMapId);
      return;
    }

    const tileSize = getActiveMapTileSize();
    const cullTileX = Math.floor(camera.x / tileSize);
    const cullTileY = Math.floor(camera.y / tileSize);
    if (cullTileX === this.lastCullTileX && cullTileY === this.lastCullTileY) return;
    this.lastCullTileX = cullTileX;
    this.lastCullTileY = cullTileY;

    const margin = tileSize * ACTIVE_ZONE_MARGIN_TILES;
    const minX = camera.x - margin;
    const minY = camera.y - margin;
    const maxX = camera.x + camera.visibleWorldWidth + margin;
    const maxY = camera.y + camera.visibleWorldHeight + margin;

    const next: NPC[] = [];
    for (const npc of this.allNpcs) {
      if (npc.mapId !== this.currentMapId) continue;
      const { worldX, worldY } = npc.position;
      if (worldX >= minX && worldX <= maxX && worldY >= minY && worldY <= maxY) {
        next.push(npc);
      }
    }
    this.activeNpcs = next;
  }

  /** Verifica proximidade e retorna o NPC alvo dentro de 1.5 tiles. */
  checkInteraction(player: Player): NPC | null {
    let closest: NPC | null = null;
    let closestDistance = NPC_INTERACTION_RADIUS_TILES + 1;

    for (const npc of this.activeNpcs) {
      const distance = npc.tileDistanceTo(player.x, player.y);
      if (distance <= NPC_INTERACTION_RADIUS_TILES && distance < closestDistance) {
        closest = npc;
        closestDistance = distance;
      }
    }

    this.nearestInteractable = closest;
    return closest;
  }

  getNearestInteractable(): NPC | null {
    return this.nearestInteractable;
  }

  getNpcById(npcId: string): NPC | null {
    return this.allNpcs.find((npc) => npc.id === npcId) ?? null;
  }

  /** Posições em tile de todos os NPCs do mapa atual — alimenta o minimapa. */
  collectMinimapMarkers(): Array<{ tileX: number; tileY: number }> {
    return this.allNpcs
      .filter((npc) => npc.mapId === this.currentMapId)
      .map((npc) => ({
        tileX: npc.position.tileX,
        tileY: npc.position.tileY,
      }));
  }

  /** Executa a ação data-driven do NPC (abre HUD correspondente). */
  executeAction(npc: NPC, player?: Player): void {
    if (npc.actionType === NpcActionType.DIALOG) {
      if (player) {
        beginWorldHudInteractionSession({
          x: player.x,
          y: player.y,
          facing: player.facing,
        });
      }
      uiEvents.emit(UIEventType.SHOW_DIALOGUE, {
        npcId: npc.id,
        npcName: npc.name,
        text: npc.dialogue,
      });
      return;
    }

    if (isVendorNpcAction(npc.actionType)) {
      uiEvents.emit(UIEventType.SHOW_VENDOR_SHOP, {
        vendorId: npc.id,
        vendorName: npc.name,
      });
      return;
    }

    if (isLabShopNpcAction(npc.actionType)) {
      uiEvents.emit(UIEventType.SHOW_LAB_SHOP, {
        vendorId: npc.id,
        vendorName: npc.name,
      });
      return;
    }

    if (isPetShopNpcAction(npc.actionType)) {
      if (player) {
        beginWorldHudInteractionSession({
          x: player.x,
          y: player.y,
          facing: player.facing,
        });
      }
      uiEvents.emit(UIEventType.SHOW_PET_SHOP, {
        vendorId: npc.id,
        vendorName: npc.name,
      });
      return;
    }

    if (isTournamentBetNpcAction(npc.actionType)) {
      if (player) {
        const center = tileCenterToWorldPixel(npc.position.tileX, npc.position.tileY);
        beginWorldHudInteractionSession({
          x: player.x,
          y: player.y,
          facing: player.facing,
          pose: {
            x: center.x,
            y: center.y,
            facing: ARENA_PULPIT_AUDIENCE_FACING,
          },
        });
        player.forceAuthoritativePosition({
          x: center.x,
          y: center.y,
          facing: ARENA_PULPIT_AUDIENCE_FACING,
        });
      }
      uiEvents.emit(UIEventType.SHOW_TOURNAMENT_BET, {
        pulpitId: npc.id,
        pulpitName: npc.name,
      });
      return;
    }

    if (isRefractionBoothNpcAction(npc.actionType)) {
      if (player) {
        beginWorldHudInteractionSession({
          x: player.x,
          y: player.y,
          facing: player.facing,
        });
      }
      uiEvents.emit(UIEventType.SHOW_DIALOGUE, {
        npcId: npc.id,
        npcName: npc.name,
        text: npc.dialogue,
      });
      return;
    }

    if (npc.actionType === NpcActionType.OPEN_CRAFT) {
      uiEvents.emit(UIEventType.SHOW_CRAFT_STATION, {
        craftStationId: npc.id,
        stationName: npc.name,
      });
      return;
    }

    if (npc.actionType === NpcActionType.OPEN_MARKET) {
      if (player) {
        beginWorldHudInteractionSession({
          x: player.x,
          y: player.y,
          facing: player.facing,
        });
      }
      grantMarketTerminalAccess();
      windowManager.open('market');
      return;
    }

    const windowId = ACTION_TO_WINDOW[npc.actionType];
    if (windowId) {
      windowManager.open(windowId);
    }
  }

  supportsShop(npc: NPC): boolean {
    return isVendorNpcAction(npc.actionType)
      || isLabShopNpcAction(npc.actionType)
      || isPetShopNpcAction(npc.actionType)
      || npc.actionType === NpcActionType.OPEN_MARKET;
  }

  /** Card de interação — Conversar. */
  executeDialogInteraction(npc: NPC, player?: Player): void {
    if (player && !isWorldHudInteractionLocked()) {
      beginWorldHudInteractionSession({
        x: player.x,
        y: player.y,
        facing: player.facing,
      });
    }

    if (npc.actionType === NpcActionType.DIALOG || isRefractionBoothNpcAction(npc.actionType)) {
      this.executeAction(npc, player);
      return;
    }

    if (npc.dialogue.trim().length > 0) {
      uiEvents.emit(UIEventType.SHOW_DIALOGUE, {
        npcId: npc.id,
        npcName: npc.name,
        text: npc.dialogue,
      });
      return;
    }

    postSystemNotification(`${npc.name} não tem nada a dizer agora.`);
  }

  /** Card de interação — Comprar. */
  executeShopInteraction(npc: NPC, player?: Player): void {
    if (!this.supportsShop(npc)) {
      postSystemNotification(`${npc.name} não vende itens.`);
      return;
    }

    this.executeAction(npc, player);
  }

  /**
   * Drawables de NPCs + jogador para Y-sort com estruturas do mapa.
   */
  collectWorldActorDrawables(
    ctx: CanvasRenderingContext2D,
    playerSnapshot: PlayerRenderSnapshot,
    timestampMs: number | undefined,
    petSnapshot: PetRenderSnapshot | null = null,
  ): WorldDepthDrawable[] {
    const drawables: WorldDepthDrawable[] = this.activeNpcs.map((npc) => ({
      depthY: npc.depthY,
      draw: () => renderNpcSprite(ctx, npc, timestampMs ?? 0),
    }));

    if (petSnapshot?.visible) {
      drawables.push({
        depthY: getPetDepthY(petSnapshot),
        draw: () => renderPetSprite(ctx, petSnapshot, timestampMs),
      });
    }

    const useHeightStacking = shouldUseLocalizedHeightStacking(
      playerSnapshot.x,
      playerSnapshot.y,
    );
    const playerHeight = playerSnapshot.heightLevel ?? 0;
    drawables.push({
      depthY: useHeightStacking
        ? getPlayerDepthYWithHeight(playerSnapshot, playerHeight)
        : getPlayerDepthY(playerSnapshot),
      draw: () => renderPlayer(ctx, playerSnapshot, timestampMs),
    });

    return drawables;
  }

  /** Nametags de atores + prompt [E] — somente DOM (fora do canvas escalado). */
  buildDomNametagEntries(
    playerSnapshot: PlayerRenderSnapshot,
    petSnapshot: PetRenderSnapshot | null = null,
  ): DomNametagEntry[] {
    const entries: DomNametagEntry[] = [];

    for (const npc of this.activeNpcs) {
      const bounds = getNpcSpriteBounds(npc);
      entries.push(...buildNpcSpriteDecalEntries(npc, bounds));

      if (npc.sprite === 'pulpit') continue;
      const featuredLift = npc.featured ? 10 : 0;
      entries.push({
        id: `npc-${npc.id}`,
        label: formatNpcDomNametag(npc.name, npc.level),
        anchor: {
          worldX: npc.position.worldX,
          anchorTopY: bounds.y - featuredLift,
        },
        className: 'npc-name-tag',
      });
    }

    const playerView = resolvePlayerNametagView();
    entries.push({
      id: 'player',
      label: formatNpcDomNametag(playerView.name, playerView.level),
      anchor: getPlayerNametagAnchor(playerSnapshot),
      className: 'player-name-tag',
    });

    if (petSnapshot?.visible) {
      const petBounds = getPetVisualBounds(petSnapshot);
      entries.push({
        id: `pet-${petSnapshot.name}`,
        label: petSnapshot.name,
        anchor: {
          worldX: petSnapshot.x,
          anchorTopY: petBounds.y,
        },
        className: 'pet-name-tag',
      });
    }

    const target = this.nearestInteractable;
    if (target) {
      const bounds = getNpcSpriteBounds(target);
      entries.push({
        id: `interact-${target.id}`,
        label: `[${WORLD_INTERACT_PROMPT_KEY}]`,
        anchor: {
          worldX: target.position.worldX,
          anchorTopY: bounds.y - (target.featured ? 22 : 8),
        },
        className: 'interact-prompt-tag',
        placement: 'center',
      });
    }

    return entries;
  }

}
