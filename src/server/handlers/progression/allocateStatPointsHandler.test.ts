import { describe, expect, it, beforeEach } from 'vitest';
import { AllocateStatPointsHandler } from './allocateStatPointsHandler.js';
import {
  loadAuthoritativeProgression,
  resetAuthoritativeProgressionStore,
} from '../../progression/authoritativeProgressionStore.js';
import { createDefaultPlayerProgressionData } from '../../../shared/progression/playerProgressionData.js';
import { emptyMarcosNodeProgression } from '../../../shared/progression/marcoProgression.js';

describe('AllocateStatPointsHandler', () => {
  beforeEach(() => {
    resetAuthoritativeProgressionStore();
  });

  it('gasta ponto e responde com bolsa atualizada', async () => {
    loadAuthoritativeProgression('player-a', 1, {
      progression: createDefaultPlayerProgressionData(),
      marcos: {
        activeMarcos: [],
        flowSpeedBase: 1,
        nodeProgression: emptyMarcosNodeProgression(),
      },
      characterProfile: {
        level: 5,
        xpCurrent: 0,
        classId: 'COGITOR',
      },
    });

    const sent: unknown[] = [];
    const handler = new AllocateStatPointsHandler();
    handler.attachSession({
      playerId: 'player-a',
      characterId: 1,
      sendIntent: (message) => {
        sent.push(message);
      },
    });

    await handler.execute('player-a', { atk: 1 }, 'intent-allocate-1');

    expect(sent).toHaveLength(1);
    const payload = (sent[0] as { payload: Record<string, unknown> }).payload;
    expect(payload.success).toBe(true);
    const data = payload.data as { characterStatPoints?: { atk: number; unspent: number } };
    expect(data.characterStatPoints?.atk).toBe(1);
    expect(data.characterStatPoints?.unspent).toBe(7);
  });

  it('rejeita quando bolsa está vazia', async () => {
    loadAuthoritativeProgression('player-a', 1, {
      progression: createDefaultPlayerProgressionData(),
      marcos: {
        activeMarcos: [],
        flowSpeedBase: 1,
        nodeProgression: emptyMarcosNodeProgression(),
      },
      characterProfile: {
        level: 1,
        xpCurrent: 0,
        classId: 'COGITOR',
      },
    });

    const sent: unknown[] = [];
    const handler = new AllocateStatPointsHandler();
    handler.attachSession({
      playerId: 'player-a',
      characterId: 1,
      sendIntent: (message) => {
        sent.push(message);
      },
    });

    await handler.execute('player-a', { def: 1 }, 'intent-allocate-2');

    const payload = (sent[0] as { payload: Record<string, unknown> }).payload;
    expect(payload.success).toBe(false);
  });
});
