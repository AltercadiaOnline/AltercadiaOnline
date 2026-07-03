import type { MapId } from '../../../shared/world/mapRegistry.js';
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { resolveTiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import type { TiledJsonObject } from '../../../config/tiledMapJson.js';
import { readTiledObjectProperty } from '../../../config/tiledMapJson.js';
import {
  isTiledMapObjectCollidable,
  resolveTiledMapObjectUid,
} from '../../../shared/world/tiledMapObject.js';
import {
  isTiledCollisionTileLayer,
  isTiledRenderableObjectLayer,
  isTiledSpawnObjectLayer,
  isTiledVisualTileLayer,
} from '../../../shared/world/tiledMapLayers.js';
import {
  resolveTiledPlayerSpawn,
  type TiledPlayerSpawn,
} from '../../../shared/world/tiledMapSpawn.js';
import { resolvePhaserWorldDepth, PHASER_GROUND_DEPTH } from '../layout/phaserWorldDepth.js';
import { getTiledAssetManager } from './TiledAssetManager.js';
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
 * - spawns: player_spawn → coordenadas para o sistema de jogador
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

  load(scene: MapLoaderScene, mapId: MapId): MapLoaderMountResult | null {
    const descriptor = resolveTiledMapDescriptor(mapId);
    if (!descriptor) return null;

    this.destroy();
    this.scene = scene;
    this.mountedMapId = mapId;
    this.mapCacheKey = descriptor.cacheKey;
    this.mapJsonUrl = descriptor.jsonUrl;

    const map = scene.make.tilemap({ key: descriptor.cacheKey });
    this.map = map;

    const tilesets = this.bindTilesets(map, descriptor.cacheKey, descriptor.jsonUrl);
    this.expectedTilesetCount = map.tilesets.length;
    this.boundTilesetCount = tilesets.length;
    if (tilesets.length === 0) {
      console.error('[MapLoader] Nenhum tileset vinculado para', mapId);
      return null;
    }

    this.worldRoot = scene.add.container(0, 0);
    this.worldRoot.setDepth(PHASER_GROUND_DEPTH);

    this.buildVisualTileLayers(map, tilesets);
    this.buildCollisionPhysics(map, tilesets);
    this.buildStructureAndPropLayers(map, tilesets, mapId, descriptor.cacheKey, descriptor.jsonUrl);
    this.playerSpawn = this.resolvePlayerSpawn(descriptor.cacheKey);

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

  /** Camadas de tile visuais montadas (ground/decor). */
  getVisualTileLayerCount(): number {
    return this.visualTileLayers.length;
  }

  /** Todos os tilesets do JSON foram vinculados com textura em cache. */
  allTilesetsBound(): boolean {
    return this.expectedTilesetCount > 0 && this.boundTilesetCount === this.expectedTilesetCount;
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
    this.scene = null;
  }

  /** ground, decor — tile layers visuais (sem colisão). */
  private buildVisualTileLayers(
    map: PhaserTiledTilemap,
    tilesets: readonly PhaserTiledTileset[],
  ): void {
    let depth = PHASER_GROUND_DEPTH;

    for (const layer of map.layers) {
      if (layer.type !== 'tilelayer') continue;
      if (!isTiledVisualTileLayer(layer.name)) continue;

      const tileLayer = map.createLayer(layer.name, tilesets, 0, 0);
      if (!tileLayer) continue;

      tileLayer.setDepth(depth);
      depth += 1;
      this.visualTileLayers.push(tileLayer);
    }
  }

  /** collision — invisível; blocos de física estáticos nos tiles com `collides: true`. */
  private buildCollisionPhysics(
    map: PhaserTiledTilemap,
    tilesets: readonly PhaserTiledTileset[],
  ): void {
    const scene = this.scene;
    if (!scene) return;

    for (const layer of map.layers) {
      if (layer.type !== 'tilelayer') continue;
      if (!isTiledCollisionTileLayer(layer.name)) continue;

      const collision = map.createLayer(layer.name, tilesets, 0, 0);
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

  /** structures + props — sprites com Y-sort e collidable opcional. */
  private buildStructureAndPropLayers(
    map: PhaserTiledTilemap,
    tilesets: readonly PhaserTiledTileset[],
    mapId: MapId,
    cacheKey: string,
    jsonUrl: string,
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
          console.error(
            '[MapLoader] Textura de objeto ausente:',
            textureKey,
            this.assets.resolvePublicUrl(jsonUrl, imagePath),
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

  /** spawns — lê player_spawn; não instancia sprite. */
  private resolvePlayerSpawn(cacheKey: string): TiledPlayerSpawn | null {
    const scene = this.scene;
    if (!scene) return null;

    const mapData = scene.cache.tilemap.get(cacheKey);
    if (!mapData) return null;

    for (const layer of mapData.data.layers) {
      if (!isTiledSpawnObjectLayer(layer.name)) continue;

      for (const object of layer.objects ?? []) {
        const spawn = resolveTiledPlayerSpawn(object);
        if (spawn) return spawn;
      }
    }

    console.warn('[MapLoader] player_spawn não encontrado na camada spawns.');
    return null;
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
  ): PhaserTiledTileset[] {
    const bound: PhaserTiledTileset[] = [];

    for (const tileset of map.tilesets) {
      const textureKey = this.assets.tilesetTextureKey(cacheKey, tileset.name);
      if (!this.scene?.textures.exists(textureKey)) {
        const imagePath = tileset.image;
        if (imagePath) {
          console.error(
            '[MapLoader] Textura de tileset ausente:',
            textureKey,
            tileset.name,
            this.assets.resolvePublicUrl(jsonUrl, imagePath),
          );
        }
        continue;
      }

      const added = map.addTilesetImage(tileset.name, textureKey);
      if (added) bound.push(added);
    }

    return bound;
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
