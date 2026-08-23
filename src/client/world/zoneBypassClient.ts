import type {
  SubZoneTransitionId,
  TerminalInitResponse,
  TerminalSubmitResponse,
  ZoneDomainSnapshot,
} from '../../shared/types/zoneBypass.js';
import { getActionDispatcher } from '../ActionDispatcher.js';
import { applyZoneDomainSnapshot, getZoneDomainSnapshot } from './zoneBypassSyncBridge.js';

export type ZoneBypassInitListener = (
  payload: TerminalInitResponse | { readonly ok: false; readonly reason: string },
) => void;

export type ZoneBypassSubmitListener = (
  payload: TerminalSubmitResponse | { readonly ok: false; readonly reason: string },
) => void;

let initListener: ZoneBypassInitListener | null = null;
let submitListener: ZoneBypassSubmitListener | null = null;

export function onZoneBypassInit(listener: ZoneBypassInitListener | null): void {
  initListener = listener;
}

export function onZoneBypassSubmit(listener: ZoneBypassSubmitListener | null): void {
  submitListener = listener;
}

export function notifyZoneBypassInitResult(
  payload: TerminalInitResponse | { readonly ok: false; readonly reason: string },
): void {
  initListener?.(payload);
}

export function notifyZoneBypassSubmitResult(
  payload: TerminalSubmitResponse | { readonly ok: false; readonly reason: string },
): void {
  submitListener?.(payload);
  if ('success' in payload && payload.success) {
    const domain = (payload as TerminalSubmitResponse & { zoneDomain?: ZoneDomainSnapshot }).zoneDomain;
    if (domain) applyZoneDomainSnapshot(domain);
  }
}

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
