import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import {
  buildInventorySnapshot,
  createEmptyInventorySlots,
} from '../../../shared/character/inventorySlots.js';
import type { GameStoreGold } from '../../state/GameStore.js';
import { create, type StoreApi, type UseBoundStore } from 'zustand';
import type { RenderEngine } from '../bridge/renderLayerBridge.js';

export type ViewMode = 'world' | 'battle';

export type PlayerData = {
  readonly displayName: string;
  readonly level: number;
  readonly hpCurrent: number;
  readonly hpMax: number;
  readonly inventory: InventorySnapshot;
  readonly gold: GameStoreGold;
};

export type GameUiStoreState = {
  readonly viewMode: ViewMode;
  readonly inGame: boolean;
  readonly worldHudActive: boolean;
  readonly renderEngine: RenderEngine;
  readonly playerData: PlayerData;
};

type GameUiStoreActions = {
  setViewMode: (viewMode: ViewMode) => void;
  setInGame: (inGame: boolean) => void;
  setWorldHudActive: (worldHudActive: boolean) => void;
  setRenderEngine: (renderEngine: RenderEngine) => void;
  patchPlayerData: (partial: Partial<PlayerData>) => void;
  resetSession: () => void;
};

export type GameUiStore = GameUiStoreState & GameUiStoreActions;

const EMPTY_INVENTORY: InventorySnapshot = buildInventorySnapshot(createEmptyInventorySlots());

const INITIAL_PLAYER: PlayerData = {
  displayName: 'Operative',
  level: 1,
  hpCurrent: 0,
  hpMax: 0,
  inventory: EMPTY_INVENTORY,
  gold: {
    dollarVolt: 0,
    alterCoins: 0,
    voltsFormatted: '0 V',
    alterFormatted: '0 AC',
  },
};

type GameStoreHook = UseBoundStore<StoreApi<GameUiStore>>;

type GlobalWithGameUiStore = typeof globalThis & {
  __ALTERCADIA_USE_GAME_STORE__?: GameStoreHook;
};

/**
 * Singleton global — main.js (tsc) e ui-runtime (esbuild) compartilham o mesmo Zustand.
 * Sem isto, AuthStore/HUD ficam em memória separada e a UI dessincroniza.
 */
function createGameUiStore(): GameStoreHook {
  return create<GameUiStore>((set) => ({
    viewMode: 'world',
    inGame: false,
    worldHudActive: false,
    renderEngine: 'construct',
    playerData: INITIAL_PLAYER,

    setViewMode: (viewMode) => set({ viewMode }),

    setInGame: (inGame) => set({ inGame }),

    setWorldHudActive: (worldHudActive) => set({ worldHudActive }),

    setRenderEngine: (renderEngine) => set({ renderEngine }),

    patchPlayerData: (partial) => set((state) => ({
      playerData: { ...state.playerData, ...partial },
    })),

    resetSession: () => set({
      viewMode: 'world',
      inGame: false,
      worldHudActive: false,
      renderEngine: 'construct',
      playerData: INITIAL_PLAYER,
    }),
  }));
}

export const useGameStore: GameStoreHook = (() => {
  const g = globalThis as GlobalWithGameUiStore;
  if (!g.__ALTERCADIA_USE_GAME_STORE__) {
    g.__ALTERCADIA_USE_GAME_STORE__ = createGameUiStore();
  }
  return g.__ALTERCADIA_USE_GAME_STORE__;
})();

/**
 * Objeto playerData inteiro — evita em HUD quente (gold invalida inventário).
 * Prefira hooks de campo abaixo.
 */
export function usePlayerData(): PlayerData {
  return useGameStore((state) => state.playerData);
}

export function usePlayerLevel(): number {
  return useGameStore((state) => state.playerData.level);
}

export function usePlayerDisplayName(): string {
  return useGameStore((state) => state.playerData.displayName);
}

/** Nome + nível + HP + gold formatado — sem inventory (selectors atômicos). */
export function usePlayerVitalsStrip(): {
  readonly displayName: string;
  readonly level: number;
  readonly hpCurrent: number;
  readonly hpMax: number;
  readonly gold: GameStoreGold;
} {
  const displayName = useGameStore((state) => state.playerData.displayName);
  const level = useGameStore((state) => state.playerData.level);
  const hpCurrent = useGameStore((state) => state.playerData.hpCurrent);
  const hpMax = useGameStore((state) => state.playerData.hpMax);
  const gold = useGameStore((state) => state.playerData.gold);
  return { displayName, level, hpCurrent, hpMax, gold };
}

export function usePlayerGold(): GameStoreGold {
  return useGameStore((state) => state.playerData.gold);
}

export function usePlayerInventory(): InventorySnapshot {
  return useGameStore((state) => state.playerData.inventory);
}

/** Lojas / inventário — dois selectors; gold não invalida craft-only. */
export function usePlayerInventoryAndGold(): {
  readonly inventory: InventorySnapshot;
  readonly gold: GameStoreGold;
} {
  const inventory = useGameStore((state) => state.playerData.inventory);
  const gold = useGameStore((state) => state.playerData.gold);
  return { inventory, gold };
}

export function useViewMode(): ViewMode {
  return useGameStore((state) => state.viewMode);
}

export function getGameUiStoreSnapshot(): GameUiStoreState {
  const {
    viewMode,
    inGame,
    worldHudActive,
    renderEngine,
    playerData,
  } = useGameStore.getState();
  return { viewMode, inGame, worldHudActive, renderEngine, playerData };
}
