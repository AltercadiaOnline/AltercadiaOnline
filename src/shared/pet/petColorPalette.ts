import type { PetKindId } from './petCatalog.js';

/** Paletas urbanas/techwear disponíveis na adoção. */
export type PetColorId = 'slate' | 'amber' | 'violet' | 'neon';

export type PetColorPalette = {
  readonly id: PetColorId;
  readonly label: string;
  readonly fur: string;
  readonly accent: string;
  readonly eye: string;
  readonly tag: string;
  readonly led: string;
};

export const PET_COLOR_PALETTES: Readonly<Record<PetColorId, PetColorPalette>> = {
  slate: {
    id: 'slate',
    label: 'Ardósia',
    fur: '#3d4f5f',
    accent: '#5a6d7a',
    eye: '#9bb4c9',
    tag: '#7ef9d8',
    led: '#5efcff',
  },
  amber: {
    id: 'amber',
    label: 'Âmbar',
    fur: '#4a4038',
    accent: '#6d5d4d',
    eye: '#c9b8a8',
    tag: '#ffd59a',
    led: '#ffb347',
  },
  violet: {
    id: 'violet',
    label: 'Violeta',
    fur: '#4a3d5c',
    accent: '#6b5a82',
    eye: '#c4a8e8',
    tag: '#d4b8ff',
    led: '#b388ff',
  },
  neon: {
    id: 'neon',
    label: 'Neon',
    fur: '#1f3d3a',
    accent: '#2d5a54',
    eye: '#7ef9d8',
    tag: '#5efcff',
    led: '#00ffc8',
  },
};

export const PET_COLOR_ORDER: readonly PetColorId[] = [
  'slate',
  'amber',
  'violet',
  'neon',
];

export function isPetColorId(value: string): value is PetColorId {
  return value in PET_COLOR_PALETTES;
}

export function getPetColorPalette(colorId: PetColorId): PetColorPalette {
  return PET_COLOR_PALETTES[colorId];
}

export function getDefaultPetColorId(kindId: PetKindId): PetColorId {
  return kindId === 'dimensional_dog' ? 'amber' : 'slate';
}

export function sanitizePetColorId(raw: unknown, fallback: PetColorId): PetColorId {
  if (typeof raw === 'string' && isPetColorId(raw)) return raw;
  return fallback;
}
