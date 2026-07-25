import type { PlayerProfile } from '../models/playerProfile.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { touchCharacterPersistenceDirty } from '../persistence/PersistenceGateway.js';
import { getPersistenceManager } from '../supabase/persistenceManagerRegistry.js';

/**
 * Após mutação autoritativa de posição/mapa:
 * - marca dirty file/postgres (flush no intervalo / logout — não a cada passo)
 * - enfileira posição LOW_PRIORITY no Supabase (batch 30s)
 */
export function notifyWorldPositionPersist(
  playerId: string,
  characterId: number,
  profile: PlayerProfile,
): void {
  touchCharacterPersistenceDirty(playerId, characterId, 'world');

  const manager = getPersistenceManager();
  if (!manager?.isEnabled()) return;

  const scope = manager.resolveScope(
    playerId,
    characterId,
    getServerInstanceContext().id,
  );

  manager.savePosition(
    scope,
    profile.lastPosition.x,
    profile.lastPosition.y,
    {
      currentMapId: profile.currentMapId,
      facing: profile.facing,
    },
  );
}
