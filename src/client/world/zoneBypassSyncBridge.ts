import type { SubZoneTransitionId, ZoneDomainSnapshot } from '../../shared/types/zoneBypass.js';
import { isSubZoneTransitionId } from '../../shared/types/zoneBypassGuards.js';

let latestSnapshot: ZoneDomainSnapshot | null = null;

export function applyZoneDomainSnapshot(snapshot: ZoneDomainSnapshot): void {
  latestSnapshot = snapshot;
}

export function getZoneDomainSnapshot(
  boundTransitionId?: SubZoneTransitionId,
): ZoneDomainSnapshot | null {
  if (!latestSnapshot) return null;
  if (!boundTransitionId) return latestSnapshot;
  const boundLane = latestSnapshot.lanes.find((lane) => lane.transitionId === boundTransitionId) ?? null;
  const nextAtTerminal =
    boundLane && !boundLane.unlocked ? boundLane.transitionId : null;
  return {
    ...latestSnapshot,
    nextTransitionId: nextAtTerminal ?? (boundTransitionId ? null : latestSnapshot.nextTransitionId),
  };
}

export function parseZoneDomainSnapshot(raw: unknown): ZoneDomainSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (!Array.isArray(record.lanes) || !Array.isArray(record.unlockedZones)) return null;
  const lanes = record.lanes.filter((lane) => {
    if (!lane || typeof lane !== 'object') return false;
    const row = lane as Record<string, unknown>;
    return isSubZoneTransitionId(row.transitionId)
      && typeof row.fromZone === 'string'
      && typeof row.toZone === 'string'
      && typeof row.unlocked === 'boolean';
  });
  if (lanes.length === 0) return null;
  return raw as ZoneDomainSnapshot;
}

export function resetZoneBypassSyncBridge(): void {
  latestSnapshot = null;
}
