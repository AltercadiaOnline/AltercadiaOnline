import { describe, expect, it } from 'vitest';
import type { StaticNetworkHudSnapshot } from '../../../../../shared/static/staticNetworkTypes.js';
import {
  buildStaticHudDistrictRows,
  hasStaticHeatAlert,
  hasVortexPatrolAlert,
  sabotagePercent,
  staticHeatLabel,
  vortexPatrolStatusLabel,
} from './staticNetworkView.js';

describe('staticNetworkView', () => {
  it('preenche distritos do catálogo mesmo sem snapshot', () => {
    const rows = buildStaticHudDistrictRows(null);
    expect(rows).toHaveLength(4);
    expect(rows.every((row) => row.heat === 'cold')).toBe(true);
    expect(hasStaticHeatAlert(null)).toBe(false);
  });

  it('espelha calor e percentual do servidor', () => {
    const snapshot: StaticNetworkHudSnapshot = {
      revision: 2,
      districts: [
        {
          id: 'city_north',
          heat: 'hot',
          sabotage: 2500,
          goal: 10000,
          blackoutRemainMs: 0,
          agentCount: 2,
          callId: null,
        },
      ],
    };
    const rows = buildStaticHudDistrictRows(snapshot);
    const north = rows.find((row) => row.id === 'city_north');
    expect(north?.heat).toBe('hot');
    expect(sabotagePercent(north!)).toBe(25);
    expect(staticHeatLabel('blackout')).toBe('APAGÃO');
    expect(hasStaticHeatAlert(snapshot)).toBe(true);
  });

  it('SINAL de patrulha no beco', () => {
    expect(vortexPatrolStatusLabel({
      id: 'farm_alley_south',
      heat: 'cold',
      sabotage: 0,
      goal: 10_000,
      blackoutRemainMs: 0,
      agentCount: 0,
      callId: null,
    })).toBe('Zona 1 — limpa');
    expect(vortexPatrolStatusLabel({
      id: 'farm_alley_north',
      heat: 'cold',
      sabotage: 0,
      goal: 10_000,
      blackoutRemainMs: 0,
      agentCount: 1,
      callId: null,
    })).toBe('Zona 1 Norte — agente detectado');
    const snapshot: StaticNetworkHudSnapshot = {
      revision: 1,
      districts: [{
        id: 'farm_alley_south',
        heat: 'cold',
        sabotage: 0,
        goal: 10_000,
        blackoutRemainMs: 0,
        agentCount: 1,
        callId: null,
      }],
    };
    expect(hasVortexPatrolAlert(snapshot)).toBe(true);
    expect(hasStaticHeatAlert(snapshot)).toBe(true);
  });
});
