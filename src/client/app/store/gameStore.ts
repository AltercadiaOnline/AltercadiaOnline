import type { InventorySnapshot } from '../../../shared/character/inventorySlots.js';
import {
  buildInventorySnapshot,
  createEmptyInventorySlots,
} from '../../../shared/character/inventorySlots.js';
import type {
  GameStoreBattleState,
  GameStoreBattleStatus,
  GameStoreGold,
} from '../../state/GameStore.js';
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

export type BattleData = {
  readonly status: GameStoreBattleStatus;
  readonly phase: string | null;
  readonly timerSeconds: number | null;
  readonly isMyTurn: boolean;
};

export type GameUiStoreState = {
  readonly viewMode: ViewMode;
  readonly inGame: boolean;
  readonly worldHudActive: boolean;
  readonly renderEngine: RenderEngine;
  readonly playerData: PlayerData;
  readonly battleData: BattleData;
};

type GameUiStoreActions = {
  setViewMode: (viewMode: ViewMode) => void;
  setInGame: (inGame: boolean) => void;
  setWorldHudActive: (worldHudActive: boolean) => void;
  setRenderEngine: (renderEngine: RenderEngine) => void;
  patchPlayerData: (partial: Partial<PlayerData>) => void;
  setBattleData: (battleData: BattleData) => void;
  resetSession: () => void;
};

export type GameUiStore = GameUiStoreState & GameUiStoreActions;

const INITIAL_BATTLE: BattleData = {
  status: 'idle',
  phase: null,
  timerSeconds: null,
  isMyTurn: false,
};

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
  renderEngine: 'canvas-legacy',
  playerData: INITIAL_PLAYER,
  battleData: INITIAL_BATTLE,

  setViewMode: (viewMode) => set({ viewMode }),

  setInGame: (inGame) => set({ inGame }),

  setWorldHudActive: (worldHudActive) => set({ worldHudActive }),

  setRenderEngine: (renderEngine) => set({ renderEngine }),

  patchPlayerData: (partial) => set((state) => ({
    playerData: { ...state.playerData, ...partial },
  })),

  setBattleData: (battleData) => set({ battleData }),

  resetSession: () => set({
    viewMode: 'world',
    inGame: false,
    worldHudActive: false,
    renderEngine: 'canvas-legacy',
    playerData: INITIAL_PLAYER,
    battleData: INITIAL_BATTLE,
  }),
}));

/** Dados do jogador — disponíveis em world e battle. */
export function usePlayerData(): PlayerData {
  return useGameStore((state) => state.playerData);
}

/**
 * Estado de combate — retorna null fora do modo battle (isolamento de leitura).
 */
export function useBattleData(): BattleData | null {
  const viewMode = useGameStore((state) => state.viewMode);
  const battleData = useGameStore((state) => state.battleData);
  return viewMode === 'battle' ? battleData : null;
}

export function useViewMode(): ViewMode {
  return useGameStore((state) => state.viewMode);
}

export function battleStateFromGameStore(battle: GameStoreBattleState): BattleData {
  return {
    status: battle.status,
    phase: battle.phase,
    timerSeconds: battle.timerSeconds,
    isMyTurn: battle.isMyTurn,
  };
}

export function getGameUiStoreSnapshot(): GameUiStoreState {
  const {
    viewMode,
    inGame,
    worldHudActive,
    renderEngine,
    playerData,
    battleData,
  } = useGameStore.getState();
  return { viewMode, inGame, worldHudActive, renderEngine, playerData, battleData };
}
