import type { MapId } from '../../../shared/world/mapRegistry.js';
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { resolveTiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import { tiledTilesetTextureKey } from '../../../config/tiledMapManifest.js';
import type { TiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import type { TiledJsonObject } from '../../../config/tiledMapJson.js';
import type { PhaserReadyTiledMap } from '../../../config/tiledMapJson.js';
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
import { forEachTiledCollidableObject, parseTiledWorldCollision } from '../../../shared/world/parseTiledWorldCollision.js';
import { setTiledMapPlacements } from '../../../shared/world/tiledMapPlacements.js';
import { setWorldCollisionObstacles, setActiveWorldCollisionMapId } from '../../../shared/world/worldCollisionRegistry.js';
import { applyTiledArcadeColliderBody } from '../../../shared/world/tiledObjectCollisionHitbox.js';
import { buildTiledCollidablePhysicsBodies } from './buildTiledCollidablePhysics.js';
import { NPC_REGISTRY_WITH_LORE } from '../../../shared/world/npcRegistry.js';
import { resolvePhaserWorldDepth, PHASER_GROUND_DEPTH } from '../layout/phaserWorldDepth.js';
import { getTiledAssetManager } from './TiledAssetManager.js';
import {
  processedTilesetAtlasKeyFromSourceUrl,
  resolveProcessedTilesetForPublicUrl,
  ROAD2_ATLAS_TEXTURE_KEY,
} from './processedTilesetPreload.js';
import { isPreloaderReady } from '../preloader/preloaderGate.js';
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
import { applyTiledObjectSpriteTransform } from './applyTiledObjectSpriteTransform.js';
import { ensureTiledTilesetTextureFrames } from './ensureTiledTilesetTextureFrames.js';
import {
  ensureTextureOrPlaceholder,
  ensureTiledMissingGidTexture,
  TILED_MISSING_GID_TEXTURE_KEY,
  type PhaserPlaceholderTextures,
  type PlaceholderKind,
} from '../assets/phaserPlaceholderTexture.js';
import {
  readTilemapJsonFromMemory,
  resolveGidTextureFrame,
} from './mapLoaderTilemapCache.js';
import type {
  MapLoaderMountResult,
  MapLoaderScene,
  PhaserMapSprite,
  PhaserPhysicsCollider,
  PhaserPhysicsColliderTarget,
  PhaserStaticColliderGroup,
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
 * JSON do mapa: injetado em memória pelo TiledAssetManager (`cache.tilemap.add`) —
 * MapLoader nunca usa `scene.load` para o JSON. GIDs sem textura → tile de erro (magenta).
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

  /** GID bruto (com flags Tiled) por object.id — para flip/rotação após sanitização. */
  private objectRawGidById = new Map<number, number>();

  /** Corpos estáticos invisíveis — `collidable: true` em todas as object layers (incl. npcs). */
  private collidableStaticGroup: PhaserStaticColliderGroup | null = null;

  private playerCollider: PhaserPhysicsCollider | null = null;

  /** tileset Tiled name (lower) → textureKey vinculada em bindTilesets. */
  private tilesetTextureKeyByName = new Map<string, string>();

  /** Agrupa sprites de object layers (props/structures). Tile layers ficam na cena — não em Container. */
  private propsRoot: {
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

    if (!isPreloaderReady()) {
      console.warn(
        '[MapLoader] PreloaderScene ainda não concluiu — road2_atlas e criaturas podem estar ausentes.',
      );
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
      const mapJson = this.ensureTilemapJsonInCache(scene, descriptor);
      if (!mapJson) {
        failTiledMapLoad(mapId, [
          'JSON Phaser-ready ausente na memória — rode npm run mirror:map-mund && npm run build.',
          'MapLoader não usa scene.load para tilemap; o artefato deve estar em tiledMapManifest.',
        ]);
      }

      this.sanitizeTilemapObjectGids(descriptor.cacheKey, descriptor);
      map = scene.make.tilemap({ key: descriptor.cacheKey });
      if (map.tilesets.length === 0) {
        console.error(
          '[MapLoader] Phaser parseou 0 tilesets — mapa parcial; verifique *PhaserMap.json.',
        );
        issues.push('Nenhum tileset no JSON parseado — chão/props podem usar placeholders.');
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

    this.propsRoot = scene.add.container(0, 0);
    this.propsRoot.setDepth(PHASER_GROUND_DEPTH + 1);

    this.buildVisualTileLayers(map, tilesets, issues);
    this.buildCollisionPhysics(map, tilesets);
    this.buildStructureAndPropLayers(map, tilesets, mapId, descriptor.cacheKey, descriptor.jsonUrl, issues);
    this.playerSpawn = this.applyTiledPlacementsFromCache(descriptor.cacheKey, mapId, map, issues);
    this.buildCollidableObjectPhysics(descriptor.cacheKey, mapId);

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
    } else {
      this.logVisualTileLayerDiagnostics();
    }

    if (issues.length > 0) {
      console.warn(
        `[MapLoader] Mapa "${mapId}" montado com ${issues.length} aviso(s) — exploração continua.`,
        issues,
      );
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

  getCollidableStaticGroup(): PhaserStaticColliderGroup | null {
    return this.collidableStaticGroup;
  }

  /**
   * Liga o jogador (body Arcade) aos corpos estáticos dos objetos Tiled collidable.
   * Chamar após o sprite do jogador ter `physics.add.existing(sprite, false)`.
   */
  bindPlayerCollider(player: PhaserPhysicsColliderTarget | null): void {
    this.playerCollider?.destroy();
    this.playerCollider = null;

    const scene = this.scene;
    if (!scene?.physics?.add || !player?.body || !this.collidableStaticGroup) return;

    this.playerCollider = scene.physics.add.collider(player, this.collidableStaticGroup);
    console.info('[MapLoader] Collider Arcade jogador ↔ objetos collidable montado.');
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

    this.playerCollider?.destroy();
    this.playerCollider = null;
    this.collidableStaticGroup?.destroy(true);
    this.collidableStaticGroup = null;

    this.propsRoot?.destroy();
    this.propsRoot = null;

    this.map?.destroy();
    this.map = null;
    this.mountedMapId = null;
    this.mapCacheKey = null;
    this.mapJsonUrl = null;
    this.expectedTilesetCount = 0;
    this.boundTilesetCount = 0;
    this.boundGridTilesetCount = 0;
    this.slicedTilesetTextureKeys.clear();
    this.objectRawGidById.clear();
    this.tilesetTextureKeyByName.clear();
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
      // TilemapLayer não pode ir para Container — WebGL culling/render quebra (tela preta).
      depth += 1;
      this.visualTileLayers.push(tileLayer);
    }
  }

  /** Amostra GIDs na primeira camada — ajuda a distinguir bind OK vs pixels vazios. */
  private logVisualTileLayerDiagnostics(): void {
    const firstLayer = this.visualTileLayers[0] as {
      readonly layer?: { readonly name?: string; readonly data?: readonly number[] };
      readonly name?: string;
      getTileAt?: (x: number, y: number) => { readonly index?: number; readonly gid?: number } | null;
    } | undefined;
    if (!firstLayer) return;

    const layerName = firstLayer.layer?.name ?? firstLayer.name ?? 'tile-layer';
    const sampleTile = firstLayer.getTileAt?.(0, 0);
    const sampleGid = sampleTile?.index ?? sampleTile?.gid ?? 0;
    const descriptor = this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null;
    const mapJson = this.scene && this.mapCacheKey && descriptor
      ? readTilemapJsonFromMemory(this.scene, this.mapCacheKey, descriptor)
      : null;
    const jsonLayers = Array.isArray((mapJson as { layers?: unknown } | null)?.layers)
      ? (mapJson as { layers: readonly { type?: string; name?: string; data?: readonly number[] }[] }).layers
      : [];
    const tiledLayer = jsonLayers.find(
      (entry) => entry.type === 'tilelayer' && entry.name === layerName,
    );
    const nonEmptyEstimate = Array.isArray(tiledLayer?.data)
      ? tiledLayer.data.filter((value: number) => value > 0).length
      : null;

    console.info(
      `[MapLoader:layer] "${layerName}" — tile(0,0) gid=${sampleGid}, tiles não-vazios≈${nonEmptyEstimate ?? '?'}`,
    );
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

  /** Preferir atlas processado (basename do PNG) ou chave do preload antes do alias legado. */
  private resolveBoundTilesetTextureKey(
    cacheKey: string,
    tilesetName: string,
    descriptorKey: string | undefined,
    processedAtlasKey: string | null = null,
  ): string | null {
    const candidates = [
      processedAtlasKey,
      this.assets.resolveTilesetTextureKey(cacheKey, tilesetName),
      descriptorKey,
      this.assets.tilesetTextureKey(cacheKey, tilesetName),
    ].filter((key): key is string => Boolean(key));

    for (const key of candidates) {
      if (this.scene?.textures.exists(key)) return key;
    }
    return processedAtlasKey ?? candidates[0] ?? null;
  }

  private resolveProcessedAtlasTextureKey(jsonUrl: string, imagePath: string): string | null {
    const publicUrl = this.assets.resolvePublicUrl(jsonUrl, imagePath);
    if (!resolveProcessedTilesetForPublicUrl(publicUrl)) return null;
    return processedTilesetAtlasKeyFromSourceUrl(publicUrl);
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
    if (!scene || !this.propsRoot) return;

    const descriptor = this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null;
    const cachedTilesets = this.listCachedTilesets(cacheKey, descriptor);
    const objectLayers = map.objects ?? [];
    const textures = scene.textures as unknown as PhaserPlaceholderTextures;
    let missingGidCount = 0;

    const resolveTextureKeyForTileset = (tilesetName: string): string | null => {
      const normalized = tilesetName.trim().toLowerCase();
      const bound = this.tilesetTextureKeyByName.get(normalized);
      if (bound && scene.textures.exists(bound)) return bound;
      const fallback = this.assets.resolveTilesetTextureKey(cacheKey, tilesetName)
        ?? this.assets.tilesetTextureKey(cacheKey, tilesetName);
      return scene.textures.exists(fallback) ? fallback : fallback;
    };

    const ensureMissingGidTexture = (): void => {
      ensureTiledMissingGidTexture(textures, map.tileWidth, map.tileHeight);
    };

    for (const layer of objectLayers) {
      if (!isTiledRenderableObjectLayer(layer.name)) continue;

      const layerObjects = layer.objects ?? [];
      this.logObjectLayerGidDiagnostics(layer.name, layerObjects, cachedTilesets);

      for (const objectData of layerObjects) {
        const rawGid = objectData.gid;
        if (rawGid) {
          const storedRawGid = objectData.id !== undefined
            ? this.objectRawGidById.get(objectData.id)
            : undefined;
          const resolution = resolveGidTextureFrame(
            scene.textures as unknown as Parameters<typeof resolveGidTextureFrame>[0],
            storedRawGid ?? rawGid,
            cachedTilesets,
            resolveTextureKeyForTileset,
            TILED_MISSING_GID_TEXTURE_KEY,
            ensureMissingGidTexture,
          );

          if (!resolution) continue;

          if (resolution.usedErrorTile) {
            missingGidCount += 1;
          }

          const resolvedTileset = findTilesetForGid(
            cachedTilesets,
            stripTiledGidFlags(storedRawGid ?? rawGid),
          );
          const tileW = Number(
            objectData.width
            || resolvedTileset?.entry.tilewidth
            || map.tileWidth
            || GAME_CONFIG.TILE_SIZE,
          );
          const tileH = Number(
            objectData.height
            || resolvedTileset?.entry.tileheight
            || map.tileHeight
            || GAME_CONFIG.TILE_SIZE,
          );

          const sprite = scene.add.sprite(
            objectData.x + tileW / 2,
            objectData.y,
            resolution.textureKey,
          );
          if (resolution.frameIndex > 0) {
            sprite.setFrame?.(resolution.frameIndex);
          }
          if (tileW > 0 && tileH > 0) {
            sprite.setDisplaySize(tileW, tileH);
          }
          applyTiledObjectSpriteTransform(sprite, objectData, storedRawGid ?? rawGid);
          this.registerMapObject(scene, sprite, objectData, layer.name, mapId);
          continue;
        }

        const imagePath = this.resolveObjectImagePath(objectData);
        if (!imagePath) continue;

        const textureKey = this.assets.objectTextureKey(cacheKey, imagePath);
        if (!scene.textures.exists(textureKey)) {
          console.warn(
            `[MapLoader] Textura de objeto ausente na camada "${layer.name}": ${this.assets.resolvePublicUrl(jsonUrl, imagePath)} — placeholder procedural.`,
          );
          ensureTextureOrPlaceholder(
            textures,
            textureKey,
            imagePath,
            'prop',
            Math.max(32, objectData.width || 32),
            Math.max(32, objectData.height || 32),
          );
        }

        if (!scene.textures.exists(textureKey)) {
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
        applyTiledObjectSpriteTransform(sprite, objectData);
        this.registerMapObject(scene, sprite, objectData, layer.name, mapId);
      }
    }

    if (missingGidCount > 0) {
      console.warn(
        `[MapLoader] ${missingGidCount} objeto(s) com GID sem textura/frame — tile de erro (magenta) aplicado.`,
      );
      issues.push(
        `${missingGidCount} objeto(s) renderizado(s) com tile de erro (GID sem textura no cache).`,
      );
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

    const descriptor = resolveTiledMapDescriptor(mapId);
    const mapJson = descriptor
      ? readTilemapJsonFromMemory(scene, cacheKey, descriptor)
      : null;
    if (!mapJson) {
      issues.push('Cache do tilemap indisponível após parse — recarregue a página.');
      return null;
    }

    const parsed = parseTiledMapPlacements(mapId, mapJson as Parameters<typeof parseTiledMapPlacements>[1]);
    const obstacles = parseTiledWorldCollision(
      mapId,
      mapJson as Parameters<typeof parseTiledWorldCollision>[1],
    );
    setWorldCollisionObstacles(mapId, obstacles);
    setActiveWorldCollisionMapId(mapId);
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

    this.propsRoot?.add(sprite);

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
    applyTiledArcadeColliderBody(body, width, height, 'prop');
  }

  private buildCollidableObjectPhysics(cacheKey: string, mapId: MapId): void {
    const scene = this.scene;
    if (!scene) return;

    this.collidableStaticGroup?.destroy(true);
    this.collidableStaticGroup = null;
    this.playerCollider?.destroy();
    this.playerCollider = null;

    const descriptor = resolveTiledMapDescriptor(mapId);
    const mapData = descriptor
      ? readTilemapJsonFromMemory(scene, cacheKey, descriptor)
      : null;
    if (!mapData) return;

    this.collidableStaticGroup = buildTiledCollidablePhysicsBodies(
      scene,
      mapId,
      mapData as Parameters<typeof forEachTiledCollidableObject>[0],
    );
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
      const publicUrl = this.assets.resolvePublicUrl(jsonUrl, tileset.imagePath);
      const processedAtlasKey = resolveProcessedTilesetForPublicUrl(publicUrl)
        ? processedTilesetAtlasKeyFromSourceUrl(publicUrl)
        : null;
      const resolvedKey =
        processedAtlasKey
        ?? this.assets.resolveTilesetTextureKey(cacheKey, tileset.name)
        ?? tiledTilesetTextureKey(cacheKey, tileset.name);
      textureKeyByNormalizedName.set(tileset.name.trim().toLowerCase(), resolvedKey);
    }

    for (const tileset of map.tilesets) {
      const normalizedName = tileset.name.trim().toLowerCase();
      const imagePath = tileset.image;
      const processedAtlasKey = imagePath
        ? this.resolveProcessedAtlasTextureKey(jsonUrl, imagePath)
        : null;
      const resolvedTextureKey =
        (processedAtlasKey && this.scene?.textures.exists(processedAtlasKey)
          ? processedAtlasKey
          : null)
        ?? this.resolveBoundTilesetTextureKey(
          cacheKey,
          tileset.name,
          textureKeyByNormalizedName.get(normalizedName),
          processedAtlasKey,
        )
        ?? tiledTilesetTextureKey(cacheKey, tileset.name);

      const layout = this.resolveTilesetLayout(cacheKey, tileset.name, descriptor);
      const isGridTileset =
        tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight;

      if (!resolvedTextureKey) {
        console.warn(
          `[MapLoader] Tileset "${tileset.name}" sem chave de textura — placeholder procedural.`,
        );
        continue;
      }

      this.tilesetTextureKeyByName.set(normalizedName, resolvedTextureKey);

      if (
        processedAtlasKey === ROAD2_ATLAS_TEXTURE_KEY
        && this.scene
        && !this.scene.textures.exists(ROAD2_ATLAS_TEXTURE_KEY)
      ) {
        const message =
          'road2_atlas não está no cache — MapLoader não carrega atlas; aguarde PreloaderScene.';
        console.error(`[MapLoader] ${message}`);
        issues.push(message);
        continue;
      }

      if (this.scene && !this.scene.textures.exists(resolvedTextureKey)) {
        const imagePath = tileset.image;
        if (imagePath && isGridTileset) {
          console.warn(
            `[MapLoader] Tileset 32×32 "${tileset.name}" sem textura carregada: ${this.assets.resolvePublicUrl(jsonUrl, imagePath)} — placeholder.`,
          );
        } else if (imagePath) {
          console.warn(
            `[MapLoader] Textura ausente para tileset de prop "${tileset.name}" — placeholder.`,
          );
        }
        const placeholderWidth = Number(layout.cached?.imagewidth ?? tileset.tileWidth ?? GAME_CONFIG.TILE_SIZE);
        const placeholderHeight = Number(layout.cached?.imageheight ?? tileset.tileHeight ?? GAME_CONFIG.TILE_SIZE);
        const placeholderKind: PlaceholderKind = isGridTileset ? 'tile' : 'prop';
        ensureTextureOrPlaceholder(
          this.scene.textures as unknown as PhaserPlaceholderTextures,
          resolvedTextureKey,
          tileset.name,
          placeholderKind,
          placeholderWidth,
          placeholderHeight,
        );
      }

      const margin = layout.margin;
      const spacing = layout.spacing;
      const jsonColumns = Number(layout.cached?.columns ?? 0);
      const jsonTilecount = Number(layout.cached?.tilecount ?? 1);
      const imageUrl = tileset.image
        ? this.assets.resolvePublicUrl(jsonUrl, tileset.image)
        : (layout.cached?.image
          ? this.assets.resolvePublicUrl(jsonUrl, String(layout.cached.image))
          : this.assets.resolveTilesetTextureKey(cacheKey, tileset.name) ?? '(sem url)');

      const textureSource = this.readTextureSourceMetrics(resolvedTextureKey);
      const added = map.addTilesetImage(
        tileset.name,
        resolvedTextureKey,
        tileset.tileWidth,
        tileset.tileHeight,
        margin,
        spacing,
      );

      if (processedAtlasKey && resolvedTextureKey === processedAtlasKey) {
        console.info(
          `[MapLoader:tileset] addTilesetImage("${tileset.name}", "${resolvedTextureKey}") — atlas processado (não load.image bruto).`,
        );
      }

      // Só props multi-tile (folhas ≠ 32×32) precisam de frames nomeados para GIDs em object layers.
      // Em tilesets de grade, frames extras quebram addTilesetImage (tela preta com bind OK).
      if (
        added
        && !isGridTileset
        && jsonTilecount > 1
        && this.scene?.textures.exists(resolvedTextureKey)
      ) {
        const textureManager = this.scene.textures as unknown as {
          get: (key: string) => Parameters<typeof ensureTiledTilesetTextureFrames>[0];
        };
        const rawTexture = textureManager.get(resolvedTextureKey);
        const framesAdded = ensureTiledTilesetTextureFrames(rawTexture, {
          tileWidth: tileset.tileWidth,
          tileHeight: tileset.tileHeight,
          margin,
          spacing,
          columns: jsonColumns,
          tilecount: jsonTilecount,
        });
        this.slicedTilesetTextureKeys.add(resolvedTextureKey);
        if (framesAdded > 0) {
          console.info(
            `[MapLoader:tileset] "${tileset.name}" — ${framesAdded} frame(s) gerado(s) em "${resolvedTextureKey}" para GIDs de props.`,
          );
        }
      }

      const diagnostic = buildTilesetBindDiagnostic({
        tilesetName: tileset.name,
        textureKey: resolvedTextureKey,
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
    descriptor: TiledMapDescriptor | null = null,
  ): { margin: number; spacing: number; cached: CachedTilesetEntry | null } {
    const rawTilesets = this.listCachedTilesets(cacheKey, descriptor);
    const entry = resolveCachedTilesetEntry(rawTilesets, tilesetName);
    return {
      margin: Number(entry?.margin ?? 0),
      spacing: Number(entry?.spacing ?? 0),
      cached: entry,
    };
  }

  private listCachedTilesets(
    cacheKey: string,
    descriptor: TiledMapDescriptor | null = null,
  ): CachedTilesetEntry[] {
    const scene = this.scene;
    if (!scene) return [];

    const resolvedDescriptor = descriptor
      ?? (this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null);
    if (!resolvedDescriptor) return [];

    const mapJson = readTilemapJsonFromMemory(scene, cacheKey, resolvedDescriptor);
    const rawTilesets = (mapJson as { readonly tilesets?: readonly CachedTilesetEntry[] } | null)?.tilesets;
    if (!Array.isArray(rawTilesets)) return [];
    return [...rawTilesets].sort(
      (left, right) => Number(left.firstgid ?? 0) - Number(right.firstgid ?? 0),
    );
  }

  /** Injeta JSON Phaser-ready em `cache.tilemap` — nunca `scene.load.tilemapTiledJSON`. */
  private ensureTilemapJsonInCache(
    scene: MapLoaderScene,
    descriptor: TiledMapDescriptor,
  ): PhaserReadyTiledMap | null {
    this.assets.ensureEnrichedTilemapInCache(scene, descriptor);
    return readTilemapJsonFromMemory(scene, descriptor.cacheKey, descriptor);
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

  private sanitizeTilemapObjectGids(cacheKey: string, descriptor: TiledMapDescriptor): void {
    const scene = this.scene;
    if (!scene) return;

    const mapJson = readTilemapJsonFromMemory(scene, cacheKey, descriptor);
    const data = mapJson as {
      readonly layers?: Array<{
        readonly type?: string;
        readonly objects?: Array<{ readonly id?: number; gid?: number }>;
      }>;
    } | null;

    if (!data?.layers) return;

    this.objectRawGidById.clear();

    for (const layer of data.layers) {
      if (layer.type !== 'objectgroup') continue;

      for (const object of layer.objects ?? []) {
        const rawGid = object.gid;
        if (typeof rawGid !== 'number' || rawGid <= 0) continue;

        const realGid = stripTiledGidFlags(rawGid);
        if (typeof object.id === 'number' && rawGid !== realGid) {
          this.objectRawGidById.set(object.id, rawGid);
        }

        (object as { gid: number }).gid = realGid;
      }
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
