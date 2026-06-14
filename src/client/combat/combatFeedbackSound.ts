import type { CombatImpactType } from '../../shared/combat/combatIntentFeedback.js';

const SOUND_SELECTOR: Record<CombatImpactType, string> = {
  NORMAL: '#sfx-combat-hit',
  HEAVY: '#sfx-combat-hit-heavy',
  CRITICAL: '#sfx-combat-hit-critical',
  BLOCK: '#sfx-combat-block',
  HEAL: '#sfx-combat-heal',
};

/** Som do impacto — primeira etapa do pipeline (noop se elemento ausente). */
export async function playCombatImpactSound(impactType: CombatImpactType): Promise<void> {
  if (typeof document === 'undefined') return;

  const selector = SOUND_SELECTOR[impactType];
  const element = document.querySelector<HTMLAudioElement>(selector);
  if (!element) return;

  try {
    element.currentTime = 0;
    await element.play();
  } catch {
    /* autoplay policy — ignorar */
  }
}
