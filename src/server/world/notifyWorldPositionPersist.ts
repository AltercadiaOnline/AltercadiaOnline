import type { PlayerProfile } from '../models/playerProfile.js';
import { getServerInstanceContext } from '../instance/ServerInstanceContext.js';
import { getPersistenceManager } from '../supabase/persistenceManagerRegistry.js';

/** Enfileira posição LOW_PRIORITY após mutação autoritativa do perfil de mundo. */
export function notifyWorldPositionPersist(
  playerId: string,
  characterId: number,
  profile: PlayerProfile,
): void {
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
