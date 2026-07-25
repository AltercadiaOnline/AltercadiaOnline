import {
  purgeAuthoritativeCharacterEconomy,
  resetAuthoritativePlayerEconomyToEmpty,
} from '../../Economy/economyStore.js';
import { clearPetAffinityForCharacter } from '../../Economy/petAffinityStore.js';
import { clearPetRosterForCharacter } from '../../Economy/petRosterStore.js';
import { clearOwnedSkinsForCharacter } from '../../Economy/skinOwnershipStore.js';
import { clearMarketplaceForCharacter } from '../../Economy/marketplaceStore.js';
import { clearAuthoritativeProgression } from '../progression/authoritativeProgressionStore.js';
import { clearWorldProfile } from '../world/worldProfileStore.js';

/**
 * Limpa estado autoritativo em RAM do personagem.
 * characterId é identidade estável — delete não reusa o ID, mas a RAM do processo ainda precisa limpar.
 */
export function purgeCharacterRuntimeState(playerId: string, characterId: number): void {
  purgeAuthoritativeCharacterEconomy(playerId, characterId);
  clearPetRosterForCharacter(playerId, characterId);
  clearPetAffinityForCharacter(playerId, characterId);
  clearOwnedSkinsForCharacter(playerId, characterId);
  clearMarketplaceForCharacter(playerId, characterId);
  clearWorldProfile(playerId, characterId);
  clearAuthoritativeProgression(playerId, characterId);
}

/** Personagem recém-criado: força economia zerada (defesa contra reuso de slot). */
export function resetNewCharacterEconomy(playerId: string, characterId: number): void {
  resetAuthoritativePlayerEconomyToEmpty(playerId, characterId);
  clearPetRosterForCharacter(playerId, characterId);
  clearPetAffinityForCharacter(playerId, characterId);
  clearMarketplaceForCharacter(playerId, characterId);
  clearWorldProfile(playerId, characterId);
}
