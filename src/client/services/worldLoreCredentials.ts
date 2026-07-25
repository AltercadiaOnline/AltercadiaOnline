import { AppScreens } from '../browser/appScreens.js';
import { getGameStore } from '../state/GameStore.js';

/**
 * Credenciais do personagem ativo — nunca assume characterId=1 (slot legado).
 */
export function resolveWorldLoreCredentials(): {
  readonly playerId: string;
  readonly characterId: number;
} {
  const sessionId = AppScreens.currentSession?.id ?? 'local-player';
  const selected = AppScreens.getSelectedCharacter();
  const fromStore = getGameStore().getActiveCharacterId();
  const characterId = selected?.id ?? fromStore;

  if (characterId === null || characterId === undefined || !Number.isInteger(characterId) || characterId < 1) {
    throw new Error('Nenhum personagem ativo — selecione um personagem antes de continuar.');
  }

  return {
    playerId: sessionId,
    characterId,
  };
}
