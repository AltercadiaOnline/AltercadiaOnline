import { FARM_ZONE_01_URBAN_PROP_DEFS } from '../../shared/world/maps/farmZone01UrbanProps.js';

import {

  tileFootprintDepthY,

  type WorldDepthDrawable,

} from '../../shared/world/worldDepthSort.js';

import { tileToWorldPixel } from './city01VisualLayout.js';

import { renderAsset } from './placeholderRenderer.js';



/** Props decorativos do Beco — Y-sort com o jogador e NPCs. */

export function collectFarmZone01DecorDrawables(

  ctx: CanvasRenderingContext2D,

  tileSize: number,

): WorldDepthDrawable[] {

  return FARM_ZONE_01_URBAN_PROP_DEFS.map((prop) => {

    const { x, y } = tileToWorldPixel(prop.tileX, prop.tileY, tileSize);

    const widthPx = prop.tileW * tileSize;

    const heightPx = prop.tileH * tileSize;

    const depthY = tileFootprintDepthY(prop.tileY, prop.tileH, tileSize);



    return {

      depthY,

      draw: () => {

        renderAsset(ctx, prop.assetKey, x, y, {

          tileSize,

          widthPx,

          heightPx,

          label: prop.label,

        });

      },

    };

  });

}


