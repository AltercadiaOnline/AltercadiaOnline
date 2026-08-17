import { describe, expect, it } from 'vitest';
import { getPetDefinition } from '../../shared/pet/petCatalog.js';
import { resolvePetFollowAnchor } from '../../shared/world/petFollowMovement.js';
import { buildRemoteCompanionRenderSnapshot } from './remoteCompanionPose.js';

describe('buildRemoteCompanionRenderSnapshot', () => {
  it('ancora o pet atrás da pose interpolada do dono', () => {
    const owner = { feetX: 320, feetY: 480, facing: 'east' as const };
    const snapshot = buildRemoteCompanionRenderSnapshot(
      owner,
      {
        name: 'Nimbus',
        kindId: 'dimensional_cat',
        colorId: 'violet',
        gender: 'female',
      },
      1_000,
    );

    const expected = resolvePetFollowAnchor(
      { x: owner.feetX, y: owner.feetY },
      owner.facing,
      getPetDefinition('dimensional_cat').followOffsetMult,
    );

    expect(snapshot.visible).toBe(true);
    expect(snapshot.name).toBe('Nimbus');
    expect(snapshot.kindId).toBe('dimensional_cat');
    expect(snapshot.x).toBe(expected.x);
    expect(snapshot.y).toBe(expected.y);
    expect(snapshot.facing).toBe('east');
  });
});
