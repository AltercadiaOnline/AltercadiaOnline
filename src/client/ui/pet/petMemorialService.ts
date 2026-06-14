import type { PetSnapshot } from '../../../shared/pet/petModel.js';
import {
  createMemorialEntryFromPet,
  type MemorialEntry,
} from '../../../shared/pet/petMemorial.js';
import { getInheritanceTokenDefinition } from '../../../shared/pet/petInheritance.js';
import { getPetMemorialStore } from './petMemorialStore.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

export type PetDeathMemorialResult = {
  readonly memorial: MemorialEntry;
  readonly inheritanceTokenId: MemorialEntry['inheritanceTokenId'];
};

/** Registra memorial, emite eventos e solicita token de herança no inventário. */
export function processPetDeathMemorial(
  pet: PetSnapshot,
  deathDateMs = Date.now(),
): PetDeathMemorialResult {
  const memorial = createMemorialEntryFromPet(pet, deathDateMs);
  getPetMemorialStore().append(memorial);

  if (memorial.inheritanceTokenId) {
    const tokenDef = getInheritanceTokenDefinition(memorial.inheritanceTokenId);
    uiEvents.emit(UIEventType.PET_INHERITANCE_GRANTED, {
      memorialId: memorial.memorialId,
      tokenId: memorial.inheritanceTokenId,
      tokenName: tokenDef.name,
      preservedSkillId: memorial.preservedSkillId,
    });
  }

  return {
    memorial,
    inheritanceTokenId: memorial.inheritanceTokenId,
  };
}
