export type PauseMenuOptions = {
  onExit: () => void;
  onSettings?: () => void;
};

export function setupPauseMenu(options: PauseMenuOptions): void {
  const menu = document.getElementById('pause-menu');
  const settingsBtn = document.getElementById('btn-pause-settings');
  const exitBtn = document.getElementById('btn-pause-exit');

  if (!menu || !settingsBtn || !exitBtn) {
    console.warn('[PauseMenu] Elementos do menu de pausa ausentes.');
    return;
  }

  settingsBtn.addEventListener('click', () => {
    if (options.onSettings) {
      options.onSettings();
      return;
    }
    window.alert('Configurações em breve.');
  });

  exitBtn.addEventListener('click', () => {
    hidePauseMenu();
    options.onExit();
  });
}

export function togglePauseMenu(): void {
  document.getElementById('pause-menu')?.classList.toggle('hidden');
}

export function showPauseMenu(): void {
  const menu = document.getElementById('pause-menu');
  if (!menu) return;
  menu.classList.remove('hidden');
  menu.setAttribute('aria-hidden', 'false');
}

export function hidePauseMenu(): void {
  const menu = document.getElementById('pause-menu');
  if (!menu) return;
  menu.classList.add('hidden');
  menu.setAttribute('aria-hidden', 'true');
}

export function isPauseMenuOpen(): boolean {
  const menu = document.getElementById('pause-menu');
  return menu !== null && !menu.classList.contains('hidden');
}

let worldSessionActive = false;

/** Sessão de mundo ativa (após entrar no mapa até logout). */
export function setWorldSessionActive(active: boolean): void {
  worldSessionActive = active;
}

export function isWorldSessionActive(): boolean {
  return worldSessionActive;
}

export function isInActiveGameSession(): boolean {
  if (!worldSessionActive) return false;

  const gameContainer = document.getElementById('game-container');
  if (!gameContainer) return false;

  return gameContainer.style.display !== 'none';
}

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement
    || target instanceof HTMLTextAreaElement
    || (target instanceof HTMLElement && target.isContentEditable)
  );
}

