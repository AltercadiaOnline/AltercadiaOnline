import { createPetSnapshot, getPetDefinition, TREINADOR_ZENO_NPC, type PetKindId } from '../pet/petCatalog.js';
import { MAX_PETS_PER_CHARACTER } from '../pet/petRoster.js';
import { getDefaultPetColorId, isPetColorId, type PetColorId } from '../pet/petColorPalette.js';
import { getDefaultPetGenderId, isPetGenderId, type PetGenderId } from '../pet/petGender.js';
import { sanitizePetDisplayName, validatePetDisplayName } from '../pet/petNameValidation.js';

export type PetPurchaseQuote = {
  readonly kindId: PetKindId;
  readonly name: string;
  readonly priceVolts: number;
};

export type PetAdoptionInput = {
  readonly kindId: PetKindId;
  readonly name: string;
  readonly colorId: PetColorId;
  readonly gender: PetGenderId;
};

export function resolvePetPurchaseQuote(kindId: PetKindId): PetPurchaseQuote {
  const def = getPetDefinition(kindId);
  return {
    kindId,
    name: def.name,
    priceVolts: def.priceVolts,
  };
}

export function validatePetPurchase(params: {
  readonly vendorId: string;
  readonly kindId: PetKindId;
  readonly name: string;
  readonly colorId: string;
  readonly gender: string;
  readonly walletVolts: number;
  readonly ownedPetCount?: number;
}): { readonly ok: true; readonly quote: PetPurchaseQuote; readonly adoption: PetAdoptionInput }
  | { readonly ok: false; readonly reason: string } {
  if (params.vendorId !== TREINADOR_ZENO_NPC) {
    return { ok: false, reason: 'Este NPC não treina companheiros dimensionais.' };
  }

  if ((params.ownedPetCount ?? 0) >= MAX_PETS_PER_CHARACTER) {
    return {
      ok: false,
      reason: `Limite de ${MAX_PETS_PER_CHARACTER} companheiros por personagem.`,
    };
  }

  const nameResult = validatePetDisplayName(params.name);
  if (!nameResult.ok) return nameResult;

  if (!isPetColorId(params.colorId)) {
    return { ok: false, reason: 'Paleta de cor inválida.' };
  }

  if (!isPetGenderId(params.gender)) {
    return { ok: false, reason: 'Selecione Macho ou Fêmea.' };
  }

  const quote = resolvePetPurchaseQuote(params.kindId);
  if (params.walletVolts < quote.priceVolts) {
    return { ok: false, reason: 'VOLTS insuficientes para adotar este companheiro.' };
  }

  return {
    ok: true,
    quote,
    adoption: {
      kindId: params.kindId,
      name: nameResult.name,
      colorId: params.colorId,
      gender: params.gender,
    },
  };
}

export function buildAdoptedPet(adoption: PetAdoptionInput) {
  return createPetSnapshot(adoption.kindId, {
    name: adoption.name,
    colorId: adoption.colorId,
    gender: adoption.gender,
  });
}

/** @deprecated Use buildAdoptedPet with adoption input. */
export function buildAdoptedPetFromKind(kindId: PetKindId) {
  return createPetSnapshot(kindId, { colorId: getDefaultPetColorId(kindId) });
}
