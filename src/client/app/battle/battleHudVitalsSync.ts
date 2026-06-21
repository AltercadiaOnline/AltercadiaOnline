import type { CombatUiHints } from '../../../shared/combatWire.js';
import {
  isMirrorBotCombatant,
  resolveBattleOpponentActorId,
} from '../../../shared/combat/resolveBattleOpponent.js';
import type { CombatState } from '../../../shared/types.js';
import type { ClassType } from '../../../shared/types/classes.js';
import { CLASS_CATALOG } from '../../../shared/types/classes.js';
import { readCombatantVital } from '../../combat/combatVitalsDisplay.js';
import { readActiveStatusesFromCombatant } from '../../hud/activeStatusAdapter.js';
import {
  getBattleHudBridge,
  isReactBattleHudEnabled,
  type BattleHudFighterSnapshot,
  type BattleHudPetSnapshot,
} from '../bridge/battleHudBridge.js';

function formatClassLabel(classId: ClassType | undefined): string {
  if (!classId) return '—';
  const entry = CLASS_CATALOG[classId];
  return `${entry.name} · ${entry.trait}`;
}

function buildFighterSnapshot(
  combatant: CombatState['combatants'][string],
  turn: number,
): BattleHudFighterSnapshot {
  const { hp, maxHp } = readCombatantVital(combatant);
  const max = Math.max(1, maxHp);
  return {
    name: combatant.name,
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
    hp,
    maxHp: max,
    hpRatio: Math.min(100, Math.max(0, (hp / max) * 100)),
  };
}

/** Espelha vitals autoritativos do snapshot de combate na HUD React. */
export function syncBattleHudVitalsFromState(state: CombatState, ui: CombatUiHints): void {
  if (!isReactBattleHudEnabled()) return;

  const player = state.combatants[ui.playerActorId];
  const opponentId = resolveBattleOpponentActorId(
    state.combatants,
    ui.playerActorId,
    state.battleType,
  );
  const opponent = opponentId ? state.combatants[opponentId] : null;

  getBattleHudBridge().setVitals(
    player ? buildFighterSnapshot(player, state.turn) : null,
    opponent ? buildFighterSnapshot(opponent, state.turn) : null,
    buildPetSnapshot(resolvePetAlly(state, ui.playerActorId)),
  );
}
