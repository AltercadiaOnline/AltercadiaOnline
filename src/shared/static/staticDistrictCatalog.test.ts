import { describe, expect, it } from 'vitest';
import {
  resolveStaticDistrictAt,
  STATIC_DISTRICT_CATALOG,
  isStaticDistrictId,
} from './staticDistrictCatalog.js';
import { staticDistrictStore } from './staticDistrictStore.js';
import { parseStaticNetworkHudSnapshot } from './staticNetworkTypes.js';
import { CITY_01_ID } from '../world/maps/city01.js';
import { FARM_ZONE_01_ID } from '../world/maps/farm_zone_01.js';

describe('Static district catalog', () => {
  it('cobre cidade e beco sem overlap no mesmo mapa', () => {
    expect(STATIC_DISTRICT_CATALOG).toHaveLength(4);
    expect(isStaticDistrictId('city_north')).toBe(true);
    expect(resolveStaticDistrictAt(CITY_01_ID, 10, 5)?.id).toBe('city_north');
    expect(resolveStaticDistrictAt(CITY_01_ID, 10, 30)?.id).toBe('city_south');
    expect(resolveStaticDistrictAt(FARM_ZONE_01_ID, 5, 5)?.id).toBe('farm_alley_north');
  });

  it('store nasce frio e o snapshot HUD parseia', () => {
    staticDistrictStore.resetForTests();
    const snap = staticDistrictStore.buildHudSnapshot(0);
    expect(snap.districts.every((row) => row.heat === 'cold' && row.sabotage === 0)).toBe(true);
    expect(parseStaticNetworkHudSnapshot(snap)).toEqual(snap);
  });
});
