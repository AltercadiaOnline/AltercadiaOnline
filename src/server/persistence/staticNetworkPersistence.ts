import path from 'node:path';
import { isStaticDistrictId } from '../../shared/static/staticDistrictCatalog.js';
import { staticDistrictStore, type StaticDistrictRuntime } from '../../shared/static/staticDistrictStore.js';
import { isStaticHeat } from '../../shared/static/staticNetworkTypes.js';
import { readJsonFile, writeJsonFileAtomic } from './DatabaseUtils.js';
import { getPersistenceRuntimeConfig, isDurablePersistence } from './PersistenceGateway.js';

const FILE_VERSION = 1;

type StaticNetworkFile = {
  readonly version: number;
  readonly updatedAt: number;
  readonly districts: readonly StaticDistrictRuntime[];
};

function filePath(dataDir: string): string {
  return path.join(dataDir, 'static-network.json');
}

function parseRuntime(value: unknown): StaticDistrictRuntime | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  if (!isStaticDistrictId(row.districtId) || !isStaticHeat(row.heat)) return null;
  if (typeof row.sabotage !== 'number' || !Number.isFinite(row.sabotage)) return null;
  if (typeof row.nextWaveAtMs !== 'number' || !Number.isFinite(row.nextWaveAtMs)) return null;
  const blackoutUntilMs = row.blackoutUntilMs === null || row.blackoutUntilMs === undefined
    ? null
    : typeof row.blackoutUntilMs === 'number' && Number.isFinite(row.blackoutUntilMs)
      ? row.blackoutUntilMs
      : null;
  const controlCharacterId = row.controlCharacterId === null || row.controlCharacterId === undefined
    ? null
    : typeof row.controlCharacterId === 'number' && Number.isFinite(row.controlCharacterId)
      ? row.controlCharacterId
      : null;
  const openCallId = typeof row.openCallId === 'string' ? row.openCallId : null;
  const agentInstanceIds = Array.isArray(row.agentInstanceIds)
    ? row.agentInstanceIds.filter((id): id is string => typeof id === 'string')
    : [];
  return {
    districtId: row.districtId,
    heat: row.heat,
    sabotage: row.sabotage,
    blackoutUntilMs,
    agentInstanceIds,
    nextWaveAtMs: row.nextWaveAtMs,
    controlCharacterId,
    openCallId,
  };
}

export async function loadStaticNetworkPersistence(): Promise<void> {
  if (!isDurablePersistence()) return;

  const { dataDir } = getPersistenceRuntimeConfig();
  const snapshot = await readJsonFile<StaticNetworkFile>(filePath(dataDir));
  const rows = snapshot?.districts?.map(parseRuntime).filter((row): row is StaticDistrictRuntime => Boolean(row))
    ?? [];
  staticDistrictStore.hydrate(rows);
}

export async function persistStaticNetworkSnapshot(): Promise<void> {
  if (!isDurablePersistence()) return;

  const { dataDir } = getPersistenceRuntimeConfig();
  await writeJsonFileAtomic(filePath(dataDir), {
    version: FILE_VERSION,
    updatedAt: Date.now(),
    districts: staticDistrictStore.exportRuntime(),
  } satisfies StaticNetworkFile);
}
