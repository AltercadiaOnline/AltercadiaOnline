import { DESIGN_CONFIG } from '../../config/designConstants.js';

import {
  applyEntityFigureUniformTransform,
  resolveSharedEntityVisualBounds,
} from '../../config/entitySpriteContract.js';
import {
  DESIGN_ENTITY_FIGURE_WIDTH,
  DESIGN_SPRITE_DIMENSIONS,
  resolveEntitySpriteCenter,
  type EntitySpriteBounds,
} from '../../config/spriteDimensions.js';
import { resolveMapTileSize } from '../../shared/world/activeMapTileSize.js';

import type { NPC } from '../entities/NPC.js';

import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';

import {
  getNpcDefinition,
} from '../../assets/npcs/npcDefinition.js';
import { getCachedNpcAssetImage } from '../loaders/npcAssetImageLoader.js';
import { snapDrawImageDest } from '../render/pixelSnap.js';
import { renderNpcHumanoidSprite } from './npcHumanoidRenderer.js';

const SPRITE_PALETTE: Record<string, { body: string; accent: string }> = {
  terminal: { body: '#14283b', accent: '#00ffcc' },
  pulpit: { body: '#2a3544', accent: '#c9a86a' },
};

export const NPC_BODY_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;

export const WORLD_INTERACT_PROMPT_KEY = 'E';

/** Mesmo contrato do PlayerSprite — resolvePlayerVisualBounds. */
function resolveNpcVisualBounds(npc: NPC): EntitySpriteBounds {
  return resolveSharedEntityVisualBounds(
    npc.getLogicalPosition(),
    resolveMapTileSize(npc.mapId),
  );
}

function renderNpcDefinitionSprite(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  image: CanvasImageSource,
  timestampMs: number,
): void {
  const def = getNpcDefinition(npc.id);
  if (!def) return;

  const bounds = resolveNpcVisualBounds(npc);
  const { x: anchorX, feetY } = resolveEntitySpriteCenter(bounds);
  const bobPhase = timestampMs * def.animationSpeed * 0.001 * Math.PI * 2;
  const bobOffset = Math.sin(bobPhase) * 1.5;
  const { dx, dy, dWidth, dHeight } = snapDrawImageDest(
    anchorX - def.width / 2,
    feetY - def.height + bobOffset,
    def.width,
    def.height,
  );

  ctx.save();
  disableCanvasImageSmoothing(ctx);
  ctx.drawImage(image, dx, dy, dWidth, dHeight);
  ctx.restore();
}

export function renderNpcSprite(
  ctx: CanvasRenderingContext2D,
  npc: NPC,
  timestampMs = 0,
): void {
  const definition = getNpcDefinition(npc.id);
  const png = definition ? getCachedNpcAssetImage(npc.id) : null;
  if (definition && png) {
    renderNpcDefinitionSprite(ctx, npc, png, timestampMs);
    return;
  }

  const bounds = resolveNpcVisualBounds(npc);

  if (npc.sprite === 'terminal') {
    renderTerminalSprite(ctx, bounds, npc);
    return;
  }

  if (npc.sprite === 'pulpit') {
    renderPulpitSprite(ctx, bounds);
    return;
  }

  renderNpcHumanoidSprite(ctx, bounds, npc.sprite);
}

function renderTerminalSprite(
  ctx: CanvasRenderingContext2D,
  bounds: EntitySpriteBounds,
  _npc: NPC,
): void {
  const palette = SPRITE_PALETTE.terminal ?? { body: '#14283b', accent: '#00ffcc' };
  const { x: anchorX, feetY } = resolveEntitySpriteCenter(bounds);
  const boxW = DESIGN_ENTITY_FIGURE_WIDTH;
  const boxH = Math.round(bounds.height * 0.6);
  const screenH = Math.round(boxH * 0.38);

  ctx.save();
  disableCanvasImageSmoothing(ctx);
  applyEntityFigureUniformTransform(ctx, anchorX, feetY, bounds.height);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(Math.round(anchorX), Math.round(feetY + 4), Math.round(boxW * 0.42), 8, 0, 0, Math.PI * 2);
  ctx.fill();

  const left = Math.round(anchorX - boxW / 2);
  const top = Math.round(feetY - boxH);

  ctx.fillStyle = palette.body;
  ctx.fillRect(left, top, boxW, boxH);

  ctx.fillStyle = palette.accent;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(
    Math.round(anchorX - boxW * 0.38),
    top + 6,
    Math.round(boxW * 0.76),
    screenH,
  );
  ctx.globalAlpha = 1;

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    Math.round(anchorX - boxW * 0.38) + 0.5,
    top + 6 + 0.5,
    Math.round(boxW * 0.76) - 1,
    screenH - 1,
  );

  ctx.restore();
}

function renderPulpitSprite(ctx: CanvasRenderingContext2D, bounds: EntitySpriteBounds): void {
  const palette = SPRITE_PALETTE.pulpit ?? { body: '#2a3544', accent: '#c9a86a' };
  const { x: anchorX, feetY } = resolveEntitySpriteCenter(bounds);
  const boxW = DESIGN_ENTITY_FIGURE_WIDTH;
  const boxH = Math.round(bounds.height * 0.55);
  const baseH = Math.round(boxH * 0.14);
  const pillarH = Math.round(boxH * 0.18);
  const topH = Math.round(boxH * 0.08);

  ctx.save();
  disableCanvasImageSmoothing(ctx);
  applyEntityFigureUniformTransform(ctx, anchorX, feetY, bounds.height);

  ctx.fillStyle = palette.body;
  ctx.fillRect(Math.round(anchorX - boxW / 2), Math.round(feetY - baseH), boxW, baseH);
  ctx.fillRect(
    Math.round(anchorX - boxW * 0.16),
    Math.round(feetY - baseH - pillarH),
    Math.round(boxW * 0.32),
    pillarH,
  );

  ctx.fillStyle = palette.accent;
  ctx.fillRect(
    Math.round(anchorX - boxW * 0.26),
    Math.round(feetY - baseH - pillarH - topH),
    Math.round(boxW * 0.52),
    topH,
  );

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    Math.round(anchorX - boxW * 0.26) + 0.5,
    Math.round(feetY - baseH - pillarH - topH) + 0.5,
    Math.round(boxW * 0.52) - 1,
    topH - 1,
  );

  ctx.restore();
}

/** Bounding box oficial para profundidade e colisão visual. */
export function getNpcSpriteBounds(npc: NPC) {
  return resolveNpcVisualBounds(npc);
}

export { DESIGN_SPRITE_DIMENSIONS };
