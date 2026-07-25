// @ts-nocheck
export const TILED_GID_MASK = 0x1fffffff;
export const TILED_GID_HORIZONTAL_FLIP = 0x80000000;
export const TILED_GID_VERTICAL_FLIP = 0x40000000;
export const TILED_GID_DIAGONAL_FLIP = 0x20000000;
/** Remove flags de flip/rotação Tiled (bits 29–31) — ex.: 2147483886 → 238. */
export function stripTiledGidFlags(rawGid) {
    return Number(rawGid) & TILED_GID_MASK;
}
export function decodeTiledGid(rawGid) {
    const gid = Number(rawGid);
    return {
        realGid: gid & TILED_GID_MASK,
        flipX: (gid & TILED_GID_HORIZONTAL_FLIP) !== 0,
        flipY: (gid & TILED_GID_VERTICAL_FLIP) !== 0,
        flipDiagonal: (gid & TILED_GID_DIAGONAL_FLIP) !== 0,
    };
}
export function computeTilesetFrameCapacity(tileWidth, tileHeight, margin, spacing, imageWidth, imageHeight, columnsHint = 0) {
    if (imageWidth <= 0 || imageHeight <= 0 || tileWidth <= 0 || tileHeight <= 0) {
        return {
            columns: Math.max(1, columnsHint),
            rows: 0,
            maxFrames: 0,
            widthGridAligned: true,
            heightGridAligned: true,
        };
    }
    const usableWidth = imageWidth - 2 * margin;
    const usableHeight = imageHeight - 2 * margin;
    const widthGridAligned = spacing > 0
        ? (usableWidth + spacing) % (tileWidth + spacing) === 0
        : usableWidth % tileWidth === 0;
    const heightGridAligned = spacing > 0
        ? (usableHeight + spacing) % (tileHeight + spacing) === 0
        : usableHeight % tileHeight === 0;
    const columns = columnsHint > 0
        ? columnsHint
        : Math.max(0, Math.floor((usableWidth + spacing) / (tileWidth + spacing)));
    const rows = Math.max(0, Math.floor((usableHeight + spacing) / (tileHeight + spacing)));
    return {
        columns: Math.max(1, columns),
        rows,
        maxFrames: columns * rows,
        widthGridAligned,
        heightGridAligned,
    };
}
export function resolveCachedTilesetEntry(rawTilesets, tilesetName) {
    return rawTilesets?.find((entry) => entry.name === tilesetName) ?? null;
}
export function findTilesetForGid(sortedTilesets, gid) {
    const stripped = stripTiledGidFlags(gid);
    if (stripped <= 0)
        return null;
    let hit = null;
    for (const entry of sortedTilesets) {
        const firstgid = Number(entry.firstgid ?? 0);
        if (stripped >= firstgid) {
            hit = entry;
        }
    }
    if (!hit || hit.firstgid == null)
        return null;
    return {
        entry: hit,
        localIndex: stripped - Number(hit.firstgid),
    };
}
export function formatTilesetBindDiagnostic(diag) {
    const jsonCap = diag.capacityFromJson;
    const texCap = diag.capacityFromTexture;
    return [
        `[MapLoader:tileset] ${diag.tilesetName}`,
        `  texture=${diag.textureKey}`,
        `  url=${diag.imageUrl}`,
        `  tile=${diag.tileWidth}×${diag.tileHeight} margin=${diag.margin} spacing=${diag.spacing}`,
        `  jsonImage=${diag.jsonImageWidth}×${diag.jsonImageHeight} columns=${diag.jsonColumns} tilecount=${diag.jsonTilecount}`,
        `  texturePx=${diag.texturePixelWidth}×${diag.texturePixelHeight} framesInTexture=${diag.textureFrameCount}`,
        `  capacity(json)=${jsonCap.columns}×${jsonCap.rows}=${jsonCap.maxFrames} wOk=${jsonCap.widthGridAligned} hOk=${jsonCap.heightGridAligned}`,
        `  capacity(tex)=${texCap.columns}×${texCap.rows}=${texCap.maxFrames} wOk=${texCap.widthGridAligned} hOk=${texCap.heightGridAligned}`,
        `  addTilesetImage=${diag.bindOk ? 'OK' : 'FALHOU'}`,
    ].join('\n');
}
export function buildTilesetBindDiagnostic(input) {
    const jsonImageWidth = Number(input.cached?.imagewidth ?? input.texturePixelWidth);
    const jsonImageHeight = Number(input.cached?.imageheight ?? input.texturePixelHeight);
    const jsonColumns = Number(input.cached?.columns ?? 0);
    const jsonTilecount = Number(input.cached?.tilecount ?? 0);
    return {
        tilesetName: input.tilesetName,
        textureKey: input.textureKey,
        imageUrl: input.imageUrl,
        tileWidth: input.tileWidth,
        tileHeight: input.tileHeight,
        margin: input.margin,
        spacing: input.spacing,
        jsonImageWidth,
        jsonImageHeight,
        jsonColumns,
        jsonTilecount,
        texturePixelWidth: input.texturePixelWidth,
        texturePixelHeight: input.texturePixelHeight,
        textureFrameCount: input.textureFrameCount,
        capacityFromJson: computeTilesetFrameCapacity(input.tileWidth, input.tileHeight, input.margin, input.spacing, jsonImageWidth, jsonImageHeight, jsonColumns),
        capacityFromTexture: computeTilesetFrameCapacity(input.tileWidth, input.tileHeight, input.margin, input.spacing, input.texturePixelWidth, input.texturePixelHeight, jsonColumns),
        bindOk: input.bindOk,
    };
}
