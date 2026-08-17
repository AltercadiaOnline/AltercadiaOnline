import { syncConstructWorldCollision } from '../shared/world/constructWorldCollision.js';
import { WORLD_LEGACY_COLLISION_ENABLED } from '../shared/world/worldCollisionPolicy.js';
import { MAP_REGISTRY, type MapId } from '../shared/world/mapRegistry.js';

/**
 * Bootstrap de colisão Construct-first:
 * NPCs (tamanho do PNG) + props físicos do export.
 * Tile-paint legado permanece desligado.
 */
export function bootstrapWorldCollision(): void {
  for (const mapId of Object.keys(MAP_REGISTRY) as MapId[]) {
    syncConstructWorldCollision(mapId);
  }
  if (!WORLD_LEGACY_COLLISION_ENABLED) {
    console.info(
      '[world-collision] Construct-first — obstáculos por asset/marker; tile-paint off.',
    );
  }
}

bootstrapWorldCollision();
