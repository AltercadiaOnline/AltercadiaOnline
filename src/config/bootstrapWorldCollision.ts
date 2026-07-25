import { syncConstructWorldCollision } from '../shared/world/constructWorldCollision.js';
import { WORLD_LEGACY_COLLISION_ENABLED } from '../shared/world/worldCollisionPolicy.js';
import { DEFAULT_MAP_ID } from '../shared/world/mapRegistry.js';

/**
 * Bootstrap de colisão Construct-first:
 * NPCs (tamanho do PNG) + props físicos do export.
 * Tile-paint legado permanece desligado.
 */
export function bootstrapWorldCollision(): void {
  syncConstructWorldCollision(DEFAULT_MAP_ID);
  if (!WORLD_LEGACY_COLLISION_ENABLED) {
    console.info(
      '[world-collision] Construct-first — obstáculos por asset/marker; tile-paint off.',
    );
  }
}

bootstrapWorldCollision();
