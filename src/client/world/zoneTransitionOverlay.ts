export const ZONE_TRANSITION_FADE_MS = 160;

const OVERLAY_ID = 'scene-transition';
const LABEL_SELECTOR = '.scene-transition__label';

let activeDepth = 0;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

function getOverlay(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(OVERLAY_ID);
}

export function showZoneTransitionOverlay(
  label = 'Atravessando zona…',
  options?: { readonly replace?: boolean },
): void {
  const overlay = getOverlay();
  if (!overlay) return;

  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }

  activeDepth = options?.replace ? 1 : activeDepth + 1;
  const labelEl = overlay.querySelector<HTMLElement>(LABEL_SELECTOR);
  if (labelEl) labelEl.textContent = label;

  overlay.classList.remove('hidden');
  overlay.classList.add('is-active');
  overlay.setAttribute('aria-hidden', 'false');
}

export function hideZoneTransitionOverlay(): void {
  activeDepth = Math.max(0, activeDepth - 1);
  if (activeDepth > 0) return;

  const overlay = getOverlay();
  if (!overlay) return;

  overlay.classList.remove('is-active');
  overlay.setAttribute('aria-hidden', 'true');

  hideTimer = setTimeout(() => {
    hideTimer = null;
    if (activeDepth > 0 || overlay.classList.contains('is-active')) return;
    overlay.classList.add('hidden');
    const labelEl = overlay.querySelector<HTMLElement>(LABEL_SELECTOR);
    if (labelEl) labelEl.textContent = 'Carregando…';
  }, ZONE_TRANSITION_FADE_MS);
}

export function forceHideZoneTransitionOverlay(): void {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
  activeDepth = 0;

  const overlay = getOverlay();
  if (!overlay) return;

  overlay.classList.remove('is-active');
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');

  const labelEl = overlay.querySelector<HTMLElement>(LABEL_SELECTOR);
  if (labelEl) labelEl.textContent = 'Carregando…';
}
