import {
  applyInheritanceStatsBonusPercent,
  resolvePetInheritanceBonusesFromStacks,
  scaleBattleProgressionXp,
} from '../../shared/pet/petInheritanceBonuses.js';
import { applyBattleProgressionGrant } from '../../shared/progression/applyBattleProgression.js';
import { getPlayerItemStore } from '../ui/items/playerItemStore.js';
import type { BattleProgressionGrant } from '../../shared/progression/battleProgressionGrant.js';
import { getClassMovePool } from '../../shared/combat/classMovesetCatalog.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { alertSystem } from '../ui/alertSystem.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerProgressionStore } from './playerProgressionStore.js';

const MOVE_MASTERY_CAP_NOTIFICATION =
  'Move no limite de nível! Suba de nível para continuar progredindo.';

let lastAppliedBattleId: string | null = null;

/** Espelha grant autoritativo no cliente — nunca recalcula XP de batalha. */
export function mirrorBattleProgressionGrant(
  battleId: string,
  grant: BattleProgressionGrant | undefined,
): void {
  if (!grant || grant.totalBattleXp <= 0) return;
  if (lastAppliedBattleId === battleId) return;
  lastAppliedBattleId = battleId;

  const dataStore = getMutableDataStore();
  const characterLevel = dataStore.getCharacterLevel();
  const progressionStore = getPlayerProgressionStore();
  const classId = getPlayerEquipmentStore().getSnapshot().classId;
  progressionStore.ensureMasteryForMovesets(getClassMovePool(classId));
  const progression = progressionStore.getSnapshot();

  const inheritance = resolvePetInheritanceBonusesFromStacks(getPlayerItemStore().toInventoryStacks());
  const scaledGrant = scaleBattleProgressionXp(grant, inheritance.xpBonusPercent);

  const applied = applyBattleProgressionGrant(
    {
      level: characterLevel.level,
      xpCurrent: characterLevel.xpCurrent,
      movesetMastery: progression.movesetMastery,
      milestoneTotalProgress: progression.milestoneTotalProgress,
    },
    scaledGrant,
  );

  dataStore.applyCharacterLevelState(applied.level, applied.xpCurrent, 'pve_victory');

  progressionStore.applyBattleProgressionResult(
    applied.movesetMastery,
    applied.milestoneTotalProgress,
  );
  dataStore.bumpRevision('movesProgression');

  if (applied.movesetMasteryCapBlocked.length > 0) {
    alertSystem(MOVE_MASTERY_CAP_NOTIFICATION);
  }
}

export function resetBattleProgressionClientGuard(): void {
  lastAppliedBattleId = null;
}
