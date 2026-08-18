import {
  STATIC_DISTRICT_CATALOG,
  getStaticDistrictDef,
  type StaticDistrictId,
} from './staticDistrictCatalog.js';
import type {
  StaticDistrictHudSlice,
  StaticHeat,
  StaticNetworkHudSnapshot,
} from './staticNetworkTypes.js';

export type StaticDistrictRuntime = {
  districtId: StaticDistrictId;
  heat: StaticHeat;
  sabotage: number;
  blackoutUntilMs: number | null;
  agentInstanceIds: string[];
  nextWaveAtMs: number;
  controlCharacterId: number | null;
  openCallId: string | null;
};

function seedRuntime(): Map<StaticDistrictId, StaticDistrictRuntime> {
  const map = new Map<StaticDistrictId, StaticDistrictRuntime>();
  for (const def of STATIC_DISTRICT_CATALOG) {
    map.set(def.id, {
      districtId: def.id,
      heat: 'cold',
      sabotage: 0,
      blackoutUntilMs: null,
      agentInstanceIds: [],
      nextWaveAtMs: 0,
      controlCharacterId: null,
      openCallId: null,
    });
  }
  return map;
}

export class StaticDistrictStore {
  private revision = 1;
  private readonly byId = seedRuntime();

  markDirty(): void {
    this.revision += 1;
  }

  getRevision(): number {
    return this.revision;
  }

  getRuntime(districtId: StaticDistrictId): StaticDistrictRuntime | null {
    return this.byId.get(districtId) ?? null;
  }

  listRuntime(): readonly StaticDistrictRuntime[] {
    return STATIC_DISTRICT_CATALOG.map((def) => this.byId.get(def.id)!);
  }

  hydrate(rows: readonly StaticDistrictRuntime[]): void {
    for (const row of rows) {
      if (!this.byId.has(row.districtId)) continue;
      this.byId.set(row.districtId, {
        districtId: row.districtId,
        heat: row.heat,
        sabotage: Math.max(0, Math.floor(row.sabotage)),
        blackoutUntilMs: row.blackoutUntilMs,
        agentInstanceIds: [...row.agentInstanceIds],
        nextWaveAtMs: row.nextWaveAtMs,
        controlCharacterId: row.controlCharacterId,
        openCallId: row.openCallId,
      });
    }
    this.markDirty();
  }

  exportRuntime(): StaticDistrictRuntime[] {
    return this.listRuntime().map((row) => ({
      ...row,
      agentInstanceIds: [...row.agentInstanceIds],
    }));
  }

  buildHudSnapshot(nowMs: number = Date.now()): StaticNetworkHudSnapshot {
    const districts: StaticDistrictHudSlice[] = this.listRuntime().map((row) => {
      const def = getStaticDistrictDef(row.districtId)!;
      const blackoutRemainMs = row.blackoutUntilMs
        ? Math.max(0, row.blackoutUntilMs - nowMs)
        : 0;
      return {
        id: row.districtId,
        heat: row.heat,
        sabotage: row.sabotage,
        goal: def.sabotageGoal,
        blackoutRemainMs,
        agentCount: row.agentInstanceIds.length,
        callId: row.openCallId,
      };
    });
    return { revision: this.revision, districts };
  }

  resetForTests(): void {
    this.revision = 1;
    for (const def of STATIC_DISTRICT_CATALOG) {
      this.byId.set(def.id, {
        districtId: def.id,
        heat: 'cold',
        sabotage: 0,
        blackoutUntilMs: null,
        agentInstanceIds: [],
        nextWaveAtMs: 0,
        controlCharacterId: null,
        openCallId: null,
      });
    }
  }
}

export const staticDistrictStore = new StaticDistrictStore();
