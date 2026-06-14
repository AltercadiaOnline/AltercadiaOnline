import { canPlayerWalkAt as checkPlayerWalkAt } from '../../shared/world/movement.js';
import { setActiveNpcOccupancyMapId } from '../../shared/world/npcTileOccupancy.js';
import { TILE_SIZE } from '../../shared/world/mapConstants.js';
import {
  DEFAULT_MAP_ID,
  getMapDefinition,
  MAP_REGISTRY,
  type MapDefinition,
  type MapId,
} from '../../shared/world/mapRegistry.js';
import {
  buildPortalTransitionPayload,
  findPortalAtTile,
  type Portal,
  worldPixelToTile,
} from '../../shared/world/portals.js';
import type { MapTransitionPayload } from '../../shared/world/protocol.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { MapVisualLayout } from '../world/mapVisualLayouts.js';
import { setActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { canWalkAt } from '../../shared/world/worldMap.js';
import type { Camera } from '../scenes/Camera.js';
import type { WorldMapRenderer } from '../world/WorldMapRenderer.js';

export type MapSceneHost = {
  readonly worldMapRenderer: WorldMapRenderer;
  readonly camera: Camera;
  readonly setPlayerPosition: (payload: MapTransitionPayload) => void;
};

export type LoadMapOptions = {
  readonly x?: number;
  readonly y?: number;
  readonly facing?: PlayerFacing;
  readonly portalLabel?: string;
  /** Camada ZoneLink — evita regenerateData na troca. */
  readonly cachedMapData?: number[][];
  readonly cachedLayout?: MapVisualLayout;
  /** Evita reposicionar duas vezes quando o ZoneTransitionController já aplica spawn. */
  readonly skipSceneSpawn?: boolean;
};

/**
 * Orquestrador de mapas — repositório, colisão local, portais e transição visual.
 * O main.ts pede loadMap(mapId); este manager sincroniza dados + WorldMapRenderer.
 */
export class MapManager {
  private currentMap: MapDefinition;
  private mapData: number[][];
  private sceneHost: MapSceneHost | null = null;

  constructor(mapId: MapId = DEFAULT_MAP_ID) {
    const definition = getMapDefinition(mapId);
    if (!definition) {
      throw new Error(`[MapManager] Mapa desconhecido: ${mapId}`);
    }
    this.currentMap = definition;
    this.mapData = definition.generateData();
    setActiveNpcOccupancyMapId(mapId);
    setActiveMapTileSize(mapId);
  }

  /** Repositório de mapas registrados (city_01, farm_zone_01, …). */
  static get registry(): typeof MAP_REGISTRY {
    return MAP_REGISTRY;
  }

  get currentMapId(): MapId {
    return this.currentMap.id;
  }

  get portals(): readonly Portal[] {
    return this.currentMap.portals;
  }

  get mapDataSnapshot(): readonly (readonly number[])[] {
    return this.mapData;
  }

  get tileSize(): number {
    return this.currentMap.tileSize;
  }

  get pixelWidth(): number {
    return (this.mapData[0]?.length ?? 0) * this.currentMap.tileSize;
  }

  get pixelHeight(): number {
    return this.mapData.length * this.currentMap.tileSize;
  }

  attachScene(host: MapSceneHost): void {
    this.sceneHost = host;
  }

  detachScene(): void {
    this.sceneHost = null;
  }

  /** Carrega mapa por id, atualiza dados de colisão e repinta a cena imediatamente. */
  loadMap(mapId: MapId, spawn?: LoadMapOptions): void {
    const next = getMapDefinition(mapId);
    if (!next) {
      throw new Error(`[MapManager] Mapa desconhecido: ${mapId}`);
    }

    this.currentMap = next;
    this.mapData = spawn?.cachedMapData ?? next.generateData();
    setActiveNpcOccupancyMapId(mapId);
    setActiveMapTileSize(mapId);
    this.applySceneForCurrentMap(mapId, spawn);
  }

  /** Compara tile lógico do jogador com os portais do mapa atual. */
  checkPortalAtTile(tileX: number, tileY: number): Portal | null {
    return findPortalAtTile(this.currentMap.portals, tileX, tileY);
  }

  /** Compara posição do jogador (pixels) com os portais do mapa atual. */
  checkPortal(playerX: number, playerY: number): Portal | null {
    const tile = worldPixelToTile(playerX, playerY, this.currentMap.tileSize);
    return this.checkPortalAtTile(tile.tileX, tile.tileY);
  }

  /**
   * Se o jogador estiver em um portal, executa a transição completa
   * (loadMap + reposicionamento) e retorna o payload aplicado.
   */
  tryPortalTransition(
    playerX: number,
    playerY: number,
    facing?: PlayerFacing,
  ): MapTransitionPayload | null {
    const portal = this.checkPortal(playerX, playerY);
    if (!portal) return null;

    const payload = buildPortalTransitionPayload(portal, this.currentMapId, facing);
    this.loadMap(payload.mapId as MapId, payload);
    return payload;
  }

  canWalkAt(worldX: number, worldY: number): boolean {
    return canWalkAt(this.mapData, worldX, worldY);
  }

  canPlayerWalkAt(position: { x: number; y: number }): boolean {
    return checkPlayerWalkAt(this.mapData, position);
  }

  private applySceneForCurrentMap(mapId: MapId, spawn?: LoadMapOptions): void {
    if (!this.sceneHost) return;

    this.sceneHost.worldMapRenderer.setMapId(mapId, spawn?.cachedLayout);
    this.sceneHost.camera.setMapDimensions(this.pixelWidth, this.pixelHeight);

    if (!spawn?.skipSceneSpawn && spawn?.x !== undefined && spawn?.y !== undefined) {
      const payload: MapTransitionPayload = {
        mapId,
        x: spawn.x,
        y: spawn.y,
        ...(spawn.facing !== undefined ? { facing: spawn.facing } : {}),
        ...(spawn.portalLabel !== undefined ? { portalLabel: spawn.portalLabel } : {}),
      };
      this.sceneHost.setPlayerPosition(payload);
    }
  }
}

export { DEFAULT_MAP_ID, MAP_REGISTRY, getMapDefinition, type MapId } from '../../shared/world/mapRegistry.js';
