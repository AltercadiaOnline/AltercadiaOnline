/** Fim de batalha — encurta fila de log/VFX para liberar o hub pós-batalha. */
let battlePlaybackClosing = false;

/** Feedback de ação em andamento — bloqueia repintura da paleta até renderState pós-fila. */
let combatActionPlaybackActive = false;

export function setBattlePlaybackClosing(closing: boolean): void {
  battlePlaybackClosing = closing;
}

export function isBattlePlaybackClosing(): boolean {
  return battlePlaybackClosing;
}

export function setCombatActionPlaybackActive(active: boolean): void {
  combatActionPlaybackActive = active;
}

export function isCombatActionPlaybackActive(): boolean {
  return combatActionPlaybackActive;
}
