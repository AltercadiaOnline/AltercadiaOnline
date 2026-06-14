import {
  applyDeathPenalty,
  DEATH_PENALTY_ALERT_MESSAGE,
  type DeathPenaltyOutcome,
} from '../../shared/progression/ProgressionPenaltyManager.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerProgressionStore } from './playerProgressionStore.js';
import { getBattleLogPanel } from '../ui/battle/BattleScreen.js';

export function buildDeathPenaltyOutcome(): DeathPenaltyOutcome {
  const profile = getPlayerProfileStore().getSnapshot();
  const equipment = getPlayerEquipmentStore().getSnapshot();
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  const progression = getPlayerProgressionStore();

  progression.ensureMasteryForMovesets(loadout);

  const snapshot = progression.getSnapshot();
  return applyDeathPenalty({
    level: equipment.level || profile.level,
    xpCurrent: profile.xpCurrent,
    equippedMovesetIds: loadout,
    movesetMastery: snapshot.movesetMastery,
    milestoneTotalProgress: snapshot.milestoneTotalProgress,
  });
}

/** Aplica penalidade punitiva permanente após derrota (nível > 10). */
export function applyDeathPenaltyToPlayer(): DeathPenaltyOutcome {
  const outcome = buildDeathPenaltyOutcome();

  if (!outcome.applied) {
    return outcome;
  }

  const profileStore = getPlayerProfileStore();
  profileStore.setXpCurrent(outcome.player.xpCurrent);

  const equipment = getPlayerEquipmentStore().getSnapshot();
  equipmentStoreSetLevel(equipment.displayName, profileStore.getSnapshot().level);

  getPlayerProgressionStore().applyPenaltyResult(
    outcome.player.movesetMastery,
    outcome.player.milestoneTotalProgress,
  );

  return outcome;
}

export function showDeathPenaltyBattleLogAlert(): void {
  getBattleLogPanel()?.appendAlert(DEATH_PENALTY_ALERT_MESSAGE);
}

export function handleBattleDefeatPenalty(): DeathPenaltyOutcome {
  const outcome = applyDeathPenaltyToPlayer();
  if (outcome.applied) {
    showDeathPenaltyBattleLogAlert();
  }
  return outcome;
}

function equipmentStoreSetLevel(displayName: string, level: number): void {
  getPlayerEquipmentStore().setPlayerInfo(displayName, level, { resetVitals: false });
}
