import { describe, expect, it, beforeEach } from 'vitest';
import {
  getWorldProfile,
  resetWorldProfileStore,
  saveWorldProfile,
} from '../world/worldProfileStore.js';
import {
  canPlayerEnterCasualDuel,
  casualDuelHpBlockedReason,
} from './casualDuelHpGate.js';

describe('casualDuelHpGate', () => {
  beforeEach(() => {
    resetWorldProfileStore();
    saveWorldProfile('p1', 1, {
      currentMapId: 'city_01',
      lastPosition: { x: 10, y: 20 },
      facing: 'south',
      sessionSync: {
        worldVitals: { hpCurrent: 50, hpMax: 100, mpCurrent: 40, mpMax: 40 },
      },
    });
    saveWorldProfile('p2', 1, {
      currentMapId: 'city_01',
      lastPosition: { x: 10, y: 20 },
      facing: 'south',
      sessionSync: {
        worldVitals: { hpCurrent: 0, hpMax: 100, mpCurrent: 40, mpMax: 40 },
      },
    });
  });

  it('permite duelo com HP > 0', () => {
    expect(canPlayerEnterCasualDuel('p1', 1)).toBe(true);
    expect(getWorldProfile('p1', 1).sessionSync?.worldVitals?.hpCurrent).toBe(50);
  });

  it('bloqueia duelo com HP 0', () => {
    expect(canPlayerEnterCasualDuel('p2', 1)).toBe(false);
  });

  it('sem vitals → permite (personagem novo)', () => {
    saveWorldProfile('p3', 1, {
      currentMapId: 'city_01',
      lastPosition: { x: 0, y: 0 },
      facing: 'south',
    });
    expect(canPlayerEnterCasualDuel('p3', 1)).toBe(true);
  });

  it('mensagens claras', () => {
    expect(casualDuelHpBlockedReason('self')).toMatch(/vida/i);
    expect(casualDuelHpBlockedReason('target')).toMatch(/fora de combate/i);
  });
});
