import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { disableCanvasImageSmoothing } from '../layout/gamePixelScale.js';
import {
  applyEntityFigureUniformTransform,
  ENTITY_FIGURE_LAYOUT_WIDTH,
} from '../../config/entitySpriteContract.js';
import {
  type EntitySpriteBounds,
  resolveEntitySpriteCenter,
} from '../../config/spriteDimensions.js';
import {
  NpcHumanoidAccessory,
  resolveNpcHumanoidAppearance,
  type NpcHumanoidPalette,
} from '../../shared/world/npcHumanoidAppearance.js';

/** Altura do bounding box — DESIGN_CONFIG.PLAYER.HEIGHT (54px). */
export const NPC_HUMANOID_HEIGHT = DESIGN_CONFIG.PLAYER.HEIGHT;

/** Largura visível — DESIGN_CONFIG.PLAYER.WIDTH (35px). */
export const NPC_HUMANOID_FIGURE_WIDTH = DESIGN_CONFIG.PLAYER.WIDTH;

type HumanoidLayout = {
  readonly figureWidth: number;
  readonly headW: number;
  readonly headH: number;
  readonly torsoW: number;
  readonly torsoH: number;
  readonly legW: number;
  readonly legH: number;
  readonly armW: number;
  readonly armH: number;
  readonly totalH: number;
};

function resolveLayout(figureWidth: number, totalH: number): HumanoidLayout {
  const headH = totalH * 0.28;
  const torsoH = totalH * 0.36;
  const legH = totalH * 0.36;
  return {
    figureWidth,
    headW: figureWidth * 0.52,
    headH,
    torsoW: figureWidth * 0.62,
    torsoH,
    legW: figureWidth * 0.2,
    legH,
    armW: figureWidth * 0.16,
    armH: torsoH * 0.88,
    totalH,
  };
}

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.roundRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), Math.max(1, Math.round(radius)));
  ctx.fill();
}

function drawShadow(ctx: CanvasRenderingContext2D, anchorX: number, feetY: number, figureWidth: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(
    Math.round(anchorX),
    Math.round(feetY + 4),
    Math.round(figureWidth * 0.45),
    8,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

function drawLegs(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  feetY: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): number {
  const legTop = feetY - layout.legH;
  const gap = layout.legW * 0.35;
  ctx.fillStyle = palette.limb;
  fillRoundRect(ctx, anchorX - gap - layout.legW, legTop, layout.legW, layout.legH, layout.legW * 0.35);
  fillRoundRect(ctx, anchorX + gap, legTop, layout.legW, layout.legH, layout.legW * 0.35);
  return legTop;
}

function drawTorso(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  torsoBottom: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): number {
  const torsoTop = torsoBottom - layout.torsoH;
  ctx.fillStyle = palette.body;
  fillRoundRect(ctx, anchorX - layout.torsoW / 2, torsoTop, layout.torsoW, layout.torsoH, layout.torsoW * 0.18);
  ctx.fillStyle = palette.accent;
  fillRoundRect(
    ctx,
    anchorX - layout.torsoW * 0.22,
    torsoTop + layout.torsoH * 0.2,
    layout.torsoW * 0.44,
    layout.torsoH * 0.55,
    3,
  );
  return torsoTop;
}

function drawArms(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  torsoTop: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): void {
  ctx.fillStyle = palette.limb;
  fillRoundRect(
    ctx,
    anchorX - layout.torsoW / 2 - layout.armW * 0.85,
    torsoTop + layout.torsoH * 0.08,
    layout.armW,
    layout.armH,
    layout.armW * 0.35,
  );
  fillRoundRect(
    ctx,
    anchorX + layout.torsoW / 2 - layout.armW * 0.15,
    torsoTop + layout.torsoH * 0.08,
    layout.armW,
    layout.armH,
    layout.armW * 0.35,
  );
}

function drawHead(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  torsoTop: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): { top: number; bottom: number } {
  const headTop = torsoTop - layout.headH;
  ctx.fillStyle = palette.face;
  fillRoundRect(ctx, anchorX - layout.headW / 2, headTop, layout.headW, layout.headH, layout.headW * 0.42);
  ctx.fillStyle = palette.body;
  fillRoundRect(
    ctx,
    anchorX - layout.headW / 2,
    headTop,
    layout.headW,
    layout.headH * 0.42,
    layout.headW * 0.35,
  );
  return { top: headTop, bottom: headTop + layout.headH };
}

function drawHat(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  headTop: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): void {
  const hatH = layout.headH * 0.18;
  const hatTop = headTop - hatH * 0.55;
  ctx.fillStyle = palette.accent;
  fillRoundRect(ctx, anchorX - layout.headW * 0.55, hatTop, layout.headW * 1.1, hatH, 3);
}

function drawGlasses(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  headTop: number,
  layout: HumanoidLayout,
  accent: string,
): void {
  const eyeY = headTop + layout.headH * 0.48;
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(
    Math.round(anchorX - layout.headW * 0.28),
    Math.round(eyeY - 3),
    Math.round(layout.headW * 0.22),
    6,
  );
  ctx.strokeRect(
    Math.round(anchorX + layout.headW * 0.06),
    Math.round(eyeY - 3),
    Math.round(layout.headW * 0.22),
    6,
  );
}

function drawApron(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  torsoTop: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): void {
  ctx.fillStyle = palette.accent;
  fillRoundRect(
    ctx,
    anchorX - layout.torsoW * 0.28,
    torsoTop + layout.torsoH * 0.15,
    layout.torsoW * 0.56,
    layout.torsoH * 0.75,
    4,
  );
}

function drawHood(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  headTop: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): void {
  ctx.fillStyle = palette.body;
  fillRoundRect(
    ctx,
    anchorX - layout.headW * 0.55,
    headTop - layout.headH * 0.04,
    layout.headW * 1.1,
    layout.headH * 0.55,
    layout.headW * 0.35,
  );
}

function drawBandana(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  headTop: number,
  layout: HumanoidLayout,
  accent: string,
): void {
  ctx.fillStyle = accent;
  fillRoundRect(
    ctx,
    anchorX - layout.headW * 0.5,
    headTop + layout.headH * 0.12,
    layout.headW,
    layout.headH * 0.18,
    3,
  );
}

function drawVisor(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  headTop: number,
  layout: HumanoidLayout,
  accent: string,
): void {
  ctx.fillStyle = accent;
  fillRoundRect(
    ctx,
    anchorX - layout.headW * 0.48,
    headTop + layout.headH * 0.35,
    layout.headW * 0.96,
    layout.headH * 0.14,
    3,
  );
}

function drawAccessories(
  ctx: CanvasRenderingContext2D,
  anchorX: number,
  headTop: number,
  torsoTop: number,
  layout: HumanoidLayout,
  palette: NpcHumanoidPalette,
): void {
  for (const accessory of palette.accessories) {
    switch (accessory) {
      case NpcHumanoidAccessory.HAT:
        drawHat(ctx, anchorX, headTop, layout, palette);
        break;
      case NpcHumanoidAccessory.HOOD:
        drawHood(ctx, anchorX, headTop, layout, palette);
        break;
      case NpcHumanoidAccessory.GLASSES:
        drawGlasses(ctx, anchorX, headTop, layout, palette.accent);
        break;
      case NpcHumanoidAccessory.APRON:
        drawApron(ctx, anchorX, torsoTop, layout, palette);
        break;
      case NpcHumanoidAccessory.BANDANA:
        drawBandana(ctx, anchorX, headTop, layout, palette.accent);
        break;
      case NpcHumanoidAccessory.VISOR:
        drawVisor(ctx, anchorX, headTop, layout, palette.accent);
        break;
      default:
        break;
    }
  }
}

/**
 * Silhueta humanóide — mesmo box do jogador; escala uniforme = chibi do player (~1 tile).
 */
export function renderNpcHumanoidSprite(
  ctx: CanvasRenderingContext2D,
  bounds: EntitySpriteBounds,
  sprite: string,
): void {
  const palette = resolveNpcHumanoidAppearance(sprite);
  const { x: anchorX, feetY } = resolveEntitySpriteCenter(bounds);
  const layout = resolveLayout(ENTITY_FIGURE_LAYOUT_WIDTH, bounds.height);

  ctx.save();
  disableCanvasImageSmoothing(ctx);

  applyEntityFigureUniformTransform(ctx, anchorX, feetY, bounds.height);

  drawShadow(ctx, anchorX, feetY, layout.figureWidth);

  const legTop = drawLegs(ctx, anchorX, feetY, layout, palette);
  const torsoTop = drawTorso(ctx, anchorX, legTop, layout, palette);
  drawArms(ctx, anchorX, torsoTop, layout, palette);
  const head = drawHead(ctx, anchorX, torsoTop, layout, palette);
  drawAccessories(ctx, anchorX, head.top, torsoTop, layout, palette);

  ctx.restore();
}

