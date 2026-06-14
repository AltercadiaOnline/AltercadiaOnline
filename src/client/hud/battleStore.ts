import {
  moveIdsToSkillData,
  resolvePlayerEquippedSkillIds,
} from '../../shared/combat/movesetLoadout.js';
import type { SkillData } from '../../shared/types.js';
import { getPlayerEquipmentStore } from '../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../ui/moveset/globalPlayerStore.js';
import { getPlayerProgressionStore } from '../progression/playerProgressionStore.js';
import { uiEvents, UIEventType } from '../ui/uiEvents.js';

/**
 * Espelha o loadout confirmado para a camada de combate.
 * Atualizado via LOADOUT_SAVED emitido pelo GlobalPlayerStore.
 */
class BattleStore {
  private activeMovesets: string[] = [];
  private unsubscribe: (() => void) | null = null;

  private resolveClassId() {
    return getPlayerEquipmentStore().getSnapshot().classId;
  }

  private syncFromConfirmed(): void {
    const classId = this.resolveClassId();
    const confirmed = getGlobalPlayerStore().getConfirmedLoadout();
    this.activeMovesets = resolvePlayerEquippedSkillIds(classId, confirmed);
  }

  attach(): void {
    if (this.unsubscribe) return;

    this.syncFromConfirmed();
    this.unsubscribe = uiEvents.on(UIEventType.LOADOUT_SAVED, ({ activeMovesets }) => {
      const classId = this.resolveClassId();
      this.activeMovesets = resolvePlayerEquippedSkillIds(classId, activeMovesets);
    });
  }

  /** Re-sincroniza após troca de classe / applyClassMoveset no enterWorld. */
  resyncLoadout(): void {
    this.syncFromConfirmed();
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.activeMovesets = [];
  }

  getActiveMovesets(): readonly string[] {
    return [...this.activeMovesets];
  }

  getPlayerBattleSkills(): SkillData[] {
    const classId = this.resolveClassId();
    const ids = resolvePlayerEquippedSkillIds(classId, this.activeMovesets);
    const { movesetMastery } = getPlayerProgressionStore().getSnapshot();
    return moveIdsToSkillData(ids, movesetMastery);
  }
}

let store: BattleStore | null = null;

export function getBattleStore(): BattleStore {
  if (!store) store = new BattleStore();
  return store;
}

export function initBattleStore(): BattleStore {
  const active = getBattleStore();
  active.attach();
  return active;
}

export function resetBattleStore(): void {
  store?.detach();
  store = null;
}
