// @ts-nocheck
import { readTiledObjectProperty as readSharedTiledObjectProperty, } from '../shared/world/tiledMapObject.js';
import { MAP_MUND_PUBLIC_BASE } from './mapMundManifest.js';
import { resolveProcessedTilesetAsset } from './processedAssetManifest.js';
import { resolveTiledImagePublicUrl } from './resolveTiledImagePublicUrl.js';
const TILED_GID_MASK = 0x1fffffff;
const TILED_FLIP_MASK = ~TILED_GID_MASK;
function resolveTilesetGidMax(firstgid, nextFirstGid) {
    if (nextFirstGid != null && nextFirstGid > firstgid) {
        return nextFirstGid - 1;
    }
    return firstgid;
}
/** Tilesets de props (48×48, 128×128, …) não podem entrar em tile layers 32×32 — quebram o Phaser. */
function listNonGridTilesetGidRanges(tilesets, mapTileWidth, mapTileHeight) {
    const sorted = [...tilesets]
        .filter((tileset) => typeof tileset.firstgid === 'number')
        .sort((left, right) => Number(left.firstgid) - Number(right.firstgid));
    const ranges = [];
    for (let index = 0; index < sorted.length; index += 1) {
        const tileset = sorted[index];
        const tileWidth = Number(tileset.tilewidth ?? mapTileWidth);
        const tileHeight = Number(tileset.tileheight ?? mapTileHeight);
        if (tileWidth === mapTileWidth && tileHeight === mapTileHeight) {
            continue;
        }
        const firstgid = Number(tileset.firstgid);
        const nextFirstGid = sorted[index + 1]?.firstgid;
        ranges.push({
            minGid: firstgid,
            maxGid: resolveTilesetGidMax(firstgid, nextFirstGid),
        });
    }
    return ranges;
}
function isTilesetGridAligned(tileWidth, tileHeight, margin, spacing, imageWidth, imageHeight) {
    if (imageWidth <= 0 || imageHeight <= 0) {
        return true;
    }
    const usableWidth = imageWidth - 2 * margin;
    const usableHeight = imageHeight - 2 * margin;
    if (usableWidth <= 0 || usableHeight <= 0) {
        return false;
    }
    const widthMod = spacing > 0
        ? (usableWidth + spacing) % (tileWidth + spacing)
        : usableWidth % tileWidth;
    const heightMod = spacing > 0
        ? (usableHeight + spacing) % (tileHeight + spacing)
        : usableHeight % tileHeight;
    return widthMod === 0 && heightMod === 0;
}
function resolveMaxTileFramesInImage(tileWidth, tileHeight, margin, spacing, imageWidth, imageHeight, columns) {
    if (imageWidth <= 0 || imageHeight <= 0) {
        return 0;
    }
    const usableWidth = imageWidth - 2 * margin;
    const usableHeight = imageHeight - 2 * margin;
    if (usableWidth <= 0 || usableHeight <= 0) {
        return 0;
    }
    const cols = columns > 0
        ? columns
        : Math.max(1, Math.floor((usableWidth + spacing) / (tileWidth + spacing)));
    const rows = Math.max(0, Math.floor((usableHeight + spacing) / (tileHeight + spacing)));
    return cols * rows;
}
function stripNonGridGidsFromTileLayers(layers, ranges) {
    if (!Array.isArray(layers)) {
        return layers;
    }
    return layers.map((layer) => {
        if (!layer || typeof layer !== 'object') {
            return layer;
        }
        const entry = { ...layer };
        if (entry.type !== 'tilelayer' || !Array.isArray(entry.data)) {
            return entry;
        }
        entry.data = entry.data.map((raw) => {
            const gid = Number(raw) & TILED_GID_MASK;
            if (gid <= 0) {
                return raw;
            }
            const blocked = ranges.some((range) => gid >= range.minGid && gid <= range.maxGid);
            if (!blocked) {
                return raw;
            }
            return Number(raw) & TILED_FLIP_MASK;
        });
        return entry;
    });
}
function stripOutOfRangeGidsFromTileLayers(layers, tilesets) {
    if (!Array.isArray(layers)) {
        return layers;
    }
    const sortedTilesets = [...tilesets]
        .filter((tileset) => typeof tileset.firstgid === 'number')
        .sort((left, right) => Number(left.firstgid) - Number(right.firstgid));
    const gidRanges = sortedTilesets.map((tileset, index) => {
        const firstgid = Number(tileset.firstgid);
        const nextFirstGid = sortedTilesets[index + 1]?.firstgid;
        const declaredTileCount = Number(tileset.tilecount ?? 1);
        const maxGid = nextFirstGid != null && nextFirstGid > firstgid
            ? Math.min(firstgid + declaredTileCount - 1, nextFirstGid - 1)
            : firstgid + declaredTileCount - 1;
        return { firstgid, maxGid };
    });
    return layers.map((layer) => {
        if (!layer || typeof layer !== 'object') {
            return layer;
        }
        const entry = { ...layer };
        if (entry.type !== 'tilelayer' || !Array.isArray(entry.data)) {
            return entry;
        }
        entry.data = entry.data.map((raw) => {
            const gid = Number(raw) & TILED_GID_MASK;
            if (gid <= 0) {
                return raw;
            }
            const tilesetIndex = gidRanges.findIndex((range, index) => gid >= range.firstgid
                && (index === gidRanges.length - 1 || gid < (gidRanges[index + 1]?.firstgid ?? Number.POSITIVE_INFINITY)));
            if (tilesetIndex < 0) {
                return Number(raw) & TILED_FLIP_MASK;
            }
            const range = gidRanges[tilesetIndex];
            if (gid > range.maxGid) {
                return Number(raw) & TILED_FLIP_MASK;
            }
            return raw;
        });
        return entry;
    });
}
function enrichTilesetForPhaser(tileset, nextFirstGid, mapTileWidth, mapTileHeight) {
    const enriched = { ...tileset };
    delete enriched.source;
    const firstgid = Number(enriched.firstgid ?? 1);
    const tileWidth = Number(enriched.tilewidth ?? mapTileWidth);
    const tileHeight = Number(enriched.tileheight ?? mapTileHeight);
    enriched.tilewidth = tileWidth;
    enriched.tileheight = tileHeight;
    const inferredTileCount = resolveTilesetGidMax(firstgid, nextFirstGid) - firstgid + 1;
    const tilecount = typeof enriched.tilecount === 'number' && enriched.tilecount > 0
        ? enriched.tilecount
        : inferredTileCount;
    enriched.tilecount = Math.max(1, tilecount);
    let margin = Number(enriched.margin ?? 0);
    const spacing = Number(enriched.spacing ?? 0);
    const originalImageWidth = Number(enriched.imagewidth ?? 0);
    const originalImageHeight = Number(enriched.imageheight ?? 0);
    let columns = typeof enriched.columns === 'number' ? enriched.columns : 0;
    if (columns <= 0) {
        if (originalImageWidth > 0) {
            columns = Math.max(1, Math.floor((originalImageWidth - 2 * margin + spacing) / (tileWidth + spacing)));
        }
        else {
            columns = 1;
        }
        enriched.columns = columns;
    }
    const rows = Math.max(1, Math.ceil(Number(enriched.tilecount) / columns));
    // Folhas CraftPix (240px = 7×32 + 16px horizontal) costumam ter slack só na largura.
    // Margin uniforme quebra a altura (ex.: 416px − 16 = 400, não múltiplo de 32) — pior que
    // manter margin 0 e aceitar o aviso de largura; Phaser ainda extrai 7×13 tiles.
    const contentWidth = columns * tileWidth + Math.max(0, columns - 1) * spacing;
    const widthSlack = originalImageWidth > 0 ? originalImageWidth - contentWidth - 2 * margin : 0;
    if (widthSlack > 0 && widthSlack % 2 === 0) {
        const candidateMargin = margin + widthSlack / 2;
        if (isTilesetGridAligned(tileWidth, tileHeight, candidateMargin, spacing, originalImageWidth, originalImageHeight)) {
            margin = candidateMargin;
        }
    }
    const contentHeight = rows * tileHeight + Math.max(0, rows - 1) * spacing;
    const heightSlack = originalImageHeight > 0 ? originalImageHeight - contentHeight - 2 * margin : 0;
    if (heightSlack > 0 && heightSlack % 2 === 0) {
        const candidateMargin = margin + heightSlack / 2;
        if (isTilesetGridAligned(tileWidth, tileHeight, candidateMargin, spacing, originalImageWidth, originalImageHeight)) {
            margin = candidateMargin;
        }
    }
    enriched.margin = margin;
    const maxFrames = resolveMaxTileFramesInImage(tileWidth, tileHeight, margin, spacing, originalImageWidth, originalImageHeight, columns);
    if (maxFrames > 0 && Number(enriched.tilecount) > maxFrames) {
        enriched.tilecount = maxFrames;
    }
    if (originalImageWidth > 0) {
        enriched.imagewidth = originalImageWidth;
    }
    else {
        enriched.imagewidth = contentWidth + 2 * margin + Math.max(0, columns - 1) * spacing;
    }
    if (originalImageHeight > 0) {
        enriched.imageheight = originalImageHeight;
    }
    else {
        enriched.imageheight = contentHeight + 2 * margin + Math.max(0, rows - 1) * spacing;
    }
    const imagePath = typeof enriched.image === 'string' ? enriched.image : '';
    if (imagePath.length > 0) {
        const sourcePublicUrl = resolveTiledImagePublicUrl(`${MAP_MUND_PUBLIC_BASE}/map.tmj`, imagePath);
        const processed = resolveProcessedTilesetAsset(sourcePublicUrl);
        if (processed) {
            enriched.imagewidth = processed.alignedWidth;
            enriched.imageheight = processed.alignedHeight;
        }
    }
    return enriched;
}
/**
 * O Phaser 4 IGNORA qualquer tileset que tenha o campo `source` (tileset externo .tsx)
 * — ver node_modules/phaser/src/tilemaps/parsers/tiled/ParseTilesets.js. O espelho
 * (`src/config/maps/*.json`) é enriquecido com `image`/`name`, mas mantém `source`,
 * então precisamos removê-lo para o Phaser embutir o tileset e renderizar os tiles.
 *
 * Props com tile size ≠ grid (48/64/128/144 px) são removidos das tile layers — ficam
 * só nas object layers — evitando `AssignTileProperties` crash (gid sem índice).
 */
export function buildPhaserTiledMapData(json) {
    const source = json;
    const mapTileWidth = Number(source.tilewidth ?? 32);
    const mapTileHeight = Number(source.tileheight ?? 32);
    const rawTilesets = (Array.isArray(source.tilesets) ? source.tilesets : []);
    const sortedTilesets = [...rawTilesets].sort((left, right) => Number(left.firstgid ?? 0) - Number(right.firstgid ?? 0));
    const tilesets = sortedTilesets.map((entry, index) => {
        const nextFirstGid = sortedTilesets[index + 1]?.firstgid;
        return enrichTilesetForPhaser(entry, nextFirstGid, mapTileWidth, mapTileHeight);
    });
    const nonGridRanges = listNonGridTilesetGidRanges(tilesets, mapTileWidth, mapTileHeight);
    const layersWithoutProps = stripNonGridGidsFromTileLayers(source.layers, nonGridRanges);
    const layersGridSafe = stripOutOfRangeGidsFromTileLayers(layersWithoutProps, tilesets);
    const layers = stripFlipFlagsFromObjectLayers(layersGridSafe);
    return {
        ...source,
        tilesets,
        layers,
    };
}
/** Object layers: GID com flags de flip (ex. 2147483886) → realGid para o Phaser resolver o tile. */
function stripFlipFlagsFromObjectLayers(layers) {
    if (!Array.isArray(layers))
        return layers;
    return layers.map((layer) => {
        if (!layer || typeof layer !== 'object')
            return layer;
        const record = layer;
        if (record.type !== 'objectgroup' || !Array.isArray(record.objects))
            return layer;
        return {
            ...record,
            objects: record.objects.map((object) => {
                if (typeof object.gid !== 'number' || object.gid <= 0)
                    return object;
                const realGid = Number(object.gid) & TILED_GID_MASK;
                if (realGid === object.gid)
                    return object;
                return { ...object, gid: realGid };
            }),
        };
    });
}
/** Tilesets declarados no export Tiled — fonte única para preload (sem lista manual). */
export function extractTilesetsFromTiledJson(json) {
    const seen = new Set();
    return json.tilesets
        .filter((tileset) => typeof tileset.image === 'string' && tileset.image.length > 0)
        .filter((tileset) => {
        if (seen.has(tileset.name))
            return false;
        seen.add(tileset.name);
        return true;
    })
        .map((tileset) => ({
        name: tileset.name,
        imagePath: tileset.image,
    }));
}
export function listTiledObjectGroupLayers(json) {
    return (json.layers ?? []).filter((layer) => layer.type === 'objectgroup');
}
export function readTiledObjectProperty(object, propertyName) {
    return readSharedTiledObjectProperty(object, propertyName);
}
/** PNGs soltos referenciados por propriedade `image` em object layers (structures/props). */
export function extractObjectImagePathsFromTiledJson(json) {
    const paths = new Set();
    for (const layer of listTiledObjectGroupLayers(json)) {
        for (const object of layer.objects ?? []) {
            const imageProperty = readTiledObjectProperty(object, 'image');
            if (typeof imageProperty === 'string' && imageProperty.trim().length > 0) {
                paths.add(imageProperty.trim());
                continue;
            }
            if (typeof object.type === 'string') {
                const typeValue = object.type.trim();
                if (typeValue.includes('/') || typeValue.endsWith('.png')) {
                    paths.add(typeValue);
                }
            }
        }
    }
    return [...paths];
}
