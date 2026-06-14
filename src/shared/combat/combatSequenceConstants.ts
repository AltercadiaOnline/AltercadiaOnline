/** Ritmo global da fila de combate (0.7 ≈ 30% mais rápido que o baseline original). */
const COMBAT_PLAYBACK_SPEED = 0.7;

function combatMs(base: number): number {
  return Math.max(0, Math.round(base * COMBAT_PLAYBACK_SPEED));
}

/** Intervalo entre eventos animados na fila de combate (ms). */
export const COMBAT_EVENT_GAP_MS = combatMs(800);

/** Pausa após DAMAGE_DEALT antes do próximo evento (ms). */
export const COMBAT_DAMAGE_EVENT_GAP_MS = combatMs(420);

/** Duração do flash/impacto em retratos side-view (ms). */
export const COMBAT_HIT_ANIM_MS = combatMs(320);

/** Windup do atacante antes do impacto visual (ms). */
export const COMBAT_ATTACK_WINDUP_MS = combatMs(300);

/** Windup curto quando SKILL_USED já posicionou o atacante (ms). */
export const COMBAT_ATTACK_WINDUP_AFTER_SKILL_MS = combatMs(90);

/** Confirmação visual imediata após escolha no moveset (ms). */
export const COMBAT_SKILL_COMMIT_MS = combatMs(130);

/** Pausa entre impacto (pop + shake) e queda da barra de HP (ms). */
export const COMBAT_HIT_IMPACT_HOLD_MS = combatMs(120);

/** Espera máxima pela fila de VFX antes de exibir o hub pós-batalha (ms). */
export const COMBAT_POST_BATTLE_HUB_WAIT_MS = combatMs(2800);

/** Duração da animação suave da barra de HP (ms). */
export const COMBAT_HP_ANIM_MS = combatMs(460);

/** Barra de HP no encerramento da fila (playback closing). */
export const COMBAT_HP_ANIM_CLOSING_MS = combatMs(80);

/** Teto de pausa em COMBAT_LOG durante a fila. */
export const COMBAT_HIT_ANIM_LOG_CAP_MS = combatMs(120);

/** Golpe bloqueado / sem dano visível. */
export const COMBAT_HIT_ANIM_BLOCK_MS = combatMs(100);

/** Retrato em status defensivo (tick/applied). */
export const COMBAT_STATUS_PORTRAIT_MS = combatMs(280);

/** Retrato em status ofensivo (applied rápido). */
export const COMBAT_STATUS_PORTRAIT_FAST_MS = combatMs(220);

/** Eventos de UI/snapshot — sem pausa entre eles na fila. */
export const COMBAT_INSTANT_EVENT_GAP_MS = 0;

/** Fator exportado para CSS/telemetria (opcional). */
export const COMBAT_PLAYBACK_SPEED_FACTOR = COMBAT_PLAYBACK_SPEED;
