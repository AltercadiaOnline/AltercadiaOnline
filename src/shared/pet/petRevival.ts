import type { PetSnapshot } from './petModel.js';

/** NPC autorizado a reativar pets — único ponto de recuperação. */
export const PET_REVIVE_NPC_ID = 'anciao_cael';

export function canRevivePetAtNpc(npcId: string): boolean {
  return npcId === PET_REVIVE_NPC_ID;
}

/**
 * Reativa pet com HP cheio. Deve ser invocado apenas após validação do NPC Ancião Cael
 * (economyGateway + transação atômica no servidor).
 */
export function revivePet(pet: PetSnapshot): PetSnapshot {
  return {
    ...pet,
    status: 'ACTIVE',
    hpCurrent: pet.hpMax,
  };
}
