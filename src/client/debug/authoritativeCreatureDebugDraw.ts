import { getActiveMapTileSize } from '../../shared/world/activeMapTileSize.js';
import { tileToWorldPixel } from '../../shared/world/portals.js';
import type { WorldCreatureSnapshot } from '../../shared/world/worldCreatureSync.js';
import { isVisualDebugModeEnabled } from './visualDebugMode.js';

const CREATURE_DEBUG_COLORS = [
  '#ff4466',
  '#44ff88',
  '#4488ff',
  '#ffcc44',
  '#cc66ff',
  '#44dddd',
] as const;

function colorForIndex(index: number): string {
  return CREATURE_DEBUG_COLORS[index % CREATURE_DEBUG_COLORS.length] ?? '#ff4466';
}

/**
 * Desenha retângulos no buffer de mundo — posição exata do state-sync (tiles × tileSize).
 * Ignora sprites/assets; útil para auditar servidor vs canvas.
 */
export function drawAuthoritativeCreatureDebugOverlay(
  ctx: CanvasRenderingContext2D,
  snapshots: readonly WorldCreatureSnapshot[],
): void {
  if (!isVisualDebugModeEnabled() || snapshots.length === 0) return;

  const tileSize = getActiveMapTileSize();

  ctx.save();

  for (let i = 0; i < snapshots.length; i += 1) {
    const creature = snapshots[i]!;
    const { x, y } = tileToWorldPixel(creature.tileX, creature.tileY, tileSize);
    const color = colorForIndex(i);

    ctx.fillStyle = `${color}55`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
    ctx.strokeRect(x + 0.5, y + 0.5, tileSize - 1, tileSize - 1);

    ctx.font = 'bold 8px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    const label = `${creature.creatureId}@${creature.tileX},${creature.tileY}`;
    ctx.strokeText(label, x + 2, y + 2);
    ctx.fillText(label, x + 2, y + 2);
  }

  ctx.restore();
}
