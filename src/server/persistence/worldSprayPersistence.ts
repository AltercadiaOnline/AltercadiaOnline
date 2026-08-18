import path from 'node:path';
import type { TacticalSpray } from '../../shared/types/tacticalSpray.js';
import { tacticalSprayService } from '../../shared/social/tacticalSprayStore.js';
import { shouldApplyWorldSprayWeeklyReset, resolveLatestElapsedWorldSprayResetAtMs } from '../../shared/social/worldSprayWeeklyReset.js';
import { readJsonFile, writeJsonFileAtomic } from './DatabaseUtils.js';
import { getPersistenceRuntimeConfig, isDurablePersistence } from './PersistenceGateway.js';

type WorldSpraySnapshotFile = {
  readonly sprays: readonly TacticalSpray[];
  readonly updatedAt: number;
  readonly lastWeeklyResetAtMs?: number;
};

let lastWeeklyResetAtMs: number | null = null;

function worldSprayFilePath(dataDir: string): string {
  return path.join(dataDir, 'world-sprays.json');
}

function isTacticalSprayRecord(value: unknown): value is TacticalSpray {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.zoneId === 'string'
    && typeof record.posX === 'number'
    && typeof record.posY === 'number'
    && typeof record.userId === 'string'
    && typeof record.authorCharacterId === 'number'
    && typeof record.authorNickname === 'string'
    && typeof record.sprayAssetId === 'string'
    && typeof record.createdAt === 'number'
    && typeof record.upvoteCount === 'number';
}

export function getWorldSprayLastWeeklyResetAtMs(): number | null {
  return lastWeeklyResetAtMs;
}

export function stampWorldSprayWeeklyReset(atMs: number): void {
  lastWeeklyResetAtMs = atMs;
}

export async function loadWorldSprayPersistence(): Promise<void> {
  if (!isDurablePersistence()) return;

  const { dataDir } = getPersistenceRuntimeConfig();
  const snapshot = await readJsonFile<WorldSpraySnapshotFile>(worldSprayFilePath(dataDir));
  const sprays = snapshot?.sprays?.filter(isTacticalSprayRecord) ?? [];
  tacticalSprayService.hydrateSprays(sprays);

  const storedReset = snapshot?.lastWeeklyResetAtMs;
  lastWeeklyResetAtMs = typeof storedReset === 'number' && Number.isFinite(storedReset)
    ? storedReset
    : null;

  const now = Date.now();
  if (lastWeeklyResetAtMs === null) {
    lastWeeklyResetAtMs = resolveLatestElapsedWorldSprayResetAtMs(now);
    await persistWorldSpraySnapshot();
    return;
  }

  if (shouldApplyWorldSprayWeeklyReset(now, lastWeeklyResetAtMs)) {
    tacticalSprayService.resetAllWorldSprays();
    lastWeeklyResetAtMs = resolveLatestElapsedWorldSprayResetAtMs(now);
    await persistWorldSpraySnapshot();
    console.log('[world-spray] catch-up: pixos do chão limpos (segunda 07h BRT).');
  }
}

export async function persistWorldSpraySnapshot(): Promise<void> {
  if (!isDurablePersistence()) return;

  const { dataDir } = getPersistenceRuntimeConfig();
  await writeJsonFileAtomic(worldSprayFilePath(dataDir), {
    sprays: tacticalSprayService.exportSprays(),
    updatedAt: Date.now(),
    ...(lastWeeklyResetAtMs !== null ? { lastWeeklyResetAtMs } : {}),
  });
}
