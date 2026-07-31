export type BattleEffectSide = 'ally' | 'foe';

export type BattleHitHudKind = 'math' | 'pop' | 'heal';

const ALLY_PORTRAIT_SELECTOR =
  '#battle-player-portrait, #battle-pet-panel, [data-side="player"], [data-side="pet"], .battle-portrait--player';
const FOE_PORTRAIT_SELECTOR =
  '#battle-opponent-portrait, [data-side="opponent"], .battle-portrait--opponent';
const EFFECTS_LAYER_SELECTOR = '[data-battle-effects-layer]';
const ARENA_SELECTOR = '.battle-arena';

/** Math um pouco acima do peito; pop/heal na altura do ombro. */
const ZONE_TOP_PCT: Record<BattleHitHudKind, number> = {
  math: 24,
  pop: 38,
  heal: 34,
};
const ZONE_STACK_LIFT_PCT: Record<BattleHitHudKind, number> = {
  math: 12,
  pop: 8,
  heal: 8,
};
const ZONE_TOP_MAX_PCT = 62;

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

/** Quem RECEBE o efeito (dano/cura): monstro = foe; player/pet = ally. */
export function resolveBattleReceiverHudSide(targetId: string): BattleEffectSide {
  if (targetId.startsWith('enemy_') || targetId.startsWith('mirror_')) return 'foe';
  return 'ally';
}

/** Quem RECEBE o dano de um golpe: monstro→player = ally; player→monstro = foe. */
export function resolveBattleHitHudSide(input: {
  readonly sourceId: string;
  readonly targetId: string;
}): BattleEffectSide {
  return resolveBattleReceiverHudSide(input.targetId);
}

export function resolveBattleEffectsHost(doc: Document = document): HTMLElement {
  const layer = doc.querySelector<HTMLElement>(EFFECTS_LAYER_SELECTOR);
  if (layer) return layer;
  const arena = doc.querySelector<HTMLElement>(ARENA_SELECTOR);
  if (arena) return arena;
  return doc.body;
}

function countActiveZoneHuds(doc: Document, side: BattleEffectSide, kind: BattleHitHudKind): number {
  return doc.querySelectorAll(
    `.battle-hit-hud--${side}.battle-hit-hud--${kind}:not(.is-fading)`,
  ).length;
}

/**
 * Camada livre acima da cena — zonas fixas da arena 640×360.
 * Ally = terço esquerdo; foe = terço direito (âncora por `right`).
 */
export function mountBattleHitHudInZone(
  overlay: HTMLElement,
  side: BattleEffectSide,
  kind: BattleHitHudKind = 'math',
): HTMLElement {
  const doc = overlay.ownerDocument;
  const host = resolveBattleEffectsHost(doc);
  const stack = countActiveZoneHuds(doc, side, kind);

  overlay.classList.add(
    `battle-effect--${side}`,
    `battle-hit-hud--${side}`,
    `battle-hit-hud--${kind}`,
    'battle-hit-hud-zone',
  );

  host.appendChild(overlay);
  overlay.style.position = 'absolute';
  overlay.style.zIndex = kind === 'math' ? '46' : '45';
  overlay.style.pointerEvents = 'none';
  overlay.style.margin = '0';
  overlay.style.transform = 'none';

  const topPct = Math.min(ZONE_TOP_PCT[kind] + stack * ZONE_STACK_LIFT_PCT[kind], ZONE_TOP_MAX_PCT);
  overlay.style.top = `${topPct}%`;

  if (side === 'ally') {
    overlay.style.left = kind === 'math' ? '18%' : '16%';
    overlay.style.right = 'auto';
    overlay.style.textAlign = 'left';
  } else {
    overlay.style.left = 'auto';
    overlay.style.right = kind === 'math' ? '18%' : '16%';
    overlay.style.textAlign = 'right';
  }

  return host;
}

export type BattleHitPopMode = 'damage' | 'heal' | 'shield';

export function showBattleHitPop(
  sideOrAnchor: BattleEffectSide | HTMLElement,
  amount: number,
  mode: BattleHitPopMode = 'damage',
): void {
  const value = Math.max(0, Math.round(amount));
  if (value <= 0 && mode === 'damage') return;

  const side: BattleEffectSide =
    typeof sideOrAnchor === 'string'
      ? sideOrAnchor
      : resolveBattleEffectSide(sideOrAnchor);

  const doc = typeof document !== 'undefined' ? document : null;
  if (!doc) return;

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

  mountBattleHitHudInZone(pop, side, mode === 'heal' ? 'heal' : 'pop');

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => pop.classList.add('is-visible'));
  } else {
    pop.classList.add('is-visible');
  }

  const schedule = typeof globalThis.setTimeout === 'function'
    ? globalThis.setTimeout.bind(globalThis)
    : setTimeout;
  schedule(() => {
    pop.classList.add('is-fading');
    schedule(() => pop.remove(), 320);
  }, 920);
}
