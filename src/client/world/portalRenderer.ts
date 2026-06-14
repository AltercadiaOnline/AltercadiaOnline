import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { tileCenterToWorldPixel } from '../../shared/world/portals.js';
import type { MapVisualLayout } from './mapVisualLayouts.js';
import type { VisualLandmark } from './city01VisualLayout.js';
import { tileFootprintDepthY, type WorldDepthDrawable } from '../../shared/world/worldDepthSort.js';

/** Raio base do portal (px) — substituir por sprite circular em `public/assets/world/portal_glyph.png`. */
export const PORTAL_GLYPH_SPRITE_PATH = 'public/assets/world/portal_glyph.png';

const PORTAL_CORE = '#00e8c8';
const PORTAL_GLOW = 'rgba(0, 232, 200, 0.45)';
const PORTAL_RING = 'rgba(0, 255, 204, 0.85)';
const PULSE_PERIOD_MS = 1_800;
const BASE_RADIUS_PX = 13;

function portalLandmarks(layout: MapVisualLayout): readonly VisualLandmark[] {
  return layout.landmarks.filter((landmark) => landmark.kind === 'portal');
}

/** Desenha portal circular procedural — trocar por `drawImage` quando o asset estiver pronto. */
export function drawPortalGlyph(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  nowMs: number,
): void {
  const pulse = 0.5 + 0.5 * Math.sin((nowMs / PULSE_PERIOD_MS) * Math.PI * 2);
  const radius = BASE_RADIUS_PX * (0.9 + pulse * 0.12);
  const glowRadius = radius * (1.55 + pulse * 0.08);

  ctx.save();

  const glow = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, glowRadius);
  glow.addColorStop(0, `rgba(0, 232, 200, ${0.35 + pulse * 0.25})`);
  glow.addColorStop(0.55, `rgba(0, 180, 160, ${0.12 + pulse * 0.08})`);
  glow.addColorStop(1, 'rgba(0, 232, 200, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = PORTAL_RING;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.55 + pulse * 0.35;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.75 + pulse * 0.2;
  ctx.fillStyle = PORTAL_GLOW;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.72, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = PORTAL_CORE;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function collectPortalDrawables(
  ctx: CanvasRenderingContext2D,
  layout: MapVisualLayout,
  nowMs: number = performance.now(),
): WorldDepthDrawable[] {
  const tileSize = layout.tileSize ?? DESIGN_CONFIG.TILE.SIZE;
  const drawables: WorldDepthDrawable[] = [];

  for (const landmark of portalLandmarks(layout)) {
    const center = tileCenterToWorldPixel(landmark.tileX, landmark.tileY, tileSize);
    const depthY = tileFootprintDepthY(landmark.tileY, 0, tileSize);

    drawables.push({
      depthY,
      draw: () => {
        drawPortalGlyph(ctx, center.x, center.y, nowMs);
      },
    });
  }

  return drawables;
}
