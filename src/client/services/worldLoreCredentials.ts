import { AppScreens } from '../browser/appScreens.js';

export function resolveWorldLoreCredentials(): {
  readonly playerId: string;
  readonly characterId: number;
} {
  const sessionId = AppScreens.currentSession?.id ?? 'local-player';
  const character = AppScreens.getSelectedCharacter();

  return {
    playerId: sessionId,
    characterId: character?.id ?? 1,
  };
}
