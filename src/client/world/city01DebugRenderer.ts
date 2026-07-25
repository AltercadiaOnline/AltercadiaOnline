// @ts-nocheck
import { CITY_01_COMMERCE_ZONE, CITY_01_RESIDENTIAL_ZONE, CITY_01_ROAD_WIDTH, CITY_01_ROAD_X_MIN, CITY_01_ROAD_Y_MIN, } from '../../shared/world/maps/city01LayoutConstants.js';
import { CITY01_VISUAL_PALETTE, tileToWorldPixel, VisualTileKind, } from './city01VisualLayout.js';
function drawZoneOutline(ctx, zone, tileSize, strokeStyle) {
    const { x, y } = tileToWorldPixel(zone.tileX, zone.tileY, tileSize);
    ctx.save();
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(x, y, zone.tileW * tileSize, zone.tileH * tileSize);
    ctx.setLineDash([]);
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillStyle = strokeStyle;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`[${zone.id}]`, x + 4, y + 4);
    ctx.restore();
}
/** Overlay de debug — contornos de zona e marcadores de largura de via. */
export function renderCity01DebugLayout(ctx, layout) {
    if (!layout.showDebugLayout)
        return;
    const { tiles, tileSize } = layout;
    const palette = CITY01_VISUAL_PALETTE;
    for (let y = 0; y < tiles.length; y++) {
        const row = tiles[y];
        if (!row)
            continue;
        for (let x = 0; x < row.length; x++) {
            const cell = row[x];
            if (!cell || cell.kind !== VisualTileKind.Road)
                continue;
            const { x: px, y: py } = tileToWorldPixel(x, y, tileSize);
            ctx.strokeStyle = palette.debugRoad;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
            if (x === CITY_01_ROAD_X_MIN && y === CITY_01_ROAD_Y_MIN) {
                ctx.save();
                ctx.fillStyle = palette.debugRoad;
                ctx.font = '600 10px system-ui, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(`${CITY_01_ROAD_WIDTH} tiles`, px + 4, py + 4);
                ctx.restore();
            }
        }
    }
    drawZoneOutline(ctx, CITY_01_RESIDENTIAL_ZONE, tileSize, palette.debugZone);
    drawZoneOutline(ctx, CITY_01_COMMERCE_ZONE, tileSize, palette.debugZone);
}
/** Retângulos rotulados — protótipo de prédios da cidade. */
export function renderCity01StructurePlaceholders(ctx, layout) {
    const palette = CITY01_VISUAL_PALETTE;
    const pad = layout.tileSize * 0.06;
    for (const structure of layout.structures) {
        const { x, y } = tileToWorldPixel(structure.tileX, structure.tileY, layout.tileSize);
        const w = structure.tileW * layout.tileSize;
        const h = structure.tileH * layout.tileSize;
        ctx.fillStyle = palette.structureFill;
        ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
        ctx.strokeStyle = palette.structureEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, w - pad * 2 - 1, h - pad * 2 - 1);
        ctx.save();
        ctx.fillStyle = palette.structureLabel;
        ctx.font = '700 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const label = `[${structure.label}]`;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
        const metrics = ctx.measureText(label);
        const boxW = metrics.width + 10;
        const boxH = 16;
        ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
        ctx.fillStyle = palette.structureLabel;
        ctx.fillText(label, cx, cy);
        ctx.restore();
    }
}
