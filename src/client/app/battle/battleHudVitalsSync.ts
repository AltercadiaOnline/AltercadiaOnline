import type { CombatUiHints } from '../../../shared/combatWire.js';
import {
  isMirrorBotCombatant,
  resolveBattleOpponentActorId,
} from '../../../shared/combat/resolveBattleOpponent.js';
import { listPveEnemyActorIds } from '../../../shared/combat/pveEncounterPack.js';
import type { CombatState } from '../../../shared/types.js';
import type { ClassType } from '../../../shared/types/classes.js';
import { CLASS_CATALOG } from '../../../shared/types/classes.js';
import { readCombatantVital } from '../../combat/combatVitalsDisplay.js';
import { readActiveStatusesFromCombatant } from '../../combat/client/activeStatusAdapter.js';
import {
  getBattleHudController,
} from '../battle/BattleHudController.js';
import type {
  BattleHudFighterSnapshot,
  BattleHudPetSnapshot,
} from '../battle/battleHudTypes.js';

function formatClassLabel(classId: ClassType | undefined): string {
  if (!classId) return '—';
  const entry = CLASS_CATALOG[classId];
  if (!entry) return classId;
  return `${entry.name} · ${entry.trait}`;
}

function buildFighterSnapshot(
  actorId: string,
  combatant: CombatState['combatants'][string],
  turn: number,
  packLabel?: string,
): BattleHudFighterSnapshot {
  const { hp, maxHp } = readCombatantVital(combatant);
  const max = Math.max(1, maxHp);
  return {
    actorId,
    name: packLabel ?? combatant.name,
    classLabel: formatClassLabel(combatant.classId),
    hp,
    maxHp: max,
    hpRatio: Math.min(100, Math.max(0, (hp / max) * 100)),
    statuses: readActiveStatusesFromCombatant(combatant, turn),
    isMirrorBot: isMirrorBotCombatant(combatant),
  };
}

function resolvePetAlly(
  state: CombatState,
  playerActorId: string,
): CombatState['combatants'][string] | null {
  const petId = `pet_${playerActorId}`;
  const pet = state.combatants[petId];
  if (!pet || pet.combatRole !== 'PET') return null;
  if (pet.petStatus === 'INACTIVE') return null;
  const hp = pet.hpCurrent ?? pet.hp;
  if (hp <= 0) return null;
  return pet;
}

function buildPetSnapshot(pet: CombatState['combatants'][string] | null): BattleHudPetSnapshot {
  if (!pet) {
    return {
      visible: false,
      name: '—',
      kindId: null,
      hp: 0,
      maxHp: 1,
      hpRatio: 0,
    };
  }
  const { hp, maxHp } = readCombatantVital(pet);
  const max = Math.max(1, maxHp);
  return {
    visible: true,
    name: pet.name,
    kindId: pet.petKindId ?? null,
    hp,
    maxHp: max,
    hpRatio: Math.min(100, Math.max(0, (hp / max) * 100)),
  };
}

/** Espelha vitals autoritativos do snapshot de combate na HUD React. */
export function syncBattleHudVitalsFromState(state: CombatState, ui: CombatUiHints): void {
  const player = state.combatants[ui.playerActorId];
  const opponentId = resolveBattleOpponentActorId(
    state.combatants,
    ui.playerActorId,
    state.battleType,
  );
  const opponent = opponentId ? state.combatants[opponentId] : null;
  const enemyIds = listPveEnemyActorIds(state.combatants);
  const packSize = enemyIds.length;
  const opponents = enemyIds.flatMap((actorId, index) => {
    const combatant = state.combatants[actorId];
    if (!combatant) return [];
    const packLabel = packSize > 1 ? `${combatant.name} ${index + 1}` : combatant.name;
    return [buildFighterSnapshot(actorId, combatant, state.turn, packLabel)];
  });
  const primary = opponentId && opponent
    ? opponents.find((entry) => entry.actorId === opponentId)
      ?? buildFighterSnapshot(opponentId, opponent, state.turn)
    : opponents[0] ?? null;

  getBattleHudController().setVitals(
    player ? buildFighterSnapshot(ui.playerActorId, player, state.turn) : null,
    primary,
    buildPetSnapshot(resolvePetAlly(state, ui.playerActorId)),
    opponents.length > 0 ? opponents : primary ? [primary] : [],
  );
}
