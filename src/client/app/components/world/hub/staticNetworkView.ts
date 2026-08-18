import { STATIC_DISTRICT_CATALOG, getStaticDistrictDef } from '../../../../../shared/static/staticDistrictCatalog.js';
import type {
  StaticDistrictHudSlice,
  StaticHeat,
  StaticNetworkHudSnapshot,
} from '../../../../../shared/static/staticNetworkTypes.js';

export type StaticHudDistrictRow = StaticDistrictHudSlice & {
  readonly label: string;
  readonly shortLabel: string;
};

const SHORT_LABEL: Record<string, string> = {
  city_north: 'Norte',
  city_south: 'Sul',
  farm_alley_north: 'Beco N',
  farm_alley_south: 'Beco S',
};

export function staticHeatLabel(heat: StaticHeat): string {
  if (heat === 'hot') return 'QUENTE';
  if (heat === 'blackout') return 'APAGÃO';
  return 'FRIO';
}

export function formatBlackoutRemain(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function sabotagePercent(row: StaticDistrictHudSlice): number {
  if (row.goal <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((row.sabotage / row.goal) * 100)));
}

export function hasStaticHeatAlert(snapshot: StaticNetworkHudSnapshot | null): boolean {
  return Boolean(snapshot?.districts.some((row) => row.heat === 'hot' || row.heat === 'blackout'));
}

export function buildStaticHudDistrictRows(
  snapshot: StaticNetworkHudSnapshot | null,
): readonly StaticHudDistrictRow[] {
  const byId = new Map((snapshot?.districts ?? []).map((row) => [row.id, row]));
  return STATIC_DISTRICT_CATALOG.map((def) => {
    const live = byId.get(def.id);
    return {
      id: def.id,
      label: def.label,
      shortLabel: SHORT_LABEL[def.id] ?? def.id,
      heat: live?.heat ?? 'cold',
      sabotage: live?.sabotage ?? 0,
      goal: live?.goal ?? def.sabotageGoal,
      blackoutRemainMs: live?.blackoutRemainMs ?? 0,
      agentCount: live?.agentCount ?? 0,
      callId: live?.callId ?? null,
    };
  });
}

export function districtDisplayName(id: string): string {
  return getStaticDistrictDef(id)?.label ?? id;
}
