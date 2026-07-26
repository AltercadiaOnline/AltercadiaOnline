import {
  applyDeathPenalty,
  DEATH_PENALTY_ALERT_MESSAGE,
  type DeathPenaltyOutcome,
} from '../../shared/progression/ProgressionPenaltyManager.js';
import { getMutableDataStore } from '../PlayerDataStore.js';
import { getMockEconomyService } from '../economy/economyLayer.js';
import { isLocalGameMode } from '../runtime/gameMode.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerProgressionStore } from './playerProgressionStore.js';
import { getBattleLogPanel } from '../ui/battle/BattleScreen.js';
import { canApplyLocalGameplayMutations } from '../sync/intentPolicy.js';
import { getActionDispatcher } from '../ActionDispatcher.js';

let lastMirroredDeathPenaltyBattleId: string | null = null;

/** Prévia local para overlay — não muta estado. */
export function buildDeathPenaltyOutcome(): DeathPenaltyOutcome {
  const levelState = getMutableDataStore().getCharacterLevel();
  const loadout = getGlobalPlayerStore().getConfirmedLoadout();
  const progression = getPlayerProgressionStore();

  progression.ensureMasteryForMovesets(loadout);

  const snapshot = progression.getSnapshot();
  return applyDeathPenalty({
    level: levelState.level,
    xpCurrent: levelState.xpCurrent,
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

  // SSOT: só o PDS — profile/equipment derivam o level.
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

  if (isLocalGameMode()) {
    getMockEconomyService()?.persistLocalSave();
  }
}

export function resetDeathPenaltyMirrorGuard(): void {
  lastMirroredDeathPenaltyBattleId = null;
}

/** Mock legado — aplica penalidade no cliente (sem LocalCombatAuthority). */
export function applyDeathPenaltyToPlayer(): DeathPenaltyOutcome {
  const outcome = buildDeathPenaltyOutcome();

  if (!outcome.applied) {
    return outcome;
  }

  getMutableDataStore().applyCharacterLevelState(
    outcome.player.level,
    outcome.player.xpCurrent,
    'death_penalty',
  );
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
  // Local L1 / online: deathPenaltyOutcome já veio no COMBAT_FINISHED.
  // Só mock legado recalcula no cliente.
  if (isLocalGameMode() || !canApplyLocalGameplayMutations(getActionDispatcher().getMode())) {
    return buildDeathPenaltyOutcome();
  }

  const outcome = applyDeathPenaltyToPlayer();
  if (outcome.applied) {
    showDeathPenaltyBattleLogAlert();
  }
  return outcome;
}
