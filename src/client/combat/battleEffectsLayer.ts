export type BattleEffectAnchorOffset = {
  readonly xFactor?: number;
  readonly yFactor?: number;
  readonly clampPadding?: number;
};

/** Lado do retrato na arena: aliado (esquerda) → HUD à direita; inimigo (direita) → HUD à esquerda. */
export type BattleEffectSide = 'ally' | 'foe';

const ALLY_PORTRAIT_SELECTOR =
  '#battle-player-portrait, #battle-pet-panel, [data-side="player"], [data-side="pet"], .battle-portrait--player';
const FOE_PORTRAIT_SELECTOR =
  '#battle-opponent-portrait, [data-side="opponent"], .battle-portrait--opponent';

export function resolveBattleEffectSide(anchor: HTMLElement): BattleEffectSide {
  if (anchor.matches(FOE_PORTRAIT_SELECTOR) || anchor.closest(FOE_PORTRAIT_SELECTOR)) {
    return 'foe';
  }
  if (anchor.matches(ALLY_PORTRAIT_SELECTOR) || anchor.closest(ALLY_PORTRAIT_SELECTOR)) {
    return 'ally';
  }
  if (anchor.closest('.battle-platform--foe, .battle-arena__foe-group')) {
    return 'foe';
  }
  return 'ally';
}

type BattleEffectSidePlacement = {
  readonly xFactor: number;
  readonly yFactor: number;
  readonly gapPx: number;
};

function resolveSidePlacement(side: BattleEffectSide, gapPx: number): BattleEffectSidePlacement {
  if (side === 'ally') {
    return { xFactor: 1, yFactor: 0.44, gapPx };
  }
  return { xFactor: 0, yFactor: 0.44, gapPx };
}

/** Ancora o HUD ao lado do retrato: jogador/pet → direita (>), inimigo → esquerda (<). */
export function applyBattleEffectSideLayout(overlay: HTMLElement, anchor: HTMLElement, gapPx = 12): BattleEffectSide {
  const side = resolveBattleEffectSide(anchor);
  overlay.classList.add(`battle-effect--${side}`);
  if (side === 'ally') {
    overlay.style.setProperty('--hit-anchor-x', `${gapPx}px`);
  } else {
    overlay.style.setProperty('--hit-anchor-x', `calc(-100% - ${gapPx}px)`);
  }
  overlay.style.setProperty('--hit-anchor-y', '-50%');
  overlay.style.transform = 'translate(var(--hit-anchor-x), var(--hit-anchor-y))';
  return side;
}

export function mountBattleEffectBesideFighter(
  overlay: HTMLElement,
  anchor: HTMLElement,
  options: { clampPadding?: number; gapPx?: number } = {},
): HTMLElement {
  const gapPx = options.gapPx ?? 12;
  const side = resolveBattleEffectSide(anchor);
  const placement = resolveSidePlacement(side, gapPx);
  const host = mountBattleEffectOnAnchor(overlay, anchor, {
    xFactor: placement.xFactor,
    yFactor: placement.yFactor,
    clampPadding: options.clampPadding ?? 10,
  });
  applyBattleEffectSideLayout(overlay, anchor, gapPx);
  return host;
}

/** Camada de VFX dentro da arena — não cortada pelo overflow do cenário. */
export function resolveBattleEffectsHost(anchor: HTMLElement): HTMLElement {
  const arena = anchor.closest('.battle-arena');
  if (arena instanceof HTMLElement) {
    const layer = arena.querySelector<HTMLElement>('[data-battle-effects-layer]');
    if (layer) return layer;
    return arena;
  }
  const combat = anchor.closest('#scene-combat');
  if (combat instanceof HTMLElement) return combat;
  return anchor.ownerDocument.body;
}

/** Mantém o overlay visível dentro da camada de efeitos (evita corte por overflow do cenário). */
export function clampBattleEffectWithinHost(
  overlay: HTMLElement,
  host: HTMLElement,
  padding = 10,
): void {
  const hostRect = host.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const hostW = hostRect.width;
  const hostH = hostRect.height;

  if (hostW <= 0 || hostH <= 0) return;
  if (overlayRect.width < 2 || overlayRect.height < 2) return;

  const visualLeft = overlayRect.left - hostRect.left;
  const visualRight = overlayRect.right - hostRect.left;
  const visualTop = overlayRect.top - hostRect.top;
  const visualBottom = overlayRect.bottom - hostRect.top;

  let deltaX = 0;
  let deltaY = 0;
  if (visualLeft < padding) deltaX = padding - visualLeft;
  else if (visualRight > hostW - padding) deltaX = (hostW - padding) - visualRight;

  if (visualTop < padding) deltaY = padding - visualTop;
  else if (visualBottom > hostH - padding) deltaY = (hostH - padding) - visualBottom;

  if (deltaX === 0 && deltaY === 0) return;

  const currentLeft = Number.parseFloat(overlay.style.left) || 0;
  const currentTop = Number.parseFloat(overlay.style.top) || 0;
  overlay.style.left = `${currentLeft + deltaX}px`;
  overlay.style.top = `${currentTop + deltaY}px`;
}

export function mountBattleEffectOnAnchor(
  overlay: HTMLElement,
  anchor: HTMLElement,
  offset: BattleEffectAnchorOffset = {},
): HTMLElement {
  const host = resolveBattleEffectsHost(anchor);
  const xFactor = offset.xFactor ?? 0.5;
  const yFactor = offset.yFactor ?? 0.22;
  const clampPadding = offset.clampPadding ?? 10;

  host.appendChild(overlay);
  overlay.style.position = 'absolute';

  const anchorRect = anchor.getBoundingClientRect();
  const hostRect = host.getBoundingClientRect();
  overlay.style.left = `${anchorRect.left - hostRect.left + anchorRect.width * xFactor}px`;
  overlay.style.top = `${anchorRect.top - hostRect.top + anchorRect.height * yFactor}px`;
  overlay.style.zIndex = '14';

  const scheduleClamp = (): void => {
    clampBattleEffectWithinHost(overlay, host, clampPadding);
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      scheduleClamp();
      requestAnimationFrame(scheduleClamp);
    });
  } else {
    scheduleClamp();
  }

  return host;
}

export type BattleHitPopMode = 'damage' | 'heal' | 'shield';

/** Número de impacto flutuante — parte do cenário, sem painel HUD. */
export function showBattleHitPop(
  anchor: HTMLElement,
  amount: number,
  mode: BattleHitPopMode = 'damage',
): void {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0 && mode === 'damage') return;

  const doc = anchor.ownerDocument;
  const pop = doc.createElement('div');
  pop.className = `battle-hit-pop battle-hit-pop--${mode}`;
  pop.setAttribute('aria-hidden', 'true');

  if (mode === 'heal') {
    pop.textContent = `+${value}`;
  } else if (mode === 'shield') {
    pop.textContent = `▲${value}`;
  } else {
    pop.textContent = `-${value}`;
  }

  mountBattleEffectBesideFighter(pop, anchor, { gapPx: 14 });

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => pop.classList.add('is-visible'));
  } else {
    pop.classList.add('is-visible');
  }

  const schedule = typeof globalThis.setTimeout === 'function' ? globalThis.setTimeout.bind(globalThis) : setTimeout;
  schedule(() => {
    pop.classList.add('is-fading');
    schedule(() => pop.remove(), 320);
  }, 920);
}
