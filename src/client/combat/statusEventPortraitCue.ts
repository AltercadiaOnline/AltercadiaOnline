/** Placeholder visual até sprites finais de status. */
const STATUS_PLACEHOLDER_ICON: Readonly<Record<string, string>> = {
  BURN: '🔥',
  PARALYZE: '⚡',
  CONFUSE: '💫',
  DELAYED_DETONATION: '💣',
  HEAL_ECHO: '💚',
  ATTACK_ECHO: '⚔',
  THORNS: '🌵',
  STATUS_IMMUNITY: '🛡',
  VULNERABLE: '⬇',
  LOCK_ENEMY_MOVES: '🔒',
  MOVESET_WEAKEN: '↓',
  RETALIATION_CHARGE: '💢',
  MARCO_CC_IMMUNE: '✦',
};

const CUE_MS = 1200;

/** Flash temporário no portrait quando o motor emite STATUS_EVENT. */
export function flashStatusPortraitCue(
  portrait: HTMLElement,
  statusId: string,
  message: string,
): void {
  portrait.querySelector('.battle-status-event-cue')?.remove();

  const cue = portrait.ownerDocument.createElement('div');
  cue.className = 'battle-status-event-cue';
  cue.dataset.statusId = statusId;
  cue.title = message;
  cue.setAttribute('aria-label', message);
  cue.textContent = STATUS_PLACEHOLDER_ICON[statusId] ?? '◎';
  portrait.appendChild(cue);
  portrait.classList.add('battle-portrait--status-event');

  window.setTimeout(() => {
    cue.remove();
    if (!portrait.querySelector('.battle-status-event-cue')) {
      portrait.classList.remove('battle-portrait--status-event');
    }
  }, CUE_MS);
}
