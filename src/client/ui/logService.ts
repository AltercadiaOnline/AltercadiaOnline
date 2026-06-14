import type { LogServicePayload } from '../../shared/world/logServiceTypes.js';
import {
  createLogServicePayload,
  isLogServicePayload,
  SystemMessageKind,
} from '../../shared/world/logServiceTypes.js';

const LOG_FEED_ID = 'log-service';
const LOG_PANEL_ID = 'log-service-panel';
const LOG_TOGGLE_ID = 'log-service-toggle';
const TOAST_ID = 'log-service-toast';
const MAX_LOG_LINES = 48;

const pendingBuffer: LogServicePayload[] = [];
let unreadCount = 0;

function getLogFeed(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(LOG_FEED_ID);
}

function getLogPanel(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(LOG_PANEL_ID);
}

function isLogPanelCollapsed(): boolean {
  const panel = getLogPanel();
  return panel?.classList.contains('log-service-panel--collapsed') ?? false;
}

function isLogFeedVisible(): boolean {
  const feed = getLogFeed();
  if (!feed) return false;
  if (isLogPanelCollapsed()) return false;
  return feed.offsetParent !== null;
}

function kindLabel(kind: LogServicePayload['kind']): string {
  return kind === SystemMessageKind.SYSTEM_TIP ? 'Dica' : 'Sistema';
}

function renderLogLine(payload: LogServicePayload): void {
  const feed = getLogFeed();
  if (!feed) return;

  const line = document.createElement('p');
  line.className = `log-service__line log-service__line--${payload.kind === SystemMessageKind.SYSTEM_TIP ? 'tip' : 'notify'}`;
  line.dataset.kind = payload.kind;
  line.textContent = `[${kindLabel(payload.kind)}] ${payload.message}`;
  feed.appendChild(line);

  while (feed.children.length > MAX_LOG_LINES) {
    feed.firstChild?.remove();
  }

  feed.scrollTop = feed.scrollHeight;
}

function updateUnreadBadge(): void {
  const toggle = document.getElementById(LOG_TOGGLE_ID);
  if (!toggle) return;
  if (unreadCount <= 0) {
    toggle.removeAttribute('data-unread');
    return;
  }
  toggle.setAttribute('data-unread', String(unreadCount));
}

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
 */
export function publishLogServiceMessage(payload: LogServicePayload): void {
  pendingBuffer.push(payload);
  if (pendingBuffer.length > MAX_LOG_LINES) {
    pendingBuffer.shift();
  }

  if (!isLogFeedVisible()) {
    unreadCount += 1;
    updateUnreadBadge();
    if (shouldToastWhileHidden(payload)) {
      showImportantToast(payload.message);
    }
  } else {
    unreadCount = 0;
    updateUnreadBadge();
  }

  renderLogLine(payload);
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

export function flushLogServiceBuffer(): void {
  if (!isLogFeedVisible()) return;
  unreadCount = 0;
  updateUnreadBadge();
  const feed = getLogFeed();
  if (!feed || feed.childElementCount > 0) return;
  for (const entry of pendingBuffer) {
    renderLogLine(entry);
  }
}

export function initLogServiceUi(): void {
  if (typeof document === 'undefined') return;

  const toggle = document.getElementById(LOG_TOGGLE_ID);
  const panel = getLogPanel();
  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('log-service-panel--collapsed');
    toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggle.textContent = collapsed ? '+' : '−';
    if (!collapsed) {
      flushLogServiceBuffer();
    }
  });

  flushLogServiceBuffer();
}

export { isLogServicePayload };
