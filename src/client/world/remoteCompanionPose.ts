import { getPetDefinition } from '../../shared/pet/petCatalog.js';
import { resolvePetFollowAnchor } from '../../shared/world/petFollowMovement.js';
import type { RemotePlayerCompanionSnapshot } from '../../shared/world/remotePlayerSync.js';
import type { PetRenderSnapshot } from '../entities/pet/PetFollowEntity.js';
import type { PlayerFacing } from '../../shared/world/playerFacing.js';

/** Pose visual do pet remoto — ancora atrás do dono interpolado; identidade vem do snapshot. */
export function buildRemoteCompanionRenderSnapshot(
  owner: {
    readonly feetX: number;
    readonly feetY: number;
    readonly facing: PlayerFacing;
  },
  companion: RemotePlayerCompanionSnapshot,
  timestampMs: number,
): PetRenderSnapshot {
  const offsetMult = getPetDefinition(companion.kindId).followOffsetMult;
  const anchor = resolvePetFollowAnchor(
    { x: owner.feetX, y: owner.feetY },
    owner.facing,
    offsetMult,
  );
  return {
    x: anchor.x,
    y: anchor.y,
    facing: owner.facing,
    southIdleMs: 0,
    visible: true,
    name: companion.name,
    kindId: companion.kindId,
    colorId: companion.colorId,
    gender: companion.gender,
    animPhase: timestampMs * 0.008,
  };
}
