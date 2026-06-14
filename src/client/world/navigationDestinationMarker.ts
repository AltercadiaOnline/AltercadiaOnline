import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';

const MARKER_COLOR = 'rgba(94, 234, 212, 0.95)';
const MARKER_GLOW = 'rgba(94, 234, 212, 0.35)';

/** Marcador “X” no destino do click-to-move (mundo). */
export function drawNavigationDestinationMarker(
  ctx: CanvasRenderingContext2D,
  worldX: number,
  worldY: number,
): void {
  const size = getActiveMapTileSize() * 0.35;
  const half = size / 2;

  ctx.save();
  ctx.strokeStyle = MARKER_GLOW;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(worldX, worldY, half + 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = MARKER_COLOR;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(worldX - half, worldY - half);
  ctx.lineTo(worldX + half, worldY + half);
  ctx.moveTo(worldX + half, worldY - half);
  ctx.lineTo(worldX - half, worldY + half);
  ctx.stroke();
  ctx.restore();
}
