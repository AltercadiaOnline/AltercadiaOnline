import { resolveSubTileDrawLayout } from '../../config/tileGridDensity.js';



export function drawSubdividedGroundCell(

  ctx: CanvasRenderingContext2D,

  originX: number,

  originY: number,

  logicalTileSize: number,

  drawCell: (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => void,

): void {

  const { visualTileSize, subdivisions } = resolveSubTileDrawLayout(logicalTileSize);



  if (subdivisions === 1) {

    drawCell(ctx, originX, originY, visualTileSize);

    return;

  }



  for (let sy = 0; sy < subdivisions; sy++) {

    for (let sx = 0; sx < subdivisions; sx++) {

      drawCell(

        ctx,

        originX + sx * visualTileSize,

        originY + sy * visualTileSize,

        visualTileSize,

      );

    }

  }

}


