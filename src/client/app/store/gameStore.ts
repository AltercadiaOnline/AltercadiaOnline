import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import {
  buildInventorySnapshot,
  createEmptyInventorySlots,
} from '../../../shared/character/inventorySlots.js';
import type { GameStoreGold } from '../../state/GameStore.js';
import { create } from 'zustand';
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

export const useGameStore = create<GameUiStore>((set) => ({
  viewMode: 'world',
  inGame: false,
  worldHudActive: false,
  renderEngine: 'phaser',
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
    renderEngine: 'phaser',
    playerData: INITIAL_PLAYER,
  }),
}));

/** Dados do jogador — disponíveis em world e battle. */
export function usePlayerData(): PlayerData {
  return useGameStore((state) => state.playerData);
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
