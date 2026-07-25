import {
  moveIdsToSkillData,
  resolvePlayerEquippedSkillIds,
} from '../../../shared/combat/movesetLoadout.js';
import type { SkillData } from '../../../shared/types.js';
import { getPlayerEquipmentStore } from '../../ui/equipment/playerEquipmentStore.js';
import { getGlobalPlayerStore } from '../../ui/moveset/globalPlayerStore.js';
import { getPlayerProgressionStore } from '../../progression/playerProgressionStore.js';
import { uiEvents, UIEventType } from '../../ui/uiEvents.js';

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
    // Sempre preferir confirmedLoadout (GlobalPlayerStore) — activeMovesets pode
    // estar vazio/stale e cair nos 4 defaults da classe.
    const confirmed = getGlobalPlayerStore().getConfirmedLoadout();
    const source = confirmed.length > 0 ? confirmed : this.activeMovesets;
    const ids = resolvePlayerEquippedSkillIds(classId, source);
    const { movesetMastery } = getPlayerProgressionStore().getSnapshot();
    return moveIdsToSkillData(ids, movesetMastery);
  }
}

type GlobalWithBattleStore = typeof globalThis & {
  __ALTERCADIA_BATTLE_STORE__?: BattleStore | null;
};

function getBattleStoreGlobal(): GlobalWithBattleStore {
  return globalThis as GlobalWithBattleStore;
}

/** Singleton cross-bundle (main.js + ui-runtime) — loadout de batalha único. */
export function getBattleStore(): BattleStore {
  const g = getBattleStoreGlobal();
  if (!g.__ALTERCADIA_BATTLE_STORE__) {
    g.__ALTERCADIA_BATTLE_STORE__ = new BattleStore();
  }
  return g.__ALTERCADIA_BATTLE_STORE__;
}

export function initBattleStore(): BattleStore {
  const active = getBattleStore();
  active.attach();
  return active;
}

export function resetBattleStore(): void {
  const g = getBattleStoreGlobal();
  g.__ALTERCADIA_BATTLE_STORE__?.detach();
  g.__ALTERCADIA_BATTLE_STORE__ = null;
}
