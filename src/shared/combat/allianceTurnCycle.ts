import type { CombatState } from '../types.js';
import {
  resolvePetAssistPlayerActionThreshold,
  shouldRunPetAssistPhase,
} from '../pet/petCombatScaling.js';

export function getPetAssistCycleIndex(state: CombatState): number {
  return Math.max(0, Math.floor(state.petAssistCycleIndex ?? 0));
}

export function getAlliancePlayerTurnsSincePet(state: CombatState): number {
  return Math.max(0, Math.floor(state.alliancePlayerTurnsSincePet ?? 0));
}

/** Quantas jogadas do jogador faltam até o pet agir (0 = pet nesta resolução, se o servidor disparar). */
export function resolvePlayerTurnsUntilPetAssist(state: CombatState): number {
  const threshold = resolvePetAssistPlayerActionThreshold(getPetAssistCycleIndex(state));
  const since = getAlliancePlayerTurnsSincePet(state);
  return Math.max(0, threshold - since);
}

/**
 * Pet coadjuvante: após N ações do jogador (cada uma com reação inimiga), o servidor
 * injeta o turno do pet. N sobe ao longo da luta: 3 → 4 → 5 → 6 → 8.
 */
export function shouldRunPetAlliancePhase(state: CombatState): boolean {
  const threshold = resolvePetAssistPlayerActionThreshold(getPetAssistCycleIndex(state));
  const nextCount = getAlliancePlayerTurnsSincePet(state) + 1;
  return shouldRunPetAssistPhase(nextCount, threshold);
}

export function createInitialPetAllianceState(): Pick<
  CombatState,
  'petAssistCycleIndex' | 'alliancePlayerTurnsSincePet'
> {
  return {
    petAssistCycleIndex: 0,
    alliancePlayerTurnsSincePet: 0,
  };
}

/** @deprecated Slots 0|1|2 — mantido só para leitura legada em testes antigos. */
export function getAllianceTurnCounter(state: CombatState): 0 | 1 | 2 {
  const since = getAlliancePlayerTurnsSincePet(state);
  if (since <= 0) return 0;
  if (since === 1) return 1;
  return 2;
}

/** @deprecated Jogador pode agir em todo CHOOSING; pet é raro via shouldRunPetAlliancePhase. */
export function isPlayerAllianceSlot(_counter: number): boolean {
  return true;
}
