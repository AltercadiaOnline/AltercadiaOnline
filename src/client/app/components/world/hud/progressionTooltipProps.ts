import { buildPlayerLevelProgressionTooltip } from '../../../../../shared/progression/progressionTooltipContent.js';
import {
  resolveCharacterLevelXpBar,
  type CharacterLevelXpBarView,
} from '../../../../../shared/character/characterLevelProgression.js';
import type { PlayerProfileSnapshot } from '../../../../../shared/character/playerProfile.js';

export function buildProgressionTooltipDataAttributes(
  profile: PlayerProfileSnapshot,
  barView?: CharacterLevelXpBarView,
): Record<string, string> {
  const bar = barView ?? resolveCharacterLevelXpBar(profile.level, profile.xpCurrent);
  const payload = buildPlayerLevelProgressionTooltip(profile, bar);
  const atMax = payload.atMax || payload.threshold <= 0;

  return {
    'data-progression-tooltip': '',
    'data-progression-kind': payload.kind,
    'data-progression-title': payload.title,
    'data-progression-percent': String(Math.floor(payload.percent)),
    'data-progression-current': String(Math.floor(payload.current)),
    'data-progression-threshold': String(Math.floor(payload.threshold)),
    'data-progression-next-label': payload.nextLabel,
    ...(atMax ? { 'data-progression-at-max': 'true' } : {}),
  };
}
