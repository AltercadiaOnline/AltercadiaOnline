import {
  applyDeathPenalty,
  DEATH_PENALTY_ALERT_MESSAGE,
  type DeathPenaltyOutcome,
} from '../../shared/progression/ProgressionPenaltyManager.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerProfileStore } from '../ui/character/playerProfileStore.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getPlayerProgressionStore } from './playerProgressionStore.js';
import { getBattleLogPanel } from '../ui/battle/BattleScreen.js';
import { canApplyLocalGameplayMutations } from '../sync/intentPolicy.js';
import { getActionDispatcher } from '../ActionDispatcher.js';

let lastMirroredDeathPenaltyBattleId: string | null = null;

/** Prévia local para overlay — não muta estado. */
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

/** Espelha penalidade autoritativa do servidor (COMBAT_FINISHED). */
export function mirrorDeathPenaltyOutcome(
  battleId: string,
  outcome: DeathPenaltyOutcome,
): void {
  if (lastMirroredDeathPenaltyBattleId === battleId) return;
  lastMirroredDeathPenaltyBattleId = battleId;

  if (!outcome.applied) return;

  getPlayerProfileStore().setXpCurrent(outcome.player.xpCurrent);
  const profile = getPlayerProfileStore().getSnapshot();
  getPlayerEquipmentStore().setPlayerInfo(
    getPlayerEquipmentStore().getSnapshot().displayName,
    profile.level,
    { resetVitals: false },
  );
  getMutableDataStore().applyCharacterLevelState(
    outcome.player.level,
    outcome.player.xpCurrent,
    'death_penalty',
  );
  getPlayerProgressionStore().applyPenaltyResult(
    outcome.player.movesetMastery,
    outcome.player.milestoneTotalProgress,
  );
  getMutableDataStore().bumpRevision('movesProgression');
  showDeathPenaltyBattleLogAlert();
}

export function resetDeathPenaltyMirrorGuard(): void {
  lastMirroredDeathPenaltyBattleId = null;
}

/** Mock/local — aplica penalidade no cliente (dev offline). */
export function applyDeathPenaltyToPlayer(): DeathPenaltyOutcome {
  const outcome = buildDeathPenaltyOutcome();

  if (!outcome.applied) {
    return outcome;
  }

  getPlayerProfileStore().setXpCurrent(outcome.player.xpCurrent);
  const profile = getPlayerProfileStore().getSnapshot();
  getPlayerEquipmentStore().setPlayerInfo(
    getPlayerEquipmentStore().getSnapshot().displayName,
    profile.level,
    { resetVitals: false },
  );
  getPlayerProgressionStore().applyPenaltyResult(
    outcome.player.movesetMastery,
    outcome.player.milestoneTotalProgress,
  );
  getMutableDataStore().applyCharacterLevelState(
    outcome.player.level,
    outcome.player.xpCurrent,
    'death_penalty',
  );

  return outcome;
}

export function showDeathPenaltyBattleLogAlert(): void {
  getBattleLogPanel()?.appendAlert(DEATH_PENALTY_ALERT_MESSAGE);
}

export function handleBattleDefeatPenalty(): DeathPenaltyOutcome {
  if (!canApplyLocalGameplayMutations(getActionDispatcher().getMode())) {
    return buildDeathPenaltyOutcome();
  }

  const outcome = applyDeathPenaltyToPlayer();
  if (outcome.applied) {
    showDeathPenaltyBattleLogAlert();
  }
  return outcome;
}
