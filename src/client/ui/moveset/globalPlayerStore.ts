import { ACTIVE_MOVESET_SLOT_COUNT } from '../../../shared/combat/moveTypes.js';
import { CLASS_HEAL_MOVE_ID, getClassMovePool } from '../../../shared/combat/classMovesetCatalog.js';
import {
  getDefaultClassActiveLoadout,
  isValidClassActiveLoadout,
} from '../../../shared/combat/movesetLoadout.js';
import type { ClassType } from '../../../shared/types/classes.js';
import type { PlayerWorldVitals } from '../../../shared/character/equipmentState.js';
import type { BattleEncounterData, ExplorationSnapshot } from '../../../shared/game/gameState.js';
import { uiEvents, UIEventType } from '../uiEvents.js';
import { persistLoadoutToServer } from './loadoutPersistence.js';
import { getPlayerEquipmentStore } from '../equipment/playerEquipmentStore.js';

export type GlobalPlayerSnapshot = {
  readonly availableMoveIds: readonly string[];
  readonly activeMovesets: readonly string[];
  readonly confirmedLoadout: readonly string[];
  readonly explorationSnapshot: ExplorationSnapshot | null;
  readonly activeEncounter: BattleEncounterData | null;
  readonly worldVitals: PlayerWorldVitals;
};

type Listener = (snapshot: GlobalPlayerSnapshot) => void;

/**
 * Estado global do operativo — loadout de movesets confirmado antes da batalha.
 * Cliente hostil: a batalha lê apenas `confirmedLoadout` após LOADOUT_SAVED.
 */
class GlobalPlayerStore {
  private availableMoveIds: string[] = [];
  private activeMovesets: string[] = [];
  private confirmedLoadout: string[] = [];
  private explorationSnapshot: ExplorationSnapshot | null = null;
  private activeEncounter: BattleEncounterData | null = null;
  private worldVitals: PlayerWorldVitals = {
    hpCurrent: 100,
    hpMax: 100,
    mpCurrent: 48,
    mpMax: 48,
  };
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.applyClassMoveset('IMPETUS');
  }

  /** Pool de 6 + loadout padrão (4) do catálogo oficial da classe. */
  applyClassMoveset(classId: ClassType): void {
    const pool = [...getClassMovePool(classId)];
    const defaultActive = getDefaultClassActiveLoadout(classId);
    this.availableMoveIds = pool;
    this.confirmedLoadout = [...defaultActive];
    this.activeMovesets = [...defaultActive];
    this.publish();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): GlobalPlayerSnapshot {
    return {
      availableMoveIds: [...this.availableMoveIds],
      activeMovesets: [...this.activeMovesets],
      confirmedLoadout: [...this.confirmedLoadout],
      explorationSnapshot: this.explorationSnapshot ? { ...this.explorationSnapshot } : null,
      activeEncounter: this.activeEncounter ? { ...this.activeEncounter } : null,
      worldVitals: { ...this.worldVitals },
    };
  }

  getWorldVitals(): PlayerWorldVitals {
    return { ...this.worldVitals };
  }

  /** Sincroniza vitals do espelho de equipamento (login / bootstrap). */
  syncWorldVitalsFromEquipment(): void {
    const vitals = getPlayerEquipmentStore().getSnapshot().vitals;
    this.worldVitals = { ...vitals };
    this.publish();
  }

  /** Autoritativo pós-batalha ou cura NPC — espelha na HUD de equipamento. */
  applyWorldVitals(vitals: Partial<PlayerWorldVitals>): void {
    this.worldVitals = { ...this.worldVitals, ...vitals };
    getPlayerEquipmentStore().setVitals(this.worldVitals);
    this.publish();
  }

  saveExplorationSnapshot(snapshot: ExplorationSnapshot): void {
    this.explorationSnapshot = { ...snapshot };
    this.publish();
  }

  getExplorationSnapshot(): ExplorationSnapshot | null {
    return this.explorationSnapshot ? { ...this.explorationSnapshot } : null;
  }

  setActiveEncounter(encounter: BattleEncounterData | null): void {
    this.activeEncounter = encounter ? { ...encounter } : null;
    this.publish();
  }

  getActiveEncounter(): BattleEncounterData | null {
    return this.activeEncounter ? { ...this.activeEncounter } : null;
  }

  clearActiveEncounter(): void {
    this.activeEncounter = null;
    this.publish();
  }

  /** Loadout persistido enviado ao combate. */
  getConfirmedLoadout(): readonly string[] {
    return [...this.confirmedLoadout];
  }

  /** Sincroniza rascunho com loadout confirmado ao abrir a HUD. */
  beginLoadoutEdit(): void {
    this.activeMovesets = [...this.confirmedLoadout];
    this.publish();
  }

  isMoveActive(moveId: string): boolean {
    return this.activeMovesets.includes(moveId);
  }

  /** Adiciona ou remove movimento do rascunho (máx. 4). */
  toggleActiveMove(moveId: string): void {
    if (!this.availableMoveIds.includes(moveId)) return;

    const classId = getPlayerEquipmentStore().getSnapshot().classId;
    const healMoveId = CLASS_HEAL_MOVE_ID[classId];

    if (this.activeMovesets.includes(moveId)) {
      this.activeMovesets = this.activeMovesets.filter((id) => id !== moveId);
    } else if (this.activeMovesets.length < ACTIVE_MOVESET_SLOT_COUNT) {
      if (healMoveId && moveId === healMoveId && this.activeMovesets.includes(healMoveId)) {
        return;
      }
      this.activeMovesets = [...this.activeMovesets, moveId];
    }

    this.publish();
  }

  removeActiveMove(moveId: string): void {
    if (!this.activeMovesets.includes(moveId)) return;
    this.activeMovesets = this.activeMovesets.filter((id) => id !== moveId);
    this.publish();
  }

  /** Persiste loadout após sucesso do servidor e notifica sistemas de combate. */
  async confirmLoadout(): Promise<boolean> {
    if (this.activeMovesets.length !== ACTIVE_MOVESET_SLOT_COUNT) return false;

    const classId = getPlayerEquipmentStore().getSnapshot().classId;
    if (!isValidClassActiveLoadout(classId, this.activeMovesets)) return false;

    const nextLoadout = [...this.activeMovesets];

    try {
      await persistLoadoutToServer(nextLoadout);
    } catch {
      return false;
    }

    this.confirmedLoadout = nextLoadout;
    uiEvents.emit(UIEventType.LOADOUT_SAVED, {
      activeMovesets: [...this.confirmedLoadout],
    });
    this.publish();
    return true;
  }

  seedDemo(classId: ClassType = 'IMPETUS'): void {
    this.applyClassMoveset(classId);
  }

  reset(): void {
    this.applyClassMoveset(getPlayerEquipmentStore().getSnapshot().classId);
    this.explorationSnapshot = null;
    this.activeEncounter = null;
    this.worldVitals = {
      hpCurrent: 100,
      hpMax: 100,
      mpCurrent: 48,
      mpMax: 48,
    };
    this.publish();
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

let store: GlobalPlayerStore | null = null;

export function getGlobalPlayerStore(): GlobalPlayerStore {
  if (!store) store = new GlobalPlayerStore();
  return store;
}

export function initGlobalPlayerStore(): GlobalPlayerStore {
  return getGlobalPlayerStore();
}

export function resetGlobalPlayerStore(): void {
  store = null;
}
