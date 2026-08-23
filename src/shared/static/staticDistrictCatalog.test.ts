import { describe, expect, it } from 'vitest';
import {
  resolveStaticDistrictAt,
  resolveStaticDistrictIdAtPixel,
  STATIC_DISTRICT_CATALOG,
  isStaticDistrictId,
} from './staticDistrictCatalog.js';
import { staticDistrictStore } from './staticDistrictStore.js';
import { parseStaticNetworkHudSnapshot, resolveStaticLiveHeat } from './staticNetworkTypes.js';
import { CITY_01_ID } from '../world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../world/maps/farm_zone_01.js';
import { DESIGN_CONFIG } from '../../config/designConstants.js';

describe('Static district catalog', () => {
  it('cobre cidade e beco sem overlap no mesmo mapa', () => {
    expect(STATIC_DISTRICT_CATALOG).toHaveLength(4);
    expect(isStaticDistrictId('city_north')).toBe(true);
    expect(resolveStaticDistrictAt(CITY_01_ID, 10, 5)?.id).toBe('city_north');
    expect(resolveStaticDistrictAt(CITY_01_ID, 10, 30)?.id).toBe('city_south');
    expect(resolveStaticDistrictAt(FARM_ZONE_01_ID, 5, 5)?.id).toBe('farm_alley_north');
    const tile = DESIGN_CONFIG.TILE.SIZE;
    expect(resolveStaticDistrictIdAtPixel(CITY_01_ID, 10 * tile, 5 * tile)).toBe('city_north');
    expect(resolveStaticDistrictIdAtPixel(CITY_01_ID, 10 * tile, 30 * tile)).toBe('city_south');
  });

  it('store nasce frio e o snapshot HUD parseia', () => {
    staticDistrictStore.resetForTests();
    const snap = staticDistrictStore.buildHudSnapshot(0);
    expect(snap.districts.every((row) => row.heat === 'cold' && row.sabotage === 0)).toBe(true);
    expect(parseStaticNetworkHudSnapshot(snap)).toEqual(snap);
  });

  it('snapshot marca distrito quente quando há agente', () => {
    staticDistrictStore.resetForTests();
    staticDistrictStore.applyAgentWave(
      'farm_alley_south',
      ['vortex_agent:farm_alley_south'],
      60_000,
    );
    const snap = staticDistrictStore.buildHudSnapshot(0);
    const south = snap.districts.find((row) => row.id === 'farm_alley_south');
    const north = snap.districts.find((row) => row.id === 'farm_alley_north');
    expect(south?.heat).toBe('hot');
    expect(south?.agentCount).toBe(1);
    expect(north?.heat).toBe('cold');
    expect(resolveStaticLiveHeat({
      blackoutRemainMs: 0,
      agentCount: 0,
      sabotage: 5_000,
      hotThreshold: 5_000,
    })).toBe('hot');
    expect(resolveStaticLiveHeat({
      blackoutRemainMs: 1,
      agentCount: 3,
      sabotage: 0,
      hotThreshold: 5_000,
    })).toBe('blackout');
  });
});
