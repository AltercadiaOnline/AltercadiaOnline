/** Auto-gerado por scripts/generate-construct-placements.mjs — NÃO editar.
 * Fonte: public/construct-world/data.json (spawn jogador).
 * Regenerar: npm run sync:construct | npm run prepare:construct | npm run generate:construct-placements
 */

import type { ConstructPlayerSpawnPlacement } from './constructPlayerSpawnPlacements.js';
import type { MapId } from './mapRegistry.js';

export const CONSTRUCT_PLAYER_SPAWN_PLACEMENTS_GENERATED: Readonly<
  Partial<Record<MapId, ConstructPlayerSpawnPlacement>>
> = {
  city_01: { mapId: 'city_01', constructX: 124, constructY: 232, widthPx: 250, heightPx: 250 }, // spawn_players
};
