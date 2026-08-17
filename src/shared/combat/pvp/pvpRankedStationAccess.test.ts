import { describe, expect, it } from 'vitest';
import { PVP_RANKED_STATION_ID } from './pvpRankedQueueConfig.js';
import { validatePvpRankedStationAccess } from './pvpRankedStationAccess.js';
import { getResolvedNpcRegistry } from '../../world/npcRegistry.js';
import { DESIGN_CONFIG } from '../../../config/designConstants.js';

describe('validatePvpRankedStationAccess', () => {
  const pulpit = getResolvedNpcRegistry().find((npc) => npc.id === PVP_RANKED_STATION_ID);

  it('tem marker combate_pvp na cidade', () => {
    expect(pulpit?.mapId).toBe('city_01');
    expect(pulpit).toBeDefined();
  });

  it('aceita pose no púlpito', () => {
    if (!pulpit) throw new Error('combate_pvp ausente no registry');
    const worldX = pulpit.worldX ?? pulpit.tileX * DESIGN_CONFIG.TILE.SIZE;
    const worldY = pulpit.worldY ?? pulpit.tileY * DESIGN_CONFIG.TILE.SIZE;
    expect(validatePvpRankedStationAccess({
      mapId: pulpit.mapId,
      worldX,
      worldY,
      stationId: PVP_RANKED_STATION_ID,
    })).toEqual({ ok: true });
  });

  it('recusa quem está longe na cidade', () => {
    expect(validatePvpRankedStationAccess({
      mapId: 'city_01',
      worldX: 32,
      worldY: 32,
      stationId: PVP_RANKED_STATION_ID,
    })).toEqual({ ok: false, reason: 'NOT_NEAR_STATION' });
  });

  it('recusa outro mapa', () => {
    if (!pulpit) throw new Error('combate_pvp ausente no registry');
    const worldX = pulpit.worldX ?? pulpit.tileX * DESIGN_CONFIG.TILE.SIZE;
    const worldY = pulpit.worldY ?? pulpit.tileY * DESIGN_CONFIG.TILE.SIZE;
    expect(validatePvpRankedStationAccess({
      mapId: 'farm_zone_01',
      worldX,
      worldY,
      stationId: PVP_RANKED_STATION_ID,
    })).toEqual({ ok: false, reason: 'NOT_NEAR_STATION' });
  });

  it('recusa estação inválida', () => {
    expect(validatePvpRankedStationAccess({
      mapId: 'city_01',
      worldX: 0,
      worldY: 0,
      stationId: 'computador_arena',
    })).toEqual({ ok: false, reason: 'INVALID_STATION' });
  });
});
