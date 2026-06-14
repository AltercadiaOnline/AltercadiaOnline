/**
 * # Battle Progression Grant — mecânica oficial (Altercadia)
 *
 * ## Decisão de produto (PVE vitória)
 * - **XP é automático** ao fim da luta vencida — não depende do cassino/loot.
 * - **Loot é opt-in** — exige abrir Recompensas e clicar Coletar; sair sem coletar perde tudo.
 *
 * ## Trilhas de progressão (independentes entre si)
 * | Trilha | Store / persistência | Curva | Como ganha em batalha |
 * |--------|----------------------|-------|------------------------|
 * | Nível do personagem | `PlayerDataStore` (`characterLevel`) | `getRequiredXpForNextLevel` | PVE, quests, exploração — não mistura com domínio |
 * | Domínio de moveset | `movesetMastery` → `moveProgression.ts` | `CharacterProgressionService.getRequiredXp` (1.15^n) | XP por uso; +10% se ≥8 usos; catch-up ×1.5; **mastery cap** char×1.5 |
 * | Progresso meta (árvore) | `milestoneTotalProgress` | Degraus 10, 25, 40… | +1 por vitória PVE (farm lento) |
 * | Habilidades Marco | `nodeProgression` via `marcoProgressEngine` | Triggers por uso | **Separado** — telemetria de combate (`marcoCombatTelemetry`) |
 *
 * ## Autoridade
 * - Servidor calcula o grant (`resolveBattleProgressionGrant`) a partir de `resolveBattleXpGain`.
 * - Cliente **espelha** o payload — nunca recalcula XP de batalha.
 * - **Não** passar por `economyGateway` (itens/moeda). Progressão ≠ economia.
 *
 * ## Arquivos relacionados
 * - Pool total PVE: `shared/combat/battleXpRewards.ts`
 * - Curva harmonizada: `shared/progression/CharacterProgressionService.ts`
 * - Marcos por trigger: `shared/progression/marcoProgressEngine.ts`
 * - Penalidade morte: `shared/progression/ProgressionPenaltyManager.ts`
 */
import {
  resolveBattleXpGain,
  resolveDefeatedCreatureLevel,
} from '../combat/battleXpRewards.js';
import { BattleType } from '../combat/battleType.js';
import { applyMoveSyncBonusToMovesetGrant } from './battleMoveSyncBonus.js';

/** Fração do pool PVE que alimenta o nível do personagem (farm mais rápido). */
export const BATTLE_LEVEL_XP_RATIO = 0.6;

/** Fração do pool PVE repartida entre moves usados na luta (farm moderado). */
export const BATTLE_MOVESET_XP_RATIO = 0.4;

/** Progresso meta incremental por vitória PVE — desbloqueio lento da árvore de marcos. */
export const BATTLE_MILESTONE_PROGRESS_PER_VICTORY = 1;

/** Usos mínimos do mesmo move na luta para bônus de especialização. */
export const MOVE_SPECIALIZATION_MIN_USES = 8;

/** Bônus no pool total de domínio quando especialização dispara (+10%). */
export const MOVE_SPECIALIZATION_XP_BONUS_RATIO = 0.1;

export type BattleProgressionGrantInput = {
  readonly victory: boolean;
  readonly battleType: BattleType;
  readonly creatureId?: string;
  /**
   * Registro de uso na batalha — cada entrada = 1 disparo do move.
   * Ex.: `['COG_2','COG_2','IMP_1']` → COG_2 ganha 2/3 do pool de domínio.
   */
  readonly movesUsedInBattle?: readonly string[];
  readonly defeatedLevel?: number;
  /** Nível do personagem antes do grant — habilita bônus de sincronia nos moves. */
  readonly characterLevel?: number;
  /** Domínio persistido — nível efetivo de cada move para sincronia. */
  readonly movesetMastery?: Readonly<Record<string, number>>;
};

export type BattleProgressionGrant = {
  /** Pool bruto da vitória (referência / UI). */
  readonly totalBattleXp: number;
  /** XP aplicado ao nível do personagem. */
  readonly levelXp: number;
  /** XP de domínio por move (soma ≤ totalBattleXp × MOVESET ratio). */
  readonly movesetXpByMoveId: Readonly<Record<string, number>>;
  /** Incremento em milestoneTotalProgress (desbloqueio de nós). */
  readonly milestoneProgressGain: number;
  readonly creatureId: string | null;
  readonly defeatedLevel: number;
};

const EMPTY_GRANT: BattleProgressionGrant = {
  totalBattleXp: 0,
  levelXp: 0,
  movesetXpByMoveId: {},
  milestoneProgressGain: 0,
  creatureId: null,
  defeatedLevel: 0,
};

function splitIntegerPool(total: number, weights: readonly number[]): number[] {
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);

  const safeWeights = weights.map((w) => Math.max(0, w));
  const weightSum = safeWeights.reduce((acc, w) => acc + w, 0);
  if (weightSum <= 0) {
    const base = Math.floor(total / weights.length);
    const remainder = total - base * weights.length;
    return weights.map((_, index) => base + (index < remainder ? 1 : 0));
  }

  const raw = safeWeights.map((w) => (total * w) / weightSum);
  const allocated = raw.map((value) => Math.floor(value));
  let leftover = total - allocated.reduce((acc, n) => acc + n, 0);

  const order = raw
    .map((value, index) => ({ index, fraction: value - allocated[index]! }))
    .sort((a, b) => b.fraction - a.fraction);

  for (const entry of order) {
    if (leftover <= 0) break;
    allocated[entry.index]! += 1;
    leftover -= 1;
  }

  return allocated;
}

/** Conta quantas vezes cada move foi usado na batalha. */
export function resolveMoveUseCounts(
  movesUsedInBattle: readonly string[],
): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const moveId of movesUsedInBattle) {
    if (!moveId) continue;
    counts[moveId] = (counts[moveId] ?? 0) + 1;
  }
  return counts;
}

/** Verdadeiro se algum move foi usado ≥ MOVE_SPECIALIZATION_MIN_USES na mesma luta. */
export function hasMoveSpecializationBonus(
  movesUsedInBattle: readonly string[],
): boolean {
  const counts = resolveMoveUseCounts(movesUsedInBattle);
  return Object.values(counts).some((count) => count >= MOVE_SPECIALIZATION_MIN_USES);
}

/**
 * Aplica multiplicador de especialização ao pool de domínio (inteiro).
 * O bônus é XP extra de domínio — não altera `totalBattleXp` de referência.
 */
export function applyMoveSpecializationBonusToPool(
  baseMovesetPool: number,
  movesUsedInBattle: readonly string[],
): number {
  if (baseMovesetPool <= 0) return 0;
  if (!hasMoveSpecializationBonus(movesUsedInBattle)) return baseMovesetPool;
  return Math.floor(baseMovesetPool * (1 + MOVE_SPECIALIZATION_XP_BONUS_RATIO));
}

/** Reparte o pool de domínio proporcional ao número de usos de cada move. */
function distributeMovesetXp(
  movesetPool: number,
  movesUsedInBattle: readonly string[],
): Readonly<Record<string, number>> {
  const useCounts = resolveMoveUseCounts(movesUsedInBattle);
  const moveIds = Object.keys(useCounts);
  if (movesetPool <= 0 || moveIds.length === 0) return {};

  const shares = splitIntegerPool(
    movesetPool,
    moveIds.map((moveId) => useCounts[moveId] ?? 0),
  );

  const byMoveId: Record<string, number> = {};
  moveIds.forEach((moveId, index) => {
    const gained = shares[index] ?? 0;
    if (gained > 0) byMoveId[moveId] = gained;
  });
  return byMoveId;
}

/**
 * Calcula o grant de progressão para uma batalha encerrada.
 * Vitória PVE com criatura → pool + split; demais casos → zeros.
 */
export function resolveBattleProgressionGrant(
  input: BattleProgressionGrantInput,
): BattleProgressionGrant {
  if (!input.victory || input.battleType !== BattleType.PVE || !input.creatureId) {
    return { ...EMPTY_GRANT };
  }

  const defeatedLevel = input.defeatedLevel ?? resolveDefeatedCreatureLevel(input.creatureId);
  const totalBattleXp = resolveBattleXpGain(input.creatureId, defeatedLevel);
  if (totalBattleXp <= 0) {
    return {
      ...EMPTY_GRANT,
      creatureId: input.creatureId,
      defeatedLevel,
    };
  }

  const levelXp = Math.floor(totalBattleXp * BATTLE_LEVEL_XP_RATIO);
  const baseMovesetPool = totalBattleXp - levelXp;
  const movesUsedInBattle = input.movesUsedInBattle ?? [];
  const movesetPool = applyMoveSpecializationBonusToPool(baseMovesetPool, movesUsedInBattle);
  const baseMovesetGrant = distributeMovesetXp(movesetPool, movesUsedInBattle);
  const movesetXpByMoveId =
    input.characterLevel !== undefined && input.movesetMastery
      ? applyMoveSyncBonusToMovesetGrant(
          baseMovesetGrant,
          input.characterLevel,
          input.movesetMastery,
        )
      : baseMovesetGrant;

  return {
    totalBattleXp,
    levelXp,
    movesetXpByMoveId,
    milestoneProgressGain: BATTLE_MILESTONE_PROGRESS_PER_VICTORY,
    creatureId: input.creatureId,
    defeatedLevel,
  };
}

/** Soma exibível de XP de moveset (para HUD/resumo). */
export function sumMovesetXpGrant(
  movesetXpByMoveId: Readonly<Record<string, number>>,
): number {
  return Object.values(movesetXpByMoveId).reduce((acc, value) => acc + value, 0);
}
