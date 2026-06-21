import type { LogServicePayload } from '../../shared/world/logServiceTypes.js';
import {
  createLogServicePayload,
  isLogServicePayload,
  SystemMessageKind,
} from '../../shared/world/logServiceTypes.js';
import { getWorldHudBridge } from '../app/bridge/worldHudBridge.js';

const MAX_LOG_LINES = 48;
const TOAST_ID = 'log-service-toast';

const pendingBuffer: LogServicePayload[] = [];
let unreadCount = 0;

function showImportantToast(message: string, variant: 'default' | 'error' = 'default'): void {
  if (typeof document === 'undefined') return;

  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement('div');
    toast.id = TOAST_ID;
    toast.className = 'log-service-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'assertive');
    document.getElementById('game-stage')?.appendChild(toast)
      ?? document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.toggle('log-service-toast--error', variant === 'error');
  toast.classList.add('log-service-toast--visible');

  window.setTimeout(() => {
    toast?.classList.remove('log-service-toast--visible', 'log-service-toast--error');
  }, 4200);
}

/** Toast visível acima de overlays de batalha/cassino — falhas de rede ou servidor. */
export function showErrorToast(message: string): void {
  showImportantToast(message, 'error');
}

function shouldToastWhileHidden(payload: LogServicePayload): boolean {
  return payload.priority === 'high' || payload.kind === SystemMessageKind.SYSTEM_NOTIFICATION;
}

/**
 * Publica no LogService (canal de sistema). Não toca no ChatGlobal.
 * Render: WorldLogServiceWidget via worldHudBridge.
 */
export function publishLogServiceMessage(payload: LogServicePayload): void {
  pendingBuffer.push(payload);
  if (pendingBuffer.length > MAX_LOG_LINES) {
    pendingBuffer.shift();
  }

  const bridge = getWorldHudBridge();
  const feedVisible = bridge.isLogPanelExpanded();
  if (!feedVisible) {
    unreadCount += 1;
    if (shouldToastWhileHidden(payload)) {
      showImportantToast(payload.message);
    }
  } else {
    unreadCount = 0;
  }
  bridge.publishLogMessage(payload);
}

export function postSystemNotification(message: string, priority: 'normal' | 'high' = 'high'): void {
  publishLogServiceMessage(createLogServicePayload(SystemMessageKind.SYSTEM_NOTIFICATION, message, priority));
}

export function postSystemTip(message: string): void {
  publishLogServiceMessage(createLogServicePayload(SystemMessageKind.SYSTEM_TIP, message, 'normal'));
}

/** @deprecated Use postSystemNotification — compat com gameChat. */
export function postGameChatMessage(message: string): void {
  postSystemNotification(message, 'normal');
}

export function handleInboundLogService(raw: unknown): void {
  if (!isLogServicePayload(raw)) return;
  publishLogServiceMessage(raw);
}

/** @deprecated React consome o buffer via worldHudBridge — no-op. */
export function flushLogServiceBuffer(): void {
  unreadCount = 0;
}

/** @deprecated Log UI montada em WorldLogServiceWidget — no-op. */
export function initLogServiceUi(): void {
  /* noop — online-react-v1 */
}

export { isLogServicePayload };
