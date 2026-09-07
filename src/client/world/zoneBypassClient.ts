import type {
  SubZoneTransitionId,
  ZoneDomainSnapshot,
} from '../../shared/types/zoneBypass.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { getZoneDomainSnapshot } from './zoneBypassSyncBridge.js';
import {
  notifyZoneBypassInitResult,
  notifyZoneBypassSubmitResult,
  onZoneBypassInit,
  onZoneBypassSubmit,
  type ZoneBypassInitListener,
  type ZoneBypassSubmitListener,
} from './zoneBypassNotify.js';

export type { ZoneBypassInitListener, ZoneBypassSubmitListener };
export {
  notifyZoneBypassInitResult,
  notifyZoneBypassSubmitResult,
  onZoneBypassInit,
  onZoneBypassSubmit,
};

export function readZoneDomainSnapshot(
  boundTransitionId?: SubZoneTransitionId,
): ZoneDomainSnapshot | null {
  return getZoneDomainSnapshot(boundTransitionId);
}

export function requestZoneBypassInit(transitionId: SubZoneTransitionId): boolean {
  const result = getActionDispatcher().dispatch({
    type: 'ZONE_BYPASS_INIT',
    payload: { transitionId },
  });
  return result.ok;
}

export function requestZoneBypassSubmit(sessionId: string, inputCode: string): boolean {
  const result = getActionDispatcher().dispatch({
    type: 'ZONE_BYPASS_SUBMIT',
    payload: { sessionId, inputCode },
  });
  return result.ok;
}
