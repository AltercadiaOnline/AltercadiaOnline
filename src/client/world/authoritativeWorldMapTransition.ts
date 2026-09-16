import type { PlayerFacing } from '../../shared/world/playerFacing.js';
import { parsePlayerFacing } from '../../shared/world/playerFacing.js';

/** Spawn autoritativo após enter/ascend/evacuate/AFK da Torre (espelho do portal). */
export type AuthoritativeWorldSpawn = {
  readonly currentMapId: string;
  readonly lastPosition: { readonly x: number; readonly y: number };
  readonly facing: PlayerFacing;
};

type Applier = (spawn: AuthoritativeWorldSpawn) => void;

let applier: Applier | null = null;

/** Ligado pelo gameSession quando a Exploration sobe. */
export function bindAuthoritativeWorldMapTransition(next: Applier | null): void {
  applier = next;
}

export function applyAuthoritativeWorldMapTransition(spawn: AuthoritativeWorldSpawn): void {
  applier?.(spawn);
}

export function tryParseAuthoritativeWorldSpawn(data: unknown): AuthoritativeWorldSpawn | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;

  const nested = record.worldSpawn;
  if (nested && typeof nested === 'object') {
    return parseSpawnRecord(nested as Record<string, unknown>);
  }

  // Compat: intent-result com mapId + lastPosition na raiz.
  if (typeof record.mapId === 'string' && record.lastPosition && typeof record.lastPosition === 'object') {
    return parseSpawnRecord({
      currentMapId: record.mapId,
      lastPosition: record.lastPosition,
      facing: record.facing,
    });
  }

  return null;
}

function parseSpawnRecord(record: Record<string, unknown>): AuthoritativeWorldSpawn | null {
  const currentMapId =
    typeof record.currentMapId === 'string'
      ? record.currentMapId
      : typeof record.mapId === 'string'
        ? record.mapId
        : '';
  if (!currentMapId) return null;

  const pos = record.lastPosition;
  if (!pos || typeof pos !== 'object') return null;
  const posRec = pos as Record<string, unknown>;
  const x = typeof posRec.x === 'number' ? posRec.x : NaN;
  const y = typeof posRec.y === 'number' ? posRec.y : NaN;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

  return {
    currentMapId,
    lastPosition: { x, y },
    facing: parsePlayerFacing(record.facing, 'south'),
  };
}
