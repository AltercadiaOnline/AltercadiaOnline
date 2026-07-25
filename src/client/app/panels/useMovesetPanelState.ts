import { useEffect, useState } from 'react';
import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../shared/combat/moveTypes.js';
import type { ClassType } from '../../../shared/types/classes.js';
import type { MovesProgressionSnapshot } from '../../../shared/playerDataSnapshots.js';
import { getDataStore } from '../../economy/economyLayer.js';
import { getBattleStore } from '../../combat/client/battleStore.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import {
  getGlobalPlayerStore,
  type GlobalPlayerSnapshot,
} from '../../ui/moveset/globalPlayerStore.js';

export type MovesetPanelState = {
  readonly snapshot: GlobalPlayerSnapshot;
  readonly classId: ClassType;
  readonly movesProgression: MovesProgressionSnapshot;
  readonly characterLevel: number;
  readonly activeSlotCount: number;
  readonly canConfirm: boolean;
};

/** Ao abrir/trocar classe: pool + loadout da classe no store compartilhado. */
function syncMovesetHudToClass(classId: ClassType): void {
  getGlobalPlayerStore().ensureClassMovePool(classId);
  getBattleStore().resyncLoadout();
}

export function useMovesetPanelState(): MovesetPanelState {
  const [snapshot, setSnapshot] = useState<GlobalPlayerSnapshot>(
    () => getGlobalPlayerStore().getSnapshot(),
  );
  const [classId, setClassId] = useState<ClassType>(
    () => getPlayerEquipmentStore().getSnapshot().classId,
  );
  const [movesProgression, setMovesProgression] = useState<MovesProgressionSnapshot>(
    () => getDataStore().getMovesProgression(),
  );
  const [characterLevel, setCharacterLevel] = useState(
    () => getDataStore().getCharacterLevel().level,
  );

  useEffect(() => {
    const resolved = getPlayerEquipmentStore().getSnapshot().classId;
    syncMovesetHudToClass(resolved);
    getGlobalPlayerStore().beginLoadoutEdit();
    setClassId(resolved);
    setSnapshot(getGlobalPlayerStore().getSnapshot());

    const unsubStore = getGlobalPlayerStore().subscribe(setSnapshot);
    const unsubEquipment = getPlayerEquipmentStore().subscribe((next) => {
      setClassId(next.classId);
      syncMovesetHudToClass(next.classId);
      getGlobalPlayerStore().beginLoadoutEdit();
    });
    const unsubProgression = getDataStore().subscribe('movesProgression', setMovesProgression);
    const unsubLevel = getDataStore().subscribe('characterLevel', (next) => {
      setCharacterLevel(next.level);
    });

    return () => {
      unsubStore();
      unsubEquipment();
      unsubProgression();
      unsubLevel();
    };
  }, []);

  const activeSlotCount = snapshot.activeMovesets.length;

  return {
    snapshot,
    classId,
    movesProgression,
    characterLevel,
    activeSlotCount,
    canConfirm: activeSlotCount === ACTIVE_MOVESET_SLOT_COUNT,
  };
}
