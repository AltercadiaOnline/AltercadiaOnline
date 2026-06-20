import type { PlayerProfile } from '../models/playerProfile.js';
import {
  resolvePortalTransition,
  type PortalTransitionFailedPayload,
  type PortalTransitionReadyPayload,
  type PortalTransitionRequestPayload,
  type WorldExplorationSessionSync,
} from '../../shared/world/zoneTransition.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { saveWorldProfile } from './worldProfileStore.js';
import { notifyWorldPositionPersist } from './notifyWorldPositionPersist.js';

export type PortalTransitionGatewayResult =
  | { readonly ok: true; readonly ready: PortalTransitionReadyPayload; readonly profile: PlayerProfile }
  | { readonly ok: false; readonly failed: PortalTransitionFailedPayload };

/**
 * Etapa A autoritativa — valida portal, persiste posição e snapshot de sessão.
 */
export class PortalTransitionGateway {
  handleRequest(
    playerId: string,
    request: PortalTransitionRequestPayload,
  ): PortalTransitionGatewayResult {
    const resolved = resolvePortalTransition(request);
    if (!resolved.ok) {
      return {
        ok: false,
        failed: {
          requestId: request.requestId,
          ...resolved.failed,
        },
      };
    }

    const profile = saveWorldProfile(playerId, request.characterId, {
      currentMapId: resolved.ready.mapId,
      lastPosition: { x: resolved.ready.x, y: resolved.ready.y },
      facing: (resolved.ready.facing ?? request.facing) as PlayerFacing,
      ...(request.sessionSync ? { sessionSync: normalizeSessionSync(request.sessionSync) } : {}),
    });
    notifyWorldPositionPersist(playerId, request.characterId, profile);

    return {
      ok: true,
      ready: resolved.ready,
      profile,
    };
  }
}

function normalizeSessionSync(sync: WorldExplorationSessionSync): WorldExplorationSessionSync {
  const parts: WorldExplorationSessionSync[] = [];

  if (sync.worldVitals) {
    const { hpCurrent, hpMax, mpCurrent, mpMax } = sync.worldVitals;
    if (
      Number.isFinite(hpCurrent)
      && Number.isFinite(hpMax)
      && Number.isFinite(mpCurrent)
      && Number.isFinite(mpMax)
    ) {
      parts.push({ worldVitals: { hpCurrent, hpMax, mpCurrent, mpMax } });
    }
  }

  if (sync.activeMovesets?.length) {
    parts.push({ activeMovesets: [...sync.activeMovesets] });
  }

  if (sync.pet !== undefined) {
    parts.push({ pet: sync.pet });
  }

  return parts.reduce<WorldExplorationSessionSync>(
    (acc, part) => ({ ...acc, ...part }),
    {},
  );
}
