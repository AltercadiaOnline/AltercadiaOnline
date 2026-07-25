// @ts-nocheck
export function ensureTiledTilesetTextureFrames(texture, options) {
    const tileWidth = Math.max(1, options.tileWidth);
    const tileHeight = Math.max(1, options.tileHeight);
    const margin = Math.max(0, options.margin);
    const spacing = Math.max(0, options.spacing);
    const tilecount = Math.max(1, options.tilecount);
    const imageWidth = Number(texture.source?.[0]?.width ?? 0);
    const imageHeight = Number(texture.source?.[0]?.height ?? 0);
    const columns = options.columns > 0
        ? options.columns
        : Math.max(1, Math.floor((imageWidth - 2 * margin + spacing) / (tileWidth + spacing)));
    let added = 0;
    for (let index = 0; index < tilecount; index += 1) {
        const frameName = String(index);
        if (texture.has(frameName))
            continue;
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = margin + column * (tileWidth + spacing);
        const y = margin + row * (tileHeight + spacing);
        if (x + tileWidth > imageWidth || y + tileHeight > imageHeight) {
            break;
        }
        const created = texture.add(frameName, 0, x, y, tileWidth, tileHeight);
        if (created)
            added += 1;
    }
    return added;
}
