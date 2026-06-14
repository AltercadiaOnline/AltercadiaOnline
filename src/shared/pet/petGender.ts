/** Sexo do companheiro — escolhido na adoção com o Treinador Zeno. */
export type PetGenderId = 'male' | 'female';

export const PetGender = {
  Male: 'male',
  Female: 'female',
} as const;

export const PET_GENDER_ORDER: readonly PetGenderId[] = ['male', 'female'];

export const PET_GENDER_LABELS: Readonly<Record<PetGenderId, string>> = {
  male: 'Macho',
  female: 'Fêmea',
};

export function isPetGenderId(value: string): value is PetGenderId {
  return value === 'male' || value === 'female';
}

export function getDefaultPetGenderId(): PetGenderId {
  return PetGender.Male;
}

export function getPetGenderLabel(genderId: PetGenderId): string {
  return PET_GENDER_LABELS[genderId];
}

export function getPetGenderSymbol(genderId: PetGenderId): string {
  return genderId === PetGender.Female ? '♀' : '♂';
}

export function formatPetNameWithGender(pet: {
  readonly name: string;
  readonly gender: PetGenderId;
}): string {
  return `${getPetGenderSymbol(pet.gender)} ${pet.name}`;
}

export function sanitizePetGenderId(raw: unknown, fallback: PetGenderId = getDefaultPetGenderId()): PetGenderId {
  if (typeof raw === 'string' && isPetGenderId(raw)) return raw;
  return fallback;
}
