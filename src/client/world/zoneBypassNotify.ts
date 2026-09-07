import type {
  TerminalInitResponse,
  TerminalSubmitResponse,
  ZoneDomainSnapshot,
} from '../../shared/types/zoneBypass.js';
import { applyZoneDomainSnapshot } from './zoneBypassSyncBridge.js';

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
