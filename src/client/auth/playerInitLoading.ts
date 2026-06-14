const OVERLAY_ID = 'player-init-loading';

export function showPlayerInitLoading(message = 'Carregando perfil no servidor…'): void {
  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.className = 'player-init-loading';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.innerHTML = `
      <div class="player-init-loading__panel">
        <div class="player-init-loading__spinner" aria-hidden="true"></div>
        <p class="player-init-loading__message" data-init-loading-message></p>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const messageEl = overlay.querySelector('[data-init-loading-message]');
  if (messageEl) messageEl.textContent = message;
  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-busy', 'true');
}

export function updatePlayerInitLoadingMessage(message: string): void {
  const overlay = document.getElementById(OVERLAY_ID);
  const messageEl = overlay?.querySelector('[data-init-loading-message]');
  if (messageEl) messageEl.textContent = message;
}

export function hidePlayerInitLoading(): void {
  const overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.removeAttribute('aria-busy');
}

export function isPlayerInitLoadingVisible(): boolean {
  const overlay = document.getElementById(OVERLAY_ID);
  return Boolean(overlay && !overlay.classList.contains('hidden'));
}
