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
import { parseTiledWorldCollision } from '../../../shared/world/parseTiledWorldCollision.js';
import { setTiledMapPlacements } from '../../../shared/world/tiledMapPlacements.js';
import { setWorldCollisionObstacles } from '../../../shared/world/worldCollisionRegistry.js';
import { NPC_REGISTRY_WITH_LORE } from '../../../shared/world/npcRegistry.js';
import { resolvePhaserWorldDepth, PHASER_GROUND_DEPTH } from '../layout/phaserWorldDepth.js';
import { getTiledAssetManager } from './TiledAssetManager.js';
import { failTiledMapLoad } from './mapLoadFatalError.js';
import {
  buildTilesetBindDiagnostic,
  computeTilesetFrameCapacity,
  findTilesetForGid,
  formatTilesetBindDiagnostic,
  resolveCachedTilesetEntry,
  stripTiledGidFlags,
  type CachedTilesetEntry,
} from './tilesetBindDiagnostics.js';
import { ensureTiledTilesetTextureFrames } from './ensureTiledTilesetTextureFrames.js';
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

  /** Texturas já fatiadas em frames 0…N para createFromObjects. */
  private slicedTilesetTextureKeys = new Set<string>();

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

    if (this.isMountedOnScene(mapId, scene)) {
      const size = this.getMapPixelSize();
      console.debug(`[MapLoader] Mapa "${mapId}" já montado nesta cena — ignorando load duplicado.`);
      return {
        mapId,
        widthPx: size?.widthPx ?? 0,
        heightPx: size?.heightPx ?? 0,
        objects: [...this.objectRecords],
        objectByUid: new Map(this.objectByUid),
        playerSpawn: this.playerSpawn,
      };
    }

    this.destroy();
    this.scene = scene;
    this.mountedMapId = mapId;
    this.mapCacheKey = descriptor.cacheKey;
    this.mapJsonUrl = descriptor.jsonUrl;

    let map: PhaserTiledTilemap;
    try {
      this.assets.ensureEnrichedTilemapInCache(scene, descriptor);
      map = scene.make.tilemap({ key: descriptor.cacheKey });
      if (map.tilesets.length === 0) {
        failTiledMapLoad(mapId, [
          'Phaser parseou o mapa com 0 tilesets — artefato *PhaserMap.json inválido ou cache corrompido.',
          'Rode: npm run mirror:map-mund && npm run build',
          'O .tmj cru em /assets/map_mund/ NÃO é usado pelo Phaser (tilesets .tsx externos são ignorados).',
        ]);
      }
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
    this.playerSpawn = this.applyTiledPlacementsFromCache(descriptor.cacheKey, mapId, map, issues);

    if (this.visualTileLayers.length === 0) {
      console.warn(
        '[MapLoader] Nenhuma camada visual de tiles montada — verifique tilesets e GIDs no export Tiled.',
      );
      if (this.boundGridTilesetCount === 0) {
        issues.push(
          'Nenhum tileset 32×32 do mapa foi vinculado — o chão não pode renderizar.',
          'Recarregue com Ctrl+Shift+R (cache de JS antigo). Confira 404 em /assets/terrain e /assets/props no console.',
        );
      }
    }

    if (issues.length > 0) {
      const hardFailure = this.visualTileLayers.length === 0 && this.boundGridTilesetCount === 0;
      if (hardFailure) {
        this.destroy();
        failTiledMapLoad(mapId, issues);
      } else {
        console.warn(
          `[MapLoader] Mapa "${mapId}" montado com ${issues.length} aviso(s) — exploração continua.`,
          issues,
        );
      }
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

  isMountedOnScene(mapId: MapId, scene: MapLoaderScene): boolean {
    return this.mountedMapId === mapId && this.scene === scene && this.map !== null;
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
    this.slicedTilesetTextureKeys.clear();
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
      console.info(
        `[MapLoader] Camada de colisão tile "${layer.name}" montada — ${gridTilesets.length} tileset(s) 32×32.`,
      );
      return;
    }

    console.info(
      '[MapLoader] Nenhuma camada tile "collision" no mapa — walkability usa grid legado (city01.ts) + objetos collidable:true.',
    );
  }

  /** Preferir chave compartilhada por URL (preload deduplicado) antes do alias legado por nome. */
  private resolveBoundTilesetTextureKey(
    cacheKey: string,
    tilesetName: string,
    descriptorKey: string | undefined,
  ): string | null {
    const candidates = [
      this.assets.resolveTilesetTextureKey(cacheKey, tilesetName),
      descriptorKey,
      this.assets.tilesetTextureKey(cacheKey, tilesetName),
    ].filter((key): key is string => Boolean(key));

    for (const key of candidates) {
      if (this.scene?.textures.exists(key)) return key;
    }
    return null;
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

    const cachedTilesets = this.listCachedTilesets(cacheKey);
    const objectLayers = map.objects ?? [];

    for (const layer of objectLayers) {
      if (!isTiledRenderableObjectLayer(layer.name)) continue;

      const layerObjects = layer.objects ?? [];
      this.logObjectLayerGidDiagnostics(layer.name, layerObjects, cachedTilesets);

      let createdFromGid: PhaserMapSprite[] = [];
      try {
        createdFromGid = map.createFromObjects(
          layer.name,
          { scene },
          true,
        ) as PhaserMapSprite[];
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(
          `[MapLoader] createFromObjects falhou na camada "${layer.name}": ${detail}`,
          'Confira logs [MapLoader:tileset] — margin/spacing/tilecount devem bater com o Tiled.',
        );
        issues.push(
          `Camada de objetos "${layer.name}" falhou ao instanciar tiles (gid) — ${detail}`,
        );
        continue;
      }

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
          console.warn(
            `[MapLoader] Textura de objeto ausente na camada "${layer.name}": ${this.assets.resolvePublicUrl(jsonUrl, imagePath)}`,
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
    map: PhaserTiledTilemap,
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
    const obstacles = parseTiledWorldCollision(
      mapId,
      mapData.data as Parameters<typeof parseTiledWorldCollision>[1],
    );
    setWorldCollisionObstacles(mapId, obstacles);
    for (const issue of parsed.issues) {
      console.warn(`[MapLoader] ${issue}`);
    }

    const playerSpawn = parsed.placements.playerSpawn ?? this.resolveDefaultPlayerSpawn(map);

    if (!parsed.spawnLayerFound) {
      console.warn(
        '[MapLoader] Camada "spawns" (ou "spawn") ausente — usando spawn padrão no centro do mapa.',
      );
    } else if (!parsed.placements.playerSpawn) {
      console.warn(
        '[MapLoader] Objeto de spawn ausente — usando spawn padrão no centro do mapa.',
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

    setTiledMapPlacements(mapId, {
      ...parsed.placements,
      playerSpawn,
    });
    void import('../../world/tiledMapPlacementsBridge.js').then(({ notifyTiledMapPlacementsCommitted }) => {
      notifyTiledMapPlacementsCommitted(mapId);
    });
    return playerSpawn;
  }

  private resolveDefaultPlayerSpawn(map: PhaserTiledTilemap): TiledPlayerSpawn {
    return {
      x: map.widthInPixels / 2,
      y: map.heightInPixels / 2,
      facing: 'south',
    };
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
      const resolvedKey =
        this.assets.resolveTilesetTextureKey(cacheKey, tileset.name)
        ?? tiledTilesetTextureKey(cacheKey, tileset.name);
      textureKeyByNormalizedName.set(tileset.name.trim().toLowerCase(), resolvedKey);
    }

    for (const tileset of map.tilesets) {
      const normalizedName = tileset.name.trim().toLowerCase();
      const textureKey = this.resolveBoundTilesetTextureKey(
        cacheKey,
        tileset.name,
        textureKeyByNormalizedName.get(normalizedName),
      );

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
      const jsonColumns = Number(layout.cached?.columns ?? 0);
      const jsonTilecount = Number(layout.cached?.tilecount ?? 1);
      const imageUrl = tileset.image
        ? this.assets.resolvePublicUrl(jsonUrl, tileset.image)
        : '(sem image)';

      const textureSource = this.readTextureSourceMetrics(textureKey);
      const added = map.addTilesetImage(
        tileset.name,
        textureKey,
        tileset.tileWidth,
        tileset.tileHeight,
        margin,
        spacing,
      );

      // Folha inteira (load.image) + frames 0…N — tile layers usam texCoordinates da folha;
      // createFromObjects usa o índice local como nome do frame.
      if (added && jsonTilecount > 1 && this.scene?.textures.exists(textureKey)) {
        const textureManager = this.scene.textures as unknown as {
          get: (key: string) => Parameters<typeof ensureTiledTilesetTextureFrames>[0];
        };
        const rawTexture = textureManager.get(textureKey);
        const framesAdded = ensureTiledTilesetTextureFrames(rawTexture, {
          tileWidth: tileset.tileWidth,
          tileHeight: tileset.tileHeight,
          margin,
          spacing,
          columns: jsonColumns,
          tilecount: jsonTilecount,
        });
        this.slicedTilesetTextureKeys.add(textureKey);
        if (framesAdded > 0) {
          console.info(
            `[MapLoader:tileset] "${tileset.name}" — ${framesAdded} frame(s) gerado(s) em "${textureKey}" para GIDs de props.`,
          );
        }
      }

      const diagnostic = buildTilesetBindDiagnostic({
        tilesetName: tileset.name,
        textureKey,
        imageUrl,
        tileWidth: tileset.tileWidth,
        tileHeight: tileset.tileHeight,
        margin,
        spacing,
        cached: layout.cached,
        texturePixelWidth: textureSource.width,
        texturePixelHeight: textureSource.height,
        textureFrameCount: textureSource.frameCount,
        bindOk: Boolean(added),
      });
      console.info(formatTilesetBindDiagnostic(diagnostic));

      if (!diagnostic.capacityFromTexture.widthGridAligned || !diagnostic.capacityFromTexture.heightGridAligned) {
        console.warn(
          `[MapLoader:tileset] "${tileset.name}" — área útil da textura (${textureSource.width}×${textureSource.height}, margin=${margin}) não é múltiplo de ${tileset.tileWidth}×${tileset.tileHeight}. Phaser emite "Image tile area not tile size multiple".`,
        );
      }

      if (
        diagnostic.capacityFromTexture.maxFrames > 0
        && diagnostic.jsonTilecount > diagnostic.capacityFromTexture.maxFrames
      ) {
        console.warn(
          `[MapLoader:tileset] "${tileset.name}" — tilecount JSON (${diagnostic.jsonTilecount}) > frames possíveis na textura (${diagnostic.capacityFromTexture.maxFrames}). GIDs acima disso geram "has no frame".`,
        );
      }

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
  ): { margin: number; spacing: number; cached: CachedTilesetEntry | null } {
    const rawTilesets = this.listCachedTilesets(cacheKey);
    const entry = resolveCachedTilesetEntry(rawTilesets, tilesetName);
    return {
      margin: Number(entry?.margin ?? 0),
      spacing: Number(entry?.spacing ?? 0),
      cached: entry,
    };
  }

  private listCachedTilesets(cacheKey: string): CachedTilesetEntry[] {
    const mapData = this.scene?.cache.tilemap.get(cacheKey);
    const rawTilesets = (mapData?.data as { readonly tilesets?: readonly CachedTilesetEntry[] } | undefined)?.tilesets;
    if (!Array.isArray(rawTilesets)) return [];
    return [...rawTilesets].sort(
      (left, right) => Number(left.firstgid ?? 0) - Number(right.firstgid ?? 0),
    );
  }

  private readTextureSourceMetrics(textureKey: string): {
    readonly width: number;
    readonly height: number;
    readonly frameCount: number;
  } {
    const textures = this.scene?.textures;
    if (!textures?.exists(textureKey)) {
      return { width: 0, height: 0, frameCount: 0 };
    }

    try {
      const textureManager = textures as unknown as {
        get: (key: string) => {
          getSourceImage?: () => { width?: number; height?: number };
          frameTotal?: number;
          source?: Array<{ width?: number; height?: number }>;
        };
      };
      const texture = textureManager.get(textureKey);
      const sourceImage = texture.getSourceImage?.();
      const width = Number(sourceImage?.width ?? texture.source?.[0]?.width ?? 0);
      const height = Number(sourceImage?.height ?? texture.source?.[0]?.height ?? 0);
      const frameCount = Number(texture.frameTotal ?? 0);
      return { width, height, frameCount };
    } catch {
      return { width: 0, height: 0, frameCount: 0 };
    }
  }

  private logObjectLayerGidDiagnostics(
    layerName: string,
    layerObjects: readonly TiledJsonObject[],
    cachedTilesets: readonly CachedTilesetEntry[],
  ): void {
    const invalid: string[] = [];

    for (const objectData of layerObjects) {
      const rawGid = objectData.gid;
      if (!rawGid) continue;

      const gid = stripTiledGidFlags(rawGid);
      const resolved = findTilesetForGid(cachedTilesets, gid);
      if (!resolved) {
        invalid.push(`gid=${gid} (tileset não encontrado)`);
        continue;
      }

      const { entry, localIndex } = resolved;
      const margin = Number(entry.margin ?? 0);
      const spacing = Number(entry.spacing ?? 0);
      const tileWidth = Number(entry.tilewidth ?? 32);
      const tileHeight = Number(entry.tileheight ?? 32);
      const imageWidth = Number(entry.imagewidth ?? 0);
      const imageHeight = Number(entry.imageheight ?? 0);
      const columns = Number(entry.columns ?? 0);
      const tilecount = Number(entry.tilecount ?? 0);
      const capacity = computeTilesetFrameCapacity(
        tileWidth,
        tileHeight,
        margin,
        spacing,
        imageWidth,
        imageHeight,
        columns,
      );

      if (localIndex < 0 || localIndex >= tilecount || localIndex >= capacity.maxFrames) {
        invalid.push(
          `gid=${gid} → ${entry.name} local=${localIndex} (tilecount=${tilecount}, maxFrames=${capacity.maxFrames})`,
        );
      }
    }

    if (invalid.length > 0) {
      console.warn(
        `[MapLoader:gid] Camada "${layerName}" — ${invalid.length} objeto(s) com GID fora do tileset:`,
        invalid.slice(0, 8),
        invalid.length > 8 ? `… +${invalid.length - 8} mais` : '',
      );
    }
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
