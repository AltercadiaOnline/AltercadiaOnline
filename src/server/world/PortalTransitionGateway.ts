import type { PlayerProfile } from '../models/playerProfile.js';
import {
  resolvePortalTransition,
  type PortalTransitionFailedPayload,
  type PortalTransitionReadyPayload,
  type PortalTransitionRequestPayload,
  type WorldExplorationSessionSync,
} from '../../shared/world/zoneTransition.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import type { MapId } from '../../shared/world/mapRegistry.js';
import { saveWorldProfile } from './worldProfileStore.js';
import { notifyWorldPositionPersist } from './notifyWorldPositionPersist.js';
import { rejectMapTransitionIfNotAllowed } from '../instance/serverWorldScope.js';
import { getZoneLoadGateway } from './ZoneLoadGateway.js';

export type PortalTransitionGatewayResult =
  | { readonly ok: true; readonly ready: PortalTransitionReadyPayload; readonly profile: PlayerProfile }
  | { readonly ok: false; readonly failed: PortalTransitionFailedPayload };

/**
 * Etapa A autoritativa — valida portal, garante zona destino, persiste posição.
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

    const targetMapId = resolved.ready.mapId as MapId;
    if (rejectMapTransitionIfNotAllowed(targetMapId)) {
      return {
        ok: false,
        failed: {
          requestId: request.requestId,
          reason: 'Mapa de destino não está nesta instância.',
          code: 'MAP_NOT_ON_INSTANCE',
        },
      };
    }

    const zoneEnsure = getZoneLoadGateway().ensure(targetMapId);
    if (!zoneEnsure.ok) {
      return {
        ok: false,
        failed: {
          requestId: request.requestId,
          reason: 'Zona de destino ainda não está pronta — tente novamente.',
          code: 'ZONE_NOT_READY',
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
