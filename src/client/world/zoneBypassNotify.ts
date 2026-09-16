import type {
  TerminalInitResponse,
  TerminalSubmitResponse,
  ZoneDomainSnapshot,
} from '../../shared/types/zoneBypass.js';
import { applyZoneDomainSnapshot } from './zoneBypassSyncBridge.js';

export type ZoneBypassInitResult =
  | TerminalInitResponse
  | { readonly ok: false; readonly reason: string };

export type ZoneBypassInitListener = (payload: ZoneBypassInitResult) => void;

export type ZoneBypassSubmitListener = (
  payload: TerminalSubmitResponse | { readonly ok: false; readonly reason: string },
) => void;

let initListener: ZoneBypassInitListener | null = null;
let submitListener: ZoneBypassSubmitListener | null = null;
/** ACK chegou antes do bridge registrar o listener — não perde o INIT. */
let bufferedInitResult: ZoneBypassInitResult | null = null;

function applyDomainFromPayload(payload: { readonly zoneDomain?: ZoneDomainSnapshot }): void {
  if (payload.zoneDomain) applyZoneDomainSnapshot(payload.zoneDomain);
}

export function onZoneBypassInit(listener: ZoneBypassInitListener | null): void {
  initListener = listener;
  if (listener && bufferedInitResult) {
    const pending = bufferedInitResult;
    bufferedInitResult = null;
    listener(pending);
  }
}

export function onZoneBypassSubmit(listener: ZoneBypassSubmitListener | null): void {
  submitListener = listener;
}

export function notifyZoneBypassInitResult(payload: ZoneBypassInitResult): void {
  if (!('ok' in payload && payload.ok === false)) {
    applyDomainFromPayload(payload as { readonly zoneDomain?: ZoneDomainSnapshot });
  }
  if (initListener) {
    initListener(payload);
    return;
  }
  bufferedInitResult = payload;
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

/** Testes / purge de sessão. */
export function resetZoneBypassNotifyBuffer(): void {
  bufferedInitResult = null;
}
