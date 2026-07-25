// @ts-nocheck
import { resolveSubTileDrawLayout } from '../../config/tileGridDensity.js';
export function drawSubdividedGroundCell(ctx, originX, originY, logicalTileSize, drawCell) {
    const { visualTileSize, subdivisions } = resolveSubTileDrawLayout(logicalTileSize);
    if (subdivisions === 1) {
        drawCell(ctx, originX, originY, visualTileSize);
        return;
    }
    for (let sy = 0; sy < subdivisions; sy++) {
        for (let sx = 0; sx < subdivisions; sx++) {
            drawCell(ctx, originX + sx * visualTileSize, originY + sy * visualTileSize, visualTileSize);
        }
    }
}
