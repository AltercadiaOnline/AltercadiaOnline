import { postGameChatMessage } from '../ui/gameChat.js';
import type { CharacterXpSource } from '../../shared/character/characterLevelTypes.js';

export type LevelUpFeedbackPayload = {
  readonly previousLevel: number;
  readonly newLevel: number;
  readonly levelsGained: number;
  readonly source: CharacterXpSource;
};

function resolveLevelUpMessage(payload: LevelUpFeedbackPayload): string {
  if (payload.levelsGained > 1) {
    return `Subiu para o nível ${payload.newLevel}! (+${payload.levelsGained} níveis)`;
  }
  return `Subiu para o nível ${payload.newLevel}!`;
}

/** SFX opcional — elemento `#sfx-level-up` no DOM, se existir. */
function playLevelUpSound(): void {
  const el = document.querySelector<HTMLAudioElement>('#sfx-level-up');
  if (!el) return;
  el.currentTime = 0;
  void el.play().catch(() => undefined);
}

/** Feedback de exploração/HUD ao subir de nível. */
export function triggerLevelUpFeedback(payload: LevelUpFeedbackPayload): void {
  postGameChatMessage(resolveLevelUpMessage(payload));
  playLevelUpSound();
  document.body.classList.add('level-up-flash');
  window.setTimeout(() => {
    document.body.classList.remove('level-up-flash');
  }, 650);
}
