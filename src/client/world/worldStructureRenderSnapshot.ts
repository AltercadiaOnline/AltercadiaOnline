// @ts-nocheck
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { FARM_ZONE_01_URBAN_PROP_DEFS } from '../../shared/world/maps/farmZone01UrbanProps.js';
import { getEntityDepthY, shouldUseLocalizedHeightStacking, } from '../../shared/world/localizedHeight.js';
import { tileCenterToWorldPixel } from '../../shared/world/portals.js';
import { tileFootprintDepthY } from '../../shared/world/worldDepthSort.js';
import { tileToWorldPixel } from './city01VisualLayout.js';
import { sceneTileToWorld, } from './city01PlaceholderLayout.js';
function portalLandmarks(layout) {
    return layout.landmarks.filter((landmark) => landmark.kind === 'portal');
}
/** Espelha `collectCity01PlaceholderStructureDrawables` — sem canvas. */
export function collectCity01PlaceholderStructureSnapshots(scene, playerWorld) {
    const { tileSize } = scene;
    const useStacking = playerWorld !== undefined && shouldUseLocalizedHeightStacking(playerWorld.x, playerWorld.y);
    return scene.entities.map((entity) => {
        const { x, y } = sceneTileToWorld(entity.tileX, entity.tileY, tileSize);
        const widthPx = entity.tileW * tileSize;
        const heightPx = entity.tileH * tileSize;
        const baseDepthY = tileFootprintDepthY(entity.tileY, entity.tileH, tileSize);
        const depthY = useStacking && entity.heightLevel !== undefined
            ? getEntityDepthY(entity.tileY, entity.tileH, entity.heightLevel, tileSize)
            : baseDepthY;
        return {
            instanceKey: `city01:${entity.assetKey}:${entity.tileX}:${entity.tileY}`,
            assetKey: entity.assetKey,
            worldX: x,
            worldY: y,
            widthPx,
            heightPx,
            depthY,
            heightLevel: entity.heightLevel ?? null,
            kind: 'asset',
        };
    });
}
export function collectFarmZone01StructureSnapshots(tileSize) {
    return FARM_ZONE_01_URBAN_PROP_DEFS.map((prop) => {
        const { x, y } = tileToWorldPixel(prop.tileX, prop.tileY, tileSize);
        const widthPx = prop.tileW * tileSize;
        const heightPx = prop.tileH * tileSize;
        return {
            instanceKey: `farm:${prop.assetKey}:${prop.tileX}:${prop.tileY}`,
            assetKey: prop.assetKey,
            worldX: x,
            worldY: y,
            widthPx,
            heightPx,
            depthY: tileFootprintDepthY(prop.tileY, prop.tileH, tileSize),
            heightLevel: null,
            kind: 'asset',
        };
    });
}
export function collectPortalStructureSnapshots(layout) {
    const tileSize = layout.tileSize ?? DESIGN_CONFIG.TILE.SIZE;
    const portalSize = 26;
    return portalLandmarks(layout).map((landmark) => {
        const center = tileCenterToWorldPixel(landmark.tileX, landmark.tileY, tileSize);
        return {
            instanceKey: `portal:${landmark.id}:${landmark.tileX}:${landmark.tileY}`,
            assetKey: landmark.id,
            worldX: center.x,
            worldY: center.y,
            widthPx: portalSize,
            heightPx: portalSize,
            depthY: tileFootprintDepthY(landmark.tileY, 0, tileSize),
            heightLevel: null,
            kind: 'portal',
        };
    });
}
export function collectMapStructureSnapshots(layout, playerWorld) {
    if (layout.placeholderScene) {
        return collectCity01PlaceholderStructureSnapshots(layout.placeholderScene, playerWorld);
    }
    const snapshots = [
        ...collectPortalStructureSnapshots(layout),
    ];
    if (layout.mapId === 'farm_zone_01') {
        snapshots.push(...collectFarmZone01StructureSnapshots(layout.tileSize));
    }
    return snapshots;
}
