import type { PetSnapshot } from './petModel.js';
import { resolvePetAffinityPercentFromXp } from './petAffinity.js';

export type PetBondTier = 'training' | 'stable' | 'soulmate';

export type PetBondSnapshot = {
  readonly percent: number;
  readonly tier: PetBondTier;
  readonly tierLabel: string;
};

const TIER_LABELS: Readonly<Record<PetBondTier, string>> = {
  training: 'Vínculo em Treino',
  stable: 'Parceria Estável',
  soulmate: 'Alma Gêmea Tática',
};

/** Deriva afinidade persistente do pet — progressão acumulada via combate/exploração. */
export function resolvePetBond(pet: PetSnapshot): PetBondSnapshot {
  const percent = resolvePetAffinityPercentFromXp(pet.affinityXp);

  const tier: PetBondTier =
    percent >= 80 ? 'soulmate' : percent >= 40 ? 'stable' : 'training';

  return {
    percent,
    tier,
    tierLabel: TIER_LABELS[tier],
  };
}
