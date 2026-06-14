/**
 * Ritmo de combate PvE — respiro entre ação do jogador e reação do monstro.
 * Fonte única para servidor (stagger de dispatch) e cliente (playback).
 */

/** Base do respiro pós-dano do jogador (ms) — faixa alvo 600–800. */
export const MONSTER_REACTION_DELAY_MS = 700;

/** Multiplicador de respiro (+30%) aplicado ao delay de reação da IA. */
export const MONSTER_REACTION_DELAY_MULTIPLIER = 1.3;

/** Delay efetivo entre fase do jogador e contra-ataque do monstro. */
export const MONSTER_REACTION_STAGGER_MS = Math.round(
  MONSTER_REACTION_DELAY_MS * MONSTER_REACTION_DELAY_MULTIPLIER,
);

/** Wind-up visual do monstro antes do golpe (após o stagger de rede). */
export const MONSTER_ATTACK_WINDUP_MS = 280;
