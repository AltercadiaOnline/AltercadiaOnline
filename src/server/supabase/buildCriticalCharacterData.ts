import { exportCharacterEconomyPersistence } from '../../Economy/economyStore.js';
import { getAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import type { CriticalCharacterData } from './persistenceManagerTypes.js';

/** Monta payload HIGH_PRIORITY a partir do estado autoritativo em memória. */
export function buildCriticalCharacterDataFromRuntime(
  playerId: string,
  characterId: number,
): CriticalCharacterData {
  const economy = exportCharacterEconomyPersistence(playerId, characterId);
  const progression = getAuthoritativeProgression(playerId, characterId);

  return {
    level: progression.characterProfile.level,
    xpCurrent: progression.characterProfile.xpCurrent,
    quests: {},
    ...(progression.characterProfile.displayName
      ? { displayName: progression.characterProfile.displayName }
      : {}),
    inventory: {
      stacks: economy.profile.inventory.map((row) => ({ ...row })),
      equipped: { ...economy.profile.equipped },
    },
    currency: {
      dollarVolt: economy.wallet.dollarVolt,
      alterCoins: economy.wallet.alterCoins,
    },
  };
}
