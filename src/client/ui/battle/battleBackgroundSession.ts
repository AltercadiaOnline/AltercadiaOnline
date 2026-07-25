/**
 * Sessão de fundo de batalha — contador local de batalhas PVE iniciadas.
 *
 * Persistência leve em localStorage (só cosmética — não é estado autoritativo):
 * a cada BATTLE_BACKGROUND_ROTATION_EVERY batalhas o fundo troca de variante.
 */
import {
  resolveCity1BattleBackground,
  type BattleBackgroundVariant,
} from '../../../shared/combat/city1BattleBackgroundCatalog.js';

const STORAGE_KEY = 'altercadia.battleBackgroundCount.v1';

function readBattleCount(): number {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    const parsed = raw === null || raw === undefined ? 0 : Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeBattleCount(count: number): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, String(count));
  } catch {
    // Sem storage (SSR/teste) — rotação segue só em memória via fallback 0.
  }
}

/** Consome uma batalha do contador e devolve a variante de fundo desta luta. */
export function consumeBattleBackgroundVariant(): BattleBackgroundVariant {
  const count = readBattleCount();
  writeBattleCount(count + 1);
  return resolveCity1BattleBackground(count);
}

/**
 * Aplica a variante ao elemento `[data-battle-background]` como CSS multi-background.
 * Camadas do catálogo vêm back → front; CSS pinta a primeira listada por cima → inverter.
 */
export function applyBattleBackgroundToElement(
  target: HTMLElement,
  variant: BattleBackgroundVariant,
): void {
  target.dataset.battleBackgroundId = variant.id;
  const stack = [...variant.layers]
    .reverse()
    .map((url) => `url("${encodeURI(url)}")`)
    .join(', ');
  target.style.backgroundImage = stack;
}
