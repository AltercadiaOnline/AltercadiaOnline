const STORAGE_KEY = 'altercadia-visual-debug';

let enabled = readInitialFlag();
let collisionDebug = readCollisionDebugFlag();

function readInitialFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debugCreatures') === '1' || params.get('visualDebug') === '1') {
      return true;
    }
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function readCollisionDebugFlag(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('debugColliders') === '1') {
      return true;
    }
    return window.localStorage.getItem(`${STORAGE_KEY}-colliders`) === '1';
  } catch {
    return false;
  }
}

/** Modo debug visual — retângulos autoritativos no canvas (ignora sprites). */
export function isVisualDebugModeEnabled(): boolean {
  return enabled;
}

/** Overlay de colisão — tiles bloqueados, hitbox do jogador e gatilhos de portal. */
export function isCollisionDebugEnabled(): boolean {
  return collisionDebug || enabled;
}

export function setVisualDebugModeEnabled(next: boolean): void {
  enabled = next;
  if (next) {
    collisionDebug = true;
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (!next) {
        window.localStorage.setItem(`${STORAGE_KEY}-colliders`, '0');
        collisionDebug = false;
      }
    } catch {
      // ignore quota errors
    }
  }
  console.info(`[VisualDebugMode] ${next ? 'ATIVADO' : 'DESATIVADO'} — F8 (criaturas + colliders)`);
}

export function setCollisionDebugEnabled(next: boolean): void {
  collisionDebug = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${STORAGE_KEY}-colliders`, next ? '1' : '0');
    } catch {
      // ignore quota errors
    }
  }
  console.info(`[CollisionDebug] ${next ? 'ATIVADO' : 'DESATIVADO'} — F9 para alternar colliders`);
}

export function toggleCollisionDebugMode(): boolean {
  setCollisionDebugEnabled(!collisionDebug);
  return collisionDebug;
}

export function toggleVisualDebugMode(): boolean {
  setVisualDebugModeEnabled(!enabled);
  return enabled;
}

/** Registra F8 (debug geral) e F9 (somente colliders). */
export function initVisualDebugModeHotkey(): () => void {
  if (typeof window === 'undefined') return () => undefined;

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code === 'F8') {
      event.preventDefault();
      toggleVisualDebugMode();
      return;
    }
    if (event.code === 'F9') {
      event.preventDefault();
      toggleCollisionDebugMode();
    }
  };

  window.addEventListener('keydown', onKeyDown);
  if (enabled) {
    console.info('[VisualDebugMode] Ativo — F8 geral / F9 colliders');
  } else if (collisionDebug) {
    console.info('[CollisionDebug] Ativo — F9 para alternar');
  }

  return () => window.removeEventListener('keydown', onKeyDown);
}
