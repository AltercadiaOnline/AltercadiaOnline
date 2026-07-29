import {
  createDemoProfile,
  getCharacterXpForNextLevel,
  type PlayerProfileSnapshot,
} from '../../../shared/character/playerProfile.js';
import { getMutableDataStore } from '../../PlayerDataStore.js';
import { uiEvents, UIEventType } from '../uiEvents.js';

type Listener = (snapshot: PlayerProfileSnapshot) => void;

class PlayerProfileStore {
  private snapshot: PlayerProfileSnapshot = createDemoProfile(1);
  private readonly listeners = new Set<Listener>();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  getSnapshot(): PlayerProfileSnapshot {
    const levelState = getMutableDataStore().getCharacterLevel();
    return {
      ...this.snapshot,
      level: levelState.level,
      xpCurrent: levelState.xpCurrent,
      xpToNext: levelState.xpToNext,
      pvp: { ...this.snapshot.pvp },
    };
  }

  setProfile(displayName: string, level: number): void {
    const safeLevel = Math.max(1, Math.floor(level));
    this.snapshot = {
      ...this.snapshot,
      displayName,
      level: safeLevel,
      xpCurrent: 0,
      xpToNext: getCharacterXpForNextLevel(safeLevel),
    };
    getMutableDataStore().applyCharacterLevelState(safeLevel, 0, 'server_sync');
  }

  setDisplayName(displayName: string): void {
    if (displayName === this.snapshot.displayName) return;
    this.snapshot = { ...this.snapshot, displayName };
    this.publish();
  }

  setLevel(level: number): void {
    const safeLevel = Math.max(1, Math.floor(level));
    const current = getMutableDataStore().getCharacterLevel();
    if (current.level === safeLevel) return;
    getMutableDataStore().applyCharacterLevelState(safeLevel, current.xpCurrent, 'server_sync');
  }

  /** Quests e exploração — use `grantCharacterXp` no DataStore com source adequada. */
  addXp(amount: number): void {
    if (amount <= 0) return;
    getMutableDataStore().grantCharacterXp(amount, 'quest');
  }

  setXpCurrent(xpCurrent: number): void {
    const levelState = getMutableDataStore().getCharacterLevel();
    const safeXp = Math.max(0, Math.floor(xpCurrent));
    if (levelState.xpCurrent === safeXp) return;
    getMutableDataStore().applyCharacterLevelState(
      levelState.level,
      safeXp,
      'death_penalty',
    );
  }

  applyLevelState(level: number, xpCurrent: number): void {
    getMutableDataStore().applyCharacterLevelState(level, xpCurrent, 'pve_victory');
  }

  /** Espelho interno — chamado apenas pelo PlayerDataStore (SSOT). */
  mirrorCharacterLevel(level: number, xpCurrent: number, xpToNext: number): void {
    const nextLevel = Math.max(1, Math.floor(level));
    const nextXp = Math.max(0, Math.floor(xpCurrent));
    if (
      this.snapshot.level === nextLevel
      && this.snapshot.xpCurrent === nextXp
      && this.snapshot.xpToNext === xpToNext
    ) {
      return;
    }
    this.snapshot = {
      ...this.snapshot,
      level: nextLevel,
      xpCurrent: nextXp,
      xpToNext,
    };
    this.publish();
  }

  private publish(): void {
    const snapshot = this.getSnapshot();
    uiEvents.emit(UIEventType.PLAYER_PROFILE_UPDATED, { profile: snapshot });
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }
}

let store: PlayerProfileStore | null = null;

export function getPlayerProfileStore(): PlayerProfileStore {
  if (!store) store = new PlayerProfileStore();
  return store;
}

export function resetPlayerProfileStore(): void {
  store = null;
}
