// @ts-nocheck
import { GAME_CONFIG } from '../../../game/constants/GameConfig.js';
import { resolveTiledMapDescriptor } from '../../../config/tiledMapManifest.js';
import { tiledTilesetTextureKey } from '../../../config/tiledMapManifest.js';
import { readTiledObjectProperty } from '../../../config/tiledMapJson.js';
import { isTiledMapObjectCollidable, resolveTiledMapObjectUid, } from '../../../shared/world/tiledMapObject.js';
import { isTiledCollisionTileLayer, isTiledRenderableObjectLayer, isTiledVisualTileLayer, } from '../../../shared/world/tiledMapLayers.js';
import { parseTiledMapPlacements } from '../../../shared/world/parseTiledMapPlacements.js';
import { parseTiledWorldCollision } from '../../../shared/world/parseTiledWorldCollision.js';
import { setTiledMapPlacements, clearTiledMapPlacements } from '../../../shared/world/tiledMapPlacements.js';
import { setWorldCollisionObstacles, setActiveWorldCollisionMapId } from '../../../shared/world/worldCollisionRegistry.js';
import { NPC_REGISTRY_WITH_LORE } from '../../../shared/world/npcRegistry.js';
import { applyTiledArcadeColliderBody } from '../../../shared/world/tiledObjectCollisionHitbox.js';
import { buildTiledCollidablePhysicsBodies } from './buildTiledCollidablePhysics.js';
import { resolvePhaserWorldDepth, PHASER_GROUND_DEPTH } from '../layout/phaserWorldDepth.js';
import { getTiledAssetManager } from './TiledAssetManager.js';
import { processedTilesetAtlasKeyFromSourceUrl, resolveProcessedTilesetForPublicUrl, ROAD2_ATLAS_TEXTURE_KEY, } from './processedTilesetPreload.js';
import { isPreloaderReady } from '../preloader/preloaderGate.js';
import { failTiledMapLoad } from './mapLoadFatalError.js';
import { buildTilesetBindDiagnostic, computeTilesetFrameCapacity, findTilesetForGid, formatTilesetBindDiagnostic, resolveCachedTilesetEntry, stripTiledGidFlags, } from './tilesetBindDiagnostics.js';
import { applyTiledObjectSpriteTransform } from './applyTiledObjectSpriteTransform.js';
import { ensureTiledTilesetTextureFrames } from './ensureTiledTilesetTextureFrames.js';
import { ensureTextureOrPlaceholder, ensureTiledMissingGidTexture, TILED_MISSING_GID_TEXTURE_KEY, } from '../assets/phaserPlaceholderTexture.js';
import { readTilemapJsonFromMemory, resolveGidTextureFrame, } from './mapLoaderTilemapCache.js';
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
export function assertTilemapReadyForRender(scene, cacheKey, context) {
    if (!scene) {
        throw new Error(`[MapLoader] Scene not ready for ${context}.`);
    }
    const tilemapCache = scene.cache?.tilemap;
    const hasEntry = tilemapCache?.has?.(cacheKey) ?? tilemapCache?.exists?.(cacheKey) ?? false;
    if (!hasEntry) {
        throw new Error(`[MapLoader] Tilemap cache entry "${cacheKey}" not ready for ${context}. `
            + 'A cena ainda não concluiu o ready-check do JSON Tiled.');
    }
}
export class MapLoader {
    assets = getTiledAssetManager();
    scene = null;
    map = null;
    visualTileLayers = [];
    objectRecords = [];
    objectByUid = new Map();
    collisionLayer = null;
    playerSpawn = null;
    mountedMapId = null;
    expectedTilesetCount = 0;
    boundTilesetCount = 0;
    boundGridTilesetCount = 0;
    mapCacheKey = null;
    mapJsonUrl = null;
    /** Texturas já fatiadas em frames 0…N para createFromObjects. */
    slicedTilesetTextureKeys = new Set();
    /** GID bruto (com flags Tiled) por object.id — para flip/rotação após sanitização. */
    objectRawGidById = new Map();
    /** Corpos estáticos invisíveis — `collidable: true` em todas as object layers (incl. npcs). */
    collidableStaticGroup = null;
    playerCollider = null;
    /** tileset Tiled name (lower) → textureKey vinculada em bindTilesets. */
    tilesetTextureKeyByName = new Map();
    /** Sprites de object layers ficam na cena com depth Y — não em Container (tilemap já fora). */
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Auditoria Tiled-First: rastreando descarte de entidades órfãs
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /** NPCs que não foram encontrados na camada Tiled (órfãos descartados). */
    orphanedNpcs = [];
    /** Objetos collidable carregados da camada Tiled. */
    collidableObjectsLoaded = 0;
    /** Tilesets definidos no JSON Tiled vs. vinculados com sucesso em Phaser. */
    tilesetsValidation = {
        declared: 0,
        bound: 0,
        warnings: [],
    };
    queuePreload(scene, mapId) {
        const descriptor = resolveTiledMapDescriptor(mapId);
        if (!descriptor)
            return false;
        this.mapCacheKey = descriptor.cacheKey;
        this.mapJsonUrl = descriptor.jsonUrl;
        this.assets.queueMapAssets(scene, descriptor);
        return true;
    }
    async load(scene, mapId) {
        const issues = [];
        const descriptor = resolveTiledMapDescriptor(mapId);
        if (!descriptor) {
            failTiledMapLoad(mapId, [
                `Export Tiled ausente para "${mapId}" — adicione o .tmj em public/assets/map_mund/ e rode npm run mirror:map-mund.`,
            ]);
        }
        if (!isPreloaderReady()) {
            console.warn('[MapLoader] PreloaderScene ainda não concluiu — road2_atlas e criaturas podem estar ausentes.');
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
        let map;
        try {
            const mapJson = this.ensureTilemapJsonInCache(scene, descriptor);
            if (!mapJson) {
                failTiledMapLoad(mapId, [
                    'JSON Phaser-ready ausente na memória — rode npm run mirror:map-mund && npm run build.',
                    'MapLoader não usa scene.load para tilemap; o artefato deve estar em tiledMapManifest.',
                ]);
            }
            assertTilemapReadyForRender(scene, descriptor.cacheKey, 'tilemap parse');
            this.sanitizeTilemapObjectGids(descriptor.cacheKey, descriptor);
            map = scene.make.tilemap({ key: descriptor.cacheKey });
            // Validar alinhamento de grid (deve ser 32×32)
            this.validateGridAlignment(map, issues, descriptor.jsonUrl);
            if (map.tilesets.length === 0) {
                console.error('[MapLoader] Phaser parseou 0 tilesets — mapa parcial; verifique *PhaserMap.json.');
                issues.push('Nenhum tileset no JSON parseado — chão/props podem usar placeholders.');
            }
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            failTiledMapLoad(mapId, [
                `Phaser não conseguiu parsear o JSON do mapa (${descriptor.jsonUrl}).`,
                `Detalhe: ${detail}`,
                'Verifique tilewidth/tileheight (32×32), tilesets embutidos e camadas válidas no Tiled.',
            ]);
        }
        this.map = map;
        try {
            const tilesets = this.bindTilesets(map, descriptor.cacheKey, descriptor.jsonUrl, issues, mapId);
            this.expectedTilesetCount = map.tilesets.length;
            this.boundTilesetCount = tilesets.length;
            if (this.boundGridTilesetCount === 0) {
                console.warn(`[MapLoader] Nenhum tileset ${map.tileWidth}×${map.tileHeight} vinculado — tile layers podem ficar vazias.`);
            }
            this.buildVisualTileLayers(map, tilesets, issues);
            this.buildCollisionPhysics(map, tilesets);
            this.buildStructureAndPropLayers(map, tilesets, mapId, descriptor.cacheKey, descriptor.jsonUrl, issues);
            this.playerSpawn = this.applyTiledPlacementsFromCache(descriptor.cacheKey, mapId, map, issues);
            this.buildCollidableObjectPhysics(descriptor.cacheKey, mapId);
            if (this.visualTileLayers.length === 0) {
                console.warn('[MapLoader] Nenhuma camada visual de tiles montada — verifique tilesets e GIDs no export Tiled.');
                if (this.boundGridTilesetCount === 0) {
                    issues.push('Nenhum tileset 32×32 do mapa foi vinculado — o chão não pode renderizar.', 'Recarregue com Ctrl+Shift+R (cache de JS antigo). Confira 404 em /assets/terrain e /assets/props no console.');
                }
            }
            else {
                this.logVisualTileLayerDiagnostics();
            }
            if (issues.length > 0) {
                console.warn(`[MapLoader] Mapa "${mapId}" montado com ${issues.length} aviso(s) — exploração continua.`, issues);
            }
            // Gerar relatório de auditoria Tiled-First
            this.generateTiledAuditReport(mapId);
            console.info(`[MapLoader] Mapa "${mapId}" montado — ${this.visualTileLayers.length} tile layer(s), ${this.boundGridTilesetCount} tileset(s) 32×32, ${this.objectRecords.length} objeto(s).`);
            return {
                mapId,
                widthPx: map.widthInPixels,
                heightPx: map.heightInPixels,
                objects: [...this.objectRecords],
                objectByUid: new Map(this.objectByUid),
                playerSpawn: this.playerSpawn,
            };
        }
        catch (error) {
            const detail = error instanceof Error ? error.message : String(error);
            console.error('[MapLoader] Falha crítica ao montar mapa Tiled.', error);
            failTiledMapLoad(mapId, [
                'Renderização do mapa abortada por falha crítica durante bind/layout.',
                `Detalhe: ${detail}`,
            ]);
        }
    }
    getCollisionLayer() {
        return this.collisionLayer;
    }
    getCollidableStaticGroup() {
        return this.collidableStaticGroup;
    }
    /**
     * Liga o jogador (body Arcade) aos corpos estáticos dos objetos Tiled collidable.
     * Chamar após o sprite do jogador ter `physics.add.existing(sprite, false)`.
     */
    bindPlayerCollider(player) {
        this.playerCollider?.destroy();
        this.playerCollider = null;
        const scene = this.scene;
        if (!scene?.physics?.add || !player?.body || !this.collidableStaticGroup)
            return;
        this.playerCollider = scene.physics.add.collider(player, this.collidableStaticGroup);
        console.info('[MapLoader] Collider Arcade jogador ↔ objetos collidable montado.');
    }
    getPlayerSpawn() {
        return this.playerSpawn ? { ...this.playerSpawn } : null;
    }
    getMapPixelSize() {
        if (!this.map)
            return null;
        return {
            widthPx: this.map.widthInPixels,
            heightPx: this.map.heightInPixels,
        };
    }
    getObjectByUid(uid) {
        return this.objectByUid.get(uid) ?? null;
    }
    listObjects() {
        return [...this.objectRecords];
    }
    isMounted(mapId) {
        if (!this.map)
            return false;
        if (mapId && this.mountedMapId !== mapId)
            return false;
        return true;
    }
    getVisualTileLayerCount() {
        return this.visualTileLayers.length;
    }
    allTilesetsBound() {
        return this.boundTilesetCount > 0;
    }
    hasRenderableTileLayers() {
        return this.visualTileLayers.length > 0;
    }
    getBoundTilesetCount() {
        return this.boundTilesetCount;
    }
    getBoundGridTilesetCount() {
        return this.boundGridTilesetCount;
    }
    isMountedOnScene(mapId, scene) {
        return this.mountedMapId === mapId && this.scene === scene && this.map !== null;
    }
    destroy() {
        const mapId = this.mountedMapId;
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
        // Resetar contadores de auditoria
        this.orphanedNpcs = [];
        this.collidableObjectsLoaded = 0;
        this.tilesetsValidation = { declared: 0, bound: 0, warnings: [] };
        // Limpar placements do mapa anterior (NPCs, spawns, etc.)
        if (mapId) {
            clearTiledMapPlacements(mapId);
        }
    }
    buildVisualTileLayers(map, tilesets, issues) {
        let depth = PHASER_GROUND_DEPTH;
        const gridTilesets = tilesets.filter((tileset) => tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight);
        for (const layer of map.layers) {
            if (!isTiledVisualTileLayer(layer.name))
                continue;
            const tileLayer = map.createLayer(layer.name, gridTilesets, 0, 0);
            if (!tileLayer) {
                console.warn(`[MapLoader] Camada "${layer.name}" não montou — tilesets 32×32 ausentes, margin incorreto ou GIDs inválidos.`);
                continue;
            }
            tileLayer.setDepth(depth);
            // TilemapLayer não pode ir para Container — WebGL culling/render quebra (tela preta).
            depth += 1;
            this.visualTileLayers.push(tileLayer);
        }
    }
    /** Amostra GIDs na primeira camada — ajuda a distinguir bind OK vs pixels vazios. */
    logVisualTileLayerDiagnostics() {
        const firstLayer = this.visualTileLayers[0];
        if (!firstLayer)
            return;
        const layerName = firstLayer.layer?.name ?? firstLayer.name ?? 'tile-layer';
        const sampleTile = firstLayer.getTileAt?.(0, 0);
        const sampleGid = sampleTile?.index ?? sampleTile?.gid ?? 0;
        const descriptor = this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null;
        const mapJson = this.scene && this.mapCacheKey && descriptor
            ? readTilemapJsonFromMemory(this.scene, this.mapCacheKey, descriptor)
            : null;
        const jsonLayers = Array.isArray(mapJson?.layers)
            ? mapJson.layers
            : [];
        const tiledLayer = jsonLayers.find((entry) => entry.type === 'tilelayer' && entry.name === layerName);
        const nonEmptyEstimate = Array.isArray(tiledLayer?.data)
            ? tiledLayer.data.filter((value) => value > 0).length
            : null;
        console.info(`[MapLoader:layer] "${layerName}" — tile(0,0) gid=${sampleGid}, tiles não-vazios≈${nonEmptyEstimate ?? '?'}`);
    }
    buildCollisionPhysics(map, tilesets) {
        const scene = this.scene;
        if (!scene)
            return;
        const gridTilesets = tilesets.filter((tileset) => tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight);
        for (const layer of map.layers) {
            if (!isTiledCollisionTileLayer(layer.name))
                continue;
            const collision = map.createLayer(layer.name, gridTilesets, 0, 0);
            if (!collision)
                continue;
            collision.setVisible(false);
            collision.setDepth(PHASER_GROUND_DEPTH + this.visualTileLayers.length);
            collision.setCollisionByProperty({ collides: true });
            map.setCollisionByProperty({ collides: true });
            if (scene.physics) {
                scene.physics.add.existing(collision, true);
            }
            this.collisionLayer = collision;
            console.info(`[MapLoader] Camada de colisão tile "${layer.name}" montada — ${gridTilesets.length} tileset(s) 32×32.`);
            return;
        }
        console.info('[MapLoader] Nenhuma camada tile "collision" no mapa — walkability usa grid legado (city01.ts) + objetos collidable:true.');
    }
    /** Preferir atlas processado (basename do PNG) ou chave do preload antes do alias legado. */
    resolveBoundTilesetTextureKey(cacheKey, tilesetName, descriptorKey, processedAtlasKey = null) {
        const candidates = [
            processedAtlasKey,
            this.assets.resolveTilesetTextureKey(cacheKey, tilesetName),
            descriptorKey,
            this.assets.tilesetTextureKey(cacheKey, tilesetName),
        ].filter((key) => Boolean(key));
        for (const key of candidates) {
            if (this.scene?.textures.exists(key))
                return key;
        }
        return processedAtlasKey ?? candidates[0] ?? null;
    }
    resolveProcessedAtlasTextureKey(jsonUrl, imagePath) {
        const publicUrl = this.assets.resolvePublicUrl(jsonUrl, imagePath);
        if (!resolveProcessedTilesetForPublicUrl(publicUrl))
            return null;
        return processedTilesetAtlasKeyFromSourceUrl(publicUrl);
    }
    buildStructureAndPropLayers(map, tilesets, mapId, cacheKey, jsonUrl, issues) {
        const scene = this.scene;
        if (!scene)
            return;
        const descriptor = this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null;
        const cachedTilesets = this.listCachedTilesets(cacheKey, descriptor);
        const objectLayers = map.objects ?? [];
        const textures = scene.textures;
        let missingGidCount = 0;
        const resolveTextureKeyForTileset = (tilesetName) => {
            const normalized = tilesetName.trim().toLowerCase();
            const bound = this.tilesetTextureKeyByName.get(normalized);
            if (bound && scene.textures.exists(bound))
                return bound;
            const fallback = this.assets.resolveTilesetTextureKey(cacheKey, tilesetName)
                ?? this.assets.tilesetTextureKey(cacheKey, tilesetName);
            return scene.textures.exists(fallback) ? fallback : fallback;
        };
        const ensureMissingGidTexture = () => {
            ensureTiledMissingGidTexture(textures, map.tileWidth, map.tileHeight);
        };
        for (const layer of objectLayers) {
            if (!isTiledRenderableObjectLayer(layer.name))
                continue;
            const layerObjects = layer.objects ?? [];
            this.logObjectLayerGidDiagnostics(layer.name, layerObjects, cachedTilesets);
            for (const objectData of layerObjects) {
                const rawGid = objectData.gid;
                if (rawGid) {
                    const storedRawGid = objectData.id !== undefined
                        ? this.objectRawGidById.get(objectData.id)
                        : undefined;
                    const resolution = resolveGidTextureFrame(scene.textures, storedRawGid ?? rawGid, cachedTilesets, resolveTextureKeyForTileset, TILED_MISSING_GID_TEXTURE_KEY, ensureMissingGidTexture);
                    if (!resolution)
                        continue;
                    if (resolution.usedErrorTile) {
                        missingGidCount += 1;
                    }
                    const resolvedTileset = findTilesetForGid(cachedTilesets, stripTiledGidFlags(storedRawGid ?? rawGid));
                    const tileW = Number(objectData.width
                        || resolvedTileset?.entry.tilewidth
                        || map.tileWidth
                        || GAME_CONFIG.TILE_SIZE);
                    const tileH = Number(objectData.height
                        || resolvedTileset?.entry.tileheight
                        || map.tileHeight
                        || GAME_CONFIG.TILE_SIZE);
                    const sprite = scene.add.sprite(objectData.x + tileW / 2, objectData.y, resolution.textureKey);
                    if (resolution.cropRect) {
                        sprite.setCrop?.(resolution.cropRect.x, resolution.cropRect.y, resolution.cropRect.width, resolution.cropRect.height);
                    }
                    else if (resolution.frameIndex > 0) {
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
                if (!imagePath)
                    continue;
                const textureKey = this.assets.objectTextureKey(cacheKey, imagePath);
                if (!scene.textures.exists(textureKey)) {
                    console.warn(`[MapLoader] Textura de objeto ausente na camada "${layer.name}": ${this.assets.resolvePublicUrl(jsonUrl, imagePath)} — placeholder procedural.`);
                    ensureTextureOrPlaceholder(textures, textureKey, imagePath, 'prop', Math.max(32, objectData.width || 32), Math.max(32, objectData.height || 32));
                }
                if (!scene.textures.exists(textureKey)) {
                    continue;
                }
                const sprite = this.createMapSprite(scene, objectData.x + objectData.width / 2, objectData.y + objectData.height, textureKey, objectData.width, objectData.height);
                applyTiledObjectSpriteTransform(sprite, objectData);
                this.registerMapObject(scene, sprite, objectData, layer.name, mapId);
            }
        }
        if (missingGidCount > 0) {
            console.warn(`[MapLoader] ${missingGidCount} objeto(s) com GID sem textura/frame — tile de erro (magenta) aplicado.`);
            issues.push(`${missingGidCount} objeto(s) renderizado(s) com tile de erro (GID sem textura no cache).`);
        }
    }
    applyTiledPlacementsFromCache(cacheKey, mapId, map, issues) {
        const scene = this.scene;
        if (!scene)
            return null;
        const descriptor = resolveTiledMapDescriptor(mapId);
        const mapJson = descriptor
            ? readTilemapJsonFromMemory(scene, cacheKey, descriptor)
            : null;
        if (!mapJson) {
            issues.push('Cache do tilemap indisponível após parse — recarregue a página.');
            return null;
        }
        // Limpar placements anteriores do mapa
        clearTiledMapPlacements(mapId);
        const parsed = parseTiledMapPlacements(mapId, mapJson);
        const obstacles = parseTiledWorldCollision(mapId, mapJson);
        setWorldCollisionObstacles(mapId, obstacles);
        setActiveWorldCollisionMapId(mapId);
        // Log apenas problemas de parse do Tiled (sem avisos sobre registro legado)
        for (const issue of parsed.issues) {
            console.warn(`[MapLoader] ${issue}`);
        }
        const playerSpawn = parsed.placements.playerSpawn ?? this.resolveDefaultPlayerSpawn(map);
        if (!parsed.spawnLayerFound) {
            console.warn('[MapLoader] Camada "spawns" (ou "spawn") ausente — usando spawn padrão no centro do mapa.');
        }
        else if (!parsed.placements.playerSpawn) {
            console.warn('[MapLoader] Objeto de spawn ausente — usando spawn padrão no centro do mapa.');
        }
        // Processar APENAS NPCs encontrados na camada Tiled "npcs"
        // Ignorar qualquer NPC do registro que não esteja mapeado no Tiled
        if (parsed.placements.npcs.size > 0) {
            console.debug(`[MapLoader] Carregados ${parsed.placements.npcs.size} NPC(s) da camada Tiled "npcs".`);
        }
        // Auditoria: rastrear NPCs órfãos
        this.auditOrphanedNpcs(mapId, new Set(parsed.placements.npcs.keys()));
        setTiledMapPlacements(mapId, {
            ...parsed.placements,
            playerSpawn,
        });
        void import('../../world/tiledMapPlacementsBridge.js').then(({ notifyTiledMapPlacementsCommitted }) => {
            notifyTiledMapPlacementsCommitted(mapId);
        });
        return playerSpawn;
    }
    /** Fallback de spawn — centro do mapa em pixels quando a camada Tiled não define player_spawn. */
    resolveDefaultPlayerSpawn(map) {
        return {
            x: map.widthInPixels / 2,
            y: map.heightInPixels / 2,
        };
    }
    /**
     * Validação de alinhamento de grid/terrain.
     * Garante que o mapa foi exportado com tilesize correto (32×32 por padrão).
     */
    validateGridAlignment(map, issues, jsonUrl) {
        const expectedTileSize = GAME_CONFIG.TILE_SIZE; // 32
        if (map.tileWidth !== expectedTileSize || map.tileHeight !== expectedTileSize) {
            const warning = `Tilemap grid desalinhado: ${map.tileWidth}×${map.tileHeight} (esperado ${expectedTileSize}×${expectedTileSize}). Verifique tilewidth/tileheight no export Tiled.`;
            console.warn(`[MapLoader] ${warning}`);
            issues.push(warning);
        }
        // Validar que o mapa tem dimensões válidas
        if (map.widthInPixels <= 0 || map.heightInPixels <= 0) {
            console.warn(`[MapLoader] Dimensões inválidas do mapa: ${map.widthInPixels}×${map.heightInPixels} px — verifique largura/altura em tiles no Tiled.`);
            issues.push('Dimensões do mapa inválidas (width/height em tiles = 0).');
        }
        // Log diagnóstico de grid
        console.info(`[MapLoader] Grid: ${map.tileWidth}×${map.tileHeight}, Mapa: ${map.widthInPixels}×${map.heightInPixels}px (${map.width}×${map.height} tiles)`);
    }
    auditOrphanedNpcs(mapId, tiledNpcIds) {
        this.orphanedNpcs = [];
        const registryNpcsForMap = NPC_REGISTRY_WITH_LORE.filter((e) => e.mapId === mapId);
        for (const npcEntry of registryNpcsForMap) {
            if (!tiledNpcIds.has(npcEntry.id)) {
                this.orphanedNpcs.push(npcEntry.id);
            }
        }
    }
    /**
     * Gera relatório completo de auditoria Tiled-First.
     * Informa quantos objetos foram carregados, descartados e validações.
     */
    generateTiledAuditReport(mapId) {
        const summary = {
            objectsLoaded: this.objectRecords.length,
            collidableObjects: this.collidableObjectsLoaded,
            orphanedNpcs: this.orphanedNpcs.length,
            tilesetsExpected: this.expectedTilesetCount,
            tilesetsBound: this.boundTilesetCount,
            gridTilesets: this.boundGridTilesetCount,
        };
        console.info('[MapLoader] ┌─ AUDITORIA TILED-FIRST ─────────────────────────────────');
        console.info(`[MapLoader] │ Mapa: "${mapId}"`);
        console.info(`[MapLoader] ├─ Objetos Carregados: ${summary.objectsLoaded} total`);
        console.info(`[MapLoader] │  └─ Collidable (física estática): ${summary.collidableObjects}`);
        if (summary.orphanedNpcs > 0) {
            console.warn(`[MapLoader] ├─ NPCs Órfãos (descartados): ${summary.orphanedNpcs}`);
            for (const npcId of this.orphanedNpcs) {
                console.warn(`[MapLoader] │  • "${npcId}" — não encontrado na camada Tiled "npcs"`);
            }
        }
        else {
            console.info(`[MapLoader] ├─ NPCs Órfãos: nenhum (todos mapeados no Tiled)`);
        }
        console.info(`[MapLoader] ├─ Tilesets: ${summary.tilesetsBound}/${summary.tilesetsExpected} vinculados`);
        console.info(`[MapLoader] │  └─ Grid-aligned 32×32: ${summary.gridTilesets}`);
        if (this.tilesetsValidation.warnings.length > 0) {
            console.warn('[MapLoader] ├─ Validação Tilesets (avisos):');
            for (const warning of this.tilesetsValidation.warnings) {
                console.warn(`[MapLoader] │  • ${warning}`);
            }
        }
        console.info('[MapLoader] └─ Carregamento concluído (Tiled-First OK)');
    }
    registerMapObject(scene, sprite, objectData, layerName, mapId) {
        sprite.setOrigin(0.5, 1);
        sprite.setDepth(resolvePhaserWorldDepth(sprite.y));
        const uid = resolveTiledMapObjectUid(mapId, layerName, objectData);
        sprite.setData(TILED_UID_DATA_KEY, uid);
        sprite.setData(TILED_LAYER_DATA_KEY, layerName);
        if (isTiledMapObjectCollidable(objectData)) {
            this.applyStaticCollision(scene, sprite, objectData);
        }
        const record = {
            uid,
            layerName,
            mapId,
            collidable: isTiledMapObjectCollidable(objectData),
            sprite,
            ...(objectData.id !== undefined ? { objectId: objectData.id } : {}),
            ...(objectData.name !== undefined ? { name: objectData.name } : {}),
        };
        if (record.collidable) {
            this.collidableObjectsLoaded++;
        }
        this.objectRecords.push(record);
        this.objectByUid.set(uid, record);
    }
    applyStaticCollision(scene, sprite, objectData) {
        if (!scene.physics)
            return;
        scene.physics.add.existing(sprite, true);
        const body = sprite.body;
        if (!body)
            return;
        const tileSize = GAME_CONFIG.TILE_SIZE;
        const width = objectData.width > 0 ? objectData.width : tileSize;
        const height = objectData.height > 0 ? objectData.height : tileSize;
        applyTiledArcadeColliderBody(body, width, height, 'prop');
    }
    buildCollidableObjectPhysics(cacheKey, mapId) {
        const scene = this.scene;
        if (!scene)
            return;
        this.collidableStaticGroup?.destroy(true);
        this.collidableStaticGroup = null;
        this.playerCollider?.destroy();
        this.playerCollider = null;
        const descriptor = resolveTiledMapDescriptor(mapId);
        const mapData = descriptor
            ? readTilemapJsonFromMemory(scene, cacheKey, descriptor)
            : null;
        if (!mapData)
            return;
        this.collidableStaticGroup = buildTiledCollidablePhysicsBodies(scene, mapId, mapData);
    }
    createMapSprite(scene, x, y, textureKey, width, height) {
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
    bindTilesets(map, cacheKey, jsonUrl, issues, mapId) {
        const bound = [];
        this.boundGridTilesetCount = 0;
        const descriptor = this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null;
        const textureKeyByNormalizedName = new Map();
        for (const tileset of descriptor?.tilesets ?? []) {
            const publicUrl = this.assets.resolvePublicUrl(jsonUrl, tileset.imagePath);
            const processedAtlasKey = resolveProcessedTilesetForPublicUrl(publicUrl)
                ? processedTilesetAtlasKeyFromSourceUrl(publicUrl)
                : null;
            const resolvedKey = processedAtlasKey
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
            const resolvedTextureKey = (processedAtlasKey && this.scene?.textures.exists(processedAtlasKey)
                ? processedAtlasKey
                : null)
                ?? this.resolveBoundTilesetTextureKey(cacheKey, tileset.name, textureKeyByNormalizedName.get(normalizedName), processedAtlasKey)
                ?? tiledTilesetTextureKey(cacheKey, tileset.name);
            const layout = this.resolveTilesetLayout(cacheKey, tileset.name, descriptor);
            const isGridTileset = tileset.tileWidth === map.tileWidth && tileset.tileHeight === map.tileHeight;
            assertTilemapReadyForRender(this.scene, cacheKey, `tileset bind (${tileset.name})`);
            if (!resolvedTextureKey) {
                console.warn(`[MapLoader] Tileset "${tileset.name}" sem chave de textura — placeholder procedural.`);
                continue;
            }
            this.tilesetTextureKeyByName.set(normalizedName, resolvedTextureKey);
            if (processedAtlasKey === ROAD2_ATLAS_TEXTURE_KEY
                && this.scene
                && !this.scene.textures.exists(ROAD2_ATLAS_TEXTURE_KEY)) {
                const message = 'road2_atlas não está no cache — MapLoader não carrega atlas; aguarde PreloaderScene.';
                console.error(`[MapLoader] ${message}`);
                issues.push(message);
                continue;
            }
            if (this.scene && !this.scene.textures.exists(resolvedTextureKey)) {
                const imagePath = tileset.image;
                if (imagePath && isGridTileset) {
                    console.warn(`[MapLoader] Tileset 32×32 "${tileset.name}" sem textura carregada: ${this.assets.resolvePublicUrl(jsonUrl, imagePath)} — placeholder.`);
                }
                else if (imagePath) {
                    console.warn(`[MapLoader] Textura ausente para tileset de prop "${tileset.name}" — placeholder.`);
                }
                const placeholderWidth = Number(layout.cached?.imagewidth ?? tileset.tileWidth ?? GAME_CONFIG.TILE_SIZE);
                const placeholderHeight = Number(layout.cached?.imageheight ?? tileset.tileHeight ?? GAME_CONFIG.TILE_SIZE);
                const placeholderKind = isGridTileset ? 'tile' : 'prop';
                ensureTextureOrPlaceholder(this.scene.textures, resolvedTextureKey, tileset.name, placeholderKind, placeholderWidth, placeholderHeight);
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
            let added = null;
            try {
                added = map.addTilesetImage(tileset.name, resolvedTextureKey, tileset.tileWidth, tileset.tileHeight, margin, spacing);
            }
            catch (error) {
                const detail = error instanceof Error ? error.message : String(error);
                console.error(`[MapLoader] Falha crítica ao vincular tileset "${tileset.name}".`, error);
                failTiledMapLoad(mapId, [
                    `Falha ao vincular tileset "${tileset.name}" no mapa.`,
                    `Detalhe: ${detail}`,
                    'Verifique a textura, margin/spacing e o tamanho do atlas/exportado.',
                ]);
            }
            if (processedAtlasKey && resolvedTextureKey === processedAtlasKey) {
                console.info(`[MapLoader:tileset] addTilesetImage("${tileset.name}", "${resolvedTextureKey}") — atlas processado (não load.image bruto).`);
            }
            // Só props multi-tile (folhas ≠ 32×32) precisam de frames nomeados para GIDs em object layers.
            // Em tilesets de grade, frames extras quebram addTilesetImage (tela preta com bind OK).
            if (added
                && !isGridTileset
                && jsonTilecount > 1
                && this.scene?.textures.exists(resolvedTextureKey)) {
                const textureManager = this.scene.textures;
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
                    console.info(`[MapLoader:tileset] "${tileset.name}" — ${framesAdded} frame(s) gerado(s) em "${resolvedTextureKey}" para GIDs de props.`);
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
                console.warn(`[MapLoader:tileset] "${tileset.name}" — área útil da textura (${textureSource.width}×${textureSource.height}, margin=${margin}) não é múltiplo de ${tileset.tileWidth}×${tileset.tileHeight}. Phaser emite "Image tile area not tile size multiple".`);
            }
            if (diagnostic.capacityFromTexture.maxFrames > 0
                && diagnostic.jsonTilecount > diagnostic.capacityFromTexture.maxFrames) {
                console.warn(`[MapLoader:tileset] "${tileset.name}" — tilecount JSON (${diagnostic.jsonTilecount}) > frames possíveis na textura (${diagnostic.capacityFromTexture.maxFrames}). GIDs acima disso geram "has no frame".`);
            }
            if (added) {
                bound.push(added);
                if (added.tileWidth === map.tileWidth && added.tileHeight === map.tileHeight) {
                    this.boundGridTilesetCount += 1;
                }
            }
            else if (isGridTileset) {
                console.warn(`[MapLoader] Tileset 32×32 "${tileset.name}" não vinculou — confira columns/tilecount, margin e dimensões do PNG.`);
            }
            else {
                console.warn(`[MapLoader] Tileset de prop "${tileset.name}" não vinculou — sprites gid dessa folha podem faltar.`);
            }
        }
        const expectedGridTilesets = map.tilesets.filter((entry) => entry.tileWidth === map.tileWidth && entry.tileHeight === map.tileHeight).length;
        if (this.boundGridTilesetCount < expectedGridTilesets) {
            const warning = `${expectedGridTilesets - this.boundGridTilesetCount}/${expectedGridTilesets} tileset(s) 32×32 não vinculado(s) — mapa parcial ou PNG/margin inválido.`;
            console.warn(`[MapLoader] ${warning}`);
            this.tilesetsValidation.warnings.push(warning);
        }
        // Validação de alinhamento de grid e tilesize
        this.tilesetsValidation.declared = descriptor?.tilesets?.length ?? 0;
        this.tilesetsValidation.bound = bound.length;
        return bound;
    }
    resolveTilesetLayout(cacheKey, tilesetName, descriptor = null) {
        const rawTilesets = this.listCachedTilesets(cacheKey, descriptor);
        const entry = resolveCachedTilesetEntry(rawTilesets, tilesetName);
        return {
            margin: Number(entry?.margin ?? 0),
            spacing: Number(entry?.spacing ?? 0),
            cached: entry,
        };
    }
    listCachedTilesets(cacheKey, descriptor = null) {
        const scene = this.scene;
        if (!scene)
            return [];
        const resolvedDescriptor = descriptor
            ?? (this.mountedMapId ? resolveTiledMapDescriptor(this.mountedMapId) : null);
        if (!resolvedDescriptor)
            return [];
        const mapJson = readTilemapJsonFromMemory(scene, cacheKey, resolvedDescriptor);
        const rawTilesets = mapJson?.tilesets;
        if (!Array.isArray(rawTilesets))
            return [];
        return [...rawTilesets].sort((left, right) => Number(left.firstgid ?? 0) - Number(right.firstgid ?? 0));
    }
    /** Injeta JSON Phaser-ready em `cache.tilemap` — nunca `scene.load.tilemapTiledJSON`. */
    ensureTilemapJsonInCache(scene, descriptor) {
        this.assets.ensureEnrichedTilemapInCache(scene, descriptor);
        return readTilemapJsonFromMemory(scene, descriptor.cacheKey, descriptor);
    }
    readTextureSourceMetrics(textureKey) {
        const textures = this.scene?.textures;
        if (!textures?.exists(textureKey)) {
            return { width: 0, height: 0, frameCount: 0 };
        }
        try {
            const textureManager = textures;
            const texture = textureManager.get(textureKey);
            const sourceImage = texture.getSourceImage?.();
            const width = Number(sourceImage?.width ?? texture.source?.[0]?.width ?? 0);
            const height = Number(sourceImage?.height ?? texture.source?.[0]?.height ?? 0);
            const frameCount = Number(texture.frameTotal ?? 0);
            return { width, height, frameCount };
        }
        catch {
            return { width: 0, height: 0, frameCount: 0 };
        }
    }
    logObjectLayerGidDiagnostics(layerName, layerObjects, cachedTilesets) {
        const invalid = [];
        for (const objectData of layerObjects) {
            const rawGid = objectData.gid;
            if (!rawGid)
                continue;
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
            const capacity = computeTilesetFrameCapacity(tileWidth, tileHeight, margin, spacing, imageWidth, imageHeight, columns);
            if (localIndex < 0 || localIndex >= tilecount || localIndex >= capacity.maxFrames) {
                invalid.push(`gid=${gid} → ${entry.name} local=${localIndex} (tilecount=${tilecount}, maxFrames=${capacity.maxFrames})`);
            }
        }
        if (invalid.length > 0) {
            console.warn(`[MapLoader:gid] Camada "${layerName}" — ${invalid.length} objeto(s) com GID fora do tileset:`, invalid.slice(0, 8), invalid.length > 8 ? `… +${invalid.length - 8} mais` : '');
        }
    }
    sanitizeTilemapObjectGids(cacheKey, descriptor) {
        const scene = this.scene;
        if (!scene)
            return;
        const mapJson = readTilemapJsonFromMemory(scene, cacheKey, descriptor);
        const data = mapJson;
        if (!data?.layers)
            return;
        this.objectRawGidById.clear();
        for (const layer of data.layers) {
            if (layer.type !== 'objectgroup')
                continue;
            for (const object of layer.objects ?? []) {
                const rawGid = object.gid;
                if (typeof rawGid !== 'number' || rawGid <= 0)
                    continue;
                const realGid = stripTiledGidFlags(rawGid);
                if (typeof object.id === 'number' && rawGid !== realGid) {
                    this.objectRawGidById.set(object.id, rawGid);
                }
                object.gid = realGid;
            }
        }
    }
    resolveObjectImagePath(object) {
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
