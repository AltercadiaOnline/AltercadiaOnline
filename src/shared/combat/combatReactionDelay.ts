import { MONSTER_REACTION_STAGGER_MS } from './CombatConfig.js';

/** Pausa assíncrona entre fase do jogador e reação do monstro (CombatWsHub). */
export function combatReactionStaggerDelay(
  ms: number = MONSTER_REACTION_STAGGER_MS,
): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
