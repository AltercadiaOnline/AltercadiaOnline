// @ts-nocheck
import { DESIGN_CONFIG } from '../../../config/designConstants.js';
import { CITY_01_ID } from '../../../shared/world/maps/city01.js';
import { CITY_01_COMMERCE_SPINE, CITY_01_COMMERCE_ZONE, CITY_01_PLAZA_MAX, CITY_01_PLAZA_MIN, CITY_01_RESIDENTIAL_SPINE, CITY_01_RESIDENTIAL_ZONE, CITY_01_ROAD_NORTH_Y, CITY_01_ROAD_SOUTH_Y, CITY_01_ROAD_X_MAX, CITY_01_ROAD_X_MIN, CITY_01_STRUCTURE_DEFS, } from '../../../shared/world/maps/city01LayoutConstants.js';
import { GROUND_TILE_IMAGE_URLS, GROUND_TILE_SPECS, } from '../../../assets/terrain/groundTileManifest.js';
import { WORLD_ASSET_IMAGE_URLS } from '../../world/worldAssetImageLoader.js';
import { TerrainLayoutKind } from './terrainLayoutPalette.js';
const TILE = DESIGN_CONFIG.TILE.SIZE;
function tileRectToWorld(tileX, tileY, tileW, tileH, layoutKind, label) {
    return {
        id: `${layoutKind}:${tileX}:${tileY}`,
        label,
        worldX: tileX * TILE,
        worldY: tileY * TILE,
        widthPx: tileW * TILE,
        heightPx: tileH * TILE,
        layoutKind,
    };
}
function groundAssetKey(tileId) {
    return `altercadia-ground-${tileId}`;
}
function structureAssetKey(assetKey) {
    return `altercadia-structure-${assetKey}`;
}
/**
 * Configuração de layout da cidade — coordenadas X/Y por área.
 * Fonte canônica de tiles: `city01LayoutConstants.ts` (servidor + ExplorationScene).
 * Phaser apenas espelha; altere zonas lá e rebuild se mudar a malha autoritativa.
 */
export class MapConfig {
    mapId;
    zones;
    terrainAssets;
    structureAssets;
    structureMarkers;
    constructor(mapId, zones, terrainAssets, structureAssets, structureMarkers) {
        this.mapId = mapId;
        this.zones = zones;
        this.terrainAssets = terrainAssets;
        this.structureAssets = structureAssets;
        this.structureMarkers = structureMarkers;
    }
}
/** Cidade 01 — base de layout urbano (placeholders + preload keys). */
export function buildCity01MapConfig() {
    const zones = [
        tileRectToWorld(CITY_01_ROAD_X_MIN, CITY_01_ROAD_NORTH_Y, CITY_01_ROAD_X_MAX - CITY_01_ROAD_X_MIN + 1, CITY_01_ROAD_SOUTH_Y - CITY_01_ROAD_NORTH_Y + 1, TerrainLayoutKind.STREET, 'Eixo principal N–S'),
        tileRectToWorld(CITY_01_PLAZA_MIN, CITY_01_PLAZA_MIN, CITY_01_PLAZA_MAX - CITY_01_PLAZA_MIN + 1, CITY_01_PLAZA_MAX - CITY_01_PLAZA_MIN + 1, TerrainLayoutKind.PLAZA, 'Praça central'),
        tileRectToWorld(CITY_01_COMMERCE_ZONE.tileX, CITY_01_COMMERCE_ZONE.tileY, CITY_01_COMMERCE_ZONE.tileW, CITY_01_COMMERCE_ZONE.tileH, TerrainLayoutKind.COMMERCIAL, 'Zona comercial'),
        tileRectToWorld(CITY_01_RESIDENTIAL_ZONE.tileX, CITY_01_RESIDENTIAL_ZONE.tileY, CITY_01_RESIDENTIAL_ZONE.tileW, CITY_01_RESIDENTIAL_ZONE.tileH, TerrainLayoutKind.GRASS, 'Bairro residencial'),
        tileRectToWorld(CITY_01_COMMERCE_SPINE.tileX, CITY_01_COMMERCE_SPINE.tileY, CITY_01_COMMERCE_SPINE.tileW, CITY_01_COMMERCE_SPINE.tileH, TerrainLayoutKind.STREET, 'Spine comercial'),
        tileRectToWorld(CITY_01_RESIDENTIAL_SPINE.tileX, CITY_01_RESIDENTIAL_SPINE.tileY, CITY_01_RESIDENTIAL_SPINE.tileW, CITY_01_RESIDENTIAL_SPINE.tileH, TerrainLayoutKind.STREET, 'Spine residencial'),
    ];
    const terrainAssets = GROUND_TILE_SPECS.map((spec) => ({
        key: groundAssetKey(spec.id),
        path: GROUND_TILE_IMAGE_URLS[spec.id],
        layoutKind: spec.placeholderType === 'ROAD_TILE'
            ? TerrainLayoutKind.STREET
            : spec.placeholderType === 'PLAZA'
                ? TerrainLayoutKind.PLAZA
                : TerrainLayoutKind.GRASS,
        groundTileId: spec.id,
    }));
    const structureAssets = Object.entries(WORLD_ASSET_IMAGE_URLS)
        .filter((entry) => Boolean(entry[1]))
        .map(([assetKey, path]) => ({
        key: structureAssetKey(assetKey),
        path,
        label: assetKey,
    }));
    return new MapConfig(CITY_01_ID, zones, terrainAssets, structureAssets, CITY_01_STRUCTURE_DEFS);
}
/** Singleton de referência — importe em preload da cena Exploration. */
export const CITY_01_MAP_CONFIG = buildCity01MapConfig();
