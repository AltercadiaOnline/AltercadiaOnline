import { describe, expect, it } from 'vitest';
import { parseRemotePlayerSnapshots } from './remotePlayerSync.js';

describe('parseRemotePlayerSnapshots', () => {
  it('aceita snapshot legado só com pose', () => {
    const parsed = parseRemotePlayerSnapshots([
      {
        playerId: 'peer-1',
        characterId: 2,
        displayName: 'Peer',
        mapId: 'city_01',
        feetX: 10,
        feetY: 20,
        facing: 'east',
        serverTimeMs: 1000,
      },
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0]).toEqual({
      playerId: 'peer-1',
      characterId: 2,
      displayName: 'Peer',
      mapId: 'city_01',
      feetX: 10,
      feetY: 20,
      facing: 'east',
      serverTimeMs: 1000,
    });
  });

  it('sanitiza skin/nível/pet e descarta campos inválidos sem inventar default', () => {
    const parsed = parseRemotePlayerSnapshots([
      {
        playerId: 'peer-2',
        characterId: 4,
        displayName: '  Mira  ',
        skinBundleId: 'not_a_skin',
        level: 0,
        companion: { name: '', kindId: 'slime', colorId: 'gold', gender: 'other' },
        mapId: 'city_01',
        feetX: 1,
        feetY: 2,
        facing: 'west',
        serverTimeMs: 50,
      },
    ]);
    expect(parsed?.[0]).toEqual({
      playerId: 'peer-2',
      characterId: 4,
      displayName: 'Mira',
      mapId: 'city_01',
      feetX: 1,
      feetY: 2,
      facing: 'west',
      serverTimeMs: 50,
    });
  });

  it('mantém identidade visual válida do peer', () => {
    const parsed = parseRemotePlayerSnapshots([
      {
        playerId: 'peer-3',
        characterId: 8,
        displayName: 'Kael',
        skinBundleId: 'player_male_3',
        level: 7,
        companion: {
          name: 'Bolt',
          kindId: 'dimensional_dog',
          colorId: 'amber',
          gender: 'male',
        },
        mapId: 'farm_zone_01',
        feetX: 80,
        feetY: 120,
        facing: 'north',
        serverTimeMs: 9_000,
      },
    ]);
    expect(parsed?.[0]).toMatchObject({
      skinBundleId: 'player_male_3',
      level: 7,
      companion: {
        name: 'Bolt',
        kindId: 'dimensional_dog',
        colorId: 'amber',
        gender: 'male',
      },
    });
  });
});
