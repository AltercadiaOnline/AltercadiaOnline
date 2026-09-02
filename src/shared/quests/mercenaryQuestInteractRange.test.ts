import { describe, expect, it } from 'vitest';
import { DESIGN_CONFIG } from '../../config/designConstants.js';
import { resolveNpcArchetypeId } from '../npc/resolveNpcArchetypeId.js';
import { CITY_01_ID } from '../world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../world/maps/farm_zone_01.js';
import { getResolvedNpcRegistry } from '../world/npcRegistry.js';
import { assertMercenaryQuestNpcInRange } from './mercenaryQuestInteractRange.js';

describe('mercenaryQuestInteractRange', () => {
  it('aceita perto do operário da cidade e recusa longe ou no beco', () => {
    const npc = getResolvedNpcRegistry().find(
      (entry) => resolveNpcArchetypeId(entry.id) === 'operario_linha4'
        && entry.mapId === CITY_01_ID,
    );
    expect(npc).toBeTruthy();
    if (!npc) return;

    const tile = DESIGN_CONFIG.TILE.SIZE;
    const near = assertMercenaryQuestNpcInRange('operario_linha4#0', CITY_01_ID, {
      mapId: CITY_01_ID,
      x: npc.tileX * tile + tile / 2,
      y: npc.tileY * tile + tile / 2,
    });
    expect(near.ok).toBe(true);

    const far = assertMercenaryQuestNpcInRange('operario_linha4#0', CITY_01_ID, {
      mapId: CITY_01_ID,
      x: 16,
      y: 16,
    });
    expect(far.ok).toBe(false);
    if (far.ok) return;
    expect(far.code).toBe('QUEST_OUT_OF_RANGE');

    const wrongMap = assertMercenaryQuestNpcInRange('operario_linha4#1', CITY_01_ID, {
      mapId: FARM_ZONE_01_ID,
      x: npc.tileX * tile,
      y: npc.tileY * tile,
    });
    expect(wrongMap.ok).toBe(false);
    if (wrongMap.ok) return;
    expect(wrongMap.code).toBe('QUEST_MAP_MISMATCH');
  });
});
