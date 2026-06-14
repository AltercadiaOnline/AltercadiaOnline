import { getClassMovePool } from '../../shared/combat/classMovesetCatalog.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import type { MovesProgressionSnapshot } from '../../shared/playerDataSnapshots.js';
import {
  buildMovesProgressionData,
  resolveMoveProgressionFromMastery,
  type MoveProgressionSnapshot,
} from '../../shared/progression/moveProgression.js';
import { attachRevision } from '../../shared/snapshotRevision.js';
import { getPlayerProgressionStore } from './playerProgressionStore.js';

export function readMovesProgressionSnapshot(revision: number): MovesProgressionSnapshot {
  const progressionStore = getPlayerProgressionStore();
  const classId = getPlayerEquipmentStore().getSnapshot().classId;
  const classPool = [...getClassMovePool(classId)];
  progressionStore.ensureMasteryForMovesets(classPool);
  const { movesetMastery } = progressionStore.getSnapshot();

  return attachRevision(
    buildMovesProgressionData(movesetMastery, classPool),
    revision,
  );
}

export function readMoveProgression(moveId: string, revision: number): MoveProgressionSnapshot {
  const progression = readMovesProgressionSnapshot(revision);
  return (
    progression.byMoveId[moveId] ??
    resolveMoveProgressionFromMastery(moveId, 0)
  );
}
