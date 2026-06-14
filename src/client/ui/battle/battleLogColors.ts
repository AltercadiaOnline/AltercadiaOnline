/** Cores do BATTLE_LOG por emissor da ação. */
export const LOG_COLORS = {
  PLAYER: '#3498db',
  ENEMY: '#e74c3c',
  SYSTEM: '#f1c40f',
} as const;

export type BattleLogEmitter = keyof typeof LOG_COLORS;

export const BATTLE_LOG_EMITTER_CLASS: Record<Lowercase<BattleLogEmitter>, string> = {
  player: 'battle-log__message--player',
  enemy: 'battle-log__message--enemy',
  system: 'battle-log__message--system',
};

export function battleLogEmitterCssVar(emitter: Lowercase<BattleLogEmitter>): string {
  return `--battle-log-${emitter}`;
}

/** Injeta tokens no container do log (usado pelo tema CSS). */
export function applyBattleLogColorTokens(root: HTMLElement): void {
  root.style.setProperty(battleLogEmitterCssVar('player'), LOG_COLORS.PLAYER);
  root.style.setProperty(battleLogEmitterCssVar('enemy'), LOG_COLORS.ENEMY);
  root.style.setProperty(battleLogEmitterCssVar('system'), LOG_COLORS.SYSTEM);
}
