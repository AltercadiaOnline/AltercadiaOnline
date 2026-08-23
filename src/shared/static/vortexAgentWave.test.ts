import { afterEach, describe, expect, it } from 'vitest';
import { resetWorldMonsterInstances } from '../world/worldMonsterInstances.js';
import { clearDefeatedMonsters } from '../world/defeatedMonsterState.js';
import { staticDistrictStore } from './staticDistrictStore.js';
import {
  STATIC_AGENT_WAVE_INTERVAL_MS,
  VORTEX_HUNT_TIMEOUT_MS,
  __resetVortexHuntRuntimeForTests,
  buildVortexAgentInstanceId,
  pickVortexIngressKind,
  resolveAgentWaveSlotEndMs,
  resolveAgentWaveSlotIndex,
  resolveVortexIngressTile,
  rollVortexAgentAppears,
  tickVortexAgentWaves,
} from './vortexAgentWave.js';

describe('vortexAgentWave', () => {
  afterEach(() => {
    staticDistrictStore.resetForTests();
    resetWorldMonsterInstances();
    clearDefeatedMonsters();
    __resetVortexHuntRuntimeForTests();
  });

  it('alinha slots a 10 min reais', () => {
    expect(resolveAgentWaveSlotIndex(0)).toBe(0);
    expect(resolveAgentWaveSlotIndex(STATIC_AGENT_WAVE_INTERVAL_MS - 1)).toBe(0);
    expect(resolveAgentWaveSlotIndex(STATIC_AGENT_WAVE_INTERVAL_MS)).toBe(1);
    expect(resolveAgentWaveSlotEndMs(3_20 * 60_000)).toBe(
      (resolveAgentWaveSlotIndex(3_20 * 60_000) + 1) * STATIC_AGENT_WAVE_INTERVAL_MS,
    );
  });

  it('sorteio 50% é estável no mesmo slot+distrito+shard', () => {
    const a = rollVortexAgentAppears(42, 'farm_alley_south', 'azul');
    const b = rollVortexAgentAppears(42, 'farm_alley_south', 'azul');
    expect(a).toBe(b);
  });

  it('primeira virada grava nextWaveAtMs e não re-rola no mesmo slot', () => {
    const now = STATIC_AGENT_WAVE_INTERVAL_MS * 12 + 1_000;
    const first = tickVortexAgentWaves(now, 'test-shard');
    expect(first.length).toBeGreaterThan(0);
    const south = staticDistrictStore.getRuntime('farm_alley_south')!;
    expect(south.nextWaveAtMs).toBe(resolveAgentWaveSlotEndMs(now));
    const second = tickVortexAgentWaves(now + 50, 'test-shard');
    expect(second).toEqual([]);
    expect(staticDistrictStore.getRuntime('farm_alley_south')?.agentInstanceIds)
      .toEqual(south.agentInstanceIds);
  });

  it('spawn usa id estável por distrito', () => {
    expect(buildVortexAgentInstanceId('city_north')).toBe('vortex_agent:city_north');
  });

  it('ingresso é norte, sul ou meio do distrito', () => {
    const bounds = { tileX0: 0, tileY0: 10, tileX1: 20, tileY1: 30 };
    expect(resolveVortexIngressTile(bounds, 'north')).toEqual({ tileX: 10, tileY: 10 });
    expect(resolveVortexIngressTile(bounds, 'south')).toEqual({ tileX: 10, tileY: 30 });
    expect(resolveVortexIngressTile(bounds, 'middle')).toEqual({ tileX: 10, tileY: 20 });
    expect(['north', 'south', 'middle']).toContain(
      pickVortexIngressKind(1, 'farm_alley_south', 'azul'),
    );
  });

  it('cidade não recebe agente na onda', () => {
    const now = STATIC_AGENT_WAVE_INTERVAL_MS * 20 + 500;
    tickVortexAgentWaves(now, 'test-shard');
    expect(staticDistrictStore.getRuntime('city_north')?.agentInstanceIds).toEqual([]);
    expect(staticDistrictStore.getRuntime('city_south')?.nextWaveAtMs).toBe(0);
  });

  it('timeout de 1 min some o agente sem re-rolar o slot', () => {
    const now = STATIC_AGENT_WAVE_INTERVAL_MS * 8 + 1_000;
    tickVortexAgentWaves(now, 'force-appear-salt');
    const south = staticDistrictStore.getRuntime('farm_alley_south')!;
    const slotEnd = south.nextWaveAtMs;
    tickVortexAgentWaves(now + VORTEX_HUNT_TIMEOUT_MS + 10, 'force-appear-salt');
    expect(staticDistrictStore.getRuntime('farm_alley_south')?.nextWaveAtMs).toBe(slotEnd);
  });
});
