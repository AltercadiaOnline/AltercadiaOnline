import { create } from 'zustand';
import type { BattleMenuMove } from '../../hud/BattleMenu.js';
import type { BattleConsumableRow } from '../../hud/battleConsumables.js';
import type { GameStoreBattleState } from '../../state/GameStore.js';
import {
  battleSessionFromGameStore,
  type BattleHudChatLine,
  type BattleHudFighterSnapshot,
  type BattleHudLogLine,
  type BattleHudPetSnapshot,
  type BattleHudSession,
  type BattleHudState,
  type BattleHudTurnTimerSnapshot,
} from './battleHudTypes.js';
import { useGameStore } from '../store/gameStore.js';

const MAX_LOG_LINES = 10;
const MAX_CHAT_LINES = 40;

let logLineSequence = 0;
let chatLineSequence = 0;

const DEFAULT_PET: BattleHudPetSnapshot = {
  visible: false,
  name: '—',
  hp: 0,
  maxHp: 1,
  hpRatio: 0,
};

const DEFAULT_TIMER: BattleHudTurnTimerSnapshot = {
  enabled: false,
  displaySec: 10,
  barRatio: 0,
  isUrgent: false,
};

const INITIAL_SESSION: BattleHudSession = {
  status: 'idle',
  phase: null,
  timerSeconds: null,
  isMyTurn: false,
};

export const INITIAL_BATTLE_HUD_STATE: BattleHudState = {
  ...INITIAL_SESSION,
  controllerReady: false,
  battleHudActive: false,
  logLines: [],
  chatLines: [],
  turnPhase: 'Aguardando…',
  turnPhaseActive: false,
  commandBarLocked: true,
  movesetDrawerOpen: false,
  itemsDrawerOpen: false,
  movesetMoves: [],
  movesetEnabled: false,
  paletteTurnBlocked: true,
  itemRows: [],
  itemsEnabled: false,
  player: null,
  opponent: null,
  pet: DEFAULT_PET,
  turnTimer: DEFAULT_TIMER,
};

function formatBattleLogTimestamp(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour12: false });
}

type BattleHudStoreActions = {
  markControllerReady: () => void;
  setBattleHudActive: (battleHudActive: boolean) => void;
  patchSession: (session: Partial<BattleHudSession>) => void;
  syncSessionFromGameStore: (battle: GameStoreBattleState) => void;
  setTurnPhase: (turnPhase: string, turnPhaseActive?: boolean) => void;
  setCommandBarLocked: (commandBarLocked: boolean) => void;
  setMovesetDrawerOpen: (movesetDrawerOpen: boolean) => void;
  toggleItemsDrawer: () => void;
  setItemsDrawerOpen: (itemsDrawerOpen: boolean) => void;
  closeDrawers: () => void;
  setMovesetPalette: (moves: readonly BattleMenuMove[], enabled: boolean) => void;
  setItemsPalette: (rows: readonly BattleConsumableRow[], enabled: boolean) => void;
  setPaletteTurnBlocked: (paletteTurnBlocked: boolean) => void;
  setVitals: (
    player: BattleHudFighterSnapshot | null,
    opponent: BattleHudFighterSnapshot | null,
    pet: BattleHudPetSnapshot,
  ) => void;
  patchFighterHp: (side: 'player' | 'opponent' | 'pet', hp: number, maxHp: number) => void;
  setTurnTimer: (timer: BattleHudTurnTimerSnapshot) => void;
  appendLogLine: (
    line: Omit<BattleHudLogLine, 'id' | 'timestamp'> & { readonly timestamp?: string },
  ) => void;
  appendChatLine: (author: string, text: string) => void;
  resetSession: () => void;
  clearLogLines: () => void;
  clearChatLines: () => void;
};

export type BattleHudStore = BattleHudState & BattleHudStoreActions;

export const useBattleHudStore = create<BattleHudStore>((set, get) => ({
  ...INITIAL_BATTLE_HUD_STATE,

  markControllerReady: () => set({ controllerReady: true }),

  setBattleHudActive: (battleHudActive) => set({ battleHudActive }),

  patchSession: (session) => set(session),

  syncSessionFromGameStore: (battle) => set(battleSessionFromGameStore(battle)),

  setTurnPhase: (turnPhase, turnPhaseActive = false) => set({ turnPhase, turnPhaseActive }),

  setCommandBarLocked: (commandBarLocked) => set({ commandBarLocked }),

  setMovesetDrawerOpen: (movesetDrawerOpen) => set({ movesetDrawerOpen }),

  toggleItemsDrawer: () => set({ itemsDrawerOpen: !get().itemsDrawerOpen }),

  setItemsDrawerOpen: (itemsDrawerOpen) => set({ itemsDrawerOpen }),

  closeDrawers: () => set({ movesetDrawerOpen: false, itemsDrawerOpen: false }),

  setMovesetPalette: (moves, enabled) => set({
    movesetMoves: [...moves],
    movesetEnabled: enabled,
  }),

  setItemsPalette: (rows, enabled) => set({
    itemRows: [...rows],
    itemsEnabled: enabled,
  }),

  setPaletteTurnBlocked: (paletteTurnBlocked) => set({ paletteTurnBlocked }),

  setVitals: (player, opponent, pet) => set({ player, opponent, pet }),

  patchFighterHp: (side, hp, maxHp) => {
    const max = Math.max(1, maxHp);
    const hpRatio = Math.min(100, Math.max(0, (hp / max) * 100));

    if (side === 'pet') {
      set({
        pet: {
          ...get().pet,
          hp,
          maxHp: max,
          hpRatio,
        },
      });
      return;
    }

    const key = side === 'player' ? 'player' : 'opponent';
    const fighter = key === 'player' ? get().player : get().opponent;
    if (!fighter) return;

    const patch = { ...fighter, hp, maxHp: max, hpRatio };
    if (key === 'player') {
      set({ player: patch });
    } else {
      set({ opponent: patch });
    }
  },

  setTurnTimer: (turnTimer) => set({ turnTimer }),

  appendLogLine: (line) => {
    const nextLines = [
      ...get().logLines,
      {
        id: `battle-log-${logLineSequence += 1}`,
        timestamp: line.timestamp ?? formatBattleLogTimestamp(),
        text: line.text,
        emitter: line.emitter,
        ...(line.tone !== undefined ? { tone: line.tone } : {}),
        ...(line.kind !== undefined ? { kind: line.kind } : {}),
      },
    ].slice(-MAX_LOG_LINES) as BattleHudLogLine[];

    set({ logLines: nextLines });
  },

  appendChatLine: (author, text) => {
    const nextLines = [
      ...get().chatLines,
      { id: `battle-chat-${chatLineSequence += 1}`, author, text },
    ].slice(-MAX_CHAT_LINES) as BattleHudChatLine[];

    set({ chatLines: nextLines });
  },

  resetSession: () => {
    const { controllerReady, battleHudActive } = get();
    set({
      ...INITIAL_BATTLE_HUD_STATE,
      controllerReady,
      battleHudActive,
    });
  },

  clearLogLines: () => set({ logLines: [] }),

  clearChatLines: () => set({ chatLines: [] }),
}));

/** HUD de combate montada e visível — null fora de battle. */
export function useBattleHud(): BattleHudState | null {
  const viewMode = useGameStore((state) => state.viewMode);
  const hud = useBattleHudStore();
  if (viewMode !== 'battle' || !hud.controllerReady || !hud.battleHudActive) {
    return null;
  }
  return hud;
}

/** Metadados de sessão — null fora de battle. */
export function useBattleSession(): BattleHudSession | null {
  const viewMode = useGameStore((state) => state.viewMode);
  const status = useBattleHudStore((state) => state.status);
  const phase = useBattleHudStore((state) => state.phase);
  const timerSeconds = useBattleHudStore((state) => state.timerSeconds);
  const isMyTurn = useBattleHudStore((state) => state.isMyTurn);
  if (viewMode !== 'battle') return null;
  return { status, phase, timerSeconds, isMyTurn };
}

export function resetBattleHudStoreSession(): void {
  useBattleHudStore.getState().resetSession();
}
