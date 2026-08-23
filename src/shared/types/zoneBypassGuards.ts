import type { SubZoneTransitionId } from '../types/zoneBypass.js';
import { SUB_ZONE_TRANSITION_ORDER } from '../types/zoneBypass.js';

export function isSubZoneTransitionId(value: unknown): value is SubZoneTransitionId {
  return typeof value === 'string'
    && (SUB_ZONE_TRANSITION_ORDER as readonly string[]).includes(value);
}
