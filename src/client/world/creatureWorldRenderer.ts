import {
  CREATURE_PROCEDURAL_HEIGHT_PX,
  CREATURE_WORLD_SPRITE_HEIGHT_PX,
} from '../layout/UIConstants.js';
import { getEntityFeetWorldY } from '../../config/playerDesignAnchoring.js';
import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';
import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import type { WorldPoint } from '../../shared/world/playerEntity.js';
import { drawCreatureIdleSpriteAtFeet } from './creatureWorldImageLoader.js';

type CreaturePalette = { readonly body: string; readonly accent: string };

const CREATURE_PALETTES: Record<string, CreaturePalette> = {
  rat: { body: '#6b5a4a', accent: '#c4a882' },
  crow: { body: '#2a2a32', accent: '#8890a8' },
  wild_dog: { body: '#7a5a3a', accent: '#d4a060' },
  bat: { body: '#3a2850', accent: '#9a70c8' },
  spider: { body: '#1a1a22', accent: '#c03838' },
};

export function resolveCreatureTileWorldPoint(
  tileX: number,
  tileY: number,
  tileSize = getActiveMapTileSize(),
): WorldPoint {
  return {
    x: tileX * tileSize + tileSize / 2,
    y: tileY * tileSize + tileSize / 2,
  };
}

function resolvePalette(creatureId: string): CreaturePalette {
  return CREATURE_PALETTES[creatureId] ?? { body: '#505868', accent: '#8898a8' };
}

function drawPixelShadow(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  width: number,
): void {
  const shadowW = Math.max(10, Math.round(width * 0.75));
  const shadowH = 4;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.fillRect(
    Math.round(anchorX - shadowW / 2),
    Math.round(feetY - shadowH + 1),
    shadowW,
    shadowH,
  );
}

function drawEyes(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  bodyW: number,
): void {
  const eye = 3;
  const gap = Math.max(4, Math.round(bodyW * 0.22));
  const cx = left + Math.round(bodyW / 2);
  ctx.fillStyle = '#f0f4f8';
  ctx.fillRect(cx - gap - eye, top + 3, eye, eye);
  ctx.fillRect(cx + gap - eye, top + 3, eye, eye);
  ctx.fillStyle = '#101820';
  ctx.fillRect(cx - gap, top + 4, 1, 1);
  ctx.fillRect(cx + gap - 1, top + 4, 1, 1);
}

function drawRat(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  const bodyW = 22;
  const bodyH = 12;
  const left = Math.round(anchorX - bodyW / 2);
  const top = Math.round(feetY - bodyH);

  drawPixelShadow(ctx, anchorX, feetY, bodyW);

  ctx.fillStyle = palette.body;
  ctx.fillRect(left, top, bodyW, bodyH);
  ctx.fillRect(left + bodyW - 1, top + 4, 7, 3);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(left + 2, top - 3, 4, 3);
  ctx.fillRect(left + 11, top - 3, 4, 3);
  drawEyes(ctx, left, top, bodyW);
}

function drawCrow(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  const bodyW = 16;
  const bodyH = 18;
  const left = Math.round(anchorX - bodyW / 2);
  const top = Math.round(feetY - bodyH);

  drawPixelShadow(ctx, anchorX, feetY, bodyW);

  ctx.fillStyle = palette.body;
  ctx.fillRect(left, top + 4, bodyW, bodyH - 4);
  ctx.fillRect(left - 5, top + 8, 6, 3);
  ctx.fillRect(left + bodyW - 1, top + 8, 6, 3);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(left + bodyW - 2, top + 9, 5, 2);
  drawEyes(ctx, left, top + 4, bodyW);
}

function drawWildDog(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  const bodyW = 24;
  const bodyH = 14;
  const left = Math.round(anchorX - bodyW / 2);
  const top = Math.round(feetY - bodyH);

  drawPixelShadow(ctx, anchorX, feetY, bodyW);

  ctx.fillStyle = palette.body;
  ctx.fillRect(left, top + 2, bodyW, bodyH - 2);
  ctx.fillRect(left + bodyW - 3, top, 8, 8);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(left + bodyW + 2, top + 5, 4, 3);
  drawEyes(ctx, left + bodyW - 2, top, 8);
}

function drawBat(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  const bodyW = 20;
  const bodyH = 10;
  const left = Math.round(anchorX - bodyW / 2);
  const top = Math.round(feetY - bodyH);

  drawPixelShadow(ctx, anchorX, feetY, bodyW + 12);

  ctx.fillStyle = palette.body;
  ctx.fillRect(left - 8, top + 2, 8, 4);
  ctx.fillRect(left + bodyW, top + 2, 8, 4);
  ctx.fillRect(left, top, bodyW, bodyH);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(left + 4, top - 3, 5, 3);
  ctx.fillRect(left + 11, top - 3, 5, 3);
  drawEyes(ctx, left, top, bodyW);
}

function drawSpider(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  const bodyW = 20;
  const bodyH = 10;
  const left = Math.round(anchorX - bodyW / 2);
  const top = Math.round(feetY - bodyH);

  drawPixelShadow(ctx, anchorX, feetY, bodyW + 8);

  ctx.fillStyle = palette.body;
  for (const offset of [-10, -6, 6, 10]) {
    ctx.fillRect(Math.round(anchorX + offset), top + 4, 2, bodyH);
  }
  ctx.fillRect(left, top, bodyW, bodyH);
  ctx.fillStyle = palette.accent;
  ctx.fillRect(left + 3, top + 2, 5, 4);
  ctx.fillRect(left + 12, top + 2, 5, 4);
}

function drawGenericCreature(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  const bodyW = 18;
  const bodyH = 14;
  const left = Math.round(anchorX - bodyW / 2);
  const top = Math.round(feetY - bodyH);

  drawPixelShadow(ctx, anchorX, feetY, bodyW);
  ctx.fillStyle = palette.body;
  ctx.fillRect(left, top, bodyW, bodyH);
  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(left + 0.5, top + 0.5, bodyW - 1, bodyH - 1);
  drawEyes(ctx, left, top, bodyW);
}

function drawProceduralCreature(
  ctx: CanvasRenderingContext2D,
  creatureId: string,
  anchorX: number,
  feetY: number,
  palette: CreaturePalette,
): void {
  switch (creatureId) {
    case 'rat':
      drawRat(ctx, anchorX, feetY, palette);
      break;
    case 'crow':
      drawCrow(ctx, anchorX, feetY, palette);
      break;
    case 'wild_dog':
      drawWildDog(ctx, anchorX, feetY, palette);
      break;
    case 'bat':
      drawBat(ctx, anchorX, feetY, palette);
      break;
    case 'spider':
      drawSpider(ctx, anchorX, feetY, palette);
      break;
    default:
      drawGenericCreature(ctx, anchorX, feetY, palette);
  }
}

function renderAdjacentAlert(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  spriteTopY: number,
  alertPulse: number,
): void {
  const bounce = Math.round(Math.sin(alertPulse) * 2);
  const x = Math.round(anchorX);
  const y = Math.round(spriteTopY + bounce - 12);

  ctx.fillStyle = '#1a1200';
  ctx.fillRect(x - 5, y - 1, 10, 12);
  ctx.fillStyle = '#ffea00';
  ctx.fillRect(x - 1, y, 2, 7);
  ctx.fillRect(x - 3, y + 8, 6, 2);
}

export type CreatureWorldRenderOptions = {
  readonly creatureId: string;
  readonly tileX: number;
  readonly tileY: number;
  readonly adjacent: boolean;
  readonly alertPulse: number;
};

/** Renderiza criatura no mapa — sprite 1:1 se disponível; senão silhueta pixel-aligned nos pés. */
export function renderCreatureOnWorldMap(
  ctx: CanvasRenderingContext2D,
  options: CreatureWorldRenderOptions,
): void {
  const tileSize = getActiveMapTileSize();
  const worldPoint = resolveCreatureTileWorldPoint(options.tileX, options.tileY, tileSize);
  const feetX = worldPoint.x;
  const feetY = getEntityFeetWorldY(worldPoint, tileSize);

  ctx.save();
  disableCanvasImageSmoothing(ctx);

  const drewSprite = drawCreatureIdleSpriteAtFeet(ctx, options.creatureId, feetX, feetY);
  if (!drewSprite) {
    drawProceduralCreature(
      ctx,
      options.creatureId,
      feetX,
      feetY,
      resolvePalette(options.creatureId),
    );
  }

  if (options.adjacent) {
    const spriteTopY = feetY - (drewSprite ? CREATURE_WORLD_SPRITE_HEIGHT_PX : CREATURE_PROCEDURAL_HEIGHT_PX);
    renderAdjacentAlert(ctx, feetX, spriteTopY, options.alertPulse);
  }

  ctx.restore();
}
