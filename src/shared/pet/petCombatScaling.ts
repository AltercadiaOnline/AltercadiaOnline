import type { EquippedSlots } from '../character/equipmentState.js';
import { calculateTotalStats, equipmentIdsToSlots } from '../items/itemUtils.js';
import type { PetSnapshot } from './petModel.js';

export function resolvePlayerBaseForcaFromEquipped(equipped: EquippedSlots): number {
  return calculateTotalStats(equipmentIdsToSlots(Object.values(equipped))).forca;
}

/** Teto de poder de combate do pet = 20% da Força base (SET) do jogador. */
export const PET_PLAYER_BASE_FORCE_RATIO = 0.2;

/** Ações do jogador antes do 1º turno do pet (P→E→P→E→P→E→pet). */
export const PET_ASSIST_PLAYER_ACTION_THRESHOLDS = [3, 4, 5, 6, 8] as const;

export function resolvePetCombatCapFromPlayerForca(playerBaseForca: number): number {
  const safe = Math.max(0, Math.floor(playerBaseForca));
  return Math.max(1, Math.floor(safe * PET_PLAYER_BASE_FORCE_RATIO));
}

/**
 * Dano do golpe do pet em batalha — capped em 20% da Força base do jogador.
 * Bônus de afinidade entra como fração pequena, sem ultrapassar o teto.
 */
export function resolvePetBattleSkillDamage(
  playerBaseForca: number,
  _pet: PetSnapshot,
): number {
  return resolvePetCombatCapFromPlayerForca(playerBaseForca);
}

/** HP máximo em combate — proporcional ao teto de Força, limitado ao HP do snapshot. */
export function resolvePetBattleHpMax(
  playerBaseForca: number,
  petHpMax: number,
): number {
  const cap = resolvePetCombatCapFromPlayerForca(playerBaseForca);
  const scaled = Math.max(8, cap * 3);
  return Math.min(Math.max(1, Math.floor(petHpMax)), scaled);
}

export function resolvePetAssistPlayerActionThreshold(cycleIndex: number): number {
  const idx = Math.min(
    Math.max(0, Math.floor(cycleIndex)),
    PET_ASSIST_PLAYER_ACTION_THRESHOLDS.length - 1,
  );
  return PET_ASSIST_PLAYER_ACTION_THRESHOLDS[idx]!;
}

export function shouldRunPetAssistPhase(
  playerTurnsSinceLastPet: number,
  threshold: number,
): boolean {
  return playerTurnsSinceLastPet >= threshold;
}
