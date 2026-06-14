import type { MarcoProgressTriggerId } from './marcoProgressCatalog.js';
import {
  MARCO_PROGRESS_MAX_EVENTS_PER_TRIGGER,
  resolveMarcoNodesForTrigger,
} from './marcoProgressCatalog.js';
import {
  ensureMarcoNodeProgressEntry,
  getMarcoNodeProgress,
  resolveMarcoNodeProgressFromTotalXp,
  totalXpFromMarcoNodeProgress,
  type MarcosNodeProgressionData,
} from './marcoProgression.js';

export type MarcoProgressEvent = {
  readonly trigger: MarcoProgressTriggerId;
  readonly count: number;
};

export type ApplyMarcoProgressResult = {
  readonly progression: MarcosNodeProgressionData;
  readonly levelUps: readonly string[];
  readonly xpGainedByNode: Readonly<Record<string, number>>;
};

export function applyMarcoProgressEvents(
  progression: MarcosNodeProgressionData,
  activeMarcos: readonly string[],
  events: readonly MarcoProgressEvent[],
): ApplyMarcoProgressResult {
  let next = progression;
  const levelUps: string[] = [];
  const xpGainedByNode: Record<string, number> = {};

  for (const event of events) {
    const count = Math.max(0, Math.min(Math.floor(event.count), MARCO_PROGRESS_MAX_EVENTS_PER_TRIGGER));
    if (count <= 0) continue;

    const rules = resolveMarcoNodesForTrigger(event.trigger, activeMarcos);
    for (const rule of rules) {
      next = ensureMarcoNodeProgressEntry(next, rule.nodeId);
      const before = getMarcoNodeProgress(next, rule.nodeId);
      if (before.level >= rule.maxLevel) continue;

      const gained = count * rule.xpPerEvent;
      xpGainedByNode[rule.nodeId] = (xpGainedByNode[rule.nodeId] ?? 0) + gained;

      const totalXp = totalXpFromMarcoNodeProgress(before) + gained;
      const after = resolveMarcoNodeProgressFromTotalXp(rule.nodeId, totalXp, rule.maxLevel);

      next = {
        byNodeId: {
          ...next.byNodeId,
          [rule.nodeId]: after,
        },
      };

      if (after.level > before.level) {
        levelUps.push(rule.nodeId);
      }
    }
  }

  return { progression: next, levelUps, xpGainedByNode };
}
