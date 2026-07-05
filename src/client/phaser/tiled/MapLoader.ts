import type { MapId } from '../../../shared/world/mapRegistry.js';
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { resolveTiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import { tiledTilesetTextureKey } from '../../../config/tiledMapManifest.js';
import type { TiledJsonObject } from '../../../config/tiledMapJson.js';
import { readTiledObjectProperty } from '../../../config/tiledMapJson.js';
import {
  isTiledMapObjectCollidable,
  resolveTiledMapObjectUid,
} from '../../../shared/world/tiledMapObject.js';
import {
  isTiledCollisionTileLayer,
  isTiledRenderableObjectLayer,
  isTiledVisualTileLayer,
} from '../../../shared/world/tiledMapLayers.js';
import type { TiledPlayerSpawn } from '../../../shared/world/tiledMapSpawn.js';
import { parseTiledMapPlacements } from '../../../shared/world/parseTiledMapPlacements.js';
import { setTiledMapPlacements } from '../../../shared/world/tiledMapPlacements.js';
import { NPC_REGISTRY_WITH_LORE } from '../../../shared/world/npcRegistry.js';
import { resolvePhaserWorldDepth, PHASER_GROUND_DEPTH } from '../layout/phaserWorldDepth.js';
import { getTiledAssetManager } from './TiledAssetManager.js';
import { failTiledMapLoad } from './mapLoadFatalError.js';
import type {
  MapLoaderMountResult,
  MapLoaderScene,
  PhaserMapSprite,
  PhaserTiledTilemap,
  PhaserTiledTilemapLayer,
  PhaserTiledTileset,
  TiledMapObjectRecord,
} from './phaserTiledMapTypes.js';

const TILED_UID_DATA_KEY = 'tiledUid';
const TILED_LAYER_DATA_KEY = 'tiledLayer';

/**
 * Runtime Tiled-first — interpreta JSON/TMJ de /assets/map_mund/ por tipo de camada:
 * - Tile layers (ground, decor): visuais estáticos
 * - Object layers (structures, props): sprites + collidable opcional
 * - collision: física invisível (tiles com collides)
 * - spawns: player_spawn → coordenadas do jogador
 * - npcs: pontos com name = id do NPC_REGISTRY → posição e collidable
 *
 * Modo estrito: qualquer falha de montagem interrompe o jogo com diagnóstico Tiled.
 */
export class MapLoader {
  private readonly assets = getTiledAssetManager();

  private scene: MapLoaderScene | null = null;

  private map: PhaserTiledTilemap | null = null;

  private visualTileLayers: PhaserTiledTilemapLayer[] = [];

  private objectRecords: TiledMapObjectRecord[] = [];

  private objectByUid = new Map<string, TiledMapObjectRecord>();

  private collisionLayer: PhaserTiledTilemapLayer | null = null;

  private playerSpawn: TiledPlayerSpawn | null = null;

  private mountedMapId: MapId | null = null;

  private expectedTilesetCount = 0;

  private boundTilesetCount = 0;

  private boundGridTilesetCount = 0;

  private mapCacheKey: string | null = null;

  private mapJsonUrl: string | null = null;

  private worldRoot: {
    add: (child: unknown) => unknown;
    setDepth: (depth: number) => unknown;
    destroy: () => void;
  } | null = null;

  queuePreload(scene: MapLoaderScene, mapId: MapId): boolean {
    const descriptor = resolveTiledMapDescriptor(mapId);
    if (!descriptor) return false;

    this.mapCacheKey = descriptor.cacheKey;
    this.mapJsonUrl = descriptor.jsonUrl;
    this.assets.queueMapAssets(scene, descriptor);
    return true;
  }

  load(scene: MapLoaderScene, mapId: MapId): MapLoaderMountResult {
    const issues: string[] = [];
    const descriptor = resolveTiledMapDescriptor(mapId);
    if (!descriptor) {
      failTiledMapLoad(mapId, [
        `Export Tiled ausente para "${mapId}" — adicione o .tmj em public/assets/map_mund/ e rode npm run mirror:map-mund.`,
      ]);
    }

    this.destroy();
    this.scene = scene;
    this.mountedMapId = mapId;
    this.mapCacheKey = descriptor.cacheKey;
    this.mapJsonUrl = descriptor.jsonUrl;

    let map: PhaserTiledTilemap;
    try {
      map = scene.make.tilemap({ key: descriptor.cacheKey });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      failTiledMapLoad(mapId, [
        `Phaser não conseguiu parsear o JSON do mapa (${descriptor.jsonUrl}).`,
        `Detalhe: ${detail}`,
        'Verifique tilewidth/tileheight (32×32), tilesets embutidos e camadas válidas no Tiled.',
      ]);
    }
    this.map = map;

    const tilesets = this.bindTilesets(map, descriptor.cacheKey, descriptor.jsonUrl, issues);
    this.expectedTilesetCount = map.tilesets.length;
    this.boundTilesetCount = tilesets.length;

    if (this.boundGridTilesetCount === 0) {
      console.warn(
        `[MapLoader] Nenhum tileset ${map.tileWidth}×${map.tileHeight} vinculado — tile layers podem ficar vazias.`,
      );
    }

    this.worldRoot = scene.add.container(0, 0);
    this.worldRoot.setDepth(PHASER_GROUND_DEPTH);

    this.buildVisualTileLayers(map, tilesets, issues);
    this.buildCollisionPhysics(map, tilesets);
    this.buildStructureAndPropLayers(map, tilesets, mapId, descriptor.cacheKey, descriptor.jsonUrl, issues);
    this.playerSpawn = this.applyTiledPlacementsFromCache(descriptor.cacheKey, mapId, issues);

    if (this.visualTileLayers.length === 0) {
      issues.push(
        'Nenhuma camada visual de tiles montada — confira tilesets 32×32 (margin/spacing) e GIDs válidos no export Tiled.',
      );
    }

    if (issues.length > 0) {
      this.destroy();
      failTiledMapLoad(mapId, issues);
    }

    console.info(
      `[MapLoader] Mapa "${mapId}" montado — ${this.visualTileLayers.length} tile layer(s), ${this.boundGridTilesetCount} tileset(s) 32×32, ${this.objectRecords.length} objeto(s).`,
    );

    return {
      mapId,
      widthPx: map.widthInPixels,
      heightPx: map.heightInPixels,
      objects: [...this.objectRecords],
      objectByUid: new Map(this.objectByUid),
      playerSpawn: this.playerSpawn,
    };
  }

  getCollisionLayer(): PhaserTiledTilemapLayer | null {
    return this.collisionLayer;
  }

  getPlayerSpawn(): TiledPlayerSpawn | null {
    return this.playerSpawn ? { ...this.playerSpawn } : null;
  }

  getMapPixelSize(): { readonly widthPx: number; readonly heightPx: number } | null {
    if (!this.map) return null;
    return {
      widthPx: this.map.widthInPixels,
      heightPx: this.map.heightInPixels,
    };
  }

  getObjectByUid(uid: string): TiledMapObjectRecord | null {
    return this.objectByUid.get(uid) ?? null;
  }

  listObjects(): readonly TiledMapObjectRecord[] {
    return [...this.objectRecords];
  }

  isMounted(mapId?: MapId): boolean {
    if (!this.map) return false;
    if (mapId && this.mountedMapId !== mapId) return false;
    return true;
  }

  getVisualTileLayerCount(): number {
    return this.visualTileLayers.length;
  }

  allTilesetsBound(): boolean {
    return this.boundTilesetCount > 0;
  }

  hasRenderableTileLayers(): boolean {
    return this.visualTileLayers.length > 0;
  }

  getBoundTilesetCount(): number {
    return this.boundTilesetCount;
  }

  getBoundGridTilesetCount(): number {
    return this.boundGridTilesetCount;
  }

  destroy(): void {
    for (const record of this.objectRecords) {
      record.sprite.destroy();
    }
    this.objectRecords = [];
    this.objectByUid.clear();
    this.playerSpawn = null;

    for (const layer of this.visualTileLayers) {
      layer.destroy();
    }
    this.visualTileLayers = [];

    this.collisionLayer?.destroy();
    this.collisionLayer = null;

    this.worldRoot?.destroy();
    this.worldRoot = null;

    this.map?.destroy();
    this.map = null;
    this.mountedMapId = null;
    this.mapCacheKey = null;
    this.mapJsonUrl = null;
    this.expectedTilesetCount = 0;
    this.boundTilesetCount = 0;
    this.boundGridTilesetCount = 0;
    this.scene = null;
  }

  private buildVisualTileLayers(
    map: PhaserTiledTilemap,
    tilesets: readonly PhaserTiledTileset[],
    issues: string[],
  ): void {
    let depth = PHASER_GROUND_DEPTH;
    const gridTilesets = tilesets.filter(
      (tileset) => tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight,
    );

    for (const layer of map.layers) {
      if (layer.type !== 'tilelayer') continue;
      if (!isTiledVisualTileLayer(layer.name)) continue;

      const tileLayer = map.createLayer(layer.name, gridTilesets, 0, 0);
      if (!tileLayer) {
        console.warn(
          `[MapLoader] Camada "${layer.name}" não montou — tilesets 32×32 ausentes, margin incorreto ou GIDs inválidos.`,
        );
        continue;
      }

      tileLayer.setDepth(depth);
      depth += 1;
      this.visualTileLayers.push(tileLayer);
    }
  }

  private buildCollisionPhysics(
    map: PhaserTiledTilemap,
    tilesets: readonly PhaserTiledTileset[],
  ): void {
    const scene = this.scene;
    if (!scene) return;

    const gridTilesets = tilesets.filter(
      (tileset) => tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight,
    );

    for (const layer of map.layers) {
      if (layer.type !== 'tilelayer') continue;
      if (!isTiledCollisionTileLayer(layer.name)) continue;

      const collision = map.createLayer(layer.name, gridTilesets, 0, 0);
      if (!collision) continue;

      collision.setVisible(false);
      collision.setDepth(PHASER_GROUND_DEPTH + this.visualTileLayers.length);
      collision.setCollisionByProperty({ collides: true });
      map.setCollisionByProperty({ collides: true });

      if (scene.physics) {
        scene.physics.add.existing(collision, true);
      }

      this.collisionLayer = collision;
      return;
    }
  }

  private buildStructureAndPropLayers(
    map: PhaserTiledTilemap,
    tilesets: readonly PhaserTiledTileset[],
    mapId: MapId,
    cacheKey: string,
    jsonUrl: string,
    issues: string[],
  ): void {
    const scene = this.scene;
    if (!scene || !this.worldRoot) return;

    const mapData = scene.cache.tilemap.get(cacheKey);

    for (const layer of map.layers) {
      if (layer.type !== 'objectgroup') continue;
      if (!isTiledRenderableObjectLayer(layer.name)) continue;

      const layerData = mapData?.data.layers.find((entry) => entry.name === layer.name);
      const layerObjects = layerData?.objects ?? [];

      const createdFromGid = map.createFromObjects(layer.name, tilesets, 0, 0, true);
      for (let index = 0; index < createdFromGid.length; index += 1) {
        const sprite = createdFromGid[index]!;
        const objectData = layerObjects[index];
        if (!objectData) continue;
        if (objectData.width > 0 && objectData.height > 0) {
          sprite.setDisplaySize(objectData.width, objectData.height);
        }
        this.registerMapObject(scene, sprite, objectData, layer.name, mapId);
      }

      for (const objectData of layerObjects) {
        if (objectData.gid) continue;
        const imagePath = this.resolveObjectImagePath(objectData);
        if (!imagePath) continue;

        const textureKey = this.assets.objectTextureKey(cacheKey, imagePath);
        if (!scene.textures.exists(textureKey)) {
          issues.push(
            `Textura de objeto ausente na camada "${layer.name}": ${this.assets.resolvePublicUrl(jsonUrl, imagePath)}`,
          );
          continue;
        }

        const sprite = this.createMapSprite(
          scene,
          objectData.x + objectData.width / 2,
          objectData.y + objectData.height,
          textureKey,
          objectData.width,
          objectData.height,
        );
        this.registerMapObject(scene, sprite, objectData, layer.name, mapId);
      }
    }
  }

  private applyTiledPlacementsFromCache(
    cacheKey: string,
    mapId: MapId,
    issues: string[],
  ): TiledPlayerSpawn | null {
    const scene = this.scene;
    if (!scene) return null;

    const mapData = scene.cache.tilemap.get(cacheKey);
    if (!mapData) {
      issues.push('Cache do tilemap indisponível após parse — recarregue a página.');
      return null;
    }

    const parsed = parseTiledMapPlacements(mapId, mapData.data as Parameters<typeof parseTiledMapPlacements>[1]);
    for (const issue of parsed.issues) {
      console.warn(`[MapLoader] ${issue}`);
    }

    if (!parsed.spawnLayerFound) {
      issues.push('Camada "spawns" (ou "spawn") ausente — crie uma object layer no Tiled.');
    } else if (!parsed.placements.playerSpawn) {
      issues.push(
        'Objeto de spawn ausente — use name/type player_spawn ou spawn_zona_* na camada spawns/spawn.',
      );
    }

    const registryIds = NPC_REGISTRY_WITH_LORE
      .filter((entry) => entry.mapId === mapId)
      .map((entry) => entry.id);

    if (registryIds.length > 0) {
      if (!parsed.npcLayerFound) {
        console.warn(
          '[MapLoader] Camada "npcs" ausente — NPCs do registro usam posição legada (sem ponto Tiled).',
        );
      } else if (parsed.placements.npcs.size === 0) {
        console.warn(
          '[MapLoader] Camada "npcs" vazia — NPCs do registro usam posição legada (sem ponto Tiled).',
        );
      }
    }

    for (const npcId of parsed.placements.npcs.keys()) {
      if (!registryIds.includes(npcId)) {
        console.warn(
          `[MapLoader] NPC desconhecido na camada npcs: "${npcId}" — ignorado (use id do NPC_REGISTRY).`,
        );
      }
    }

    if (parsed.placements.npcs.size > 0) {
      for (const registryId of registryIds) {
        if (!parsed.placements.npcs.has(registryId)) {
          console.warn(
            `[MapLoader] NPC_REGISTRY "${registryId}" ausente na camada Tiled npcs — posição legada do registro.`,
          );
        }
      }
    }

    setTiledMapPlacements(mapId, parsed.placements);
    void import('../../world/tiledMapPlacementsBridge.js').then(({ notifyTiledMapPlacementsCommitted }) => {
      notifyTiledMapPlacementsCommitted(mapId);
    });
    return parsed.placements.playerSpawn;
  }

  private registerMapObject(
    scene: MapLoaderScene,
    sprite: PhaserMapSprite,
    objectData: TiledJsonObject,
    layerName: string,
    mapId: MapId,
  ): void {
    sprite.setOrigin(0.5, 1);
    sprite.setDepth(resolvePhaserWorldDepth(sprite.y));

    const uid = resolveTiledMapObjectUid(mapId, layerName, objectData);
    sprite.setData(TILED_UID_DATA_KEY, uid);
    sprite.setData(TILED_LAYER_DATA_KEY, layerName);

    if (isTiledMapObjectCollidable(objectData)) {
      this.applyStaticCollision(scene, sprite, objectData);
    }

    this.worldRoot?.add(sprite);

    const record: TiledMapObjectRecord = {
      uid,
      layerName,
      mapId,
      collidable: isTiledMapObjectCollidable(objectData),
      sprite,
      ...(objectData.id !== undefined ? { objectId: objectData.id } : {}),
      ...(objectData.name !== undefined ? { name: objectData.name } : {}),
    };

    this.objectRecords.push(record);
    this.objectByUid.set(uid, record);
  }

  private applyStaticCollision(
    scene: MapLoaderScene,
    sprite: PhaserMapSprite,
    objectData: TiledJsonObject,
  ): void {
    if (!scene.physics) return;

    scene.physics.add.existing(sprite, true);

    const body = sprite.body;
    if (!body) return;

    const tileSize = GAME_CONFIG.TILE_SIZE;
    const width = objectData.width > 0 ? objectData.width : tileSize;
    const height = objectData.height > 0 ? objectData.height : tileSize;
    body.setSize(width, height * 0.5, true);
    body.setOffset(-width / 2, -height);
  }

  private createMapSprite(
    scene: MapLoaderScene,
    x: number,
    y: number,
    textureKey: string,
    width: number,
    height: number,
  ): PhaserMapSprite {
    const sprite = scene.add.sprite(x, y, textureKey);
    const frame = sprite.texture.get(textureKey);
    const nativeW = frame?.width ?? sprite.width;
    const nativeH = frame?.height ?? sprite.height;
    const displayW = width > 0 ? width : nativeW;
    const displayH = height > 0 ? height : nativeH;
    if (displayW > 0 && displayH > 0) {
      sprite.setDisplaySize(displayW, displayH);
    }
    return sprite;
  }

  private bindTilesets(
    map: PhaserTiledTilemap,
    cacheKey: string,
    jsonUrl: string,
    issues: string[],
  ): PhaserTiledTileset[] {
    const bound: PhaserTiledTileset[] = [];
    this.boundGridTilesetCount = 0;
    const descriptor = this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null;
    const textureKeyByNormalizedName = new Map<string, string>();

    for (const tileset of descriptor?.tilesets ?? []) {
      textureKeyByNormalizedName.set(
        tileset.name.trim().toLowerCase(),
        tiledTilesetTextureKey(cacheKey, tileset.name),
      );
    }

    for (const tileset of map.tilesets) {
      const primaryKey = this.assets.tilesetTextureKey(cacheKey, tileset.name);
      const normalizedName = tileset.name.trim().toLowerCase();
      const fallbackKey = textureKeyByNormalizedName.get(normalizedName);
      const textureKey = this.scene?.textures.exists(primaryKey)
        ? primaryKey
        : (fallbackKey && this.scene?.textures.exists(fallbackKey) ? fallbackKey : null);

      if (!textureKey) {
        const imagePath = tileset.image;
        const isGridTileset =
          tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight;
        if (imagePath && isGridTileset) {
          console.warn(
            `[MapLoader] Tileset 32×32 "${tileset.name}" sem textura carregada: ${this.assets.resolvePublicUrl(jsonUrl, imagePath)}`,
          );
        } else if (imagePath) {
          console.warn(
            `[MapLoader] Textura ausente para tileset de prop "${tileset.name}" — objetos com gid podem faltar.`,
          );
        }
        continue;
      }

      const layout = this.resolveTilesetLayout(cacheKey, tileset.name);
      const isGridTileset =
        tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight;
      const margin = layout.margin;
      const spacing = layout.spacing;
      const added = map.addTilesetImage(
        tileset.name,
        textureKey,
        tileset.tileWidth,
        tileset.tileHeight,
        margin,
        spacing,
      );
      if (added) {
        bound.push(added);
        if (added.tileWidth === map.tileWidth && added.tileHeight === map.tileHeight) {
          this.boundGridTilesetCount += 1;
        }
      } else if (isGridTileset) {
        console.warn(
          `[MapLoader] Tileset 32×32 "${tileset.name}" não vinculou — confira columns/tilecount, margin e dimensões do PNG.`,
        );
      } else {
        console.warn(
          `[MapLoader] Tileset de prop "${tileset.name}" não vinculou — sprites gid dessa folha podem faltar.`,
        );
      }
    }

    const expectedGridTilesets = map.tilesets.filter(
      (entry) => entry.tileWidth === map.tileWidth && entry.tileHeight === map.tileHeight,
    ).length;
    if (this.boundGridTilesetCount < expectedGridTilesets) {
      console.warn(
        `[MapLoader] ${expectedGridTilesets - this.boundGridTilesetCount}/${expectedGridTilesets} tileset(s) 32×32 não vinculado(s) — mapa parcial ou PNG/margin inválido.`,
      );
    }

    return bound;
  }

  private resolveTilesetLayout(
    cacheKey: string,
    tilesetName: string,
  ): { margin: number; spacing: number } {
    const mapData = this.scene?.cache.tilemap.get(cacheKey);
    const rawTilesets = (mapData?.data as { readonly tilesets?: readonly {
      readonly name?: string;
      readonly margin?: number;
      readonly spacing?: number;
    }[] } | undefined)?.tilesets;
    const entry = rawTilesets?.find((candidate) => candidate.name === tilesetName);
    return {
      margin: Number(entry?.margin ?? 0),
      spacing: Number(entry?.spacing ?? 0),
    };
  }

  private resolveObjectImagePath(object: TiledJsonObject): string | null {
    const imageProperty = readTiledObjectProperty(object, 'image');
    if (typeof imageProperty === 'string' && imageProperty.trim().length > 0) {
      return imageProperty.trim();
    }

    if (typeof object.type === 'string' && object.type.trim().length > 0) {
      const typeValue = object.type.trim();
      if (typeValue.includes('/') || typeValue.endsWith('.png')) {
        return typeValue;
      }
    }

    return null;
  }
}
